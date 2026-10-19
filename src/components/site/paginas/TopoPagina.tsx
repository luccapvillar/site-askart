import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Midia } from '@/payload-types'
import { Foto } from '../Foto'
import { TituloSecao } from '../TituloSecao'
import s from './Paginas.module.css'

export type ItemTrilha = { rotulo: string; href?: string }

/**
 * Topo das páginas internas: trilha (opcional), sobretítulo, título, introdução, ações e foto grande
 * (opcional, com crédito). Sem foto, vira uma faixa escura institucional com a faixa do capacete.
 */
export function TopoPagina({
  rotulo,
  titulo,
  intro,
  foto,
  acoes,
  trilha,
  lateral,
}: {
  rotulo?: string
  titulo: ReactNode
  intro?: ReactNode
  foto?: Midia | null
  acoes?: ReactNode
  /** "Você está aqui": ex. [{ rotulo: 'BKS', href: '/bks' }, { rotulo: 'Classificação' }]. O início é incluído sozinho. */
  trilha?: ItemTrilha[]
  /** Conteúdo à direita no computador (ex.: cartão com a próxima data). */
  lateral?: ReactNode
}) {
  const comFoto = Boolean(foto && typeof foto === 'object' && foto.url)
  return (
    <section className={`${s.topo} ${comFoto ? s.comFoto : ''}`} aria-labelledby="titulo-pagina">
      {comFoto && <Foto midia={foto} className={s.topoFoto} prioridade sizes="100vw" alt="" />}
      <div className={`conteiner ${s.topoConteudo} ${lateral ? s.topoComLateral : ''}`}>
        <div className={s.topoTextos}>
          {trilha && trilha.length > 0 && <Trilha itens={trilha} />}
          {rotulo && <p className={`rotulo ${s.topoRotulo}`}>{rotulo}</p>}
          <h1 id="titulo-pagina" className="titulo-marca h1">
            {titulo}
          </h1>
          {intro && <div className={s.intro}>{intro}</div>}
          {acoes && <div className={s.acoes}>{acoes}</div>}
        </div>
        {lateral && <div className={s.lateral}>{lateral}</div>}
      </div>
      {comFoto && foto?.credito && <p className={s.creditoTopo}>Foto: {foto.credito}</p>}
      <div className={`faixa-marca ${s.topoFaixa}`} aria-hidden="true" />
    </section>
  )
}

/** Trilha de navegação ("Início › BKS › Classificação"). */
export function Trilha({ itens }: { itens: ItemTrilha[] }) {
  const todos: ItemTrilha[] = [{ rotulo: 'Início', href: '/' }, ...itens]
  return (
    <nav className={s.trilha} aria-label="Você está aqui">
      <ol>
        {todos.map((i, n) => {
          const ultimo = n === todos.length - 1
          return (
            <li key={`${i.rotulo}-${n}`}>
              {i.href && !ultimo ? <Link href={i.href}>{i.rotulo}</Link> : <span aria-current={ultimo ? 'page' : undefined}>{i.rotulo}</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Navegação interna da página (âncoras para as seções), fixa logo abaixo do cabeçalho. */
export function Sumario({ itens }: { itens: { id: string; rotulo: string }[] }) {
  if (itens.length < 2) return null
  return (
    <nav className={s.sumario} aria-label="Nesta página">
      <ul className="conteiner">
        {itens.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`}>{i.rotulo}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

type Fundo = 'papel' | 'branco' | 'tinta' | 'escuro'

/** Seção de página com título e conteúdo. `branca` é o atalho antigo de `fundo="branco"`. */
export function Secao({
  id,
  titulo,
  rotulo,
  children,
  branca = false,
  acao,
  fundo,
  intro,
  ampla = false,
}: {
  id: string
  titulo: ReactNode
  rotulo?: string
  children: ReactNode
  branca?: boolean
  acao?: ReactNode
  fundo?: Fundo
  /** Parágrafo de apoio logo abaixo do título. */
  intro?: string | null
  /** Mais respiro (seções principais da página). */
  ampla?: boolean
}) {
  const cor = fundo ?? (branca ? 'branco' : 'papel')
  const classeFundo = cor === 'escuro' ? 'escuro' : `fundo-${cor}`
  return (
    <section id={id} className={`${ampla ? 'secao' : 'secao-compacta'} ${classeFundo} ${s.secao}`} aria-labelledby={`${id}-titulo`}>
      <div className="conteiner">
        <TituloSecao id={`${id}-titulo`} rotulo={rotulo} titulo={titulo} subtitulo={intro} acao={acao} />
        {children}
      </div>
    </section>
  )
}
