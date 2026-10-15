import type { FotoGaleria } from '@/components/site/Galeria'
import { fontesDaFoto } from '@/components/site/Foto'
import { semDemo } from '@/components/site/TextoDemo'
import type { Galeria, Midia } from '@/payload-types'

/** Fotos de uma galeria no formato do componente Galeria (miniatura + versão grande + crédito). */
export function fotosDaGaleria(galeria: Pick<Galeria, 'fotos'>): FotoGaleria[] {
  return (galeria.fotos ?? [])
    .filter((f): f is Midia => typeof f === 'object' && f !== null && Boolean(f.url) && !String(f.mimeType ?? '').startsWith('video/'))
    .map((f) => {
      const pequena = fontesDaFoto(f, 'card')
      const grande = fontesDaFoto(f, 'destaque')
      return {
        id: f.id,
        miniatura: pequena.src,
        grande: grande.src,
        largura: pequena.largura,
        altura: pequena.altura,
        alt: semDemo(f.alt) || '',
        legenda: f.legenda,
        credito: f.credito,
      }
    })
}
