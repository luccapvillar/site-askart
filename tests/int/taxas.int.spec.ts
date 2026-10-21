/**
 * Taxas do kartódromo: valores no formato brasileiro, total da mensalidade calculado (pista + ambulâncias) e a
 * atualização do site já publicado (dados de 21/10/2026), que nunca passa por cima do que o moderador mudou.
 */
import { describe, expect, it } from 'vitest'
import {
  formatarReais,
  opcaoDaMensalidade,
  planosDaMensalidade,
  PLANOS_MENSALIDADE_OFICIAIS,
  reaisOuAConfirmar,
  REGRAS_MENSALIDADE_OFICIAIS,
  somarReais,
  taxasDe2026,
  taxasDeAmbulancia,
  TEXTO_PASSO_TAXAS,
  TEXTO_PASSO_TAXAS_ANTIGO,
  VALOR_A_CONFIRMAR,
  valorDaTaxa,
} from '@/lib/taxas'

/** O pt-BR separa "R$" do número com espaço não separável: o teste compara com espaço comum. */
const texto = (v: string) => v.replace(/ /g, ' ')

describe('valores em reais', () => {
  it('formato brasileiro com centavos', () => {
    expect(texto(formatarReais(450))).toBe('R$ 450,00')
    expect(texto(formatarReais(80))).toBe('R$ 80,00')
    expect(texto(formatarReais(1234.5))).toBe('R$ 1.234,50')
    expect(texto(valorDaTaxa({ valor: 50, aConfirmar: false }))).toBe('R$ 50,00')
    expect(valorDaTaxa({ valor: 80, aConfirmar: true })).toBe(VALOR_A_CONFIRMAR)
    expect(reaisOuAConfirmar(null)).toBe(VALOR_A_CONFIRMAR)
  })

  it('soma sem erro de centavos', () => {
    expect(somarReais(0.1, 0.2)).toBe(0.3)
    expect(somarReais(320, 200)).toBe(520)
  })

  it('"taxa" no singular só com uma', () => {
    expect(taxasDeAmbulancia(1)).toBe('1 taxa de ambulância')
    expect(taxasDeAmbulancia(12)).toBe('12 taxas de ambulância')
  })
})

describe('mensalidade da taxa de pista', () => {
  it('o total de cada opção é pista + ambulâncias (os números do comunicado)', () => {
    const { planos, semDesconto, comDesconto } = planosDaMensalidade(PLANOS_MENSALIDADE_OFICIAIS.map((p) => ({ ...p })))
    expect(semDesconto && comDesconto).toBe(true)
    expect(planos.map((p) => [p.ambulanciasIncluidas, p.semDesconto?.total, p.comDesconto?.total])).toEqual([
      [4, 520, 450],
      [8, 720, 600],
      [12, 920, 750],
    ])
    expect(texto(reaisOuAConfirmar(planos[0].comDesconto!.total))).toBe('R$ 450,00')
  })

  it('falta de valor: sem nenhum, a opção não existe; com um só, o total fica "a confirmar"', () => {
    expect(opcaoDaMensalidade(null)).toBeNull()
    expect(opcaoDaMensalidade({ pista: null, ambulancias: undefined })).toBeNull()
    expect(opcaoDaMensalidade({ pista: 300 })).toEqual({ pista: 300, ambulancias: null, total: null })
    expect(opcaoDaMensalidade({ pista: 0, ambulancias: 150 })).toEqual({ pista: 0, ambulancias: 150, total: 150 })
  })

  it('plano sem quantidade ou sem valores fica de fora; coluna vazia não aparece', () => {
    const r = planosDaMensalidade([
      { id: 'a', ambulanciasIncluidas: 4, semDesconto: { pista: 320, ambulancias: 200 }, comDesconto: {} },
      { id: 'b', ambulanciasIncluidas: null, semDesconto: { pista: 320, ambulancias: 400 } },
      { id: 'c', ambulanciasIncluidas: 8, semDesconto: {}, comDesconto: null },
    ])
    expect(r.planos.map((p) => p.chave)).toEqual(['a'])
    expect(r.semDesconto).toBe(true)
    expect(r.comDesconto).toBe(false)
    expect(planosDaMensalidade(null).planos).toEqual([])
  })
})

type Taxa = { id: string; item: string; valor: number | null; aConfirmar: boolean; obrigatoria: boolean; observacao: string | null }

describe('atualização do site já publicado (21/10/2026)', () => {
  const original = () => ({
    taxas: <Taxa[]>[
      { id: '1', item: 'Taxa de ambulância', valor: 50, aConfirmar: false, obrigatoria: true, observacao: 'Por piloto, por dia de treino' },
      { id: '2', item: 'Taxa de pista', valor: null, aConfirmar: true, obrigatoria: true, observacao: null },
    ],
    mensalidadeIntroducao: null,
    mensalidadePlanos: [],
    mensalidadeRegras: [],
    comoTreinar: [
      { id: 'p1', titulo: 'Escolha o horário da sua turma', texto: 'Veja a grade.' },
      { id: 'p2', titulo: 'Pague as taxas na Administração', texto: TEXTO_PASSO_TAXAS_ANTIGO },
    ],
  })

  it('preenche o que ainda está no padrão: taxa de pista, mensalidade e o passo das taxas', () => {
    const { dados, feitos } = taxasDe2026(original())
    const taxas = dados.taxas as { id: string; valor: number; aConfirmar: boolean; observacao: string }[]
    expect(taxas[0]).toEqual(original().taxas[0])
    expect(taxas[1]).toMatchObject({ id: '2', valor: 80, aConfirmar: false, observacao: 'Avulsa' })
    expect(dados.mensalidadePlanos).toHaveLength(3)
    expect((dados.mensalidadeRegras as { texto: string }[]).map((r) => r.texto)).toEqual([...REGRAS_MENSALIDADE_OFICIAIS])
    expect(typeof dados.mensalidadeIntroducao).toBe('string')
    const passos = dados.comoTreinar as { id: string; texto: string }[]
    expect(passos[1]).toEqual({ id: 'p2', titulo: 'Pague as taxas na Administração', texto: TEXTO_PASSO_TAXAS })
    expect(passos[1].texto).toContain('a taxa de pista (R$ 80,00 avulsa, ou a mensalidade para quem não treina no horário de iniciante)')
    expect(feitos.length).toBe(5)
  })

  it('o que o moderador já mudou fica como está, e rodar de novo não muda nada', () => {
    const mudado = original()
    mudado.taxas[1] = { ...mudado.taxas[1], valor: 90, aConfirmar: false }
    mudado.comoTreinar[1] = { ...mudado.comoTreinar[1], texto: 'Texto do moderador.' }
    const r = taxasDe2026({ ...mudado, mensalidadeRegras: [{ texto: 'Regra do moderador.' }] })
    expect(r.dados.taxas).toBeUndefined()
    expect(r.dados.comoTreinar).toBeUndefined()
    expect(r.dados.mensalidadeRegras).toBeUndefined()
    expect(r.avisos.join(' ')).toContain('taxa de pista já tinha valor')

    const aplicado = { ...original(), ...taxasDe2026(original()).dados }
    const segunda = taxasDe2026(aplicado)
    expect(segunda.feitos).toEqual([])
    expect(segunda.dados).toEqual({})
  })
})
