/**
 * Hooks de etapas:
 * - valores padrão inteligentes: temporada atual, número = último + 1, nome "3ª Etapa", local = nome
 *   do kartódromo, categorias = as da temporada;
 * - conferências: categorias da temporada, fim depois do início, número único na temporada;
 * - status "realizada" automático (quando todas as corridas que contam estão oficiais);
 * - temporada encerrada congelada; exclusão só sem resultados (corridas vazias saem junto).
 */
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
  PayloadRequest,
} from 'payload'
import { atualizar, buscar, buscarPorId, buscarPrimeiro, COLECOES, excluir, type ContextoCompeticao } from './api'
import {
  carregarCategorias,
  carregarTemporada,
  categoriasDaTemporada,
  nomeKartodromo,
  proximoNumeroEtapa,
  rotuloCategoria,
  temporadaAtualPadrao,
} from './consultas'
import { conferirCongelamento } from './congelamento'
import { atualizarDerivados, derivadosEtapa } from './derivados'
import { falhar, falharNoCampo } from './erros'
import { contarUsos, mensagemVinculos } from './exclusao'
import { nomeEtapaPadrao } from './texto'
import type { CorridaDoc, EtapaDoc } from './tipos'
import type { ID } from './util'
import { contemId, idDe, idsDe, mesmoId, mudouAlgum, docAnterior } from './util'
import { statusEtapaAutomatico } from './validacoes'

/** Campos que continuam editáveis com a temporada encerrada (apresentação e visibilidade). */
const LIVRES_ENCERRADA = ['descricao', 'imagem', 'visibilidade', 'localMapa', 'linkIngressos']

type Erro = { caminho: string; mensagem: string }

/* ----------------------------------------------------------------------------------------------
 * Valores padrão do formulário (etapa nova)
 * -------------------------------------------------------------------------------------------- */

export const numeroPadrao = async ({ req }: { req: PayloadRequest }) => proximoNumeroEtapa(req, await temporadaAtualPadrao(req))

export const nomePadrao = async ({ req }: { req: PayloadRequest }) => nomeEtapaPadrao(await numeroPadrao({ req }))

export const localPadrao = async ({ req }: { req: PayloadRequest }) => (await nomeKartodromo(req)) ?? undefined

export const categoriasPadrao = async ({ req }: { req: PayloadRequest }) => {
  const ids = await categoriasDaTemporada(req, await temporadaAtualPadrao(req))
  return ids.length ? ids : undefined
}

/** O nome ainda é o automático ("3ª Etapa")? Então acompanha o número. */
export const ehNomeAutomatico = (nome: string | null | undefined) => !nome?.trim() || /^\d+[ªº]?\s*etapa$/i.test(nome.trim())

/** Fim antes do início? (pura) */
export function fimAntesDoInicio(inicio: unknown, fim: unknown): boolean {
  if (!inicio || !fim) return false
  const a = new Date(inicio as string).getTime()
  const b = new Date(fim as string).getTime()
  return Number.isFinite(a) && Number.isFinite(b) && b < a
}

/** Corridas da etapa que já têm resultado lançado ou oficial (são histórico). */
export const corridaTemResultado = (c: Pick<CorridaDoc, 'status' | 'resultados'>) =>
  c.status === 'oficial' || (c.resultados?.length ?? 0) > 0

/* ----------------------------------------------------------------------------------------------
 * beforeValidate
 * -------------------------------------------------------------------------------------------- */

