/**
 * O que pode ser pré-visualizado e onde aparece no site.
 * Sem dependências do servidor: o painel (componentes de cliente) também usa.
 */

export type AlvoPrevia = {
  tipo: 'colecao' | 'global'
  slug: string
  /** Nome para o moderador. */
  rotulo: string
  /** Páginas do site onde o conteúdo aparece (a primeira é a principal). */
  rotas: string[]
}

/** Seções principais do site (menu, rodapé e textos das seções aparecem em todas). */
export const ROTAS_SITE = ['/', '/kartodromo', '/bks', '/noticias', '/avisos', '/contato', '/sobre']

export const ALVOS_PREVIA: AlvoPrevia[] = [
  // Globais (partes únicas do site)
  { tipo: 'global', slug: 'pagina-inicial', rotulo: 'Página inicial', rotas: ['/'] },
  { tipo: 'global', slug: 'kartodromo', rotulo: 'Kartódromo', rotas: ['/kartodromo'] },
  { tipo: 'global', slug: 'contato', rotulo: 'Contato e redes sociais', rotas: ['/contato'] },
  { tipo: 'global', slug: 'institucional', rotulo: 'Sobre a ASKART', rotas: ['/sobre'] },
  { tipo: 'global', slug: 'textos-paginas', rotulo: 'Textos das seções', rotas: ROTAS_SITE },
  { tipo: 'global', slug: 'navegacao', rotulo: 'Menu e rodapé', rotas: ROTAS_SITE },
  // Coleções
  { tipo: 'colecao', slug: 'etapas', rotulo: 'Etapas', rotas: ['/bks'] },
  { tipo: 'colecao', slug: 'noticias', rotulo: 'Notícias', rotas: ['/noticias', '/'] },
  { tipo: 'colecao', slug: 'avisos', rotulo: 'Avisos', rotas: ['/avisos'] },
  { tipo: 'colecao', slug: 'paginas', rotulo: 'Páginas', rotas: [] },
  { tipo: 'colecao', slug: 'perguntas', rotulo: 'Perguntas frequentes', rotas: ['/kartodromo', '/bks', '/contato'] },
  { tipo: 'colecao', slug: 'galerias', rotulo: 'Galerias de fotos', rotas: ['/bks/fotos'] },
  { tipo: 'colecao', slug: 'documentos', rotulo: 'Documentos', rotas: ['/bks/regulamento'] },
  { tipo: 'colecao', slug: 'banners', rotulo: 'Banners', rotas: [] },
  { tipo: 'colecao', slug: 'eventos', rotulo: 'Eventos', rotas: [] },
]

export const alvoPrevia = (tipo: AlvoPrevia['tipo'], slug: string): AlvoPrevia | undefined =>
  ALVOS_PREVIA.find((a) => a.tipo === tipo && a.slug === slug)

const PAGINA_DA_SECAO: Record<string, string> = { kartodromo: '/kartodromo', bks: '/bks', geral: '/contato' }

const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? encodeURIComponent(v.trim()) : null)
const ident = (v: unknown) => (typeof v === 'number' || (typeof v === 'string' && v.trim()) ? encodeURIComponent(String(v)) : null)

/**
 * Página do site que mostra o documento (ou a página principal da coleção/global).
 * `null` quando o conteúdo não aparece em nenhuma página.
 */
export function rotaDoDoc(slug: string, doc: { id?: number | string; slug?: string | null; secao?: string | null }): string | null {
  const alvo = ALVOS_PREVIA.find((a) => a.slug === slug)
  const principal = alvo?.rotas[0] ?? null
  const id = ident(doc?.id)
  const endereco = texto(doc?.slug)
  switch (slug) {
    case 'etapas':
      return id ? `/etapas/${id}` : principal
    case 'noticias':
      return endereco ? `/noticias/${endereco}` : principal
    case 'avisos':
      return id ? `/avisos/${id}` : principal
    case 'paginas':
      return endereco ? `/${endereco}` : null
    case 'galerias':
      return endereco ? `/galeria/${endereco}` : principal
    case 'perguntas':
      return (doc?.secao && PAGINA_DA_SECAO[doc.secao]) || principal
    default:
      return principal
  }
}

/** Endereço do item no painel. */
export function urlAdmin(tipo: 'colecao' | 'global', slug: string, id?: number | string): string {
  if (tipo === 'global') return `/admin/globals/${slug}`
  return id !== undefined && id !== null && id !== '' ? `/admin/collections/${slug}/${id}` : `/admin/collections/${slug}`
}
