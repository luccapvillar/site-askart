import Link from 'next/link'
import type { ReactNode } from 'react'
import s from './Botao.module.css'

type Variante = 'primario' | 'destaque' | 'contorno' | 'texto'

type Props = {
  href?: string
  children: ReactNode
  variante?: Variante
  pequeno?: boolean
  seta?: boolean
  externo?: boolean
  type?: 'button' | 'submit'
  className?: string
}

/** Botão/link padrão. Links externos abrem em nova aba com rel seguro. */
export function Botao({ href, children, variante = 'primario', pequeno, seta, externo, type = 'button', className }: Props) {
  const classe = [s.botao, variante !== 'primario' && s[variante], pequeno && s.pequeno, className].filter(Boolean).join(' ')
  const conteudo = (
    <>
      {children}
      {seta && (
        <span className={s.seta} aria-hidden="true">
          →
        </span>
      )}
    </>
  )
  if (!href)
    return (
      <button type={type} className={classe}>
        {conteudo}
      </button>
    )
  if (externo || /^https?:/.test(href))
    return (
      <a href={href} className={classe} target="_blank" rel="noopener noreferrer">
        {conteudo}
      </a>
    )
  return (
    <Link href={href} className={classe}>
      {conteudo}
    </Link>
  )
}
