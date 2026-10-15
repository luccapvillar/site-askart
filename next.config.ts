import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

/** Cabeçalhos de segurança (docs/ARQUITETURA.md §8). */
const SEGURANCA = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
]

/**
 * Seções fixas que vivem dentro das 4 abas (BKS · Kartódromo · Notícias · Contato).
 * Links antigos ou digitados continuam funcionando.
 */
const ATALHOS: [string, string][] = [
  ['/calendario', '/bks'],
  ['/campeonatos', '/bks'],
  ['/classificacao', '/bks/classificacao'],
  ['/resultados', '/bks/resultados'],
  ['/historico', '/bks/historia'],
  ['/estatisticas', '/bks/historia'],
  ['/galeria', '/bks/fotos'],
  ['/documentos', '/bks/regulamento'],
  ['/regulamento', '/bks/regulamento'],
  ['/pilotos', '/bks/classificacao'],
  ['/categorias', '/bks/classificacao'],
  ['/treinos', '/kartodromo#treinos'],
  ['/comunicados', '/noticias'],
  ['/eventos', '/noticias'],
  ['/busca', '/noticias'],
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:caminho*', headers: SEGURANCA }]
  },
  async redirects() {
    return ATALHOS.map(([source, destination]) => ({ source, destination, permanent: false }))
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
