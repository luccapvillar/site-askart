/** Páginas do site oferecidas na pré-visualização do painel e utilitários de caminho. Sem dependências do servidor. */

export const PAGINAS = [
  { rotulo: 'Início', rota: '/' },
  { rotulo: 'BKS', rota: '/bks' },
  { rotulo: 'Kartódromo', rota: '/kartodromo' },
  { rotulo: 'Avisos', rota: '/avisos' },
  { rotulo: 'Notícias', rota: '/noticias' },
  { rotulo: 'Contato', rota: '/contato' },
] as const

/**
 * Caminho de uma página do site a partir do que o moderador digitou ou do que o site mandou.
 * Aceita o endereço completo do próprio site. Devolve null para endereços fora do site (painel, API, outro domínio).
 */
export function limparCaminho(valor: unknown, origem?: string): string | null {
  if (typeof valor !== 'string') return null
  let v = valor.trim()
  if (!v) return null
  if (origem && v.startsWith(origem)) v = v.slice(origem.length) || '/'
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null
  if (!v.startsWith('/')) v = `/${v}`
  if (v.startsWith('//') || v.includes('\\')) return null
  if (/^\/(admin|api|previa|_next)(\/|\?|#|$)/.test(v)) return null
  return v.length > 1 ? v.replace(/\/+(?=[?#]|$)/, '') || '/' : v
}

/** Só o caminho (sem ?busca, #âncora e barra no fim), para comparar com as rotas conhecidas. */
export function semBusca(caminho: string): string {
  const v = caminho.split(/[?#]/)[0] || '/'
  return v.length > 1 ? v.replace(/\/+$/, '') || '/' : v
}

/** Endereço que abre a página do site em modo de pré-visualização. */
export const urlPrevia = (rota: string) => `/previa?caminho=${encodeURIComponent(rota)}`

/** Nome da página para o moderador ("Kartódromo"); se não for uma das principais, o próprio caminho. */
export function nomeDaRota(rota: string): string {
  const limpo = semBusca(rota)
  return PAGINAS.find((p) => p.rota === limpo)?.rotulo ?? limpo
}
