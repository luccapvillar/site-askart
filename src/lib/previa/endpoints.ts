/**
 * Rotas da pré-visualização (sob /api, só administrador e editor):
 *   GET  /api/previa/pendentes  — o que tem alteração ainda não publicada
 *   POST /api/previa/publicar   — publica (body { itens? }; sem itens = todos os pendentes)
 *   POST /api/previa/descartar  — volta à versão publicada (item novo, nunca publicado, é excluído)
 *
 * "Pendente" = a última versão é rascunho e o item está no ar (alteração por publicar) ou nunca foi
 * publicado (novo). Item que alguém tirou do ar de propósito ("Despublicar") não entra na lista.
 */
import type { CollectionSlug, Endpoint, GlobalSlug, PayloadRequest } from 'payload'
import { ehEditorOuAdmin } from '@/access'
import { registrarAtividade } from '@/collections/admin/Atividades'
import { ALVOS_PREVIA, alvoPrevia, rotaDoDoc, urlAdmin, type AlvoPrevia } from './alvos'
import { comContexto, temRascunho, type TipoAlvo } from './rascunho'

export type Pendente = {
  tipo: TipoAlvo
  slug: string
  id?: number
  titulo: string
  rotuloColecao: string
  atualizadoEm: string
  novo: boolean
  urlAdmin: string
  rota: string | null
}

export type ItemPrevia = { tipo: TipoAlvo; slug: string; id?: number }
export type ResultadoPrevia = { slug: string; id?: number; ok: boolean; mensagem: string }

type Doc = Record<string, unknown> & { id?: number | string; _status?: string | null; updatedAt?: string }

const LIMITE_POR_COLECAO = 200

const json = (dados: unknown, status = 200) => Response.json(dados, { status })

function barrar(req: PayloadRequest) {
  if (!req.user || !ehEditorOuAdmin(req.user)) {
    return json({ erro: 'Só o administrador e o editor publicam ou descartam alterações.' }, 403)
  }
  return null
}

const alvosComRascunho = (req: PayloadRequest) => ALVOS_PREVIA.filter((a) => temRascunho(req.payload, a.tipo, a.slug))

const textoDe = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 160) : null)

function tituloDoDoc(req: PayloadRequest, slug: string, doc: Doc): string {
  const config = req.payload.collections[slug as CollectionSlug]?.config
  const campo = config?.admin?.useAsTitle
  const singular = typeof config?.labels?.singular === 'string' ? config.labels.singular : 'Item'
  return (campo && textoDe(doc[campo])) || textoDe(doc.titulo) || textoDe(doc.nome) || `${singular} #${String(doc.id ?? '')}`
}

/** Mensagem legível de um erro do Payload (validação traz a lista de campos). */
function mensagemDoErro(erro: unknown): string {
  const e = erro as { message?: string; data?: { errors?: { message?: string; path?: string; label?: string }[] } }
  const campos = e.data?.errors?.map((x) => `${x.label || x.path ? `${x.label || x.path}: ` : ''}${x.message ?? ''}`).join('; ')
  if (campos) return `Não deu para gravar — ${campos}`
  return e.message || 'Não deu para gravar. Tente de novo.'
}

const vezesPublicado = async (req: PayloadRequest, slug: CollectionSlug, id: number | string) =>
  (
    await req.payload.countVersions({
      collection: slug,
      where: { and: [{ parent: { equals: id } }, { 'version._status': { equals: 'published' } }] },
      overrideAccess: true,
      req,
    })
  ).totalDocs

/* ───────────────────────────── pendentes ───────────────────────────── */

async function pendentesDaColecao(req: PayloadRequest, alvo: AlvoPrevia): Promise<Pendente[]> {
  const slug = alvo.slug as CollectionSlug
  // Últimas versões que são rascunho (a lixeira fica de fora)
  const { docs } = await req.payload.find({
    collection: slug,
    draft: true,
    overrideAccess: true,
    where: { _status: { equals: 'draft' } },
    sort: '-updatedAt',
    depth: 0,
    limit: LIMITE_POR_COLECAO,
    req,
  })
  const rascunhos = docs as unknown as Doc[]
  if (!rascunhos.length) return []
  const ids = rascunhos.map((d) => d.id).filter((id): id is number | string => id !== undefined)
  // Situação do item no ar (registro principal)
  const { docs: principais } = await req.payload.find({
    collection: slug,
    draft: false,
    overrideAccess: true,
    where: { id: { in: ids } },
    depth: 0,
    limit: ids.length,
    pagination: false,
    req,
  })
  const noAr = new Map((principais as unknown as Doc[]).map((p) => [String(p.id), p._status === 'published']))
  const lista: Pendente[] = []
  for (const doc of rascunhos) {
    if (doc.id === undefined) continue
    let novo = false
    if (!noAr.get(String(doc.id))) {
      // Fora do ar: entra só se nunca foi publicado (despublicado de propósito fica como está)
      if ((await vezesPublicado(req, slug, doc.id)) > 0) continue
      novo = true
    }
    lista.push({
      tipo: 'colecao',
      slug: alvo.slug,
      id: Number(doc.id),
      titulo: tituloDoDoc(req, alvo.slug, doc),
      rotuloColecao: alvo.rotulo,
      atualizadoEm: String(doc.updatedAt ?? ''),
      novo,
      urlAdmin: urlAdmin('colecao', alvo.slug, doc.id),
      rota: rotaDoDoc(alvo.slug, doc as { id?: number | string; slug?: string | null; secao?: string | null }),
    })
  }
  return lista
}

