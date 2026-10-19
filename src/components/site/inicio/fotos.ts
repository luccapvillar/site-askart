/**
 * Escolha das fotos da página inicial. Todas vêm do painel (topo da página inicial, banner do campeonato,
 * foto do kartódromo e galerias); aqui só se evita repetir a mesma foto em dois blocos e usar, como fundo
 * largo, uma foto pequena ou em pé (ex.: a vista aérea em formato de story).
 */
import type { Galeria, Midia } from '@/payload-types'

const comoMidia = (v: unknown): Midia | null => {
  if (!v || typeof v !== 'object') return null
  const m = v as Midia
  if (!m.url || String(m.mimeType ?? '').startsWith('video/')) return null
  return m
}

/** Serve como foto larga (fundo de faixa, topo): deitada e com pelo menos 1200 px de largura. */
export const fotoLarga = (m: Midia | null): m is Midia =>
  Boolean(m && (m.width ?? 0) >= 1200 && (m.width ?? 0) > (m.height ?? 0) * 1.15)

/** Fotos das galerias, na ordem do painel, sem repetir. */
export function fotosDasGalerias(galerias: (Galeria | number | null | undefined)[]): Midia[] {
  const vistas = new Set<number>()
  const lista: Midia[] = []
  for (const g of galerias) {
    if (!g || typeof g !== 'object') continue
    for (const f of g.fotos ?? []) {
      const m = comoMidia(f)
      if (m && !vistas.has(m.id)) {
        vistas.add(m.id)
        lista.push(m)
      }
    }
  }
  return lista
}

/**
 * Distribui as fotos entre os blocos: cada bloco pega a primeira candidata larga que ainda não foi usada
 * (nem reservada, como as capas das notícias que aparecem na página).
 */
export function criarEscolha() {
  const usadas = new Set<number>()
  const escolher = (candidatas: unknown[], { largaObrigatoria = true } = {}): Midia | null => {
    const lista = candidatas.map(comoMidia).filter((m): m is Midia => m !== null)
    const escolhida =
      lista.find((m) => !usadas.has(m.id) && fotoLarga(m)) ?? (largaObrigatoria ? null : lista.find((m) => !usadas.has(m.id)) ?? null)
    if (escolhida) usadas.add(escolhida.id)
    return escolhida
  }
  const reservar = (fotos: unknown[]) => {
    for (const f of fotos) {
      const m = comoMidia(f)
      if (m) usadas.add(m.id)
    }
  }
  /** Ordem do mosaico: abre com uma foto larga ainda não mostrada; as pequenas (menos de 300 px) ficam de fora. */
  const mosaico = (fotos: Midia[]): Midia[] => {
    const boas = fotos.filter((m) => (m.width ?? 0) >= 300)
    const abertura = boas.find((m) => fotoLarga(m) && !usadas.has(m.id)) ?? boas.find((m) => fotoLarga(m))
    if (!abertura) return boas
    const resto = boas.filter((m) => m.id !== abertura.id)
    // Primeiro as que ainda não apareceram na página
    resto.sort((a, b) => Number(usadas.has(a.id)) - Number(usadas.has(b.id)))
    return [abertura, ...resto]
  }
  return { escolher, reservar, mosaico }
}
