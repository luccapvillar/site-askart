/**
 * Atualização do site depois de uma mudança no painel.
 *
 * Qualquer gravação no painel expira o cache do site (etiqueta `site` e as páginas geradas);
 * a próxima visita já vê o conteúdo novo. Salvar rascunho (inclusive o autosalvamento) não conta:
 * o site só muda ao publicar (src/lib/previa/rascunho.ts). A expiração roda
 * depois da resposta (`after`), quando a gravação já foi confirmada no banco. Fora do Next (scripts
 * de carga e testes) não há cache para limpar e nada acontece.
 */
import { revalidatePath, revalidateTag } from 'next/cache'
import { after } from 'next/server'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  PayloadRequest,
} from 'payload'
import { gravouSoRascunho } from './previa/rascunho'

export const TAG_SITE = 'site'

function expirar() {
  try {
    revalidateTag(TAG_SITE, { expire: 0 })
    // Páginas geradas (ISR): todas são refeitas na próxima visita
    revalidatePath('/', 'layout')
  } catch {
    // Fora de uma requisição do Next (scripts): não há cache
  }
}

// Uma expiração por requisição basta (ela vale para o site inteiro), mesmo com várias gravações
const agendadas = new WeakSet<object>()

export function revalidarSite(req?: Pick<PayloadRequest, 'context'>) {
  if (req?.context?.semRevalidar) return
  if (req) {
    if (agendadas.has(req)) return
    agendadas.add(req)
  }
  try {
    after(expirar)
  } catch {
    expirar()
  }
}

export const revalidarAposGravar: CollectionAfterChangeHook = async ({ doc, previousDoc, req, collection }) => {
  if (!(await gravouSoRascunho({ doc, previousDoc, req, colecao: collection.slug }))) revalidarSite(req)
  return doc
}

export const revalidarAposExcluir: CollectionAfterDeleteHook = ({ doc, req }) => {
  revalidarSite(req)
  return doc
}

export const revalidarGlobal: GlobalAfterChangeHook = async ({ doc, previousDoc, req, global }) => {
  if (!(await gravouSoRascunho({ doc, previousDoc, req, global: global.slug }))) revalidarSite(req)
  return doc
}
