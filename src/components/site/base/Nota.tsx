import type { ReactNode } from 'react'
import s from './Base.module.css'

type Tom = 'info' | 'atencao' | 'ok' | 'perigo'

const ICONES: Record<Tom, ReactNode> = {
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.75" r="0.6" fill="currentColor" />
    </>
  ),
  atencao: (
    <>
      <path d="M12 3 2.5 20h19L12 3z" />
      <path d="M12 10v4.5M12 17.2v.3" />
    </>
  ),
  ok: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16.5 9.5" />
    </>
  ),
  perigo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.2v.3" />
    </>
  ),
}

/**
 * Nota/aviso dentro do conteúdo (ex.: "Valor ainda não informado", "Contato provisório", regras de acesso).
 * O título diz o tipo da nota em texto: a cor nunca é a única informação.
 */
export function Nota({ tom = 'info', titulo, children }: { tom?: Tom; titulo?: ReactNode; children: ReactNode }) {
  return (
    <div className={`${s.nota} ${s[`nota_${tom}`]}`} role="note">
      <svg className={s.notaIcone} aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONES[tom]}
      </svg>
      <div className={s.notaTextos}>
        {titulo && <p className={s.notaTitulo}>{titulo}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}
