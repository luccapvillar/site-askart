import { nivelSeguro, ROTULO_NIVEL } from './comum'
import s from './Avisos.module.css'

/** Ícone de cada nível (forma diferente, para não depender só da cor). */
function Icone({ nivel }: { nivel: 'informativo' | 'atencao' | 'urgente' }) {
  if (nivel === 'urgente') {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
        <path d="M5.2 1h5.6L15 5.2v5.6L10.8 15H5.2L1 10.8V5.2z" fill="currentColor" />
        <path d="M8 4.2v4.6M8 10.9v.9" stroke="var(--fundo-icone)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }
  if (nivel === 'atencao') {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
        <path d="M8 1.3 15.2 14H.8z" fill="currentColor" />
        <path d="M8 5.6v4M8 11.6v.6" stroke="var(--fundo-icone)" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <path d="M8 7.2v4.4M8 4.5v.5" stroke="var(--fundo-icone)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/** Etiqueta do nível do aviso: ícone + texto ("Informativo", "Atenção", "Urgente"), com contraste AA. */
export function SeloNivel({ nivel }: { nivel: string | null | undefined }) {
  const n = nivelSeguro(nivel)
  return (
    <span className={`${s.nivel} ${s[n]}`}>
      <Icone nivel={n} />
      {ROTULO_NIVEL[n]}
    </span>
  )
}
