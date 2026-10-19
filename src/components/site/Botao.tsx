import Link from 'next/link'
import type { ReactNode } from 'react'
import s from './Botao.module.css'

/**
 * primario  → verde da marca (ação principal em fundo claro)
 * destaque  → amarelo da placa (ação principal em fundo escuro ou sobre foto)
 * contorno  → borda na cor do texto (ação secundária, funciona no claro e no escuro)
 * secundario→ branco com borda (ação secundária em fundo claro)
 * claro     → branco cheio (ação sobre foto ou fundo escuro)
 * texto     → link com cara de ação, sem caixa
 */
type Variante = 'primario' | 'destaque' | 'contorno' | 'secundario' | 'claro' | 'texto'

type Props = {
  href?: string
  children: ReactNode
  variante?: Variante
  pequeno?: boolean
  /** Botão maior (topo de página, chamada principal). */
  grande?: boolean
  /** Ocupa a largura toda (útil no celular). */
  largo?: boolean
  seta?: boolean
  externo?: boolean
  type?: 'button' | 'submit'
  className?: string
}

const interno = (href: string) => href.startsWith('/') || href.startsWith('#')

/** Botão/link padrão. Links externos abrem em nova aba com rel seguro e avisam o leitor de tela. */
export function Botao({ href, children, variante = 'primario', pequeno, grande, largo, seta, externo, type = 'button', className }: Props) {
  const classe = [s.botao, s[variante], pequeno && s.pequeno, grande && s.grande, largo && s.largo, className].filter(Boolean).join(' ')
  const novaAba = Boolean(href && (externo || /^https?:/.test(href)))
  const conteudo = (
    <>
      <span className={s.conteudo}>{children}</span>
      {seta && (
        <span className={s.seta} aria-hidden="true">
          {novaAba ? '↗' : '→'}
        </span>
      )}
      {novaAba && <span className="visualmente-oculto"> (abre em nova aba)</span>}
    </>
  )
  if (!href)
    return (
      <button type={type} className={classe}>
        {conteudo}
      </button>
    )
  if (novaAba)
    return (
      <a href={href} className={classe} target="_blank" rel="noopener noreferrer">
        {conteudo}
      </a>
    )
  if (!interno(href))
    return (
      <a href={href} className={classe}>
        {conteudo}
      </a>
    )
  return (
    <Link href={href} className={classe}>
      {conteudo}
    </Link>
  )
}
