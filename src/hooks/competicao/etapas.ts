/**
 * Hooks de etapas:
 * - valores padrão inteligentes: temporada atual, número = último + 1, nome "3ª Etapa", local = nome
 *   do kartódromo, categorias = as da temporada;
 * - conferências: categorias da temporada, fim depois do início, número único na temporada;
 * - status "realizada" automático (quando todas as corridas que contam estão oficiais);
 * - temporada encerrada congelada; exclusão só sem resultados (corridas vazias saem junto);
 * - rascunho (pré-visualização): pode ficar incompleto e não mexe em nada fora da própria etapa;
 *   as conferências e os efeitos (títulos das corridas etc.) valem ao publicar.
 */
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
  PayloadRequest,
} from 'payload'
import { buscar, buscarPorId, buscarPrimeiro, COLECOES, excluir, type ContextoCompeticao } from './api'
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

/** Campos que continuam editáveis com a temporada encerrada (apresentação, links e visibilidade). */
const LIVRES_ENCERRADA = [
  '_status',
  'descricao',
  'imagem',
  'visibilidade',
  'localMapa',
  'linkIngressos',
  'linkTreinosLivres',
  'gradeTreinosLivres',
  'imagemGradeTreinosLivres',
  'transmissaoProfissional',
  'transmissaoIndoor',
]

/**
 * Gravação de rascunho (autosalvamento ou "salvar rascunho"): o Payload marca `_status: 'draft'` nos
 * dados antes dos hooks (beforeValidate/beforeChange) e devolve a versão-rascunho no afterChange.
 */
export const ehRascunho = (doc: unknown) => (doc as { _status?: unknown } | null | undefined)?._status === 'draft'

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
  const rascunho = ehRascunho(data)
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

  // Rascunho pode ficar incompleto: as conferências barram ao publicar. Só o número repetido barra já
  // na criação (o rascunho novo ocupa o número no banco).
  const bloqueantes = rascunho ? erros.filter((e) => operation === 'create' && e.caminho === 'numero') : erros
  if (bloqueantes.length) falharNoCampo(req, COLECOES.etapas, bloqueantes)
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

/**
 * Etapa renomeada, renumerada ou com nova data: atualiza os títulos das corridas.
 * Só a versão publicada mexe nas corridas; rascunho não. Ao publicar um rascunho, o "anterior" é o
 * próprio rascunho, então recalcula sempre (só grava o que de fato mudou).
 */
export const aposSalvarEtapa: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (ehRascunho(doc)) return doc
  const publicandoRascunho = ehRascunho(previousDoc)
  if (operation === 'update' && (publicandoRascunho || mudouAlgum(doc, previousDoc, ['nome', 'numero', 'inicio', 'temporada']))) {
    await atualizarDerivados(req, COLECOES.corridas, { etapa: { equals: doc.id } })
  }
  return doc
}

/* ----------------------------------------------------------------------------------------------
 * Atualizações automáticas sem publicar o rascunho do moderador
 * -------------------------------------------------------------------------------------------- */

type Dados = Record<string, unknown>
type Mudanca = Dados | ((versao: Dados) => Dados)

/** Campos que não se copiam de uma versão para outra (sistema, calculados e listas de outras coleções). */
const FORA_DA_COPIA = new Set(['id', 'createdAt', 'updatedAt', '_status', 'titulo', 'textoBusca', 'corridas', 'noticias', 'galerias'])

/** Todos os campos da versão (os ausentes viram vazio, para nada "vazar" da outra versão). */
function copiaDaVersao(versao: Dados, campos: Iterable<string>): Dados {
  const dados: Dados = {}
  for (const campo of campos) if (!FORA_DA_COPIA.has(campo)) dados[campo] = versao[campo] ?? null
  return dados
}

const aplicar = (mudanca: Mudanca, versao: Dados) => (typeof mudanca === 'function' ? mudanca(versao) : mudanca)

async function gravarEtapa(req: PayloadRequest, id: ID, data: Dados, rascunho: boolean, contexto?: ContextoCompeticao) {
  const anterior = req.context
  try {
    await req.payload.update({
      collection: COLECOES.etapas as 'etapas',
      id,
      data: data as never,
      draft: rascunho,
      depth: 0,
      overrideAccess: true,
      context: contexto,
      req,
    })
  } finally {
    req.context = anterior
  }
}

/**
 * Atualiza uma etapa por dentro do sistema (status automático, categorias da temporada…).
 * Uma gravação comum do Payload numa coleção com rascunho parte da ÚLTIMA versão: publicaria o rascunho
 * que o moderador ainda está revisando (ou gravaria a etapa como rascunho, sumindo do site). Aqui:
 * - etapa nunca publicada: a mudança vai para o rascunho;
 * - publicada sem rascunho pendente: grava publicada;
 * - publicada com rascunho pendente: grava a mudança na versão publicada e refaz o rascunho por cima,
 *   com a mesma mudança (o moderador continua de onde parou).
 * `mudanca` pode ser uma função da versão (ex.: tirar uma categoria da lista de cada versão).
 */
export async function atualizarEtapaPublicada(req: PayloadRequest, etapaId: unknown, mudanca: Mudanca, contexto?: ContextoCompeticao) {
  const id = idDe(etapaId)
  if (id === null) return
  // Sem `draft`, a leitura vem da tabela principal: a versão publicada (ou o rascunho de etapa nova)
  const publicada = await buscarPorId<Dados>(req, COLECOES.etapas, id)
  if (!publicada) return
  // Com `draft: true`, a última versão (o rascunho pendente, se houver)
  const ultima = (await req.payload.findByID({
    collection: COLECOES.etapas as 'etapas',
    id,
    draft: true,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req,
  })) as unknown as Dados | null
  if (publicada._status !== 'published') {
    await gravarEtapa(req, id, aplicar(mudanca, ultima ?? publicada), true, contexto)
    return
  }
  if (!ultima || !ehRascunho(ultima)) {
    await gravarEtapa(req, id, { ...aplicar(mudanca, publicada), _status: 'published' }, false, contexto)
    return
  }
  const campos = new Set([...Object.keys(publicada), ...Object.keys(ultima)])
  await gravarEtapa(req, id, { ...copiaDaVersao(publicada, campos), ...aplicar(mudanca, publicada), _status: 'published' }, false, contexto)
  await gravarEtapa(req, id, { ...copiaDaVersao(ultima, campos), ...aplicar(mudanca, ultima) }, true, contexto)
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
  if (novo) await atualizarEtapaPublicada(req, id, { status: novo }, { statusAutomaticoEtapa: id })
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
