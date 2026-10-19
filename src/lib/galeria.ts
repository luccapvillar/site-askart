import type { FotoGaleria } from '@/components/site/Galeria'
import { fontesDaFoto } from '@/components/site/Foto'
import { semDemo } from '@/components/site/TextoDemo'
import type { Galeria, Midia } from '@/payload-types'

/**
 * Fotos de uma galeria no formato do componente Galeria: miniatura (com as versões menores para o
 * navegador escolher), versão grande para a ampliação, texto alternativo, legenda e crédito.
 * Vídeos ficam de fora (a galeria é de fotos).
 */
export function fotosDaGaleria(galeria: Pick<Galeria, 'fotos'>): FotoGaleria[] {
  return (galeria.fotos ?? [])
    .filter((f): f is Midia => typeof f === 'object' && f !== null && Boolean(f.url) && !String(f.mimeType ?? '').startsWith('video/'))
    .map((f) => {
      const pequena = fontesDaFoto(f, 'card')
      const grande = fontesDaFoto(f, 'destaque')
      return {
        id: f.id,
        miniatura: pequena.src,
        miniaturaSrcSet: pequena.srcSet ?? null,
        grande: grande.src,
        grandeSrcSet: grande.srcSet ?? null,
        largura: pequena.largura,
        altura: pequena.altura,
        alt: semDemo(f.alt) || semDemo(f.legenda) || '',
        legenda: semDemo(f.legenda) || null,
        credito: f.credito?.trim() || null,
        foco: `${f.focalX ?? 50}% ${f.focalY ?? 50}%`,
      }
    })
}

/** Créditos das fotos (sem repetir), para a linha "Fotos: …" abaixo da galeria. */
export const creditosDasFotos = (fotos: Pick<FotoGaleria, 'credito'>[]) => [...new Set(fotos.map((f) => f.credito?.trim()).filter((c): c is string => Boolean(c)))]
