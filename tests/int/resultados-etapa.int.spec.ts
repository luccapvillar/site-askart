/**
 * Warm-up fora da pontuação e matriz do resultado da etapa (src/components/site/resultados/matriz.ts).
 * Nomes, números e tempos abaixo são dados de TESTE, não dados oficiais da ASKART.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { resultadosDaEtapa, type ResultadoCategoriaNaEtapa } from '@/lib/carregar-competicao'
import {
  calcularClassificacao,
  calcularResultadoCorrida,
  type Corrida,
  type Etapa,
  type Inscricao,
  type LinhaResultado,
  type Regra,
} from '@/lib/classificacao'
import { resultadoSomadoDaEtapa } from '@/lib/estatisticas'
import { corridaContaPontos, planejarCorridas, statusEtapaAutomatico } from '@/hooks/competicao/validacoes'
import { formatarPontos, formatarVolta, montarMatriz } from '@/components/site/resultados/matriz'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: unknown }) => createElement('a', { href }, children as never),
}))

// ───────── construtores ─────────

const CAT = 'cat'
const ins = (id: string, extra: Partial<Inscricao> = {}): Inscricao => ({
  id,
  categoria: CAT,
  piloto: `p-${id}`,
  nome: id,
  numero: id.charCodeAt(0),
  condicao: 'titular',
  status: 'ativa',
  ...extra,
})
const etapa = (id: string, numero: number): Etapa => ({ id, numero, status: 'realizada', inicio: `2026-0${numero}-10T13:00:00.000Z` })
const chegada = (...ids: string[]): LinhaResultado[] => ids.map((id, i) => ({ inscricao: id, posicaoChegada: i + 1, status: 'classificado' }))
let seq = 0
const corrida = (etapaId: string, resultados: LinhaResultado[], extra: Partial<Corrida> = {}): Corrida => ({
  id: `c${++seq}`,
  etapa: etapaId,
  categorias: [CAT],
  nome: 'Corrida',
  tipo: 'bateria',
  status: 'oficial',
  resultados,
  ...extra,
})
const regra = (extra: Partial<Regra> = {}): Regra => ({ tabelas: [{ id: 't', nome: 'Padrão', pontos: [10, 8, 6, 5, 4] }], ...extra })

// ───────── warm-up ─────────

describe('warm-up fica fora da pontuação', () => {
  const tres = [ins('A'), ins('B'), ins('C')]

  it('a sessão de warm-up tem posições, mas nunca pontos nem volta mais rápida (mesmo marcada para contar)', () => {
    const wu = corrida('e1', [...chegada('C', 'B', 'A')].map((l, i) => ({ ...l, melhorVolta: 50_000 + i * 100 })), {
      tipo: 'warm-up',
      contaParaClassificacao: true,
    })
    const r = calcularResultadoCorrida(wu, regra({ pontosVoltaRapida: 1, pontosParticipacao: 2 }), { inscricoes: tres })
    expect(r.conta).toBe(false)
    expect(r.voltaMaisRapida).toBeNull()
    expect(r.linhas.map((l) => [l.nome, l.posicaoCategoria, l.pontos, l.melhorVolta])).toEqual([
      ['C', 1, 0, 50_000],
      ['B', 2, 0, 50_100],
      ['A', 3, 0, 50_200],
    ])
  })

  it('a classificação ignora o warm-up: sem pontos, pole, participação, vitórias nem corridas', () => {
    const e1 = etapa('e1', 1)
    const corridas = [
      corrida('e1', chegada('C', 'B', 'A'), { tipo: 'warm-up', contaParaClassificacao: true, nome: 'Warm-up' }),
      corrida('e1', chegada('A', 'B', 'C'), { nome: 'Corrida 1' }),
    ]
    const r = calcularClassificacao({
      regra: regra({ pontosParticipacao: 1, pontosPole: 3 }),
      categoria: CAT,
      etapas: [e1],
      corridas,
      inscricoes: tres,
    })
    const por = Object.fromEntries(r.linhas.map((l) => [l.nome, l]))
    // Só a Corrida 1 conta: 10/8/6 + 1 de participação; o 1º do warm-up (C) não ganha nada a mais.
    expect(r.linhas.map((l) => [l.nome, l.pontos])).toEqual([
      ['A', 11],
      ['B', 9],
      ['C', 7],
    ])
    expect(por.C).toEqual(expect.objectContaining({ vitorias: 0, corridas: 1, poles: 0 }))
    expect(por.A).toEqual(expect.objectContaining({ vitorias: 1, corridas: 1 }))
  })

  it('quem só fez o warm-up não aparece como participante, e etapa só com warm-up não conta como realizada', () => {
    const e1 = etapa('e1', 1)
    const e2 = etapa('e2', 2)
    const quatro = [...tres, ins('D')]
    const r = calcularClassificacao({
      regra: regra({ pontosParticipacao: 1 }),
      categoria: CAT,
      etapas: [e1, e2],
      corridas: [
        corrida('e1', chegada('D', 'A', 'B', 'C'), { tipo: 'warm-up' }),
        corrida('e1', chegada('A', 'B', 'C')),
        corrida('e2', chegada('A', 'B'), { tipo: 'warm-up' }),
      ],
      inscricoes: quatro,
    })
    expect(r.etapasRealizadas).toBe(1)
    const d = r.linhas.find((l) => l.nome === 'D')
    expect(d).toEqual(expect.objectContaining({ pontos: 0, etapas: 0, corridas: 0 }))
    expect(d?.porEtapa[0].participou).toBe(false)
  })

  it('warm-up nasce sem contar e não impede a etapa de virar "realizada"', () => {
    expect(corridaContaPontos({ tipo: 'warm-up', contaParaClassificacao: true })).toBe(false)
    expect(corridaContaPontos({ tipo: 'bateria' })).toBe(true)
    expect(statusEtapaAutomatico('confirmada', [{ status: 'oficial', tipo: 'bateria' }, { status: 'rascunho', tipo: 'warm-up' }])).toBe(
      'realizada',
    )
    const { criar } = planejarCorridas(
      10,
      [
        { nome: 'Warm-up', tipo: 'warm-up' },
        { nome: 'Classificação', tipo: 'tomada-de-tempo', contaParaClassificacao: false },
        { nome: 'Corrida 1', tipo: 'bateria' },
      ],
      [1],
      new Set(),
    )
    expect(criar.map((c) => [c.nome, c.tipo, c.contaParaClassificacao])).toEqual([
      ['Warm-up', 'warm-up', false],
      ['Classificação', 'tomada-de-tempo', false],
      ['Corrida 1', 'bateria', true],
    ])
  })
})

// ───────── resultado da etapa com o desempate do campeonato ─────────

describe('resultado somado da etapa', () => {
  it('empate em pontos segue os critérios do campeonato (não a última corrida)', () => {
    // Corrida 1: X, Y, Z, W (10, 8, 6, 5). Corrida 2: W, Y, X, Z (10, 8, 6, 5).
    // X = 16 e Y = 16. Pela última corrida, Y ficaria na frente; com "mais vitórias" (critério do
    // campeonato), X fica em 1º.
    const e1 = etapa('e1', 1)
    const r = calcularClassificacao({
      regra: regra({ criteriosDesempate: ['mais-vitorias'] }),
      categoria: CAT,
      etapas: [e1],
      corridas: [
        corrida('e1', chegada('X', 'Y', 'Z', 'W'), { inicio: '2026-01-10T13:00:00.000Z' }),
        corrida('e1', chegada('W', 'Y', 'X', 'Z'), { inicio: '2026-01-10T15:00:00.000Z' }),
      ],
      inscricoes: [ins('X'), ins('Y'), ins('Z'), ins('W')],
      comPosicaoAnterior: false,
    })
    expect(resultadoSomadoDaEtapa(r, 'e1').map((l) => [l.nome, l.posicao, l.total])).toEqual([
      ['X', 1, 16],
      ['Y', 2, 16],
      ['W', 3, 15],
      ['Z', 4, 11],
    ])
  })

  it('total desconta penalidade de pontos; quem não tem posição em corrida que conta vem no fim, sem posição', () => {
    const e1 = etapa('e1', 1)
    const r = calcularClassificacao({
      regra: regra(),
      categoria: CAT,
      etapas: [e1],
      corridas: [
        corrida('e1', [
          { inscricao: 'A', posicaoChegada: 1, status: 'classificado', penalidade: { tipo: 'pontos', valor: 3, motivo: 'Teste' } },
          { inscricao: 'B', posicaoChegada: 2, status: 'classificado' },
          { inscricao: 'C', status: 'nao-largou' },
        ]),
      ],
      inscricoes: [ins('A'), ins('B'), ins('C')],
    })
    // A chegou em 1º (10), mas perdeu 3 pontos: total 7, atrás de B (8). C não largou: sem posição.
    expect(resultadoSomadoDaEtapa(r, 'e1').map((l) => [l.nome, l.posicao, l.pontos, l.ajustes, l.total])).toEqual([
      ['B', 1, 8, 0, 8],
      ['A', 2, 10, -3, 7],
      ['C', null, 0, 0, 0],
    ])
  })
})

// ───────── matriz (dados sintéticos passando pelo adaptador) ─────────

type Doc = Record<string, unknown> & { id: number }
type Where = Record<string, unknown>

const casa = (doc: Doc, where?: Where): boolean => {
  if (!where) return true
  return Object.entries(where).every(([campo, cond]) => {
    if (campo === 'and') return (cond as Where[]).every((w) => casa(doc, w))
    const c = cond as { equals?: unknown; in?: unknown[] }
    const v = doc[campo]
    const id = (x: unknown) => String(x && typeof x === 'object' && 'id' in x ? (x as { id: unknown }).id : x)
    if ('equals' in c) return id(v) === String(c.equals)
    if ('in' in c) return (c.in ?? []).map(String).includes(id(v))
    return true
  })
}

const banco = (dados: Record<string, Doc[]>) =>
  ({
    find: async (args: { collection: string; where?: Where; limit?: number }) => {
      const docs = (dados[args.collection] ?? []).filter((d) => casa(d, args.where))
      return { docs: args.limit === 1 ? docs.slice(0, 1) : docs }
    },
  }) as never

const linha = (inscricao: number, posicaoChegada: number | null, melhorVoltaMs: number | null, status = 'classificado') => ({
  inscricao,
  posicaoChegada,
  status,
  melhorVoltaMs,
})

/**
 * Etapa de teste: A=101, B=102, C=103, D=104 (convidado), E=105 (só fez o warm-up).
 * Corridas cadastradas fora de ordem (a ordem vem do horário).
 */
