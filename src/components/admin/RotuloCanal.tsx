'use client'
import { useRowLabel } from '@payloadcms/ui'

const TIPOS: Record<string, string> = { whatsapp: 'WhatsApp', telefone: 'Telefone', email: 'E-mail', outro: 'Outro' }

/** Título de cada linha da lista de canais: "WhatsApp · Secretaria · +55 61 …". */
export function RotuloCanal() {
  const { data, rowNumber } = useRowLabel<{ tipo?: string; rotulo?: string; valor?: string; provisorio?: boolean }>()
  const partes = [TIPOS[data?.tipo ?? ''] ?? 'Canal', data?.rotulo, data?.valor].filter(Boolean)
  const texto = partes.length > 1 ? partes.join(' · ') : `Canal ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`
  return <span>{data?.provisorio ? `${texto} (provisório)` : texto}</span>
}
