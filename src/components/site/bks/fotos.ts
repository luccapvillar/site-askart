/**
 * Fotos do BKS para a aba (topo, "Venha assistir", faixa de fotos): o banner do campeonato e as fotos das
 * galerias ligadas a ele, sem repetir e sem vídeos. Tudo vem da Mídia (fotos recebidas do cliente e fotos de
 * uso livre com crédito); nenhuma foto externa é carregada.
 */
import { cache } from 'react'
import { comoDoc, lerBks, lerGalerias } from '@/lib/publico'
import type { Galeria, Midia } from '@/payload-types'

const ehFoto = (m: Midia | null | undefined): m is Midia => Boolean(m?.url) && !String(m?.mimeType ?? '').startsWith('video/')

/** Galerias do campeonato principal (as mais recentes primeiro). */
export const galeriasDoBks = cache(async (limite = 24): Promise<Galeria[]> => {
  const bks = await lerBks()
  if (!bks) return []
  return lerGalerias({ campeonato: { equals: bks.campeonato.id } }, limite)
})

/** Banner do campeonato + capa e fotos das galerias do BKS, sem repetir. */
export const fotosDoBks = cache(async (): Promise<Midia[]> => {
  const [bks, galerias] = await Promise.all([lerBks(), galeriasDoBks()])
  const todas: Midia[] = []
  const vistos = new Set<number>()
  const somar = (m: unknown) => {
    const midia = comoDoc<Midia>(m)
    if (!ehFoto(midia) || vistos.has(midia.id)) return
    vistos.add(midia.id)
    todas.push(midia)
  }
  somar(bks?.campeonato.banner)
  for (const g of galerias) {
    somar(g.capa)
    for (const f of g.fotos ?? []) somar(f)
  }
  return todas
})

/** Foto de capa de uma galeria: a escolhida no painel ou a primeira foto. */
export function capaDaGaleria(g: Pick<Galeria, 'capa' | 'fotos'>): Midia | null {
  const capa = comoDoc<Midia>(g.capa)
  if (ehFoto(capa)) return capa
  return (g.fotos ?? []).map((f) => comoDoc<Midia>(f)).find(ehFoto) ?? null
}
