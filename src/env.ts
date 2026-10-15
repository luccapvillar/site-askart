/**
 * Variáveis de ambiente, conferidas na inicialização. Uma falta aqui derruba o servidor com uma
 * mensagem clara, em vez de um erro confuso no meio do uso.
 */
const producao = process.env.NODE_ENV === 'production'
const fase = process.env.NEXT_PHASE ?? ''

function exigir(nome: string, valor: string | undefined, regra?: (v: string) => string | null): string {
  if (!valor) throw new Error(`Configuração ausente: defina a variável de ambiente ${nome} (veja .env.example).`)
  const problema = regra?.(valor)
  if (problema) throw new Error(`Configuração inválida em ${nome}: ${problema}`)
  return valor
}

const urlDoServidor = () => {
  const explicita = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '')
  if (explicita) return explicita
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}

export const env = {
  producao,
  emBuild: fase === 'phase-production-build',
  DATABASE_URL: exigir('DATABASE_URL', process.env.DATABASE_URL || process.env.POSTGRES_URL),
  PAYLOAD_SECRET: exigir('PAYLOAD_SECRET', process.env.PAYLOAD_SECRET, (v) =>
    producao && v.length < 32 ? 'use um segredo com pelo menos 32 caracteres (ex.: openssl rand -hex 32).' : null,
  ),
  SERVER_URL: urlDoServidor(),
  /** Endereços extras liberados para o painel (ex.: o link de prévia da Vercel). */
  URLS_EXTRAS: [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .filter((u): u is string => Boolean(u))
    .map((u) => `https://${u}`),
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
} as const
