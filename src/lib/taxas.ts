/** Texto mostrado no lugar do valor enquanto a ASKART não informa o preço (pedido do cliente). */
export const VALOR_A_CONFIRMAR = 'R$ X'

export function valorDaTaxa(taxa: { valor?: number | null; aConfirmar?: boolean | null }): string {
  if (taxa.aConfirmar || taxa.valor === null || taxa.valor === undefined) return VALOR_A_CONFIRMAR
  return taxa.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
