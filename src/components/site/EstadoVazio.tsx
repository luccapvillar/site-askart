import type { ReactNode } from 'react'
import { Quadriculado } from './Quadriculado'
import s from './EstadoVazio.module.css'

/**
 * Estado vazio: aparece quando ainda não há dados oficiais publicados.
 * O texto vem do painel (global "textos-paginas"), com um padrão neutro.
 */
export function EstadoVazio({ texto, acao }: { texto?: string | null; acao?: ReactNode }) {
  return (
    <div className={s.vazio} role="status">
      <Quadriculado className={s.icone} colunas={4} linhas={2} tamanho={7} />
      <p className={s.texto}>{texto || 'As informações oficiais serão publicadas aqui em breve.'}</p>
      {acao}
    </div>
  )
}
