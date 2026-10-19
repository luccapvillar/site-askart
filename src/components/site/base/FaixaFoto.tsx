import type { ReactNode } from 'react'
import type { Midia } from '@/payload-types'
import { Foto } from '../Foto'
import s from './Base.module.css'

type Props = {
  /** id do título (para aria-labelledby e âncoras). */
  id: string
  foto?: Midia | number | null
  rotulo?: string
  titulo: ReactNode
  texto?: ReactNode
  /** Conteúdo extra abaixo do texto (lista, dados). */
  children?: ReactNode
  acoes?: ReactNode
  nivel?: 2 | 3
  /** Lado do bloco de texto no computador. */
  lado?: 'esquerda' | 'direita'
  /** Manchete em caixa alta (como no topo da página inicial). */
  display?: boolean
}

/**
 * Faixa de destaque com foto grande de fundo (largura toda) e texto por cima, com véu escuro para leitura.
 * Sem foto, vira uma faixa escura institucional. O crédito da foto aparece no canto.
 * Uso: "Venha assistir", chamadas do kartódromo, abertura de seções.
 */
export function FaixaFoto({ id, foto, rotulo, titulo, texto, children, acoes, nivel = 2, lado = 'esquerda', display = false }: Props) {
  const midia = foto && typeof foto === 'object' && foto.url ? foto : null
  const H = nivel === 3 ? 'h3' : 'h2'
  return (
    <section className={`${s.faixa} ${midia ? s.faixaComFoto : ''} ${lado === 'direita' ? s.faixaDireita : ''}`} aria-labelledby={id}>
      {midia && <Foto midia={midia} className={s.faixaFoto} sizes="100vw" alt="" />}
      <div className={`conteiner ${s.faixaConteudo}`}>
        <div className={s.faixaTextos}>
          {rotulo && <p className={`rotulo ${s.faixaRotulo}`}>{rotulo}</p>}
          <H id={id} className={display ? 'titulo-display' : 'titulo-marca h2'}>
            {titulo}
          </H>
          {texto && <div className={s.faixaTexto}>{texto}</div>}
          {children}
          {acoes && <div className="botoes">{acoes}</div>}
        </div>
      </div>
      {midia?.credito && <p className={s.faixaCredito}>Foto: {midia.credito}</p>}
    </section>
  )
}