async function pendenteDoGlobal(req: PayloadRequest, alvo: AlvoPrevia): Promise<Pendente | null> {
  const slug = alvo.slug as GlobalSlug
  const { docs } = await req.payload.findGlobalVersions({ slug, sort: '-updatedAt', limit: 1, depth: 0, overrideAccess: true, req })
  const ultima = docs[0] as unknown as { updatedAt?: string; version?: Doc } | undefined
  if (!ultima || ultima.version?._status !== 'draft') return null
  const principal = (await req.payload.db.findGlobal({ slug, req })) as Doc | null
  let novo = false
  if (principal?._status !== 'published') {
    const { totalDocs } = await req.payload.countGlobalVersions({
      global: slug,
      where: { 'version._status': { equals: 'published' } },
      overrideAccess: true,
      req,
    })
    if (totalDocs > 0) return null
    novo = true
  }
  return {
    tipo: 'global',
    slug: alvo.slug,
    titulo: alvo.rotulo,
    rotuloColecao: 'Partes do site',
    atualizadoEm: String(ultima.updatedAt ?? ultima.version?.updatedAt ?? ''),
    novo,
    urlAdmin: urlAdmin('global', alvo.slug),
    rota: alvo.rotas[0] ?? null,
  }
}

export async function listarPendentes(req: PayloadRequest): Promise<Pendente[]> {
  const alvos = alvosComRascunho(req)
  const partes = await Promise.all(
    alvos.map(async (alvo) => {
      try {
        if (alvo.tipo === 'global') {
          const p = await pendenteDoGlobal(req, alvo)
          return p ? [p] : []
        }
        return await pendentesDaColecao(req, alvo)
      } catch (erro) {
        req.payload.logger.warn({ msg: `Pré-visualização: falha ao listar pendentes de ${alvo.slug}`, erro })
        return []
      }
    }),
  )
  return partes.flat().sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
}

/* ───────────────────────────── itens pedidos ───────────────────────────── */

async function itensDoPedido(req: PayloadRequest): Promise<ItemPrevia[] | null> {
  let corpo: { itens?: unknown } | undefined
  try {
    corpo = (await req.json?.()) as { itens?: unknown } | undefined
  } catch {
    corpo = undefined
  }
  if (!Array.isArray(corpo?.itens)) return null
  return corpo.itens
    .slice(0, 500)
    .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === 'object')
    .map((i) => ({
      tipo: i.tipo === 'global' ? 'global' : 'colecao',
      slug: String(i.slug ?? ''),
      id: i.id === undefined || i.id === null || i.id === '' ? undefined : Number(i.id),
    }))
}

/** Confere se o item pode passar pela prévia; devolve a mensagem de recusa ou null. */
function recusa(req: PayloadRequest, item: ItemPrevia): string | null {
  const alvo = alvoPrevia(item.tipo, item.slug)
  if (!alvo) return 'Este item não passa pela pré-visualização.'
  if (!temRascunho(req.payload, item.tipo, item.slug)) return 'Sem pré-visualização: confirme direto.'
  if (item.tipo === 'colecao' && (item.id === undefined || !Number.isFinite(item.id))) return 'Falta o número do item.'
  return null
}

async function processar(
  req: PayloadRequest,
  acao: (item: ItemPrevia) => Promise<string>,
): Promise<{ resultados: ResultadoPrevia[] }> {
  const pedidos = await itensDoPedido(req)
  const itens: ItemPrevia[] = pedidos ?? (await listarPendentes(req)).map(({ tipo, slug, id }) => ({ tipo, slug, id }))
  const resultados: ResultadoPrevia[] = []
  // Um de cada vez: cada gravação tem a própria transação; um erro não desfaz os outros
  for (const item of itens) {
    const base = { slug: item.slug, ...(item.tipo === 'colecao' ? { id: item.id } : {}) }
    const motivo = recusa(req, item)
    if (motivo) {
      resultados.push({ ...base, ok: false, mensagem: motivo })
      continue
    }
    try {
      resultados.push({ ...base, ok: true, mensagem: await acao(item) })
    } catch (erro) {
      resultados.push({ ...base, ok: false, mensagem: mensagemDoErro(erro) })
    }
  }
  return { resultados }
}

/* ───────────────────────────── publicar ───────────────────────────── */

