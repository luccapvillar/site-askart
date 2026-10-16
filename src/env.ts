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

/** Lê a variável pelo nome ou com prefixo (a Vercel às vezes cria, por exemplo, STORAGE_DATABASE_URL). */
const ler = (...nomes: string[]) => {
  for (const nome of nomes) {
    const chave = Object.keys(process.env).find((k) => (k === nome || k.endsWith(`_${nome}`)) && process.env[k])
    if (chave) return process.env[chave]
  }
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
  DATABASE_URL: exigir('DATABASE_URL', ler('DATABASE_URL', 'POSTGRES_URL')),
  PAYLOAD_SECRET: exigir('PAYLOAD_SECRET', process.env.PAYLOAD_SECRET, (v) =>
    producao && v.length < 32 ? 'use um segredo com pelo menos 32 caracteres (ex.: openssl rand -hex 32).' : null,
  ),
  SERVER_URL: urlDoServidor(),
  /**
   * Endereço oficial definido à mão (domínio próprio). Só com ele o painel restringe os cookies a uma
   * lista de origens; sem ele (prévia na Vercel, que abre o mesmo site por vários endereços *.vercel.app)
   * vale a proteção do cookie SameSite=Lax e o painel funciona em qualquer endereço do projeto.
   */
  URL_OFICIAL: process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '') || null,
  /** Endereços extras liberados para o painel (ex.: o link de prévia da Vercel). */
  URLS_EXTRAS: [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .filter((u): u is string => Boolean(u))
    .map((u) => `https://${u}`),
  BLOB_READ_WRITE_TOKEN:
    ler('BLOB_READ_WRITE_TOKEN') || Object.values(process.env).find((v) => v?.startsWith('vercel_blob_rw_')) || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
} as const
