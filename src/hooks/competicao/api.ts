/**
 * Acesso ao banco usado pelos hooks e endpoints da Competição (Local API do Payload).
 *
 * - Sempre repassa `req` (mesma transação da operação que disparou o hook).
 * - Operações internas usam overrideAccess (o papel já foi conferido pela regra de acesso
 *   ou pelo endpoint). Leituras do site público NÃO passam por aqui (ver src/lib/publico.ts).
 * - `contexto` é aplicado só durante a operação aninhada e depois desfeito: o Payload mescla o
 *   contexto no `req` compartilhado, e sem isso as marcas "vazariam" para o resto da requisição.
 * - As coleções são referenciadas por texto para não depender de src/payload-types.ts regenerado.
 */
import type { CollectionSlug, GlobalSlug, PayloadRequest, RequestContext, Sort, Where } from 'payload'
import type { ID } from './util'

export const COLECOES = {
  campeonatos: 'campeonatos',
  temporadas: 'temporadas',
  temporadaCategorias: 'temporada-categorias',
  categorias: 'categorias',
  equipes: 'equipes',
  pilotos: 'pilotos',
  inscricoes: 'inscricoes',
  regras: 'regras-pontuacao',
  etapas: 'etapas',
  corridas: 'corridas',
} as const

export type SlugCompeticao = (typeof COLECOES)[keyof typeof COLECOES]

const colecao = (slug: string) => slug as CollectionSlug

/** Marcas de contexto usadas pela frente (evitam laços e liberam escritas internas). */
export interface ContextoCompeticao extends RequestContext {
  /** Escrita feita pelo encerramento da temporada (libera campos congelados). */
  encerrandoTemporada?: ID
  /** Status da etapa sendo ajustado automaticamente a partir das corridas. */
  statusAutomaticoEtapa?: ID
  /** Criação automática de classificações a partir da temporada. */
  criandoClassificacoes?: ID
  /** Exclusão em cascata feita pela exclusão da etapa/temporada. */
  exclusaoEmCascata?: ID
}

async function comContexto<T>(req: PayloadRequest, contexto: ContextoCompeticao | undefined, fn: () => Promise<T>) {
  if (!contexto) return fn()
  const anterior = req.context
  try {
    return await fn()
  } finally {
    req.context = anterior
  }
}

export async function buscar<T>(
  req: PayloadRequest,
  slug: SlugCompeticao,
  opcoes: { where?: Where; sort?: Sort; limit?: number; depth?: number } = {},
): Promise<T[]> {
  const resultado = await req.payload.find({
    collection: colecao(slug),
    where: opcoes.where,
    sort: opcoes.sort,
    limit: opcoes.limit ?? 0,
    pagination: false,
    depth: opcoes.depth ?? 0,
    overrideAccess: true,
    req,
  })
  return resultado.docs as unknown as T[]
}

export async function buscarPrimeiro<T>(
  req: PayloadRequest,
  slug: SlugCompeticao,
  opcoes: { where?: Where; sort?: Sort; depth?: number } = {},
): Promise<T | null> {
  const resultado = await req.payload.find({
    collection: colecao(slug),
    where: opcoes.where,
    sort: opcoes.sort,
    limit: 1,
    depth: opcoes.depth ?? 0,
    overrideAccess: true,
    req,
  })
  return (resultado.docs[0] as unknown as T) ?? null
}

export async function buscarPorId<T>(
  req: PayloadRequest,
  slug: SlugCompeticao,
  id: ID | null | undefined,
  depth = 0,
): Promise<T | null> {
  if (id === null || id === undefined || id === '') return null
  const doc = await req.payload.findByID({
    collection: colecao(slug),
    id,
    depth,
    overrideAccess: true,
    disableErrors: true,
    req,
  })
  return (doc as unknown as T) ?? null
}

/** Conta documentos (aceita coleções de outras frentes, ex.: "noticias"). */
export async function contar(req: PayloadRequest, slug: SlugCompeticao | string, where: Where): Promise<number> {
  const { totalDocs } = await req.payload.count({ collection: colecao(slug), where, overrideAccess: true, req })
  return totalDocs
}

export async function criar<T>(
  req: PayloadRequest,
  slug: SlugCompeticao,
  data: Record<string, unknown>,
  contexto?: ContextoCompeticao,
): Promise<T> {
  return comContexto(req, contexto, async () => {
    const doc = await req.payload.create({
      collection: colecao(slug),
      data: data as never,
      depth: 0,
      overrideAccess: true,
      context: contexto,
      req,
    })
    return doc as unknown as T
  })
}

export async function atualizar<T>(
  req: PayloadRequest,
  slug: SlugCompeticao,
  id: ID,
  data: Record<string, unknown>,
  contexto?: ContextoCompeticao,
): Promise<T> {
  return comContexto(req, contexto, async () => {
    const doc = await req.payload.update({
      collection: colecao(slug),
      id,
      data: data as never,
      depth: 0,
      overrideAccess: true,
      context: contexto,
      req,
    })
    return doc as unknown as T
  })
}

export async function excluir(req: PayloadRequest, slug: SlugCompeticao, id: ID, contexto?: ContextoCompeticao) {
  return comContexto(req, contexto, () =>
    req.payload.delete({ collection: colecao(slug), id, overrideAccess: true, context: contexto, req }),
  )
}

/**
 * Grava campos derivados (título, texto de busca) direto no banco, sem rodar hooks nem validações
 * e sem criar versão. Usado para propagar renomeações (ex.: categoria renomeada → títulos das
 * corridas) sem esbarrar no congelamento de temporadas encerradas.
 */
export async function gravarDerivados(
  req: PayloadRequest,
  slug: SlugCompeticao,
  id: ID,
  data: Record<string, string | null>,
) {
  await req.payload.db.updateOne({ collection: colecao(slug), id, data, req, returning: false })
}

/**
 * Lê um global de outra frente sem quebrar se ele não existir na configuração.
 * (Confere antes, em vez de try/catch: um erro de banco dentro da transação a invalidaria.)
 */
export async function lerGlobal<T>(req: PayloadRequest, slug: string): Promise<T | null> {
  if (!req.payload.config.globals.some((g) => g.slug === slug)) return null
  const global = await req.payload.findGlobal({ slug: slug as GlobalSlug, depth: 0, overrideAccess: true, req })
  return (global as unknown as T) ?? null
}

/** A coleção existe na configuração? (para consultar vínculos de outras frentes com segurança) */
export const colecaoExiste = (req: PayloadRequest, slug: string) =>
  req.payload.config.collections.some((c) => c.slug === slug)

/** Cache por requisição para consultas repetidas (filtros de relacionamento, valores padrão). */
const caches = new WeakMap<object, Map<string, Promise<unknown>>>()

export function memo<T>(req: PayloadRequest, chave: string, fn: () => Promise<T>): Promise<T> {
  let cache = caches.get(req)
  if (!cache) {
    cache = new Map()
    caches.set(req, cache)
  }
  if (!cache.has(chave)) cache.set(chave, fn())
  return cache.get(chave) as Promise<T>
}
