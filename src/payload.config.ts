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
import { endpointsAssistente } from './lib/assistente/endpoints'
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

// Com domínio oficial: endereço fixo e lista de origens. Sem ele (prévia), endereços relativos.
const origens = env.URL_OFICIAL ? [env.URL_OFICIAL, ...env.URLS_EXTRAS] : []

export default buildConfig({
  ...(env.URL_OFICIAL ? { serverURL: env.URL_OFICIAL, csrf: origens, cors: origens } : {}),
  admin: {
    user: 'usuarios',
    importMap: { baseDir: path.resolve(dirname) },
    dateFormat: 'dd/MM/yyyy HH:mm',
    timezones: {
      defaultTimezone: 'America/Sao_Paulo',
      supportedTimezones: [{ label: 'Brasília', value: 'America/Sao_Paulo' }],
    },
    meta: { titleSuffix: ' — Painel ASKART' },
    components: {
      beforeDashboard: ['/components/admin/PainelInicial#PainelInicial'],
      graphics: { Logo: '/components/admin/Marca#Logo', Icon: '/components/admin/Marca#Icone' },
      beforeNavLinks: ['/components/admin/assistente/LinkAssistente#LinkAssistente'],
      views: {
        assistente: { Component: '/components/admin/assistente/VisaoAssistente#VisaoAssistente', path: '/assistente' },
      },
    },
  },
  i18n: { supportedLanguages: { pt }, fallbackLanguage: 'pt' },
  collections: [...colecoesCompeticao, ...colecoesKartodromo, ...colecoesConteudo, ...colecoesAdmin].map(comEfeitos),
  globals: globais.map(globalComEfeitos),
  endpoints: endpointsAssistente,
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
      // Fotos são públicas: o endereço aponta direto para o Blob (mais rápido). Documentos passam pelo controle de acesso.
      collections: { midia: { disablePayloadAccessControl: true }, documentos: true },
      token: env.BLOB_READ_WRITE_TOKEN,
      // Mesmos campos no banco com e sem Blob (sem isto a migração local não cria `_object_key` e tudo quebra na Vercel)
      alwaysInsertFields: true,
      // Com sufixo aleatório o adaptador troca o nome do original pelo da última variação gravada
      addRandomSuffix: false,
      clientUploads: true,
    }),
  ],
})
