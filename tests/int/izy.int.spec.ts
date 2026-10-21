import { describe, expect, it } from 'vitest'
import { IZY_PASS_BKS, situacaoDaEtapa } from '@/lib/site'

describe('link de compra da etapa', () => {
  const antes = new Date('2026-10-01T12:00:00-03:00')
  const etapa = { inicio: '2026-11-15T12:00:00.000Z', status: 'agendada' } as never

  it('sem link próprio, usa o link geral da IZY Pass', () => {
    expect(situacaoDaEtapa(etapa, antes, IZY_PASS_BKS).linkCompra).toBe(IZY_PASS_BKS)
  })
  it('link próprio da etapa vem antes do geral', () => {
    const propria = { ...(etapa as object), linkIngressos: 'https://izypass.com.br/evento/etapa-1' } as never
    expect(situacaoDaEtapa(propria, antes, IZY_PASS_BKS).linkCompra).toBe('https://izypass.com.br/evento/etapa-1')
  })
  it('depois da etapa, nenhum link de compra', () => {
    expect(situacaoDaEtapa(etapa, new Date('2026-12-01T12:00:00-03:00'), IZY_PASS_BKS).linkCompra).toBeNull()
  })
})
