/**
 * Endpoints próprios da Competição (ações do painel). Todos:
 * - exigem login de editor ou administrador (endpoints do Payload não exigem login por padrão);
 * - validam o id da URL antes de qualquer consulta;
 * - rodam numa transação (tudo ou nada) e passam pelas mesmas regras e hooks das telas.
 *
 *   POST /api/temporadas/:id/encerrar       grava a classificação final e os campeões; congela a temporada
 *   POST /api/temporadas/:id/criar-proxima  { ano?, tornarAtual? } nova temporada com categorias, regra e formato
 *   POST /api/regras-pontuacao/:id/duplicar cópia editável da regra
 *   POST /api/etapas/:id/gerar-corridas     corridas do formato da temporada × categorias da etapa (categoria com
 *                                           subcategorias: as sessões de cada subcategoria)
 */
import {
  commitTransaction,
  initTransaction,
  killTransaction,
  type CollectionSlug,
  type Endpoint,
  type PayloadHandler,
  type PayloadRequest,
} from 'payload'
import { ehEditorOuAdmin } from '../../access'
import { slugificar } from '../../fields/slug'
import { buscar, buscarPorId, buscarPrimeiro, COLECOES, type SlugCompeticao } from './api'
import { carregarCategorias, carregarTemporada, rotuloCategoria } from './consultas'
import { estaEncerrada, mensagemCongelada } from './congelamento'
import { categoriasPermitidas } from './corridas'
import { falhar } from './erros'
import { nomeProximaTemporada } from './texto'
import type {
  CampeonatoDoc,
  CorridaDoc,
  EtapaDoc,
  RegraPontuacaoDoc,
  TemporadaCategoriaDoc,
  TemporadaDoc,
} from './tipos'
import type { ID } from './util'
import { idDaRota, idDe, idsDe, mesmoId, semIdsDeLinha } from './util'
import { planejarCorridas, validarInteiro } from './validacoes'

/* ----------------------------------------------------------------------------------------------
 * Infraestrutura
 * -------------------------------------------------------------------------------------------- */

/** Confere o papel e devolve o id validado da rota. */
function conferirPedido(req: PayloadRequest): ID {
  if (!req.user) falhar('Entre no painel para usar esta ação.', 401)
  if (!ehEditorOuAdmin(req.user)) falhar('Esta ação é só para editores e administradores.', 403)
  const id = idDaRota(req.routeParams?.id)
  if (id === null) falhar('Identificador inválido.', 400)
  return id
}

/** Corpo JSON opcional (vazio ou inválido = {}). */
async function lerCorpo(req: PayloadRequest): Promise<Record<string, unknown>> {
  try {
    const corpo = typeof req.json === 'function' ? await req.json() : null
    return corpo && typeof corpo === 'object' && !Array.isArray(corpo) ? (corpo as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/** Executa numa transação: confirma no fim ou desfaz tudo se algo falhar. */
async function emTransacao<T>(req: PayloadRequest, fn: () => Promise<T>): Promise<T> {
  const iniciou = await initTransaction(req)
  try {
    const resultado = await fn()
    if (iniciou) await commitTransaction(req)
    return resultado
  } catch (erro) {
    if (iniciou) await killTransaction(req)
    throw erro
  }
}

/**
 * Escritas dos endpoints: passam pela regra de acesso do usuário (overrideAccess: false) e por todos
 * os hooks, exatamente como se fossem feitas na tela.
 */
const comoUsuario = { overrideAccess: false, depth: 0 } as const
const colecao = (slug: SlugCompeticao) => slug as CollectionSlug

async function carregarOu404<T>(req: PayloadRequest, slug: SlugCompeticao, id: ID, oQue: string): Promise<T> {
  const doc = await buscarPorId<T>(req, slug, id)
  if (!doc) falhar(`${oQue} não encontrada.`, 404)
  return doc
}

/* ----------------------------------------------------------------------------------------------
 * Temporadas → encerrar
 * -------------------------------------------------------------------------------------------- */

const encerrarTemporada: PayloadHandler = async (req) => {
  const id = conferirPedido(req)
  const resposta = await emTransacao(req, async () => {
    const temporada = await carregarOu404<TemporadaDoc>(req, COLECOES.temporadas, id, 'Temporada')
    if (estaEncerrada(temporada)) falhar(`A temporada "${temporada.nome}" já está encerrada.`, 409)

    // Mudar o status dispara as conferências (regra definida, nada em rascunho) e a gravação da
    // fotografia final e do pódio de cada categoria (hooks em ./temporadas.ts e ./encerramento.ts)
    await req.payload.update({
      collection: colecao(COLECOES.temporadas),
      id,
      data: { status: 'encerrada' } as never,
      ...comoUsuario,
      req,
    })

    const classificacoes = await buscar<TemporadaCategoriaDoc>(req, COLECOES.temporadaCategorias, {
      where: { temporada: { equals: id } },
      sort: 'ordem',
    })
    return {
      mensagem: `Temporada "${temporada.nome}" encerrada. A classificação final de ${classificacoes.length} categoria(s) foi gravada.`,
      temporada: id,
      classificacoes: classificacoes.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        campeao: idDe(c.campeao),
        vice: idDe(c.vice),
        terceiro: idDe(c.terceiro),
      })),
    }
  })
  return Response.json(resposta)
}

