import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { pt } from '@payloadcms/translations/languages/pt'
import path from 'path'
import { buildConfig, type CollectionConfig, type GlobalConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { colecoesAdmin } from './collections/admin'
import { registrarExclusao, registrarGlobal, registrarMudanca } from './collections/admin/Atividades'
import { colecoesCompeticao } from './collections/competicao'
import { colecoesConteudo } from './collections/conteudo'
import { colecoesKartodromo } from './collections/kartodromo'
import { env } from './env'
import { globais } from './globals'
import { revalidarAposExcluir, revalidarAposGravar, revalidarGlobal } from './lib/revalidar'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const rotulo = (c: CollectionConfig) => {
  const plural = c.labels?.plural
  return typeof plural === 'string' ? plural : c.slug
}

/** Toda gravação atualiza o site e entra no registro de atividades (exceto o próprio registro). */
const comEfeitos = (c: CollectionConfig): CollectionConfig =>
  c.slug === 'atividades'
    ? c
    : {
        ...c,
        hooks: {
          ...c.hooks,
          afterChange: [...(c.hooks?.afterChange ?? []), revalidarAposGravar, registrarMudanca(rotulo(c))],
          afterDelete: [...(c.hooks?.afterDelete ?? []), revalidarAposExcluir, registrarExclusao(rotulo(c))],
        },
      }

const globalComEfeitos = (g: GlobalConfig): GlobalConfig => {
  const onde = typeof g.label === 'string' ? g.label : g.slug
  const depois = (g.hooks?.afterChange ?? []).filter((h) => h !== revalidarGlobal)
  return { ...g, hooks: { ...g.hooks, afterChange: [...depois, revalidarGlobal, registrarGlobal(onde)] } }
}

const origens = [env.SERVER_URL, ...env.URLS_EXTRAS]

export default buildConfig({
  serverURL: env.SERVER_URL,
  csrf: origens,
  cors: origens,
  admin: {
    user: 'usuarios',
    importMap: { baseDir: path.resolve(dirname) },
    dateFormat: 'dd/MM/yyyy HH:mm',
    timezones: {
      defaultTimezone: 'America/Sao_Paulo',
      supportedTimezones: [{ label: 'Brasília', value: 'America/Sao_Paulo' }],
    },
    meta: { titleSuffix: ' — Painel ASKART' },
  },
  i18n: { supportedLanguages: { pt }, fallbackLanguage: 'pt' },
  collections: [...colecoesCompeticao, ...colecoesKartodromo, ...colecoesConteudo, ...colecoesAdmin].map(comEfeitos),
  globals: globais.map(globalComEfeitos),
  editor: lexicalEditor(),
  secret: env.PAYLOAD_SECRET,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  defaultDepth: 1,
  maxDepth: 4,
  graphQL: { disablePlaygroundInProduction: true, maxComplexity: 300 },
  upload: { limits: { fileSize: 60 * 1024 * 1024 } },
  db: postgresAdapter({
    pool: { connectionString: env.DATABASE_URL, max: env.producao ? 5 : 10 },
    migrationDir: path.resolve(dirname, 'migrations'),
    push: false,
  }),
  sharp,
  plugins: [
    // Na Vercel, fotos e documentos ficam no Blob; localmente, numa pasta do projeto
    vercelBlobStorage({
      enabled: Boolean(env.BLOB_READ_WRITE_TOKEN),
      collections: { midia: true, documentos: true },
      token: env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
      clientUploads: true,
    }),
  ],
})
