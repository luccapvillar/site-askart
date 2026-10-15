/**
 * Testes das estatísticas (src/lib/estatisticas.ts) — funções puras, sem banco.
 * Nomes e números são dados de TESTE, não dados oficiais da ASKART.
 */
import { describe, expect, it } from 'vitest'
import { calcularClassificacao, type Corrida, type EntradaClassificacao, type Etapa, type Inscricao, type LinhaResultado } from '@/lib/classificacao'
import {
  desempenhoPorEtapa,
  evolucaoClassificacao,
  maioresPontuacoes,
  ranking,
  resultadoDaEtapa,
  totaisDoPiloto,
  totaisPorPiloto,
  type ClassificacaoDaTemporada,
} from '@/lib/estatisticas'

const ins = (id: string): Inscricao => ({ id, categoria: 'cat', piloto: `p-${id}`, nome: id, numero: id.charCodeAt(0) })
const etapa = (id: string, numero: number, extra: Partial<Etapa> = {}): Etapa => ({
  id,
  numero,
  status: 'realizada',
  inicio: `2026-0${numero}-10T13:00:00.000Z`,
  ...extra,
})
const chegada = (...ids: string[]): LinhaResultado[] => ids.map((id, i) => ({ inscricao: id, posicaoChegada: i + 1 }))
let seq = 0
const corrida = (etapaId: string, resultados: LinhaResultado[]): Corrida => ({
  id: `c${++seq}`,
  etapa: etapaId,
  categorias: ['cat'],
  status: 'oficial',
  resultados,
})

const entrada = (extra: Partial<EntradaClassificacao> = {}): EntradaClassificacao => ({
  regra: { tabelas: [{ nome: 'T', pontos: [10, 8, 6] }], descartes: { quantidade: 1 } },
  categoria: 'cat',
  etapas: [etapa('e1', 1), etapa('e2', 2), etapa('e3', 3), etapa('e4', 4, { status: 'agendada' })],
  corridas: [corrida('e1', chegada('A', 'B', 'C')), corrida('e2', chegada('B', 'A', 'C')), corrida('e3', chegada('B', 'C'))],
  inscricoes: [ins('A'), ins('B'), ins('C')],
  ...extra,
})

const linha = (piloto: string, posicao: number, pontos: number, extra: Record<string, unknown> = {}) => ({
  piloto,
  chave: piloto,
  nome: piloto.toUpperCase(),
  posicao,
  pontos,
  vitorias: 0,
  podios: 0,
  corridas: 0,
  ...extra,
})

const historico: ClassificacaoDaTemporada[] = [
  {
    temporada: 't2025',
    ano: 2025,
    categoria: 'cat',
    encerrada: true,
    fonte: 'manual',
    linhas: [linha('a', 1, 120.5, { vitorias: 4, podios: 6, corridas: 8 }), linha('b', 2, 100, { vitorias: 2, podios: 5, corridas: 8 })],
  },
  {
    temporada: 't2026',
    ano: 2026,
    categoria: 'cat',
    encerrada: false,
    fonte: 'automatica',
    linhas: [linha('b', 1, 60.2, { vitorias: 3, podios: 3, corridas: 4, poles: 2 }), linha('a', 2, 40.1, { vitorias: 1, podios: 3, corridas: 4 })],
  },
  {
    temporada: 't2026',
    ano: 2026,
    categoria: 'geral',
    agregada: true,
    linhas: [linha('b', 1, 60.2, { vitorias: 3 }), linha('a', 2, 40.1, { vitorias: 1 })],
  },
]

