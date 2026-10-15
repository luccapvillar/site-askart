/**
 * Hooks de temporada-categorias (menu "Classificações"): uma por categoria da temporada, criada e
 * removida sozinha junto com as categorias da temporada (ver ./temporadas.ts).
 *
 * - título calculado ("Cadete · Campeonato X — 2026");
 * - ajustes, destaque e linhas manuais conferidos (inscrição da própria temporada/categoria, motivo);
 * - ao passar para o modo manual, as linhas calculadas viram o ponto de partida;
 * - temporada encerrada: só "Publicada" e a ordem mudam (a fotografia final é gravada pelo encerramento).
 */
import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
  PayloadRequest,
} from 'payload'
import { buscar, buscarPrimeiro, COLECOES, type ContextoCompeticao } from './api'
import { carregarCategorias, carregarTemporada, rotuloCategoria } from './consultas'
import { conferirCongelamento } from './congelamento'
import { derivadosClassificacao } from './derivados'
import { linhasCalculadasParaManual } from './encerramento'
import { falhar, falharNoCampo } from './erros'
import { normalizarBusca } from './texto'
import type { AjusteDoc, EtapaDoc, InscricaoDoc, LinhaManualDoc, TemporadaCategoriaDoc } from './tipos'
import type { ID } from './util'
import { contemId, idDe, idsDe, mesmoId, docAnterior } from './util'

/** Campos que continuam editáveis com a temporada encerrada. */
const LIVRES_ENCERRADA = ['publicada', 'ordem']

type Erro = { caminho: string; mensagem: string }

/** Categorias cujas inscrições entram nesta classificação (a própria + as somadas). */
export const categoriasDoGrupo = (doc: Pick<TemporadaCategoriaDoc, 'categoria' | 'incluiResultadosDe'>): ID[] => {
  const propria = idDe(doc.categoria)
  return [...(propria !== null ? [propria] : []), ...idsDe(doc.incluiResultadosDe).filter((c) => !mesmoId(c, propria))]
}

/** Confere ajustes (pura): motivo, pontos e inscrição dentro do grupo. Devolve os erros apontando a linha. */
export function conferirAjustes(
  ajustes: AjusteDoc[],
  inscricoesValidas: Set<string>,
  etapasValidas: Set<string>,
): Erro[] {
  const erros: Erro[] = []
  ajustes.forEach((a, i) => {
    const inscricao = idDe(a.inscricao)
    if (inscricao === null) erros.push({ caminho: `ajustes.${i}.inscricao`, mensagem: 'Escolha o piloto do ajuste.' })
    else if (!inscricoesValidas.has(String(inscricao))) {
      erros.push({ caminho: `ajustes.${i}.inscricao`, mensagem: 'Este piloto não está inscrito nesta categoria nesta temporada.' })
    }
    const etapa = idDe(a.etapa)
    if (etapa !== null && !etapasValidas.has(String(etapa))) {
      erros.push({ caminho: `ajustes.${i}.etapa`, mensagem: 'Escolha uma etapa desta temporada.' })
    }
    if (typeof a.pontos === 'number' && a.pontos === 0) {
      erros.push({ caminho: `ajustes.${i}.pontos`, mensagem: 'Informe quantos pontos (diferente de zero).' })
    }
    if (!a.motivo?.trim()) erros.push({ caminho: `ajustes.${i}.motivo`, mensagem: 'Informe o motivo do ajuste.' })
  })
  return erros
}

/** Linhas manuais (pura): posição e piloto não se repetem. */
export function conferirLinhasManuais(linhas: LinhaManualDoc[]): Erro[] {
  const erros: Erro[] = []
  const posicoes = new Map<number, number>()
  const pilotos = new Map<string, number>()
  linhas.forEach((l, i) => {
    if (typeof l.posicao === 'number') {
      if (posicoes.has(l.posicao)) {
        erros.push({ caminho: `linhasManuais.${i}.posicao`, mensagem: `A posição ${l.posicao} já está na linha ${posicoes.get(l.posicao)! + 1}.` })
      } else posicoes.set(l.posicao, i)
    }
    const piloto = idDe(l.piloto)
    if (piloto !== null) {
      if (pilotos.has(String(piloto))) {
        erros.push({ caminho: `linhasManuais.${i}.piloto`, mensagem: `Este piloto já está na linha ${pilotos.get(String(piloto))! + 1}.` })
      } else pilotos.set(String(piloto), i)
    }
  })
  return erros
}

/** O rótulo do destaque manual não pode imitar o líder calculado. */
export const rotuloDestaqueValido = (rotulo: string | null | undefined) => {
  const r = normalizarBusca(rotulo ?? '')
  return r !== 'lider' && !r.startsWith('lider ')
}

async function inscricoesDoGrupo(req: PayloadRequest, temporada: ID, categorias: ID[]) {
  if (!categorias.length) return []
  return buscar<InscricaoDoc>(req, COLECOES.inscricoes, {
    where: { and: [{ temporada: { equals: temporada } }, { categoria: { in: categorias } }] },
  })
}

