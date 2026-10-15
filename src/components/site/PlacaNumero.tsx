import { fundoLegivel } from '@/lib/site'
import s from './PlacaNumero.module.css'

/** Escolhe texto preto ou branco conforme a luminância da cor de fundo (contraste AA). */
export function corDeTexto(hex?: string | null) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return undefined
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return l > 0.36 ? '#111111' : '#ffffff'
}

/** Placa com o número do kart. A cor é a da categoria (definida no painel). */
export function PlacaNumero({ numero, cor, tamanho = 'm' }: { numero?: string | number | null; cor?: string | null; tamanho?: 'p' | 'm' | 'g' }) {
  if (numero === undefined || numero === null || numero === '') return null
  const legivel = cor && /^#[0-9a-f]{6}$/i.test(cor) ? fundoLegivel(cor) : null
  const estilo = legivel ? ({ '--cor': legivel.fundo, '--texto-placa': legivel.texto } as React.CSSProperties) : undefined
  return (
    <span className={`${s.placa} ${s[tamanho]}`} style={estilo} aria-label={`Número ${numero}`}>
      <span>{numero}</span>
    </span>
  )
}
