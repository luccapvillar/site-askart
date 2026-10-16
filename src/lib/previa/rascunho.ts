/**
 * Rascunho x publicação, do lado do servidor (hooks, endpoints e assistente).
 *
 * Salvar rascunho (inclusive o autosalvamento) não muda o site: não atualiza páginas, não entra no
 * registro de atividades e não dispara efeitos. Só publicar (ou despublicar) conta.
 */
import type { CollectionSlug, GlobalSlug, Payload, PayloadRequest } from 'payload'

export type TipoAlvo = 'colecao' | 'global'

/** A coleção ou global tem rascunho ligado na configuração atual. */
export function temRascunho(payload: Payload, tipo: TipoAlvo, slug: string): boolean {
  if (tipo === 'colecao') return Boolean(payload.collections[slug as CollectionSlug]?.config.versions?.drafts)
  return Boolean(payload.config.globals.find((g) => g.slug === slug)?.versions?.drafts)
}

type ArgsGravacao = {
  doc: unknown
  previousDoc?: unknown
  req: PayloadRequest
  colecao?: string
  global?: string
}

type ComStatus = { _status?: unknown; id?: unknown }

// Um resultado por documento gravado: revalidação e registro perguntam a mesma coisa
const memoria = new WeakMap<object, Promise<boolean>>()

/**
 * Verdadeiro quando a gravação só salvou um rascunho (o site continua igual).
 *
 * O Payload 3 não passa o `draft` aos hooks `afterChange`; o que se vê é `doc._status === 'draft'`.
 * Isso também acontece ao "Despublicar" (que muda o site), então:
 *  - pelo painel/API REST o rascunho vem com `?draft=true` (despublicar nunca manda esse indicador);
 *  - pela API local, olhamos o registro principal: salvar rascunho não toca nele; despublicar troca o status.
 */
export function gravouSoRascunho(args: ArgsGravacao): Promise<boolean> {
  const doc = args.doc as ComStatus | null | undefined
  if (!doc || typeof doc !== 'object' || doc._status !== 'draft') return Promise.resolve(false)
  const salvo = memoria.get(doc)
  if (salvo) return salvo
  const resultado = verificar(args, doc)
  memoria.set(doc, resultado)
  return resultado
}

async function verificar({ previousDoc, req, colecao, global }: ArgsGravacao, doc: ComStatus): Promise<boolean> {
  const indicador = (req.query as Record<string, unknown> | undefined)?.draft
  if (indicador === true || indicador === 'true') return true
  try {
    const principal = (
      colecao && doc.id !== undefined
        ? await req.payload.db.findOne({ collection: colecao as CollectionSlug, where: { id: { equals: doc.id } }, req })
        : global
          ? await req.payload.db.findGlobal({ slug: global as GlobalSlug, req })
          : null
    ) as ComStatus | null
    // Publicado continua no ar: a gravação foi só um rascunho por cima
    if (principal?._status === 'published') return true
  } catch {
    // Na dúvida, trata como mudança visível (atualizar o site a mais não faz mal)
    return false
  }
  // Principal em rascunho: só mudou o site se antes estava publicado (despublicar)
  return (previousDoc as ComStatus | null | undefined)?._status !== 'published'
}

/** Roda `fn` com marcas extras no contexto da requisição, sem deixá-las para as operações seguintes. */
export async function comContexto<T>(req: PayloadRequest, extras: Record<string, unknown>, fn: () => Promise<T>): Promise<T> {
  const antes = req.context
  req.context = { ...(antes ?? {}), ...extras }
  try {
    return await fn()
  } finally {
    req.context = antes
  }
}
