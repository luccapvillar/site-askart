/**
 * Liga a pré-visualização: GET /previa?caminho=/kartodromo
 * Só para administrador ou editor logado no painel. Liga o modo de prévia do Next (cookie próprio,
 * que faz o site ler as últimas versões, inclusive rascunhos) e leva ao caminho pedido do próprio site.
 */
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { caminhoSeguro, respostaSemPermissao, situacaoNoPainel } from '@/lib/previa/servidor'

export async function GET(request: Request) {
  const caminho = caminhoSeguro(new URL(request.url).searchParams.get('caminho'))
  const situacao = await situacaoNoPainel(request.headers)
  if (situacao === 'sem-login') {
    redirect(`/admin/login?redirect=${encodeURIComponent(`/previa?caminho=${encodeURIComponent(caminho)}`)}`)
  }
  if (situacao === 'sem-permissao') return respostaSemPermissao()
  ;(await draftMode()).enable()
  redirect(caminho)
}
