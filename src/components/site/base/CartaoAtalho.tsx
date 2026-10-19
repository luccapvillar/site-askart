import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Midia } from '@/payload-types'
import { Foto } from '../Foto'
import s from './Base.module.css'

type Props = {
  href: string
  titulo: ReactNode
  texto?: ReactNode
  /** Sobretítulo pequeno (ex.: "Campeonato", "Treinos"). */
  rotulo?: string
  foto?: Midia | number | null
  /** Texto da ação no pé do cartão. */
  acao?: string
  externo?: boolean
  nivel?: 2 | 3
  /** Conteúdo extra no corpo (ex.: <Subcategorias />). */
  children?: ReactNode
}

/**
 * Cartão de atalho para uma área do site (BKS, Kartódromo, Karts indoor…): foto grande opcional,
 * título, texto curto e ação. O cartão inteiro é clicável pelo link do título.
 */
export function CartaoAtalho({ href, titulo, texto, rotulo, foto, acao = 'Acessar', externo, nivel = 3, children }: Props) {
  const midia = foto && typeof foto === 'object' && foto.url ? foto : null
  const H = nivel === 2 ? 'h2' : 'h3'
  const novaAba = externo || /^https?:/.test(href)
  const link = novaAba ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {titulo}
      <span className="visualmente-oculto"> (abre em nova aba)</span>
    </a>
  ) : href.startsWith('/') ? (
    <Link href={href}>{titulo}</Link>
  ) : (
    <a href={href}>{titulo}</a>
  )
  return (
    <article className={`${s.atalho} ${midia ? '' : s.atalhoSemFoto}`}>
      {midia && (
        <div className={s.atalhoMidia}>
          <Foto midia={midia} ate="card" sizes="(min-width: 1040px) 400px, (min-width: 720px) 50vw, 100vw" alt="" />
        </div>
      )}
      <div className={s.atalhoCorpo}>
        {rotulo && <p className={`rotulo ${s.atalhoRotulo}`}>{rotulo}</p>}
        <H className={`h3 ${s.atalhoTitulo}`}>{link}</H>
        {texto && <div className={s.atalhoTexto}>{texto}</div>}
        {children}
        <span className={s.atalhoAcao} aria-hidden="true">
          {acao} <span className={s.atalhoSeta}>{novaAba ? '↗' : '→'}</span>
        </span>
      </div>
    </article>
  )
}