async function publicar(req: PayloadRequest, item: ItemPrevia): Promise<string> {
  const comum = { overrideAccess: false, user: req.user, req, depth: 0 } as const
  if (item.tipo === 'global') {
    const slug = item.slug as GlobalSlug
    const atual = (await req.payload.findGlobal({ slug, draft: true, overrideAccess: true, depth: 0, req })) as Doc
    if (atual?._status !== 'draft') return 'Nada a publicar: já está no ar.'
    // Sem dados: o Payload completa com a última versão (o rascunho) e publica
    await req.payload.updateGlobal({ slug, data: { _status: 'published' } as never, draft: false, ...comum })
    return 'Publicado.'
  }
  const slug = item.slug as CollectionSlug
  const id = item.id as number
  const atual = (await req.payload.findByID({ collection: slug, id, draft: true, overrideAccess: true, depth: 0, disableErrors: true, req })) as Doc | null
  if (!atual) throw new Error('Item não encontrado (pode ter sido excluído).')
  if (atual._status !== 'draft') return 'Nada a publicar: já está no ar.'
  await req.payload.update({ collection: slug, id, data: { _status: 'published' } as never, draft: false, ...comum })
  return 'Publicado.'
}

/* ───────────────────────────── descartar ───────────────────────────── */

async function descartar(req: PayloadRequest, item: ItemPrevia): Promise<string> {
  const alvo = alvoPrevia(item.tipo, item.slug) as AlvoPrevia
  const comum = { overrideAccess: false, user: req.user, req, depth: 0 } as const

  if (item.tipo === 'global') {
    const slug = item.slug as GlobalSlug
    const atual = (await req.payload.findGlobal({ slug, draft: true, overrideAccess: true, depth: 0, req })) as Doc
    if (atual?._status !== 'draft') return 'Nada a descartar.'
    const { docs } = await req.payload.findGlobalVersions({
      slug,
      where: { 'version._status': { equals: 'published' } },
      sort: '-updatedAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (!docs[0]) throw new Error('Esta parte do site ainda não tem uma versão publicada para voltar.')
    // O registro "descartou" é feito abaixo; a restauração em si não entra como "publicou"
    await comContexto(req, { semRegistro: true }, () =>
      req.payload.restoreGlobalVersion({ slug, id: String(docs[0].id), ...comum }),
    )
    await registrarAtividade(req, { acao: 'alterou', onde: alvo.rotulo, colecao: slug, resumo: `Descartou as alterações não publicadas: ${alvo.rotulo}` })
    return 'Alterações descartadas: voltou à versão publicada.'
  }

  const slug = item.slug as CollectionSlug
  const id = item.id as number
  const atual = (await req.payload.findByID({ collection: slug, id, draft: true, overrideAccess: true, depth: 0, disableErrors: true, req })) as Doc | null
  if (!atual) throw new Error('Item não encontrado (pode ter sido excluído).')
  if (atual._status !== 'draft') return 'Nada a descartar.'
  const titulo = tituloDoDoc(req, item.slug, atual)
  const principal = (await req.payload.db.findOne({ collection: slug, where: { id: { equals: id } }, req })) as Doc | null

  if (principal?._status === 'published') {
    const { docs } = await req.payload.findVersions({
      collection: slug,
      where: { and: [{ parent: { equals: id } }, { 'version._status': { equals: 'published' } }] },
      sort: '-updatedAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (!docs[0]) throw new Error('Não achei a versão publicada deste item.')
    await comContexto(req, { semRegistro: true }, () =>
      req.payload.restoreVersion({ collection: slug, id: String(docs[0].id), ...comum }),
    )
    await registrarAtividade(req, { acao: 'alterou', onde: alvo.rotulo, colecao: slug, documento: String(id), resumo: `Descartou as alterações não publicadas: ${titulo}` })
    return 'Alterações descartadas: voltou à versão publicada.'
  }

  // Fora do ar: só exclui o que nunca foi publicado
  if ((await vezesPublicado(req, slug, id)) > 0) {
    throw new Error('Este item foi tirado do ar de propósito. Abra-o no painel para decidir o que fazer.')
  }
  await comContexto(req, { semRegistro: true }, () => req.payload.delete({ collection: slug, id, ...comum }))
  await registrarAtividade(req, { acao: 'excluiu', onde: alvo.rotulo, colecao: slug, documento: String(id), resumo: `Descartou o item novo (nunca publicado): ${titulo}` })
  return 'Item novo descartado (nunca tinha sido publicado).'
}

/* ───────────────────────────── rotas ───────────────────────────── */

export const endpointsPrevia: Endpoint[] = [
  {
    path: '/previa/pendentes',
    method: 'get',
    handler: async (req) => {
      const bloqueio = barrar(req)
      if (bloqueio) return bloqueio
      return json({ pendentes: await listarPendentes(req) })
    },
  },
  {
    path: '/previa/publicar',
    method: 'post',
    handler: async (req) => {
      const bloqueio = barrar(req)
      if (bloqueio) return bloqueio
      return json(await processar(req, (item) => publicar(req, item)))
    },
  },
  {
    path: '/previa/descartar',
    method: 'post',
    handler: async (req) => {
      const bloqueio = barrar(req)
      if (bloqueio) return bloqueio
      return json(await processar(req, (item) => descartar(req, item)))
    },
  },
]
