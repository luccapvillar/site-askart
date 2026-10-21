'use client'
import { useRowLabel } from '@payloadcms/ui'
import { opcaoDaMensalidade, reaisOuAConfirmar, taxasDeAmbulancia, type PlanoGravado } from '@/lib/taxas'

/**
 * Título de cada plano da mensalidade da taxa de pista, com o total que o site vai mostrar:
 * "4 taxas de ambulância · R$ 520,00 sem desconto · R$ 450,00 com desconto".
 */
export function RotuloPlano() {
  const { data, rowNumber } = useRowLabel<PlanoGravado>()
  const quantidade = typeof data?.ambulanciasIncluidas === 'number' ? data.ambulanciasIncluidas : null
  if (!quantidade) return <span>{`Plano ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`}</span>
  const sem = opcaoDaMensalidade(data?.semDesconto)
  const com = opcaoDaMensalidade(data?.comDesconto)
  const partes = [
    taxasDeAmbulancia(quantidade),
    sem ? `${reaisOuAConfirmar(sem.total)} sem desconto` : null,
    com ? `${reaisOuAConfirmar(com.total)} com desconto` : null,
  ].filter(Boolean)
  return <span>{partes.join(' · ')}</span>
}

/** Título de cada regra da mensalidade: o próprio texto (cortado se for longo). */
export function RotuloRegra() {
  const { data, rowNumber } = useRowLabel<{ texto?: string | null }>()
  const texto = data?.texto?.trim()
  if (!texto) return <span>{`Regra ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`}</span>
  return <span>{texto.length > 70 ? `${texto.slice(0, 68).trimEnd()}…` : texto}</span>
}
