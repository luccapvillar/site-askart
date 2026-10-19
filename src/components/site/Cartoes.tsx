import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { Selo, STATUS_ETAPA } from './Selo'
import s from './Cartoes.module.css'

export type Imagem = { url: string; alt: string; largura?: number | null; altura?: number | null } | null | undefined

/** Grade responsiva de cartões: quantas colunas couberem com largura mínima `min` (px). */
export function GradeCartoes({ children, min = 300 }: { children: ReactNode; min?: number }) {
  return (
    <div className={s.grade} style={{ '--min': `${min}px` } as CSSProperties}>
      {children}
    </div>
  )
}

/** Foto do cartão; sem foto, um bloco verde neutro com a faixa do capacete (nada de padrão quadriculado). */
export function MidiaCartao({ imagem, proporcao }: { imagem: Imagem; proporcao?: string }) {
  return (
    <div className={s.midia} style={proporcao ? { aspectRatio: proporcao } : undefined}>
      {imagem?.url ? (
        <img src={imagem.url} alt={imagem.alt} loading="lazy" decoding="async" width={imagem.largura ?? undefined} height={imagem.altura ?? undefined} />
      ) : (
        <div className={s.semImagem} aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="m4 17 5-4.5 3.5 3 3-2.5L20 17" />
          </svg>
        </div>
      )}
    </div>
  )
}

/** Cartão de notícia (lista e "Notícias da semana"). O cartão inteiro é clicável pelo link do título. */
export function CartaoNoticia({ href, titulo, resumo, data, categoria, imagem }: { href: string; titulo: string; resumo?: string | null; data: string; categoria?: string | null; imagem?: Imagem }) {
  return (
    <article className={`${s.cartao} ${s.clicavel}`}>
      <MidiaCartao imagem={imagem} />
      <div className={s.corpo}>
        <p className={s.meta}>
          {categoria && <Selo tom="marca">{categoria}</Selo>}
          <time>{data}</time>
        </p>
        <h3 className={`h3 ${s.titulo}`}>
          <Link href={href}>{titulo}</Link>
        </h3>
        {resumo && <p className={s.resumo}>{resumo}</p>}
        <span className={s.ler} aria-hidden="true">
          Ler notícia <span className={s.seta}>→</span>
        </span>
      </div>
    </article>
  )
}

/** Cartão de etapa do calendário: data em bloco, nome, local, categorias e status. */
export function CartaoEtapa({
  href,
  nome,
  dia,
  mes,
  semana,
  horario,
  local,
  categorias,
  status,
}: {
  href: string
  nome: string
  dia: string
  mes: string
  semana: string
  horario?: string | null
  local?: string | null
  categorias?: string[]
  status: string
}) {
  const [rotulo, tom] = STATUS_ETAPA[status] ?? [status, 'neutro']
  return (
    <article className={`${s.cartao} ${s.clicavel} ${s.etapa} ${status === 'cancelada' ? s.cancelada : ''}`}>
      <div className={s.data} aria-hidden="true">
        <span className={s.dia}>{dia}</span>
        <span className={s.mes}>{mes}</span>
        <span className={s.semana}>{semana}</span>
      </div>
      <div className={s.corpo}>
        <p className={s.meta}>
          <Selo tom={tom}>{rotulo}</Selo>
          {horario && <span>{horario}</span>}
        </p>
        <h3 className={`h3 ${s.titulo}`}>
          <Link href={href}>{nome}</Link>
        </h3>
        {local && <p className="texto-2">{local}</p>}
        {categorias && categorias.length > 0 && <p className={s.categorias}>{categorias.join(' · ')}</p>}
      </div>
      <span className={s.irEtapa} aria-hidden="true" />
    </article>
  )
}