export const endpointEncerrarTemporada: Endpoint = { path: '/:id/encerrar', method: 'post', handler: encerrarTemporada }

/* ----------------------------------------------------------------------------------------------
 * Temporadas → criar a próxima
 * -------------------------------------------------------------------------------------------- */

const criarProximaTemporada: PayloadHandler = async (req) => {
  const id = conferirPedido(req)
  const corpo = await lerCorpo(req)
  const resposta = await emTransacao(req, async () => {
    const atual = await carregarOu404<TemporadaDoc>(req, COLECOES.temporadas, id, 'Temporada')
    const campeonatoId = idDe(atual.campeonato)
    const campeonato = await buscarPorId<CampeonatoDoc>(req, COLECOES.campeonatos, campeonatoId)
    if (!campeonato) falhar('O campeonato desta temporada não foi encontrado.', 404)

    const ano = corpo.ano === undefined || corpo.ano === null || corpo.ano === '' ? atual.ano + 1 : Number(corpo.ano)
    const anoValido = validarInteiro(1950, 2100, 'O ano')(ano)
    if (anoValido !== true) falhar(anoValido, 400)

    // Mesmo ano já existente neste campeonato: pede outro ano em vez de criar "2027-2" sem querer
    const slug = slugificar(String(ano))
    const existente = await buscarPrimeiro<TemporadaDoc>(req, COLECOES.temporadas, {
      where: { and: [{ campeonato: { equals: campeonatoId } }, { slug: { equals: slug } }] },
    })
    if (existente) falhar(`Já existe a temporada "${existente.nome}" neste campeonato.`, 409)

    const nova = (await req.payload.create({
      collection: colecao(COLECOES.temporadas),
      data: {
        campeonato: campeonatoId,
        ano,
        nome: nomeProximaTemporada(atual.nome, atual.ano, ano, campeonato.nome),
        slug,
        status: 'planejada',
        regra: idDe(atual.regra),
        categorias: idsDe(atual.categorias),
        formatoEtapa: semIdsDeLinha(atual.formatoEtapa as Record<string, unknown>[] | null),
        fonteDados: 'resultados',
        // Nasce fora do site: fica visível quando o calendário estiver pronto
        visibilidade: 'oculto',
      } as never,
      ...comoUsuario,
      req,
    })) as unknown as TemporadaDoc

    // As classificações foram criadas pelo hook da temporada; copia a configuração de cada categoria
    const antigas = await buscar<TemporadaCategoriaDoc>(req, COLECOES.temporadaCategorias, {
      where: { temporada: { equals: id } },
    })
    const novas = await buscar<TemporadaCategoriaDoc>(req, COLECOES.temporadaCategorias, {
      where: { temporada: { equals: nova.id } },
    })
    for (const destino of novas) {
      const origem = antigas.find((a) => mesmoId(a.categoria, destino.categoria))
      if (!origem) continue
      await req.payload.update({
        collection: colecao(COLECOES.temporadaCategorias),
        id: destino.id,
        data: {
          ordem: origem.ordem ?? destino.ordem,
          regra: idDe(origem.regra),
          incluiResultadosDe: idsDe(origem.incluiResultadosDe),
        } as never,
        ...comoUsuario,
        req,
      })
    }

    const tornarAtual = corpo.tornarAtual === true
    if (tornarAtual) {
      await req.payload.update({
        collection: colecao(COLECOES.campeonatos),
        id: campeonato.id,
        data: { temporadaAtual: nova.id } as never,
        ...comoUsuario,
        req,
      })
    }

    return {
      mensagem:
        `Temporada "${nova.nome}" criada com as categorias, a regra e o formato de etapas de "${atual.nome}". ` +
        'Ela está oculta no site: cadastre as etapas e mude "No site" para Visível quando estiver pronta.' +
        (tornarAtual ? ' Ela já é a temporada atual do campeonato.' : ''),
      id: nova.id,
      nome: nova.nome,
      tornouAtual: tornarAtual,
    }
  })
  return Response.json(resposta, { status: 201 })
}