export const prepararClassificacao: CollectionBeforeValidateHook = async ({ data, originalDoc, operation, req, context }) => {
  if (!data) return data
  const contexto = context as ContextoCompeticao
  const anterior = docAnterior<TemporadaCategoriaDoc>(originalDoc)
  const temporadaId = idDe(data.temporada ?? anterior?.temporada)
  const categoriaId = idDe(data.categoria ?? anterior?.categoria)
  // Criação automática pela temporada: dados já conferidos lá
  if (contexto.criandoClassificacoes !== undefined || contexto.encerrandoTemporada !== undefined) return data
  if (temporadaId === null || categoriaId === null) return data

  const erros: Erro[] = []
  const temporada = await carregarTemporada(req, temporadaId)
  const categoriasDaTemporada = idsDe(temporada?.categorias)

  if (operation === 'update' && anterior && (!mesmoId(anterior.temporada, temporadaId) || !mesmoId(anterior.categoria, categoriaId))) {
    falhar('A temporada e a categoria de uma classificação não mudam. Ajuste as categorias na própria temporada.', 400)
  }
  if (!contemId(categoriasDaTemporada, categoriaId)) {
    erros.push({ caminho: 'categoria', mensagem: 'Esta categoria não está na temporada. Inclua-a em "Categorias desta temporada".' })
  }
  if (operation === 'create') {
    const existente = await buscarPrimeiro<TemporadaCategoriaDoc>(req, COLECOES.temporadaCategorias, {
      where: { and: [{ temporada: { equals: temporadaId } }, { categoria: { equals: categoriaId } }] },
    })
    if (existente) falhar('Já existe a classificação desta categoria nesta temporada (ela é criada sozinha).', 409)
  }

  // Categorias somadas: da mesma temporada e diferentes da própria
  const somadas = idsDe(data.incluiResultadosDe)
  data.incluiResultadosDe = somadas.filter((c) => !mesmoId(c, categoriaId))
  const fora = somadas.filter((c) => !contemId(categoriasDaTemporada, c))
  if (fora.length) {
    const nomes = (await carregarCategorias(req, fora)).map(rotuloCategoria).join(', ')
    erros.push({ caminho: 'incluiResultadosDe', mensagem: `Categoria(s) fora desta temporada: ${nomes}.` })
  }

  // Ajustes e destaque: inscrições do grupo de categorias da classificação
  const ajustes = (Array.isArray(data.ajustes) ? data.ajustes : []) as AjusteDoc[]
  const destaque = (data.destaqueManual ?? null) as TemporadaCategoriaDoc['destaqueManual']
  if (ajustes.length || idDe(destaque?.inscricao) !== null) {
    const inscricoes = await inscricoesDoGrupo(req, temporadaId, categoriasDoGrupo({ categoria: categoriaId, incluiResultadosDe: data.incluiResultadosDe }))
    const validas = new Set(inscricoes.map((i) => String(i.id)))
    const etapas = await buscar<EtapaDoc>(req, COLECOES.etapas, { where: { temporada: { equals: temporadaId } } })
    erros.push(...conferirAjustes(ajustes, validas, new Set(etapas.map((e) => String(e.id)))))
    const inscricaoDestaque = idDe(destaque?.inscricao)
    if (inscricaoDestaque !== null && !validas.has(String(inscricaoDestaque))) {
      erros.push({ caminho: 'destaqueManual.inscricao', mensagem: 'Escolha um piloto inscrito nesta categoria.' })
    }
  }
  if (destaque?.rotulo && !rotuloDestaqueValido(destaque.rotulo)) {
    erros.push({
      caminho: 'destaqueManual.rotulo',
      mensagem: '"Líder" é só para o 1º colocado calculado. Use outro rótulo (ex.: "Destaque").',
    })
  }

  erros.push(...conferirLinhasManuais((Array.isArray(data.linhasManuais) ? data.linhasManuais : []) as LinhaManualDoc[]))
  if (erros.length) falharNoCampo(req, COLECOES.temporadaCategorias, erros)
  return data
}

/**
 * Congelamento, registro de quem lançou cada ajuste, cópia das linhas calculadas ao passar para o
 * modo manual e título calculado.
 */
export const regrasDaClassificacao: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req, context }) => {
  const anterior = docAnterior<TemporadaCategoriaDoc>(originalDoc)
  const contexto = context as ContextoCompeticao
  const temporadaId = idDe(data.temporada ?? anterior?.temporada)

  if (operation === 'update' && contexto.criandoClassificacoes === undefined) {
    await conferirCongelamento({
      req,
      context,
      temporadas: [temporadaId],
      oQue: 'as classificações (ajustes, modo e linhas)',
      operacao: 'update',
      data,
      originalDoc,
      livres: LIVRES_ENCERRADA,
    })
  }

  // Quem lançou e quando (ajustes novos)
  const idsAnteriores = new Set((anterior?.ajustes ?? []).map((a) => String(a.id)))
  for (const ajuste of (Array.isArray(data.ajustes) ? data.ajustes : []) as Array<AjusteDoc & Record<string, unknown>>) {
    if (ajuste.id && idsAnteriores.has(String(ajuste.id))) continue
    if (!ajuste.registradoEm) ajuste.registradoEm = new Date().toISOString()
    if (!ajuste.registradoPor && req.user) ajuste.registradoPor = req.user.id
  }

  // Passou para o modo manual sem linhas: começa pela classificação calculada
  const virouManual = data.modo === 'manual' && anterior?.modo !== 'manual'
  const semLinhas = !Array.isArray(data.linhasManuais) || data.linhasManuais.length === 0
  if (virouManual && semLinhas && temporadaId !== null && idDe(data.categoria ?? anterior?.categoria) !== null) {
    data.linhasManuais = await linhasCalculadasParaManual(req, temporadaId, idDe(data.categoria ?? anterior?.categoria)!)
  }

  Object.assign(data, await derivadosClassificacao(req, data))
  return data
}

/** Classificações saem junto com a categoria da temporada; não se exclui uma avulsa. */
export const antesDeExcluirClassificacao: CollectionBeforeDeleteHook = ({ context }) => {
  if ((context as ContextoCompeticao).exclusaoEmCascata !== undefined) return
  falhar(
    'As classificações são criadas e removidas sozinhas com as categorias da temporada. ' +
      'Para tirar do site, desmarque "Publicada"; para remover, tire a categoria da temporada.',
    409,
  )
}
