import type { Midia } from '@/payload-types'
import { semDemo } from './TextoDemo'

type Tamanho = 'miniatura' | 'card' | 'destaque'
const LARGURAS: Record<Tamanho, number> = { miniatura: 400, card: 800, destaque: 1600 }

/** Variações geradas pelo painel (WebP) + original, para o navegador escolher a menor que serve. */
export function fontesDaFoto(midia: Midia, ate: Tamanho = 'destaque') {
  const ordem: Tamanho[] = ['miniatura', 'card', 'destaque']
  const fontes = ordem
    .slice(0, ordem.indexOf(ate) + 1)
    .map((t) => midia.sizes?.[t])
    .filter((v): v is NonNullable<typeof v> => Boolean(v?.url && v.width))
    .filter((v, i, todas) => todas.findIndex((o) => o.width === v.width) === i)
    .map((v) => `${v.url} ${v.width}w`)
  const maior = midia.sizes?.[ate]?.url ? midia.sizes[ate] : null
  return {
    src: maior?.url || midia.url || '',
    srcSet: fontes.length ? fontes.join(', ') : undefined,
    largura: maior?.width ?? midia.width ?? undefined,
    altura: maior?.height ?? midia.height ?? undefined,
  }
}

type Props = {
  midia: Midia | number | null | undefined
  ate?: Tamanho
  sizes?: string
  prioridade?: boolean
  className?: string
  alt?: string
  /** Mostra o crédito do fotógrafo sobre a foto. */
  credito?: boolean
}

/** Foto da Mídia com srcset, dimensões (sem salto de layout) e crédito do autor. */
export function Foto({ midia, ate = 'destaque', sizes = '100vw', prioridade, className, alt, credito }: Props) {
  if (!midia || typeof midia !== 'object' || !midia.url) return null
  const f = fontesDaFoto(midia, ate)
  const imagem = (
    <img
      className={credito ? undefined : className}
      src={f.src}
      srcSet={f.srcSet}
      sizes={f.srcSet ? sizes : undefined}
      width={f.largura ?? undefined}
      height={f.altura ?? undefined}
      alt={alt ?? semDemo(midia.alt) ?? ''}
      loading={prioridade ? 'eager' : 'lazy'}
      fetchPriority={prioridade ? 'high' : undefined}
      decoding={prioridade ? 'sync' : 'async'}
      style={{ objectPosition: `${midia.focalX ?? 50}% ${midia.focalY ?? 50}%` }}
    />
  )
  if (!credito || !midia.credito) return imagem
  return (
    <figure className={className} style={{ position: 'relative', margin: 0 }}>
      {imagem}
      <figcaption className="credito-foto">Foto: {midia.credito}</figcaption>
    </figure>
  )
}

/** Mesma foto no formato dos cartões (src/components/site/Cartoes). */
export function imagemDoCartao(midia: unknown) {
  if (!midia || typeof midia !== 'object') return null
  const m = midia as Midia
  if (!m.url) return null
  const f = fontesDaFoto(m, 'card')
  return { url: f.src, alt: semDemo(m.alt) || '', largura: f.largura, altura: f.altura }
}