describe('totais por piloto (carreira e temporada)', () => {
  it('soma carreira a partir de classificações automáticas e manuais, sem contar a agregada', () => {
    const t = totaisDoPiloto('a', historico)
    expect(t).not.toBeNull()
    expect(t?.pontos).toBe(160.6)
    expect(t?.vitorias).toBe(5)
    expect(t?.podios).toBe(9)
    expect(t?.corridas).toBe(12)
    expect(t?.titulos).toBe(1)
    expect(t?.temporadasDisputadas).toBe(2)
    expect(t?.melhorPosicao).toBe(1)
    expect(t?.temporadas.map((x) => x.ano)).toEqual([2026, 2025])
  })

  it('temporada em andamento não conta título; piloto sem classificação = null', () => {
    expect(totaisDoPiloto('b', historico)?.titulos).toBe(0)
    expect(totaisDoPiloto('zzz', historico)).toBeNull()
  })

  it('soma decimais sem erro de ponto flutuante', () => {
    const t = totaisPorPiloto([
      { temporada: 1, categoria: 1, linhas: [linha('x', 1, 0.1)] },
      { temporada: 2, categoria: 1, linhas: [linha('x', 1, 0.2)] },
    ])
    expect(t[0].pontos).toBe(0.3)
  })
})

describe('rankings', () => {
  const totais = totaisPorPiloto(historico)

  it('mais vitórias, pódios, pontos e participações', () => {
    expect(ranking(totais, 'vitorias').map((i) => [i.piloto.chave, i.valor])).toEqual([
      ['a', 5],
      ['b', 5],
    ])
    expect(ranking(totais, 'pontos')[0].piloto.chave).toBe('a')
    expect(ranking(totais, 'podios').map((i) => i.valor)).toEqual([9, 8])
    expect(ranking(totais, 'corridas').map((i) => i.valor)).toEqual([12, 12])
  })

  it('empatados dividem a posição e quem tem zero fica de fora', () => {
    const r = ranking(totais, 'vitorias')
    expect(r.map((i) => i.posicao)).toEqual([1, 1])
    expect(r.every((i) => i.empatado)).toBe(true)
    expect(ranking(totais, 'poles').map((i) => i.piloto.chave)).toEqual(['b'])
  })

  it('limite mantém os empatados na última posição', () => {
    const t = totaisPorPiloto([
      { temporada: 1, categoria: 1, linhas: [linha('a', 1, 30), linha('b', 2, 20), linha('c', 3, 20), linha('d', 4, 10)] },
    ])
    expect(ranking(t, 'pontos', { limite: 2 }).map((i) => i.piloto.chave)).toEqual(['a', 'b', 'c'])
  })

  it('maiores pontuações numa temporada', () => {
    expect(maioresPontuacoes(historico, 2).map((x) => x.pontos)).toEqual([120.5, 100])
  })
})

describe('métricas por etapa (a partir dos resultados)', () => {
  it('evolução da pontuação após cada etapa, com descartes progressivos', () => {
    const ev = evolucaoClassificacao(entrada())
    expect(ev.etapas.map((e) => e.numero)).toEqual([1, 2, 3])
    const b = ev.series.find((s) => s.chave === 'p-B')
    // Após E1: 8 · após E2: 18 (descarte só vale com mais etapas que descartes) → descarta 8 = 10 · após E3: 28 − 8 = 20
    expect(b?.pontos.map((p) => p.pontos)).toEqual([8, 10, 20])
    expect(b?.pontos.map((p) => p.posicao)).toEqual([2, 1, 1])
    expect(ev.series[0].chave).toBe('p-B')
  })

  it('desempenho por etapa: participações, média, melhor posição e pódios', () => {
    const r = calcularClassificacao(entrada())
    const a = desempenhoPorEtapa(r).find((d) => d.chave === 'p-A')
    expect(a?.participacoes).toBe(2)
    expect(a?.mediaPontos).toBe(9)
    expect(a?.melhorPosicao).toBe(1)
    expect(a?.podiosEmEtapas).toBe(2)
    expect(a?.melhorEtapa).toEqual({ etapa: 'e1', numero: 1, pontos: 10 })
    expect(a?.etapas[2]).toEqual(expect.objectContaining({ participou: false, pontos: 0 }))
  })

  it('resultado da etapa em ordem de posição', () => {
    const r = calcularClassificacao(entrada())
    expect(resultadoDaEtapa(r, 'e3').map((x) => [x.nome, x.posicao, x.pontos])).toEqual([
      ['B', 1, 10],
      ['C', 2, 8],
    ])
  })
})
