/**
 * Pré-visualização ao vivo nativa do Payload (botão "Pré-visualizar ao vivo" na edição).
 * Vai em `admin.livePreview` do payload.config. O quadro abre /previa?caminho=<página do item>,
 * que liga o modo de prévia e mostra o site com o rascunho; a cada autosalvamento o Payload avisa
 * o quadro e o site recarrega os dados (src/components/site/previa/OuvintePrevia.tsx).
 */
import type { Config, PayloadRequest } from 'payload'
import { env } from '@/env'
import { rotaDoDoc } from './alvos'

type ConfigLivePreview = NonNullable<NonNullable<Config['admin']>['livePreview']>

/** Coleções com rascunho que aparecem em alguma página do site (banners e eventos não aparecem). */
const COLECOES = ['etapas', 'noticias', 'avisos', 'paginas', 'perguntas', 'galerias', 'documentos']
const GLOBAIS = ['pagina-inicial', 'kartodromo', 'contato', 'institucional', 'textos-paginas', 'navegacao']

/**
 * Origem do site como o navegador do moderador a vê (o Payload exige endereço completo para
 * conversar com o quadro). O painel e o site são o mesmo endereço.
 */
function origemDe(req: PayloadRequest): string {
  const cabecalhos = req.headers
  const host = cabecalhos?.get('x-forwarded-host')?.split(',')[0]?.trim() || cabecalhos?.get('host')
  if (host) {
    const protocolo =
      cabecalhos?.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
      (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? 'http' : 'https')
    return `${protocolo}://${host}`
  }
  return req.origin || env.SERVER_URL
}

export const livePreviewConfig: ConfigLivePreview = {
  collections: COLECOES,
  globals: GLOBAIS,
  breakpoints: [
    { name: 'celular', label: 'Celular', width: 390, height: 844 },
    { name: 'computador', label: 'Computador', width: 1366, height: 900 },
  ],
  url: ({ collectionConfig, globalConfig, data, req }) => {
    const slug = collectionConfig?.slug ?? globalConfig?.slug
    if (!slug) return null
    const rota = rotaDoDoc(slug, (data ?? {}) as { id?: number | string; slug?: string | null; secao?: string | null })
    if (!rota) return null
    return `${origemDe(req)}/previa?caminho=${encodeURIComponent(rota)}`
  },
}
