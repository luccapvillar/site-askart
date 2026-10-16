/** Peças das rotas /previa e /previa/sair (só no servidor). */
import config from '@payload-config'
import { getPayload } from 'payload'
import { getSafeRedirect } from 'payload/shared'
import { ehEditorOuAdmin } from '@/access'

/**
 * Caminho interno seguro para redirecionar ("/kartodromo", "/etapas/3?x=1#topo").
 * Qualquer coisa que não seja um caminho do próprio site (URL externa, "//outro.site", "/\\…",
 * "javascript:") vira "/". A própria rota de prévia também vira "/" (evita voltas).
 */
export function caminhoSeguro(valor: string | null | undefined): string {
  const seguro = getSafeRedirect({ redirectTo: valor ?? '/', fallbackTo: '/' })
  let url: URL
  try {
    url = new URL(seguro, 'http://local.invalido')
  } catch {
    return '/'
  }
  if (url.origin !== 'http://local.invalido') return '/'
  if (url.pathname === '/previa' || url.pathname.startsWith('/previa/')) return '/'
  return `${url.pathname}${url.search}${url.hash}`
}

export type SituacaoPainel = 'sem-login' | 'sem-permissao' | 'ok'

/** Quem está pedindo a prévia: precisa estar logado no painel como administrador ou editor. */
export async function situacaoNoPainel(headers: Headers): Promise<SituacaoPainel> {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers })
    if (!user) return 'sem-login'
    return ehEditorOuAdmin(user) ? 'ok' : 'sem-permissao'
  } catch {
    return 'sem-login'
  }
}

/** Página curta para quem não pode ver a prévia (colaborador ou usuário desativado). */
export function respostaSemPermissao(): Response {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Pré-visualização indisponível</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f6f2;color:#141714;font:16px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif;padding:16px}main{max-width:32rem}h1{font-size:1.25rem;margin:0 0 .5rem}a{color:#2c6332;font-weight:600}a:focus-visible{outline:3px solid #141714;outline-offset:2px}</style></head>
<body><main><h1>Pré-visualização indisponível</h1><p>A pré-visualização das alterações é para administradores e editores do painel. Peça a um deles para conferir e publicar.</p><p><a href="/admin">Voltar ao painel</a> · <a href="/">Ir para o site</a></p></main></body></html>`
  return new Response(html, { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}