export const endpointCriarProximaTemporada: Endpoint = {
  path: '/:id/criar-proxima',
  method: 'post',
  handler: criarProximaTemporada,
}

/* ----------------------------------------------------------------------------------------------
 * Regras de pontuação → duplicar
 * -------------------------------------------------------------------------------------------- */

/** Campos que não vão para a cópia (sistema e listas "onde é usada"). */
const FORA_DA_COPIA = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'temporadas', 'classificacoes']

/** Próximo nome livre: "Regra (cópia)", "Regra (cópia 2)"… */
export function nomeDeCopia(nome: string, existentes: string[]): string {
  const base = nome.replace(/\s*\(cópia(?: \d+)?\)$/, '').trim() || 'Regra'
  const usados = new Set(existentes)
  let candidato = `${base} (cópia)`
  for (let n = 2; usados.has(candidato); n++) candidato = `${base} (cópia ${n})`
  return candidato
}

const duplicarRegra: PayloadHandler = async (req) => {
  const id = conferirPedido(req)
  const resposta = await emTransacao(req, async () => {
    const regra = await carregarOu404<RegraPontuacaoDoc>(req, COLECOES.regras, id, 'Regra')
    const dados: Record<string, unknown> = {}
    for (const [campo, valor] of Object.entries(regra)) {
      if (FORA_DA_COPIA.includes(campo)) continue
      dados[campo] = Array.isArray(valor) && valor.every((v) => v && typeof v === 'object')
        ? semIdsDeLinha(valor as Record<string, unknown>[])
        : valor
    }
    const parecidas = await buscar<RegraPontuacaoDoc>(req, COLECOES.regras, { where: { nome: { like: regra.nome } } })
    dados.nome = nomeDeCopia(regra.nome, parecidas.map((r) => r.nome))
    const copia = (await req.payload.create({
      collection: colecao(COLECOES.regras),
      data: dados as never,
      ...comoUsuario,
      req,
    })) as unknown as RegraPontuacaoDoc
    return {
      mensagem: `Cópia criada: "${copia.nome}". Edite a cópia e escolha-a na nova temporada.`,
      id: copia.id,
      nome: copia.nome,
    }
  })
  return Response.json(resposta, { status: 201 })
}

export const endpointDuplicarRegra: Endpoint = { path: '/:id/duplicar', method: 'post', handler: duplicarRegra }

