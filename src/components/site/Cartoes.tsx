import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { Quadriculado } from './Quadriculado'
import { Selo, STATUS_ETAPA } from './Selo'
import s from './Cartoes.module.css'

export type Imagem = { url: string; alt: string; largura?: number | null; altura?: number | null } | null | undefined

export function GradeCartoes({ children, min = 300 }: { children: ReactNode; min?: number }) {
  return (
    <div className={s.grade} style={{ '--min': `${min}px` } as CSSProperties}>
      {children}
    </div>
  )
}

function Midia({ imagem }: { imagem: Imagem }) {
  return (
    <div className={s.midia}>
      {imagem?.url ? (
        <img src={imagem.url} alt={imagem.alt} loading="lazy" decoding="async" width={imagem.largura ?? undefined} height={imagem.altura ?? undefined} />
      ) : (
        <div className={s.semImagem} aria-hidden="true">
          <Quadriculado colunas={6} linhas={2} tamanho={8} />
        </div>
      )}
    </div>
  )
}

/** Cartão de notícia (lista e "Notícias da semana"). */
export function CartaoNoticia({ href, titulo, resumo, data, categoria, imagem }: { href: string; titulo: string; resumo?: string | null; data: string; categoria?: string | null; imagem?: Imagem }) {
  return (
    <article className={s.cartao}>
      <Midia imagem={imagem} />
      <div className={s.corpo}>
        <p className={s.meta}>
          <time>{data}</time>
          {categoria && <Selo tom="marca">{categoria}</Selo>}
        </p>
        <h3 className={`h3 ${s.titulo}`}>
          <Link href={href}>{titulo}</Link>
        </h3>
        {resumo && <p className={s.resumo}>{resumo}</p>}
        <span className={s.ler} aria-hidden="true">
          Ler notícia →
        </span>
      </div>
    </article>
  )
}

/** Cartão de etapa do calendário: data em bloco escuro, nome, local, categorias e status. */
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
    <article className={`${s.cartao} ${s.etapa} ${status === 'cancelada' ? s.cancelada : ''}`}>
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
        {categorias && categorias.length > 0 && <p className={s.meta}>{categorias.join(' · ')}</p>}
      </div>
    </article>
  )
}