export const prepararEtapa: CollectionBeforeValidateHook = async ({ data, originalDoc, operation, req, context }) => {
  if (!data) return data
  const anterior = docAnterior<EtapaDoc>(originalDoc)
  const contexto = context as ContextoCompeticao
  const temporadaId = idDe(data.temporada)
  if (temporadaId === null) return data
  const temporada = await carregarTemporada(req, temporadaId)
  const erros: Erro[] = []

  // Valores padrão que dependem da temporada escolhida
  if (typeof data.numero !== 'number') data.numero = await proximoNumeroEtapa(req, temporadaId)
  if (typeof data.nome === 'string') data.nome = data.nome.trim()
  if (ehNomeAutomatico(data.nome)) data.nome = nomeEtapaPadrao(data.numero)
  if (operation === 'create') {
    if (!data.local?.toString().trim()) data.local = (await nomeKartodromo(req)) ?? data.local
    if (!idsDe(data.categorias).length) data.categorias = idsDe(temporada?.categorias)
  }
  if (typeof data.local === 'string') data.local = data.local.trim()

  // Número único na temporada (também garantido por índice único)
  const mesmaPosicao = await buscarPrimeiro<EtapaDoc>(req, COLECOES.etapas, {
    where: {
      and: [
        { temporada: { equals: temporadaId } },
        { numero: { equals: data.numero } },
        ...(anterior ? [{ id: { not_equals: anterior.id } }] : []),
      ],
    },
  })
  if (mesmaPosicao) {
    const livre = await proximoNumeroEtapa(req, temporadaId)
    erros.push({
      caminho: 'numero',
      mensagem: `Já existe a etapa ${data.numero} nesta temporada ("${mesmaPosicao.nome}"). O próximo número livre é ${livre}.`,
    })
  }

  // Categorias: só as da temporada
  const categorias = idsDe(data.categorias)
  const daTemporada = idsDe(temporada?.categorias)
  const fora = categorias.filter((c) => !contemId(daTemporada, c))
  if (fora.length) {
    const nomes = (await carregarCategorias(req, fora)).map(rotuloCategoria).join(', ')
    erros.push({ caminho: 'categorias', mensagem: `Categoria(s) fora da temporada: ${nomes}. Inclua-as na temporada antes.` })
  }

  if (fimAntesDoInicio(data.inicio, data.fim)) {
    erros.push({ caminho: 'fim', mensagem: 'O fim precisa ser depois do início.' })
  }

  if (anterior) {
    const corridas = await buscar<CorridaDoc>(req, COLECOES.corridas, { where: { etapa: { equals: anterior.id } } })

    // Categoria retirada da etapa não pode ter corridas
    const removidas = idsDe(anterior.categorias).filter((c) => !contemId(categorias, c))
    const comCorridas = removidas.filter((c) => corridas.some((cor) => contemId(idsDe(cor.categorias), c)))
    if (comCorridas.length) {
      const nomes = (await carregarCategorias(req, comCorridas)).map(rotuloCategoria).join(', ')
      erros.push({
        caminho: 'categorias',
        mensagem: `A etapa tem corridas de ${nomes}. Exclua essas corridas (ou mude para "Cancelada") antes de tirar a categoria.`,
      })
    }

    // Mudar de temporada com resultados lançados mudaria o histórico
    if (!mesmoId(anterior.temporada, temporadaId) && corridas.some(corridaTemResultado)) {
      erros.push({ caminho: 'temporada', mensagem: 'Esta etapa já tem resultados: não é possível mudá-la de temporada.' })
    }

    // "Realizada" é automática: só quando as corridas que contam estão oficiais
    if (data.status === 'realizada' && anterior.status !== 'realizada' && contexto.statusAutomaticoEtapa === undefined) {
      const pendentes = corridas.filter((c) => c.contaParaClassificacao !== false && c.status === 'rascunho')
      if (pendentes.length) {
        erros.push({
          caminho: 'status',
          mensagem: `A etapa vira "Realizada" sozinha quando todas as corridas que contam estiverem oficiais. Faltam ${pendentes.length}: ${pendentes
            .slice(0, 4)
            .map((c) => c.titulo || c.nome)
            .join('; ')}.`,
        })
      }
    }
  }

  if (erros.length) falharNoCampo(req, COLECOES.etapas, erros)
  return data
}

/* ----------------------------------------------------------------------------------------------
 * beforeChange / afterChange
 * -------------------------------------------------------------------------------------------- */

export const regrasDaEtapa: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req, context }) => {
  await conferirCongelamento({
    req,
    context,
    temporadas: [data.temporada, originalDoc?.temporada],
    oQue: 'etapas, corridas e resultados',
    operacao: operation === 'create' ? 'create' : 'update',
    data,
    originalDoc,
    livres: LIVRES_ENCERRADA,
  })
  Object.assign(data, await derivadosEtapa(req, data))
  return data
}

/** Etapa renomeada, renumerada ou com nova data: atualiza os títulos das corridas. */
export const aposSalvarEtapa: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (operation === 'update' && mudouAlgum(doc, previousDoc, ['nome', 'numero', 'inicio', 'temporada'])) {
    await atualizarDerivados(req, COLECOES.corridas, { etapa: { equals: doc.id } })
  }
  return doc
}

/**
 * Ajusta o status da etapa a partir das corridas (chamado pelos hooks das corridas):
 * vira "realizada" quando todas as que contam estão oficiais; volta a "confirmada" se alguma deixar de ser.
 */
export async function sincronizarStatusEtapa(req: PayloadRequest, etapaId: unknown) {
  const id = idDe(etapaId)
  if (id === null) return
  const etapa = await buscarPorId<EtapaDoc>(req, COLECOES.etapas, id)
  if (!etapa) return
  const corridas = await buscar<CorridaDoc>(req, COLECOES.corridas, { where: { etapa: { equals: id } } })
  const novo = statusEtapaAutomatico(etapa.status, corridas)
  if (novo) await atualizar(req, COLECOES.etapas, id, { status: novo }, { statusAutomaticoEtapa: id })
}

/* ----------------------------------------------------------------------------------------------
 * beforeDelete
 * -------------------------------------------------------------------------------------------- */

/**
 * Etapa só sai se não tiver resultados nem vínculos (notícias, galerias, ajustes…).
 * Corridas ainda vazias (geradas e não usadas) são excluídas junto.
 */
export const antesDeExcluirEtapa: CollectionBeforeDeleteHook = async ({ id, req, context }) => {
  const etapa = await buscarPorId<EtapaDoc>(req, COLECOES.etapas, id)
  await conferirCongelamento({ req, context, temporadas: [etapa?.temporada], oQue: 'etapas', operacao: 'delete' })
  const corridas = await buscar<CorridaDoc>(req, COLECOES.corridas, { where: { etapa: { equals: id } } })
  const comResultado = corridas.filter(corridaTemResultado)
  const usos = await contarUsos(req, COLECOES.etapas, id, [{ colecao: COLECOES.corridas, caminho: 'etapa' }])
  if (comResultado.length || usos.length) {
    falhar(
      mensagemVinculos(
        'esta etapa',
        usos,
        comResultado.length ? `${comResultado.length} corrida(s) têm resultados lançados` : undefined,
      ) + ' Se a etapa não vai acontecer, mude o status para "Cancelada".',
      409,
    )
  }
  for (const corrida of corridas) {
    await excluir(req, COLECOES.corridas, corrida.id, { exclusaoEmCascata: id as ID })
  }
}
