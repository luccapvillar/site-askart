import type { MetadataRoute } from 'next'
import { env } from '@/env'
import { lerTodosParaMapa } from '@/lib/publico'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.SERVER_URL
  const fixas = ['', '/bks', '/bks/classificacao', '/bks/resultados', '/bks/historia', '/bks/fotos', '/bks/regulamento', '/kartodromo', '/noticias', '/avisos', '/contato', '/sobre']
  const { noticias, paginas, etapas } = await lerTodosParaMapa()
  return [
    ...fixas.map((c) => ({ url: `${base}${c}`, changeFrequency: 'weekly' as const })),
    ...etapas.map((e) => ({ url: `${base}/etapas/${e.id}`, lastModified: e.updatedAt })),
    ...noticias.filter((n) => n.slug).map((n) => ({ url: `${base}/noticias/${n.slug}`, lastModified: n.updatedAt })),
    ...paginas.filter((p) => p.slug).map((p) => ({ url: `${base}/${p.slug}`, lastModified: p.updatedAt })),
  ]
}