function dadosEtapa(): Record<string, Doc[]> {
  const base = { etapa: 11, categorias: [3], status: 'oficial', tabela: null, fator: 1, voltaMaisRapidaManual: { inscricao: null, motivo: null } }
  return {
    temporadas: [{ id: 1, nome: 'Teste', ano: 2026, status: 'em-andamento', regra: 7 }],
    'temporada-categorias': [{ id: 50, temporada: 1, categoria: 3, ordem: 1, regra: null }],
    'regras-pontuacao': [
      { id: 7, nome: 'Regra de teste', tabelas: [{ id: 'x', nome: 'Padrão', pontos: [10, 8, 6, 5] }], pontosPole: 1, pontosVoltaRapida: 1 },
    ],
    etapas: [{ id: 11, temporada: 1, numero: 1, status: 'realizada', inicio: '2026-03-10T11:00:00.000Z', categorias: [3] }],
    corridas: [
      {
        id: 24,
        ...base,
        nome: 'Corrida 2',
        tipo: 'bateria',
        contaParaClassificacao: true,
        inicio: '2026-03-10T14:00:00.000Z',
        resultados: [linha(102, 1, 50_000), linha(101, 2, 50_050), linha(103, 3, 50_300), linha(104, null, null, 'nao-largou')],
      },
      {
        id: 21,
        ...base,
        nome: 'Warm-up',
        tipo: 'warm-up',
        contaParaClassificacao: false,
        inicio: '2026-03-10T11:00:00.000Z',
        resultados: [linha(105, 1, 50_500), linha(101, 2, 50_200), linha(102, 3, 51_000), linha(103, 4, 50_900)],
      },
      {
        id: 23,
        ...base,
        nome: 'Corrida 1',
        tipo: 'bateria',
        contaParaClassificacao: true,
        inicio: '2026-03-10T13:00:00.000Z',
        resultados: [linha(101, 1, 50_000), linha(104, 2, 50_100), linha(102, 3, 50_200), linha(103, 4, 49_900)],
      },
      {
        id: 22,
        ...base,
        nome: 'Classificação',
        tipo: 'tomada-de-tempo',
        contaParaClassificacao: false,
        inicio: '2026-03-10T12:00:00.000Z',
        resultados: [linha(102, 1, 49_800), linha(101, 2, 49_900), linha(103, 3, 50_100), linha(104, 4, 50_300)],
      },
    ],
    inscricoes: [
      { id: 101, temporada: 1, categoria: 3, piloto: 201, numero: 33, condicao: 'titular', status: 'ativa' },
      { id: 102, temporada: 1, categoria: 3, piloto: 202, numero: 7, condicao: 'titular', status: 'ativa' },
      { id: 103, temporada: 1, categoria: 3, piloto: 203, numero: 12, condicao: 'titular', status: 'ativa' },
      { id: 104, temporada: 1, categoria: 3, piloto: 204, numero: 99, condicao: 'convidado', status: 'ativa' },
      { id: 105, temporada: 1, categoria: 3, piloto: 205, numero: 5, condicao: 'titular', status: 'ativa' },
    ],
    pilotos: [
      { id: 201, nome: 'Piloto A', slug: 'piloto-a', visibilidade: 'visivel' },
      { id: 202, nome: 'Piloto B', slug: 'piloto-b', visibilidade: 'visivel' },
      { id: 203, nome: 'Piloto C', slug: 'piloto-c', visibilidade: 'visivel' },
      { id: 204, nome: 'Piloto D', slug: 'piloto-d', visibilidade: 'visivel' },
      { id: 205, nome: 'Piloto E', slug: 'piloto-e', visibilidade: 'visivel' },
    ],
    equipes: [],
    categorias: [{ id: 3, nome: 'Categoria Teste', sigla: 'CT', slug: 'categoria-teste' }],
  }
}

