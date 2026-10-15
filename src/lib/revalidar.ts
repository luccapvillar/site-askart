/**
 * Atualização do site depois de uma mudança no painel.
 *
 * Todas as leituras do site público usam a etiqueta de cache `site` (src/lib/publico.ts). Qualquer
 * gravação no painel expira essa etiqueta; a próxima visita já vê o conteúdo novo. A expiração roda
 * depois da resposta (`after`), quando a gravação já foi confirmada no banco. Fora do Next (scripts
 * de carga e testes) não há cache para limpar e nada acontece.
 */
import { revalidateTag } from 'next/cache'
import { after } from 'next/server'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  PayloadRequest,
} from 'payload'

export const TAG_SITE = 'site'

function expirar() {
  try {
    revalidateTag(TAG_SITE, { expire: 0 })
  } catch {
    // Fora de uma requisição do Next (scripts): não há cache
  }
}

export function revalidarSite(req?: Pick<PayloadRequest, 'context'>) {
  if (req?.context?.semRevalidar) return
  try {
    after(expirar)
  } catch {
    expirar()
  }
}

export const revalidarAposGravar: CollectionAfterChangeHook = ({ doc, req }) => {
  revalidarSite(req)
  return doc
}

export const revalidarAposExcluir: CollectionAfterDeleteHook = ({ doc, req }) => {
  revalidarSite(req)
  return doc
}

export const revalidarGlobal: GlobalAfterChangeHook = ({ doc, req }) => {
  revalidarSite(req)
  return doc
}
