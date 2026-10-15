/**
 * Vídeo externo (YouTube ou Vimeo). Só esses dois são aceitos: o site monta o player (iframe) a partir
 * do id do vídeo, em vez de usar o endereço colado — assim nenhum código de terceiros entra no site.
 * Funções puras, usadas na validação dos campos e pelo site para montar o player.
 */
import type { Field } from 'payload'

export interface VideoExterno {
  plataforma: 'youtube' | 'vimeo'
  id: string
  /** Endereço do player para o <iframe> (YouTube sem cookies de rastreamento). */
  urlPlayer: string
}

const HOSTS_YOUTUBE = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'])
const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/

/** Lê um endereço de vídeo do YouTube/Vimeo. Devolve null se não for um deles. */
export function lerVideoExterno(endereco: unknown): VideoExterno | null {
  if (typeof endereco !== 'string' || !endereco.trim()) return null
  let url: URL
  try {
    url = new URL(endereco.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.toLowerCase()
  const partes = url.pathname.split('/').filter(Boolean)

  let idYoutube: string | null = null
  if (host === 'youtu.be') idYoutube = partes[0] ?? null
  else if (HOSTS_YOUTUBE.has(host)) {
    if (partes[0] === 'watch') idYoutube = url.searchParams.get('v')
    else if (['embed', 'shorts', 'live', 'v'].includes(partes[0] ?? '')) idYoutube = partes[1] ?? null
  }
  if (idYoutube && ID_YOUTUBE.test(idYoutube)) {
    return { plataforma: 'youtube', id: idYoutube, urlPlayer: `https://www.youtube-nocookie.com/embed/${idYoutube}` }
  }

  if (host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com') {
    // vimeo.com/123456789, vimeo.com/123456789/abcdef (não listado), vimeo.com/channels/x/123456789,
    // player.vimeo.com/video/123456789
    const indice = partes.findIndex((p) => /^\d{5,}$/.test(p))
    if (indice >= 0) {
      const id = partes[indice]
      const hashNaRota = partes[indice + 1]
      const hash = url.searchParams.get('h') ?? (hashNaRota && /^[0-9a-f]{6,}$/i.test(hashNaRota) ? hashNaRota : null)
      const sufixo = hash ? `?h=${encodeURIComponent(hash)}` : ''
      return { plataforma: 'vimeo', id, urlPlayer: `https://player.vimeo.com/video/${id}${sufixo}` }
    }
  }
  return null
}

export function validarVideoExterno(valor: unknown): string | true {
  if (valor === null || valor === undefined || valor === '') return true
  return lerVideoExterno(valor)
    ? true
    : 'Cole o endereço de um vídeo do YouTube ou do Vimeo (ex.: https://www.youtube.com/watch?v=… ou https://vimeo.com/…).'
}

/** Campo "Vídeo externo" (endereço do YouTube ou Vimeo). */
export const campoVideoExterno = (descricao: string, nome = 'videoExterno'): Field => ({
  name: nome,
  label: 'Vídeo externo (YouTube ou Vimeo)',
  type: 'text',
  validate: validarVideoExterno,
  hooks: { beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim() || null : value)] },
  admin: { description: descricao, placeholder: 'https://www.youtube.com/watch?v=' },
})
