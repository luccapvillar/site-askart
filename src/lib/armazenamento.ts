/**
 * Fotos e documentos no Vercel Blob pelo acesso novo da Vercel (BLOB_STORE_ID + token automático), que o
 * plugin oficial do Payload ainda não entende (ele exige BLOB_READ_WRITE_TOKEN). Vale para lojas públicas e
 * privadas: os arquivos passam pelo próprio site (/api/<coleção>/file/<nome>), com cache longo na CDN.
 */
import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import type { Adapter } from '@payloadcms/plugin-cloud-storage/types'
import { getStorageFilePath } from '@payloadcms/plugin-cloud-storage/utilities'
import { BlobAccessError, BlobError, BlobNotFoundError, del, get, head, put } from '@vercel/blob'
import type { Config, Plugin } from 'payload'
import { isXmlMimeType, UPLOAD_CONTENT_SECURITY_POLICY } from 'payload/internal'

type Acesso = 'public' | 'private'
/** Descoberto na primeira gravação: a Vercel recusa o modo errado. */
let acessoDaLoja: Acesso | undefined

async function gravar(caminho: string, dados: Buffer, contentType: string) {
  let erro: unknown
  for (const access of acessoDaLoja ? [acessoDaLoja] : (['public', 'private'] as const)) {
    try {
      await put(caminho, dados, {
        access,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType,
        cacheControlMaxAge: 31536000,
      })
      acessoDaLoja = access
      return
    } catch (e) {
      erro = e
      if (!(
        e instanceof BlobAccessError ||
        (e instanceof BlobError && /access|private|public/i.test(e.message))
      ))
        throw e
    }
  }
  throw erro
}

const adaptador: Adapter = ({ collection, prefix = '' }) => ({
  name: 'vercel-blob-oidc',
  generateURL: ({ filename }) => `/api/${collection.slug}/file/${encodeURIComponent(filename)}`,
  handleUpload: async ({ data, file: { buffer, mimeType }, storageFilePath }) => {
    await gravar(storageFilePath, buffer, mimeType)
    return data
  },
  handleDelete: async ({ storageFilePath }) => {
    await del(storageFilePath).catch((e) => {
      if (!(e instanceof BlobNotFoundError)) throw e
    })
  },
  staticHandler: async (req, { doc, headers, params: { clientUploadContext, filename } }) => {
    try {
      const caminho = await getStorageFilePath({
        clientUploadContext,
        collection,
        collectionPrefix: prefix,
        doc,
        filename,
        req,
      })
      const meta = await head(caminho)
      const saida = new Headers(headers)
      saida.set('Content-Type', meta.contentType)
      saida.set('Content-Disposition', meta.contentDisposition)
      saida.set('ETag', `"${meta.etag}"`)
      // Navegador guarda por um dia; a CDN da Vercel guarda até a próxima publicação
      saida.set('Cache-Control', 'public, max-age=86400, s-maxage=31536000')
      if (isXmlMimeType(meta.contentType))
        saida.set('Content-Security-Policy', UPLOAD_CONTENT_SECURITY_POLICY)
      if (req.headers.get('if-none-match') === `"${meta.etag}"`)
        return new Response(null, { headers: saida, status: 304 })
      const privada = new URL(meta.url).hostname.includes('.private.')
      const corpo = privada
        ? (await get(meta.url, { access: 'private' }))?.stream
        : (await fetch(meta.url)).body
      if (!corpo) return new Response(null, { status: 404 })
      return new Response(corpo, { headers: saida })
    } catch (e) {
      if (e instanceof BlobNotFoundError) return new Response(null, { status: 404 })
      req.payload.logger.error({ err: e, msg: 'Falha ao ler arquivo do Blob' })
      return new Response('Não foi possível abrir o arquivo.', { status: 500 })
    }
  },
})

/** Liga o Blob às coleções (sem gravar no disco, que na Vercel é só leitura). */
export const blobPorOidc =
  (slugs: string[]): Plugin =>
  (config: Config) =>
    cloudStoragePlugin({
      // Mesmos campos no banco que o plugin oficial cria (prefix, _objectKey)
      alwaysInsertFields: true,
      collections: Object.fromEntries(slugs.map((s) => [s, { adapter: adaptador }])),
    })({
      ...config,
      collections: config.collections?.map((c) =>
        slugs.includes(c.slug)
          ? {
              ...c,
              upload: {
                ...(typeof c.upload === 'object' ? c.upload : {}),
                disableLocalStorage: true,
              },
            }
          : c,
      ),
    })
