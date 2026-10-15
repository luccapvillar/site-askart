import type { MetadataRoute } from 'next'
import { env } from '@/env'
import { lerConfiguracoes } from '@/lib/publico'

export const revalidate = 3600

/** Prévia com dados de demonstração não entra no Google. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const config = await lerConfiguracoes()
  if (config.faixaDemonstracao) return { rules: { userAgent: '*', disallow: '/' } }
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] }, sitemap: `${env.SERVER_URL}/sitemap.xml` }
}
