import type { ReactNode } from 'react'
import type { Midia } from '@/payload-types'
import { Foto } from '../Foto'
import s from './Paginas.module.css'

/** Topo das páginas internas: título, introdução e foto (opcional, com crédito). */
export function TopoPagina({
  rotulo,
  titulo,
  intro,
  foto,
  acoes,
}: {
  rotulo?: string
  titulo: ReactNode
  intro?: ReactNode
  foto?: Midia | null
  acoes?: ReactNode
}) {
  return (
    <section className={`${s.topo} ${foto ? s.comFoto : ''}`} aria-labelledby="titulo-pagina">
      {foto && <Foto midia={foto} className={s.topoFoto} prioridade sizes="100vw" alt="" />}
      <div className={`conteiner ${s.topoConteudo}`}>
        {rotulo && <p className="rotulo">{rotulo}</p>}
        <h1 id="titulo-pagina" className="titulo-marca h1">
          {titulo}
        </h1>
        {intro && <div className={s.intro}>{intro}</div>}
        {acoes && <div className={s.acoes}>{acoes}</div>}
      </div>
      {foto?.credito && <p className={s.creditoTopo}>Foto: {foto.credito}</p>}
    </section>
  )
}

/** Navegação interna da página (âncoras para as seções). */
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

/** Seção de página com título e conteúdo. */
export function Secao({ id, titulo, rotulo, children, branca = false, acao }: { id: string; titulo: ReactNode; rotulo?: string; children: ReactNode; branca?: boolean; acao?: ReactNode }) {
  return (
    <section id={id} className={`secao-compacta ${branca ? 'fundo-branco' : ''} ${s.secao}`} aria-labelledby={`${id}-titulo`}>
      <div className="conteiner">
        <div className={s.cabecaSecao}>
          <div>
            {rotulo && <p className={`rotulo ${s.rotuloSecao}`}>{rotulo}</p>}
            <h2 id={`${id}-titulo`} className="titulo-marca h2">
              {titulo}
            </h2>
          </div>
          {acao}
        </div>
        {children}
      </div>
    </section>
  )
}