async function resultadoDeTeste(): Promise<ResultadoCategoriaNaEtapa> {
  const r = await resultadosDaEtapa({ payload: banco(dadosEtapa()), etapa: 11, publico: true })
  expect(r?.categorias).toHaveLength(1)
  return r!.categorias[0]
}

describe('resultadosDaEtapa com warm-up', () => {
  it('sessões em ordem de horário, com ordem, tipo e melhor volta; warm-up sem pontos e fora do resultado da etapa', async () => {
    const cat = await resultadoDeTeste()
    expect(cat.corridas.map((c) => [c.ordem, c.nome, c.tipo, c.conta])).toEqual([
      [1, 'Warm-up', 'warm-up', false],
      [2, 'Classificação', 'tomada-de-tempo', false],
      [3, 'Corrida 1', 'bateria', true],
      [4, 'Corrida 2', 'bateria', true],
    ])
    expect(cat.corridas[0].linhas.every((l) => l.pontos === 0)).toBe(true)
    expect(cat.corridas[0].linhas[1]).toEqual(expect.objectContaining({ nome: 'Piloto A', numero: 33, posicaoCategoria: 2, melhorVolta: 50_200 }))
    // Corrida 1: A 10; B 8 (convidado D não pontua); C 6 + volta mais rápida 1. Corrida 2: B 10 + 1; A 8; C 6. Pole: B.
    expect(cat.etapa.map((l) => [l.nome, l.posicao, l.total, l.pole])).toEqual([
      ['Piloto B', 1, 20, true],
      ['Piloto A', 2, 18, false],
      ['Piloto C', 3, 13, false],
    ])
  })
})

