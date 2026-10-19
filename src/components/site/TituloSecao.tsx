import type { ReactNode } from 'react'
import s from './TituloSecao.module.css'

type Props = {
  rotulo?: string
  titulo: ReactNode
  subtitulo?: string | null
  acao?: ReactNode
  nivel?: 1 | 2
  id?: string
  /** Centraliza (chamadas curtas, como "Venha assistir"). */
  centro?: boolean
}

/** Cabeçalho de seção: sobretítulo com a marca do capacete, título forte, subtítulo e ação opcional. */
export function TituloSecao({ rotulo, titulo, subtitulo, acao, nivel = 2, id, centro = false }: Props) {
  const H = nivel === 1 ? 'h1' : 'h2'
  return (
    <div className={`${s.cabeca} ${centro ? s.centro : ''}`}>
      <div className={s.textos}>
        {rotulo && (
          <p className={`rotulo ${s.rotulo}`}>
            <span className={s.marcador} aria-hidden="true" />
            {rotulo}
          </p>
        )}
        <H id={id} className={`titulo-marca ${nivel === 1 ? 'h1' : 'h2'}`}>
          {titulo}
        </H>
        {subtitulo && <p className={`${s.subtitulo} texto-2`}>{subtitulo}</p>}
      </div>
      {acao && <div className={s.acao}>{acao}</div>}
    </div>
  )
}
