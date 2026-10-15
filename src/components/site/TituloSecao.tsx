import type { ReactNode } from 'react'
import { Quadriculado } from './Quadriculado'
import s from './TituloSecao.module.css'

type Props = {
  rotulo?: string
  titulo: ReactNode
  subtitulo?: string | null
  acao?: ReactNode
  nivel?: 1 | 2
  id?: string
}

/** Cabeçalho de seção: rótulo com a faixa quadriculada, título em itálico largo (como a logo) e ação opcional. */
export function TituloSecao({ rotulo, titulo, subtitulo, acao, nivel = 2, id }: Props) {
  const H = nivel === 1 ? 'h1' : 'h2'
  return (
    <div className={s.cabeca}>
      <div className={s.textos}>
        {rotulo && (
          <p className={`rotulo ${s.rotulo}`}>
            <Quadriculado className={s.quadriculado} />
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