describe('montarMatriz', () => {
  it('colunas fixas, todos os pilotos e a ordem do resultado da etapa (depois, pela classificação)', async () => {
    const m = montarMatriz(await resultadoDeTeste())
    expect(m.colunas.map((c) => [c.titulo, c.tipo, c.comPontos, c.ausente])).toEqual([
      ['Warm-up', 'warm-up', false, null],
      ['Classificação', 'classificacao', false, null],
      ['Corrida 1', 'corrida', true, null],
      ['Corrida 2', 'corrida', true, null],
      ['Resultado da etapa', 'etapa', true, null],
    ])
    // B, A, C pelo resultado da etapa; D (convidado, 4º na classificação) e E (só warm-up) depois.
    expect(m.linhas.map((l) => [l.nome, l.convidado])).toEqual([
      ['Piloto B', false],
      ['Piloto A', false],
      ['Piloto C', false],
      ['Piloto D', true],
      ['Piloto E', false],
    ])
  })

  it('roxo: volta mais rápida no warm-up e na classificação, vencedor nas corridas e na etapa, volta mais rápida de cada corrida', async () => {
    const m = montarMatriz(await resultadoDeTeste())
    const roxos = m.colunas.map((_, i) => m.linhas.filter((l) => l.celulas[i].melhorDoGrid).map((l) => l.nome))
    expect(roxos).toEqual([
      ['Piloto A'], // warm-up: E chegou em 1º, mas A fez a volta mais rápida
      ['Piloto B'],
      ['Piloto A'],
      ['Piloto B'],
      ['Piloto B'],
    ])
    const voltas = m.colunas.map((_, i) => m.linhas.filter((l) => l.celulas[i].voltaMaisRapida).map((l) => l.nome))
    expect(voltas).toEqual([[], [], ['Piloto C'], ['Piloto B'], []])

    const b = m.linhas[0]
    expect(b.celulas[1]).toEqual(expect.objectContaining({ posicao: 1, melhorVolta: 49_800, pole: true, pontos: null }))
    expect(b.celulas[4]).toEqual(expect.objectContaining({ posicao: 1, pontos: 20, melhorDoGrid: true }))
    const d = m.linhas[3]
    expect(d.celulas[0].tem).toBe(false) // não fez o warm-up
    expect(d.celulas[2]).toEqual(expect.objectContaining({ posicao: 2, pontos: null })) // convidado não pontua
    expect(d.celulas[3]).toEqual(expect.objectContaining({ posicao: null, situacao: 'Não largou' }))
    expect(d.celulas[4].tem).toBe(false)
    const e = m.linhas[4]
    expect(e.celulas[0]).toEqual(expect.objectContaining({ posicao: 1, melhorDoGrid: false, melhorVolta: 50_500 }))
    expect(e.celulas.slice(1).every((c) => !c.tem)).toBe(true)
  })

  it('sessão que falta vira coluna vazia com explicação; mais de duas baterias viram Corrida 3…', async () => {
    const cat = await resultadoDeTeste()
    const soBaterias: ResultadoCategoriaNaEtapa = {
      ...cat,
      corridas: [
        ...cat.corridas.filter((c) => c.tipo === 'bateria'),
        { ...cat.corridas[3], id: 99, nome: 'Final', tipo: 'final', ordem: 5 },
      ],
    }
    const m = montarMatriz(soBaterias)
    expect(m.colunas.map((c) => [c.titulo, c.subtitulo, c.ausente])).toEqual([
      ['Warm-up', null, 'Sem resultado de warm-up nesta etapa'],
      ['Classificação', null, 'Sem resultado de classificação nesta etapa'],
      ['Corrida 1', null, null],
      ['Corrida 2', null, null],
      ['Corrida 3', 'Final', null],
      ['Resultado da etapa', null, null],
    ])
    expect(m.linhas.every((l) => !l.celulas[0].tem && !l.celulas[1].tem)).toBe(true)

    const umaSo = montarMatriz({ ...cat, corridas: cat.corridas.filter((c) => c.nome === 'Corrida 1') })
    expect(umaSo.colunas.find((c) => c.titulo === 'Corrida 2')?.ausente).toBe('Sem resultado da Corrida 2 nesta etapa')
  })

  it('categoria sem regra: sem pontos e sem resultado da etapa (nada inventado)', async () => {
    const cat = await resultadoDeTeste()
    const m = montarMatriz({ ...cat, semRegra: true })
    expect(m.colunas.every((c) => !c.comPontos || c.tipo === 'etapa')).toBe(true)
    expect(m.colunas.at(-1)?.ausente).toBe('Pontuação da categoria ainda não definida')
    expect(m.linhas.every((l) => l.celulas.every((c) => c.pontos === null))).toBe(true)
  })

  it('formatos: volta mm:ss.mmm e pontos com vírgula', () => {
    expect(formatarVolta(62_345)).toBe('01:02.345')
    expect(formatarVolta(48_007)).toBe('00:48.007')
    expect(formatarPontos(12.5)).toBe('12,5')
    expect(formatarPontos(20)).toBe('20')
  })
})

describe('MatrizEtapa (HTML do servidor)', () => {
  it('tabela acessível: caption, th com scope, legenda e marcador de texto além do roxo', async () => {
    const { MatrizEtapa } = await import('@/components/site/resultados/MatrizEtapa')
    const html = renderToStaticMarkup(
      createElement(MatrizEtapa, { categoria: { id: 3, nome: 'Categoria Teste', cor: '#1A7F37' }, resultado: await resultadoDeTeste() }),
    )
    expect(html).toContain('<caption')
    expect(html).toContain('Em roxo: o melhor do grid em cada sessão.')
    expect(html.match(/scope="col"/g)).toHaveLength(6)
    expect(html.match(/scope="row"/g)).toHaveLength(5)
    // 5 colunas com um "melhor do grid" cada (texto para leitor de tela, além da cor).
    expect(html.match(/\(melhor do grid/g)?.length).toBeGreaterThanOrEqual(5)
    expect(html).toContain('(melhor do grid: volta mais rápida da sessão)')
    expect(html).toContain('(volta mais rápida da corrida)')
    expect(html).toContain('00:49.800')
    expect(html).toContain('href="/pilotos/piloto-b"')
    expect(html).not.toContain('<script')
  })
})
