import type { ReactNode } from 'react'
import s from './Selo.module.css'

export type TomSelo = 'ok' | 'atencao' | 'perigo' | 'info' | 'neutro' | 'marca'

/** Etiqueta de status (etapa, treino, aviso, provisório…). A cor nunca é a única informação: sempre há texto. */
export function Selo({ tom = 'neutro', children, ponto = true }: { tom?: TomSelo; children: ReactNode; ponto?: boolean }) {
  return (
    <span className={`${s.selo} ${s[tom]}`}>
      {ponto && <span className={s.ponto} aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Mapas de status → (rótulo, tom) usados em todo o site. */
export const STATUS_ETAPA: Record<string, [string, TomSelo]> = {
  agendada: ['Agendada', 'info'],
  confirmada: ['Confirmada', 'ok'],
  adiada: ['Adiada', 'atencao'],
  cancelada: ['Cancelada', 'perigo'],
  realizada: ['Realizada', 'neutro'],
}

export const STATUS_TREINO: Record<string, [string, TomSelo]> = {
  liberado: ['Liberado', 'ok'],
  extra: ['Horário extra', 'info'],
  lotado: ['Lotado', 'atencao'],
  bloqueado: ['Bloqueado', 'perigo'],
  cancelado: ['Cancelado', 'perigo'],
}

export const NIVEL_AVISO: Record<string, [string, TomSelo]> = {
  informativo: ['Informativo', 'info'],
  atencao: ['Atenção', 'atencao'],
  urgente: ['Urgente', 'perigo'],
}
