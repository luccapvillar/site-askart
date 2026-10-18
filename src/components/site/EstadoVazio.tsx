import type { ReactNode } from 'react'
import s from './EstadoVazio.module.css'

/**
 * Estado vazio: aparece quando ainda não há dados oficiais publicados. O texto diz o que falta
 * (vem do painel, global "textos-paginas", ou de um padrão neutro); o ícone é só decorativo.
 */
export function EstadoVazio({ texto, acao }: { texto?: string | null; acao?: ReactNode }) {
  return (
    <div className={s.vazio} role="status">
      <svg
        className={s.icone}
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5.5" />
        <circle cx="12" cy="7.75" r="0.6" fill="currentColor" />
      </svg>
      <p className={s.texto}>
        {texto || 'As informações oficiais serão publicadas aqui em breve.'}
      </p>
      {acao}
    </div>
  )
}
