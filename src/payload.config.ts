import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { pt } from '@payloadcms/translations/languages/pt'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { colecoesAdmin } from './collections/admin'
import { colecoesCompeticao } from './collections/competicao'
import { colecoesConteudo } from './collections/conteudo'
import { colecoesKartodromo } from './collections/kartodromo'
import { globais } from './globals'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
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
  collections: [...colecoesCompeticao, ...colecoesKartodromo, ...colecoesConteudo, ...colecoesAdmin],
  globals: globais,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  plugins: [],
})