/* ----------------------------------------------------------------------------------------------
 * Etapas → gerar corridas
 * -------------------------------------------------------------------------------------------- */

const gerarCorridas: PayloadHandler = async (req) => {
  const id = conferirPedido(req)
  const resposta = await emTransacao(req, async () => {
    const etapa = await carregarOu404<EtapaDoc>(req, COLECOES.etapas, id, 'Etapa')
    const temporada = await carregarTemporada(req, etapa.temporada)
    if (!temporada) falhar('A temporada desta etapa não foi encontrada.', 404)
    if (estaEncerrada(temporada)) falhar(mensagemCongelada(temporada.nome, 'etapas, corridas e resultados'), 409)
    if (etapa.status === 'cancelada') falhar('Esta etapa está cancelada: não há corridas para gerar.', 409)

    const categorias = categoriasPermitidas(etapa, temporada)
    if (!categorias.length) falhar('Escolha as categorias da etapa (ou da temporada) antes de gerar as corridas.', 400)

    // Categoria com subcategorias: as sessões de cada subcategoria (as do formato ou, sem formato, Warm-up,
    // Classificação, Corrida 1 e Corrida 2). Sem subcategorias, só o formato da temporada.
    const docsCategorias = await carregarCategorias(req, categorias)
    const subcategoriasDe = new Map(docsCategorias.map((c) => [String(c.id), c.subcategorias ?? []] as const))
    const comSubcategorias = docsCategorias.filter((c) => (c.subcategorias ?? []).some((s) => s?.nome?.trim()))
    const formato = (temporada.formatoEtapa ?? []).filter((f) => f.nome?.trim())
    if (!formato.length && !comSubcategorias.length) {
      falhar(
        `A temporada "${temporada.nome}" ainda não tem o "Formato padrão das etapas". Cadastre as corridas (ex.: Bateria 1, Final) na aba "Pontuação e formato" da temporada.`,
        400,
      )
    }

    const existentes = await buscar<CorridaDoc>(req, COLECOES.corridas, { where: { etapa: { equals: id } } })
    const plano = planejarCorridas(etapa.id, formato, categorias, new Set(existentes.map((c) => c.chaveUnica ?? '')), subcategoriasDe)
    for (const corrida of plano.criar) {
      const { chaveUnica: _calculadaNoHook, ...dados } = corrida
      await req.payload.create({
        collection: colecao(COLECOES.corridas),
        data: dados as never,
        ...comoUsuario,
        req,
      })
    }
    const criadas = plano.criar.length
    const porSubcategoria = plano.criar.filter((c) => c.subcategorias?.length).length
    // Sem formato, as categorias sem subcategorias ficam sem corridas: o moderador precisa saber
    const semFormato = formato.length ? [] : docsCategorias.filter((c) => !comSubcategorias.includes(c)).map(rotuloCategoria).filter(Boolean)
    const mensagem = [
      criadas
        ? `${criadas} corrida(s) criada(s)${porSubcategoria ? `, ${porSubcategoria} delas por subcategoria (cada uma com o seu horário, a preencher)` : ''}${plano.jaExistiam ? `; ${plano.jaExistiam} já existiam e foram mantidas` : ''}.`
        : 'Todas as corridas já existem nesta etapa. Nada foi criado.',
      semFormato.length
        ? `Sem o "Formato padrão das etapas" na temporada, ${semFormato.length === 1 ? 'a categoria' : 'as categorias'} ${semFormato.join(', ')} (sem subcategorias) ${semFormato.length === 1 ? 'ficou' : 'ficaram'} sem corridas.`
        : null,
    ]
      .filter(Boolean)
      .join(' ')
    return { mensagem, criadas, jaExistiam: plano.jaExistiam }
  })
  return Response.json(resposta, { status: 201 })
}

export const endpointGerarCorridas: Endpoint = { path: '/:id/gerar-corridas', method: 'post', handler: gerarCorridas }
