/**
 * Testes do motor de classificação (src/lib/classificacao.ts) — funções puras, sem banco.
 * Os números e nomes abaixo são dados de TESTE, não dados oficiais da ASKART.
 */
import { describe, expect, it } from 'vitest'
import {
  arredondar1,
  calcularClassificacao,
  calcularResultadoCorrida,
  criarFotografiaFinal,
  lerFotografiaFinal,
  liderDe,
  type Ajuste,
  type Corrida,
  type EntradaClassificacao,
  type Etapa,
  type Inscricao,
  type LinhaResultado,
  type Regra,
} from '@/lib/classificacao'
import { classificacaoDe, classificacoesDaTemporada, paraRegra } from '@/lib/carregar-competicao'

// ───────── construtores de dados de teste ─────────

const CAT = 'cat'
const TABELA = [10, 8, 6, 5, 4, 3, 2, 1]

const ins = (id: string, extra: Partial<Inscricao> = {}): Inscricao => ({
  id,
  categoria: CAT,
  piloto: `piloto-${id}`,
  nome: id,
  numero: id.charCodeAt(0),
  condicao: 'titular',
  status: 'ativa',
  ...extra,
})

const etapa = (id: string, numero: number, extra: Partial<Etapa> = {}): Etapa => ({
  id,
  numero,
  status: 'realizada',
  inicio: `2026-${String(numero).padStart(2, '0')}-10T13:00:00.000Z`,
  ...extra,
})

/** Linhas classificadas na ordem de chegada informada. */
const chegada = (...ids: string[]): LinhaResultado[] =>
  ids.map((id, i) => ({ inscricao: id, posicaoChegada: i + 1, status: 'classificado' }))

let seq = 0
const corrida = (etapaId: string, resultados: LinhaResultado[], extra: Partial<Corrida> = {}): Corrida => ({
  id: `c${++seq}`,
  etapa: etapaId,
  categorias: [CAT],
  nome: `Bateria ${seq}`,
  tipo: 'bateria',
  status: 'oficial',
  contaParaClassificacao: true,
  resultados,
  ...extra,
})

const regraBase = (extra: Partial<Regra> = {}): Regra => ({
  tabelas: [{ nome: 'Padrão', pontos: TABELA }],
  ...extra,
})

const calc = (e: Partial<EntradaClassificacao> & Pick<EntradaClassificacao, 'etapas' | 'corridas' | 'inscricoes'>) =>
  calcularClassificacao({ regra: regraBase(), categoria: CAT, ...e })

const porNome = (r: ReturnType<typeof calcularClassificacao>) => Object.fromEntries(r.linhas.map((l) => [l.nome, l]))
const ordem = (r: ReturnType<typeof calcularClassificacao>) => r.linhas.map((l) => l.nome)

const tres = [ins('A'), ins('B'), ins('C')]

// ───────── pontuação básica ─────────

describe('pontuação básica', () => {
  it('tabela simples: pontos, posições, vitórias, pódios e corridas', () => {
    const r = calc({ etapas: [etapa('e1', 1)], corridas: [corrida('e1', chegada('A', 'B', 'C'))], inscricoes: tres })
    expect(ordem(r)).toEqual(['A', 'B', 'C'])
    const l = porNome(r)
    expect([l.A.pontos, l.B.pontos, l.C.pontos]).toEqual([10, 8, 6])
    expect(l.A.vitorias).toBe(1)
    expect(l.C.podios).toBe(1)
    expect(l.B.corridas).toBe(1)
    expect(r.etapasRealizadas).toBe(1)
    expect(l.A.porEtapa).toEqual([
      expect.objectContaining({ etapa: 'e1', numero: 1, pontos: 10, posicao: 1, descartado: false, participou: true }),
    ])
  })

  it('fator da etapa e fator da corrida multiplicam os pontos de tabela', () => {
    const r1 = calc({ etapas: [etapa('e1', 1, { fatorPontuacao: 2 })], corridas: [corrida('e1', chegada('A', 'B'))], inscricoes: tres })
    expect(porNome(r1).A.pontos).toBe(20)
    const r2 = calc({ etapas: [etapa('e1', 1)], corridas: [corrida('e1', chegada('A', 'B'), { fatorPontuacao: 0.5 })], inscricoes: tres })
    expect(porNome(r2).B.pontos).toBe(4)
    const r3 = calc({
      etapas: [etapa('e1', 1, { fatorPontuacao: 2 })],
      corridas: [corrida('e1', chegada('A', 'B'), { fatorPontuacao: 0.5 })],
      inscricoes: tres,
    })
    expect(porNome(r3).A.pontos).toBe(10)
  })

  it('várias baterias na etapa: soma e conta vitórias/corridas por bateria', () => {
    const r = calc({
      regra: regraBase({ criteriosDesempate: ['melhor-resultado-ultima-etapa'] }),
      etapas: [etapa('e1', 1)],
      corridas: [corrida('e1', chegada('A', 'B', 'C')), corrida('e1', chegada('B', 'A', 'C'))],
      inscricoes: tres,
    })
    const l = porNome(r)
    expect(l.A.pontos).toBe(18)
    expect(l.B.pontos).toBe(18)
    expect(l.C.pontos).toBe(12)
    expect(l.A.corridas).toBe(2)
    expect(l.A.vitorias).toBe(1)
    // Empate na etapa: decide a última bateria (B venceu) → B 1º na etapa e na classificação.
    expect(l.B.porEtapa[0].posicao).toBe(1)
    expect(ordem(r)).toEqual(['B', 'A', 'C'])
    expect(l.A.desempate).toBe('melhor-resultado-ultima-etapa')
  })

  it('usa a tabela indicada na corrida (por nome) e avisa tabela inexistente', () => {
    const regra = regraBase({ tabelas: [{ nome: 'Padrão', pontos: TABELA }, { id: 't2', nome: 'Final', pontos: [20, 16] }] })
    const r = calc({
      regra,
      etapas: [etapa('e1', 1)],
      corridas: [corrida('e1', chegada('A', 'B'), { tabela: 'final' }), corrida('e1', chegada('A', 'B'), { tabela: 'Não existe' })],
      inscricoes: tres,
    })
    expect(porNome(r).A.pontos).toBe(20)
    expect(r.avisos.some((a) => a.includes('Não existe'))).toBe(true)
  })

  it('pontos manuais da linha substituem os calculados', () => {
    const linhas = chegada('A', 'B')
    linhas[0].pontosManuais = 3.5
    const r = calc({ etapas: [etapa('e1', 1)], corridas: [corrida('e1', linhas)], inscricoes: tres })
    expect(porNome(r).A.pontos).toBe(3.5)
    expect(porNome(r).A.vitorias).toBe(1)
    expect(ordem(r)).toEqual(['B', 'A', 'C'])
  })

  it('pontos com 1 casa decimal, sem erro de ponto flutuante', () => {
    expect(arredondar1(0.1 + 0.2)).toBe(0.3)
    expect(arredondar1(1.25)).toBe(1.3)
    const l1 = chegada('A')
    l1[0].pontosManuais = 0.1
    const l2 = chegada('A')
    l2[0].pontosManuais = 0.2
    const r = calc({
      etapas: [etapa('e1', 1)],
      corridas: [corrida('e1', l1), corrida('e1', l2), corrida('e1', chegada('B', 'A'), { fatorPontuacao: 0.15 })],
      inscricoes: tres,
    })
    // 0,1 + 0,2 + (8 × 0,15 = 1,2) = 1,5 exatos
    expect(porNome(r).A.pontos).toBe(1.5)
    expect(porNome(r).B.pontos).toBe(1.5)
    // 10 × 0,25 = 2,5
    const r2 = calc({ etapas: [etapa('e1', 1)], corridas: [corrida('e1', chegada('A'), { fatorPontuacao: 0.25 })], inscricoes: tres })
    expect(porNome(r2).A.pontos).toBe(2.5)
  })
})

// ───────── convidados, abandono, voltas ─────────

describe('convidados', () => {
  const inscricoes = [ins('G', { condicao: 'convidado' }), ins('A'), ins('B')]
  const corridas = () => [corrida('e1', chegada('G', 'A', 'B'))]

  it('reclassificar elegíveis: titular atrás do convidado recebe pontos e vitória de 1º', () => {
    const r = calc({ regra: regraBase({ convidados: 'reclassificar-elegiveis' }), etapas: [etapa('e1', 1)], corridas: corridas(), inscricoes })
    expect(ordem(r)).toEqual(['A', 'B'])
    expect(porNome(r).A.pontos).toBe(10)
    expect(porNome(r).A.vitorias).toBe(1)
    expect(porNome(r).B.pontos).toBe(8)
  })

  it('manter posições: convidado não pontua e ninguém herda os pontos dele', () => {
    const r = calc({ regra: regraBase({ convidados: 'manter-posicoes' }), etapas: [etapa('e1', 1)], corridas: corridas(), inscricoes })
    expect(ordem(r)).toEqual(['A', 'B'])
    expect(porNome(r).A.pontos).toBe(8)
    expect(porNome(r).A.vitorias).toBe(0)
    expect(porNome(r).B.pontos).toBe(6)
  })
})

describe('abandono e percentual mínimo de voltas', () => {
  const linhas = (): LinhaResultado[] => [
    { inscricao: 'A', posicaoChegada: 1, status: 'classificado', voltas: 20 },
    { inscricao: 'B', posicaoChegada: 2, status: 'classificado', voltas: 20 },
    { inscricao: 'C', posicaoChegada: 3, status: 'abandono', voltas: 12 },
  ]
  const base = { etapas: [etapa('e1', 1)], inscricoes: tres }

  it('abandono pela posição: é classificado depois dos que terminaram e pontua', () => {
    const r = calc({ ...base, regra: regraBase({ abandono: 'pela-posicao', pontosParticipacao: 1 }), corridas: [corrida('e1', linhas())] })
    expect(porNome(r).C.pontos).toBe(7) // 6 da 3ª posição + 1 de participação
  })

  it('abandono só participação', () => {
    const r = calc({ ...base, regra: regraBase({ abandono: 'so-participacao', pontosParticipacao: 1 }), corridas: [corrida('e1', linhas())] })
    expect(porNome(r).C.pontos).toBe(1)
    expect(porNome(r).C.podios).toBe(0)
  })

  it('abandono tem posição oficial (atrás de quem terminou), mas só pontua por ela na regra "pela posição"', () => {
    const r = calcularResultadoCorrida(corrida('e1', linhas()), regraBase({ abandono: 'so-participacao' }), { inscricoes: tres })
    const c = r.linhas.find((l) => l.inscricao === 'C')
    expect(c?.posicaoOficial).toBe(3)
    expect(c?.posicaoParaPontos).toBeNull()
    expect(c?.pontosTabela).toBe(0)
  })

  it('abandono zero: nem participação', () => {
    const r = calc({ ...base, regra: regraBase({ abandono: 'zero', pontosParticipacao: 1 }), corridas: [corrida('e1', linhas())] })
    expect(porNome(r).C.pontos).toBe(0)
    expect(porNome(r).C.corridas).toBe(1)
  })

  it('percentual mínimo de voltas: abaixo do mínimo vira não classificado e os de trás sobem', () => {
    const r = calc({
      etapas: [etapa('e1', 1)],
      inscricoes: [...tres, ins('D')],
      regra: regraBase({ percentualMinimoVoltas: 75, abandono: 'pela-posicao' }),
      corridas: [
        corrida('e1', [
          { inscricao: 'A', posicaoChegada: 1, status: 'classificado', voltas: 20 },
          { inscricao: 'B', posicaoChegada: 2, status: 'classificado', voltas: 20 },
          { inscricao: 'C', posicaoChegada: 3, status: 'classificado', voltas: 14 }, // 70%
          { inscricao: 'D', posicaoChegada: 4, status: 'abandono', voltas: 15 }, // 75%: classificado pela posição
        ]),
      ],
    })
    expect(porNome(r).C.pontos).toBe(0)
    expect(porNome(r).D.pontos).toBe(6)
  })

  it('participação conforme o requisito (presente, largou, classificado)', () => {
    const linhasP = (): LinhaResultado[] => [
      { inscricao: 'A', posicaoChegada: 1, status: 'classificado' },
      { inscricao: 'B', status: 'nao-largou' },
      { inscricao: 'C', status: 'nao-classificado' },
    ]
    const regra = (requisitoParticipacao: Regra['requisitoParticipacao']) =>
      regraBase({ tabelas: [{ nome: 'Zero', pontos: [] }], pontosParticipacao: 2, requisitoParticipacao })
    const pts = (req: Regra['requisitoParticipacao']) => {
      const l = porNome(calc({ etapas: [etapa('e1', 1)], inscricoes: tres, regra: regra(req), corridas: [corrida('e1', linhasP())] }))
      return [l.A.pontos, l.B.pontos, l.C.pontos]
    }
    expect(pts('presente')).toEqual([2, 2, 2])
    expect(pts('largou')).toEqual([2, 0, 2])
    expect(pts('classificado')).toEqual([2, 0, 0])
  })
})

// ───────── penalidades e desclassificação ─────────

describe('penalidades', () => {
  it('penalidade de posições: perde N posições na ordem oficial', () => {
    const linhas = chegada('A', 'B', 'C', 'D')
    linhas[0].penalidade = { tipo: 'posicoes', valor: 2, motivo: 'Queima de largada' }
    const r = calc({ etapas: [etapa('e1', 1)], corridas: [corrida('e1', linhas)], inscricoes: [...tres, ins('D')] })
    expect(ordem(r)).toEqual(['B', 'C', 'A', 'D'])
    expect(porNome(r).A.pontos).toBe(6)
  })

  it('penalidade de tempo reordena pelo tempo total (com todos os tempos)', () => {
    const linhas: LinhaResultado[] = [
      { inscricao: 'A', posicaoChegada: 1, status: 'classificado', voltas: 15, tempoTotal: 600_000, penalidade: { tipo: 'tempo', valor: 5, motivo: 'Corte de pista' } },
      { inscricao: 'B', posicaoChegada: 2, status: 'classificado', voltas: 15, tempoTotal: 603_000 },
      { inscricao: 'C', posicaoChegada: 3, status: 'classificado', voltas: 15, tempoTotal: 700_000 },
    ]
    const r = calc({ etapas: [etapa('e1', 1)], corridas: [corrida('e1', linhas)], inscricoes: tres })
    expect(ordem(r)).toEqual(['B', 'A', 'C'])
  })

  it('penalidade de tempo sem tempo total mantém a chegada e avisa', () => {
    const linhas = chegada('A', 'B')
    linhas[0].penalidade = { tipo: 'tempo', valor: 5, motivo: 'x' }
    const r = calc({ etapas: [etapa('e1', 1)], corridas: [corrida('e1', linhas)], inscricoes: tres })
    expect(ordem(r).slice(0, 2)).toEqual(['A', 'B'])
    expect(r.avisos.some((a) => a.includes('tempo total'))).toBe(true)
  })

  it('penalidade de pontos é descontada do total e aparece na coluna da etapa', () => {
    const linhas = chegada('A', 'B')
    linhas[0].penalidade = { tipo: 'pontos', valor: 3, motivo: 'Conduta' }
    const r = calc({ etapas: [etapa('e1', 1)], corridas: [corrida('e1', linhas)], inscricoes: tres })
    const a = porNome(r).A
    expect(a.pontos).toBe(7)
    expect(a.porEtapa[0].pontos).toBe(10)
    expect(a.porEtapa[0].ajustes).toBe(-3)
    expect(a.ajustes).toBe(-3)
  })

  it('desclassificado não pontua, os de trás sobem e a corrida conta como disputada', () => {
    const linhas = chegada('A', 'B', 'C')
    linhas[0].status = 'desclassificado'
    const r = calc({ etapas: [etapa('e1', 1)], corridas: [corrida('e1', linhas)], inscricoes: tres })
    const l = porNome(r)
    expect(l.A.pontos).toBe(0)
    expect(l.A.corridas).toBe(1)
    expect(l.A.porEtapa[0].desclassificado).toBe(true)
    expect(l.B.pontos).toBe(10)
    expect(l.B.vitorias).toBe(1)
  })
})

// ───────── descartes e ajustes ─────────

describe('descartes', () => {
  // A: 10, 8, 6 · B: 8, 10, 10
  const tresEtapas = () => [etapa('e1', 1), etapa('e2', 2), etapa('e3', 3)]
  const corridasTres = () => [corrida('e1', chegada('A', 'B')), corrida('e2', chegada('B', 'A')), corrida('e3', chegada('B', 'C', 'A'))]

  it('descarta a pior etapa', () => {
    const r = calc({ regra: regraBase({ descartes: { quantidade: 1, unidade: 'etapa' } }), etapas: tresEtapas(), corridas: corridasTres(), inscricoes: tres })
    const a = porNome(r).A
    expect(a.pontosBrutos).toBe(24)
    expect(a.pontos).toBe(18)
    expect(a.porEtapa.map((e) => e.descartado)).toEqual([false, false, true])
    expect(r.criterios.descartes?.aplicado).toBe(true)
  })

  it('ausência conta como resultado zero descartável', () => {
    const r = calc({ regra: regraBase({ descartes: { quantidade: 1 } }), etapas: tresEtapas(), corridas: corridasTres(), inscricoes: tres })
    const c = porNome(r).C // só correu a etapa 3
    expect(c.pontos).toBe(8)
    expect(c.porEtapa.filter((e) => e.descartado)).toHaveLength(1)
    expect(c.porEtapa[2].descartado).toBe(false)
  })

  it('só descarta a partir de N etapas realizadas', () => {
    const r = calc({ regra: regraBase({ descartes: { quantidade: 1, aPartirDeEtapas: 4 } }), etapas: tresEtapas(), corridas: corridasTres(), inscricoes: tres })
    expect(porNome(r).A.pontos).toBe(24)
    expect(r.criterios.descartes?.aplicado).toBe(false)
  })

  it('última etapa do calendário não descartável', () => {
    const r = calc({
      regra: regraBase({ descartes: { quantidade: 1, ultimaEtapaDescartavel: false } }),
      etapas: tresEtapas(),
      corridas: corridasTres(),
      inscricoes: tres,
    })
    const a = porNome(r).A
    // A pior é a etapa 3 (6), que é a última: descarta a etapa 2 (8).
    expect(a.porEtapa.map((e) => e.descartado)).toEqual([false, true, false])
    expect(a.pontos).toBe(16)
  })

  it('a última etapa só fica protegida quando é a final do calendário', () => {
    const etapas = [...tresEtapas(), etapa('e4', 4, { status: 'agendada' })]
    const r = calc({ regra: regraBase({ descartes: { quantidade: 1, ultimaEtapaDescartavel: false } }), etapas, corridas: corridasTres(), inscricoes: tres })
    expect(porNome(r).A.porEtapa.map((e) => e.descartado)).toEqual([false, false, true])
  })

  it('desclassificação não é descartável', () => {
    const corridas = corridasTres()
    corridas[1].resultados = [{ inscricao: 'B', posicaoChegada: 1, status: 'classificado' }, { inscricao: 'A', posicaoChegada: 2, status: 'desclassificado' }]
    const r = calc({ regra: regraBase({ descartes: { quantidade: 1 } }), etapas: tresEtapas(), corridas, inscricoes: tres })
    const a = porNome(r).A
    // Etapas de A: 10, 0 (DSQ), 6 → descarta a etapa 3, nunca a do DSQ.
    expect(a.porEtapa.map((e) => e.descartado)).toEqual([false, false, true])
    expect(a.pontos).toBe(10)
  })

  it('descarte por corrida', () => {
    const etapas = [etapa('e1', 1), etapa('e2', 2)]
    const corridas = [
      corrida('e1', chegada('A', 'B')), // A 10
      corrida('e1', chegada('B', 'C', 'A')), // A 6
      corrida('e2', chegada('A', 'B')), // A 10
      corrida('e2', chegada('B', 'A')), // A 8
    ]
    const r = calc({ regra: regraBase({ descartes: { quantidade: 1, unidade: 'corrida' } }), etapas, corridas, inscricoes: tres })
    const a = porNome(r).A
    expect(a.pontosBrutos).toBe(34)
    expect(a.pontos).toBe(28)
    expect(a.porEtapa[0].corridasDescartadas).toEqual([corridas[1].id])
    expect(a.porEtapa[0].pontosDescartados).toBe(6)
    expect(a.porEtapa[0].descartado).toBe(false)
  })

  it('ajustes e penalidades entram depois dos descartes e nunca são descartados', () => {
    const corridas = corridasTres()
    ;(corridas[2].resultados as LinhaResultado[])[2].penalidade = { tipo: 'pontos', valor: 2, motivo: 'x' }
    const ajustes: Ajuste[] = [
      { inscricao: 'A', etapa: 'e3', tipo: 'penalidade', pontos: 5, motivo: 'Decisão dos comissários' },
      { inscricao: 'A', tipo: 'bonificacao', pontos: -1, motivo: 'Presença' },
      { inscricao: 'B', tipo: 'correcao', pontos: -0.5, motivo: 'Correção' },
    ]
    const r = calc({ regra: regraBase({ descartes: { quantidade: 1 } }), etapas: tresEtapas(), corridas, inscricoes: tres, ajustes })
    const a = porNome(r).A
    // Brutos 24, descarta a etapa 3 (6) = 18; −2 (penalidade da corrida) −5 (penalidade) +1 (bonificação) = 12
    expect(a.porEtapa[2].descartado).toBe(true)
    expect(a.porEtapa[2].ajustes).toBe(-7)
    expect(a.ajustes).toBe(-6)
    expect(a.pontos).toBe(12)
    expect(porNome(r).B.pontos).toBe(19.5) // 28 − 8 (descarta etapa 1) − 0,5
  })

  it('ajuste ligado a etapa ainda não realizada não vale', () => {
    const r = calc({
      etapas: [etapa('e1', 1), etapa('e2', 2, { status: 'agendada' })],
      corridas: [corrida('e1', chegada('A', 'B'))],
      inscricoes: tres,
      ajustes: [{ inscricao: 'A', etapa: 'e2', tipo: 'penalidade', pontos: 3 }],
    })
    expect(porNome(r).A.pontos).toBe(10)
  })
})

// ───────── o que não conta ─────────

describe('o que não conta', () => {
  it('etapa cancelada ou adiada não conta (mesmo com corrida oficial)', () => {
    const r = calc({
      etapas: [etapa('e1', 1), etapa('e2', 2, { status: 'cancelada' }), etapa('e3', 3, { status: 'adiada' })],
      corridas: [corrida('e1', chegada('A', 'B')), corrida('e2', chegada('B', 'A')), corrida('e3', chegada('B', 'A'))],
      inscricoes: tres,
    })
    expect(r.etapasRealizadas).toBe(1)
    expect(porNome(r).A.pontos).toBe(10)
    expect(porNome(r).A.porEtapa).toHaveLength(1)
  })

  it('corrida em rascunho, cancelada ou que não conta para a classificação não pontua', () => {
    const r = calc({
      etapas: [etapa('e1', 1)],
      corridas: [
        corrida('e1', chegada('A', 'B')),
        corrida('e1', chegada('B', 'A'), { status: 'rascunho' }),
        corrida('e1', chegada('B', 'A'), { status: 'cancelada' }),
        corrida('e1', chegada('B', 'A'), { contaParaClassificacao: false }),
      ],
      inscricoes: tres,
    })
    expect(porNome(r).A.pontos).toBe(10)
    expect(porNome(r).B.pontos).toBe(8)
    expect(porNome(r).B.corridas).toBe(1)
  })

  it('inscrição excluída não aparece; desistente só aparece se correu', () => {
    const r = calc({
      etapas: [etapa('e1', 1)],
      corridas: [corrida('e1', chegada('A', 'B', 'X'))],
      inscricoes: [ins('A'), ins('B', { status: 'excluida' }), ins('X', { status: 'desistente' }), ins('Y', { status: 'desistente' })],
    })
    expect(ordem(r)).toEqual(['A', 'X'])
    // B continua ocupando a posição na pista (não há reclassificação por exclusão).
    expect(porNome(r).X.pontos).toBe(6)
  })

  it('titular sem resultado aparece com zero', () => {
    const r = calc({ etapas: [etapa('e1', 1)], corridas: [corrida('e1', chegada('A'))], inscricoes: tres })
    expect(ordem(r)).toEqual(['A', 'B', 'C'])
    expect(porNome(r).B.porEtapa[0]).toEqual(expect.objectContaining({ pontos: 0, participou: false, posicao: null }))
  })
})

// ───────── desempates ─────────

describe('desempates', () => {
  it('mais vitórias decide empate em pontos', () => {
    const r = calc({
      regra: regraBase({ criteriosDesempate: ['mais-vitorias'] }),
      etapas: [etapa('e1', 1), etapa('e2', 2)],
      corridas: [corrida('e1', chegada('A', 'C', 'B')), corrida('e2', chegada('C', 'B', 'D', 'E', 'A'))],
      inscricoes: [...tres, ins('D'), ins('E')],
    })
    // A: 10 + 4 = 14 (1 vitória) · B: 6 + 8 = 14 (0 vitória)
    const l = porNome(r)
    expect(l.A.pontos).toBe(14)
    expect(l.B.pontos).toBe(14)
    expect(l.A.posicao).toBeLessThan(l.B.posicao)
    expect(l.B.desempate).toBe('mais-vitorias')
  })

  it('contagem de posições (mais 2º lugares)', () => {
    const inscricoes = ['A', 'B', 'C', 'D', 'E', 'F'].map((x) => ins(x))
    const r = calc({
      regra: regraBase({ criteriosDesempate: ['contagem-de-posicoes'] }),
      etapas: [etapa('e1', 1), etapa('e2', 2), etapa('e3', 3)],
      corridas: [
        corrida('e1', chegada('A', 'C', 'B')), // A 10, B 6
        corrida('e2', chegada('B', 'A', 'C')), // B 10, A 8
        corrida('e3', chegada('C', 'D', 'E', 'B', 'F', 'A')), // B 5, A 3
      ],
      inscricoes,
    })
    const l = porNome(r)
    expect(l.A.pontos).toBe(21)
    expect(l.B.pontos).toBe(21)
    expect(l.A.posicao).toBeLessThan(l.B.posicao)
    expect(l.B.desempate).toBe('contagem-de-posicoes')
    expect(r.criterios.empates.some((e) => e.resolvidoPor.includes('contagem-de-posicoes'))).toBe(true)
  })

  it('melhor resultado na última etapa, retrocedendo quando nenhum dos dois correu', () => {
    const regra = regraBase({ criteriosDesempate: ['melhor-resultado-ultima-etapa'] })
    const r = calc({
      regra,
      etapas: [etapa('e1', 1), etapa('e2', 2)],
      corridas: [corrida('e1', chegada('A', 'B')), corrida('e2', chegada('B', 'A'))],
      inscricoes: tres,
    })
    expect(ordem(r).slice(0, 2)).toEqual(['B', 'A'])
    const r2 = calc({
      regra,
      etapas: [etapa('e1', 1), etapa('e2', 2), etapa('e3', 3)],
      corridas: [corrida('e1', chegada('B', 'A')), corrida('e2', chegada('A', 'B')), corrida('e3', chegada('C'))],
      inscricoes: tres,
    })
    // Na etapa 3 nenhum dos dois correu: decide a etapa 2 (A venceu).
    const l = porNome(r2)
    expect(l.A.posicao).toBeLessThan(l.B.posicao)
    expect(l.B.desempate).toBe('melhor-resultado-ultima-etapa')
  })

  it('mais poles', () => {
    const r = calc({
      regra: regraBase({ criteriosDesempate: ['mais-poles'] }),
      etapas: [etapa('e1', 1), etapa('e2', 2)],
      corridas: [
        corrida('e1', chegada('B', 'A'), { tipo: 'tomada-de-tempo', contaParaClassificacao: false }),
        corrida('e1', chegada('A', 'B')),
        corrida('e2', chegada('B', 'A')),
      ],
      inscricoes: tres,
    })
    expect(ordem(r).slice(0, 2)).toEqual(['B', 'A'])
    expect(porNome(r).A.desempate).toBe('mais-poles')
  })

  it('por fim, ordem alfabética estável (ignora acentos)', () => {
    const inscricoes = [ins('b', { nome: 'Bruno' }), ins('a', { nome: 'Ana' }), ins('l', { nome: 'Álvaro' })]
    const r = calc({ regra: regraBase({ criteriosDesempate: [] }), etapas: [etapa('e1', 1)], corridas: [], inscricoes })
    expect(ordem(r)).toEqual(['Álvaro', 'Ana', 'Bruno'])
    expect(r.linhas[1].desempate).toBe('ordem-alfabetica')
  })
})

// ───────── categorias somadas, pole, volta mais rápida ─────────

describe('categorias, pole e volta mais rápida', () => {
  const inscricoesDuas = [
    ins('G1', { categoria: 'graduados' }),
    ins('G2', { categoria: 'graduados' }),
    ins('N1', { categoria: 'novatos' }),
    ins('N2', { categoria: 'novatos' }),
  ]
  const corridaJunta = () => corrida('e1', chegada('N1', 'G1', 'N2', 'G2'), { categorias: ['graduados', 'novatos'] })

  it('corrida com duas categorias: a posição que pontua é a da categoria', () => {
    const r = calc({ categoria: 'graduados', etapas: [etapa('e1', 1)], corridas: [corridaJunta()], inscricoes: inscricoesDuas })
    expect(ordem(r)).toEqual(['G1', 'G2'])
    expect(porNome(r).G1.pontos).toBe(10)
    expect(porNome(r).G2.pontos).toBe(8)
  })

  it('incluiResultadosDe soma as categorias numa só classificação', () => {
    const r = calc({
      categoria: 'graduados',
      incluiResultadosDe: ['novatos'],
      etapas: [etapa('e1', 1)],
      corridas: [corridaJunta()],
      inscricoes: inscricoesDuas,
    })
    expect(ordem(r)).toEqual(['N1', 'G1', 'N2', 'G2'])
    expect(porNome(r).G1.pontos).toBe(8)
    expect(porNome(r).N1.categoria).toBe('novatos')
  })

  it('pole = P1 da tomada de tempo; volta mais rápida = menor melhor volta entre os classificados', () => {
    const bateria: LinhaResultado[] = [
      { inscricao: 'A', posicaoChegada: 1, status: 'classificado', melhorVolta: 50_300 },
      { inscricao: 'B', posicaoChegada: 2, status: 'classificado', melhorVolta: 50_500 },
      { inscricao: 'C', posicaoChegada: 3, status: 'classificado', melhorVolta: 50_100 },
    ]
    const regra = regraBase({ pontosPole: 1, pontosVoltaRapida: 1 })
    const tomada = corrida('e1', chegada('B', 'A', 'C'), { tipo: 'tomada-de-tempo', contaParaClassificacao: false })
    const r = calc({ regra, etapas: [etapa('e1', 1)], corridas: [tomada, corrida('e1', bateria)], inscricoes: tres })
    const l = porNome(r)
    expect(l.B.poles).toBe(1)
    expect(l.B.pontos).toBe(9)
    expect(l.B.porEtapa[0].pole).toBe(true)
    expect(l.C.voltasRapidas).toBe(1)
    expect(l.C.pontos).toBe(7)
    expect(l.B.corridas).toBe(1) // a tomada de tempo não conta como corrida

    // Substituição manual da volta mais rápida.
    const r2 = calc({ regra, etapas: [etapa('e1', 1)], corridas: [tomada, corrida('e1', bateria, { voltaMaisRapidaManual: 'A' })], inscricoes: tres })
    expect(porNome(r2).A.voltasRapidas).toBe(1)
    expect(porNome(r2).C.voltasRapidas).toBe(0)
  })

  it('volta mais rápida de convidado: passa ao melhor elegível (reclassificar) ou a ninguém (manter)', () => {
    const linhas: LinhaResultado[] = [
      { inscricao: 'G', posicaoChegada: 1, status: 'classificado', melhorVolta: 49_000 },
      { inscricao: 'A', posicaoChegada: 2, status: 'classificado', melhorVolta: 50_000 },
      { inscricao: 'B', posicaoChegada: 3, status: 'classificado', melhorVolta: 49_500 },
    ]
    const inscricoes = [ins('G', { condicao: 'convidado' }), ins('A'), ins('B')]
    const reclass = calcularResultadoCorrida(corrida('e1', linhas), regraBase({ pontosVoltaRapida: 1 }), { inscricoes, categorias: [CAT] })
    expect(reclass.voltaMaisRapida).toBe('B')
    const manter = calcularResultadoCorrida(corrida('e1', linhas), regraBase({ pontosVoltaRapida: 1, convidados: 'manter-posicoes' }), {
      inscricoes,
      categorias: [CAT],
    })
    expect(manter.voltaMaisRapida).toBeNull()
  })
})

// ───────── evolução, líder, corrida avulsa ─────────

describe('posição anterior, ateEtapa e líder', () => {
  const etapas = () => [etapa('e1', 1), etapa('e2', 2)]
  const corridas = () => [corrida('e1', chegada('A', 'B', 'C')), corrida('e2', chegada('B', 'C', 'A')), corrida('e2', chegada('B', 'C', 'A'))]

  it('posicaoAnterior = classificação até a etapa anterior', () => {
    const r = calc({ regra: regraBase({ criteriosDesempate: ['mais-vitorias'] }), etapas: etapas(), corridas: corridas(), inscricoes: tres })
    // Depois da etapa 1: A, B, C. Depois da etapa 2: B 28, C 22, A 22 (A tem 1 vitória → à frente de C).
    expect(ordem(r)).toEqual(['B', 'A', 'C'])
    const l = porNome(r)
    expect(l.B.posicaoAnterior).toBe(2)
    expect(l.A.posicaoAnterior).toBe(1)
    expect(l.C.posicaoAnterior).toBe(3)
  })

  it('sem etapa anterior, posicaoAnterior é nula', () => {
    const r = calc({ etapas: [etapa('e1', 1)], corridas: [corrida('e1', chegada('A'))], inscricoes: tres })
    expect(r.linhas.every((l) => l.posicaoAnterior === null)).toBe(true)
  })

  it('ateEtapa calcula a classificação após a etapa indicada', () => {
    const r = calc({ etapas: etapas(), corridas: corridas(), inscricoes: tres, ateEtapa: 'e1' })
    expect(r.etapasRealizadas).toBe(1)
    expect(ordem(r)).toEqual(['A', 'B', 'C'])
  })

  it('liderDe: destaque manual vale até o prazo; depois volta o 1º calculado', () => {
    const r = calc({ etapas: etapas(), corridas: corridas(), inscricoes: tres })
    const destaque = { inscricao: 'C', rotulo: 'Destaque do mês', exibirAte: '2026-10-20T00:00:00.000Z' }
    expect(liderDe(r.linhas, destaque, new Date('2026-10-15T12:00:00Z'))).toEqual(
      expect.objectContaining({ tipo: 'destaque', rotulo: 'Destaque do mês', linha: expect.objectContaining({ nome: 'C' }) }),
    )
    const expirado = liderDe(r.linhas, destaque, new Date('2026-10-21T12:00:00Z'))
    expect(expirado?.tipo).toBe('lider')
    expect(expirado?.rotulo).toBe('Líder')
    expect(expirado?.linha.nome).toBe('B')
  })

  it('liderDe: sem pontos não há líder', () => {
    const r = calc({ etapas: [], corridas: [], inscricoes: tres })
    expect(liderDe(r.linhas, null)).toBeNull()
  })
})

describe('calcularResultadoCorrida e validação', () => {
  it('posição oficial geral, posição na categoria e correção manual com motivo', () => {
    const inscricoes = [ins('A'), ins('B'), ins('C'), ins('X', { categoria: 'outra' })]
    const linhas = chegada('X', 'A', 'B', 'C')
    linhas[3] = { ...linhas[3], posicaoOficial: 2, motivoPosicaoOficial: 'Recurso aceito' }
    const r = calcularResultadoCorrida(corrida('e1', linhas, { categorias: [CAT, 'outra'] }), regraBase(), { inscricoes, categorias: [CAT] })
    expect(r.linhas.map((l) => [l.inscricao, l.posicaoOficial, l.posicaoCategoria, l.pontos])).toEqual([
      ['C', 2, 1, 10],
      ['A', 3, 2, 8],
      ['B', 4, 3, 6],
    ])
    expect(r.linhas[0].posicaoOficialManual).toBe(true)
  })

  it('ignora linha duplicada e sem inscrição, com aviso', () => {
    const r = calcularResultadoCorrida(
      corrida('e1', [...chegada('A', 'B'), { inscricao: 'A', posicaoChegada: 3 }, { inscricao: null }]),
      regraBase(),
      { inscricoes: tres },
    )
    expect(r.linhas).toHaveLength(2)
    expect(r.avisos).toHaveLength(2)
  })

  it('fotografia final: grava e lê de volta', () => {
    const r = calc({ etapas: [etapa('e1', 1)], corridas: [corrida('e1', chegada('A', 'B'))], inscricoes: tres })
    const foto = criarFotografiaFinal(r, new Date('2026-12-01T00:00:00Z'))
    const lida = lerFotografiaFinal(JSON.parse(JSON.stringify(foto)))
    expect(lida?.linhas.map((l) => l.nome)).toEqual(['A', 'B', 'C'])
    expect(lida?.geradaEm).toBe('2026-12-01T00:00:00.000Z')
    expect(lerFotografiaFinal(null)).toBeNull()
    expect(lerFotografiaFinal({ qualquer: 1 })).toBeNull()
  })
})

// ───────── adaptador banco → motor (Payload simulado, sem banco) ─────────

describe('carregar-competicao (adaptador)', () => {
  type Doc = Record<string, unknown> & { id: number }
  type Where = Record<string, unknown>

  /** Filtro mínimo de `where` (equals, in, and) sobre documentos em memória. */
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

  const banco = (dados: Record<string, Doc[]>) => {
    const chamadas: { collection: string; overrideAccess?: boolean; select?: Record<string, unknown> }[] = []
    const payload = {
      find: async (args: { collection: string; where?: Where; overrideAccess?: boolean; select?: Record<string, unknown>; limit?: number }) => {
        chamadas.push({ collection: args.collection, overrideAccess: args.overrideAccess, select: args.select })
        const docs = (dados[args.collection] ?? []).filter((d) => casa(d, args.where))
        return { docs: args.limit === 1 ? docs.slice(0, 1) : docs }
      },
    }
    return { payload: payload as never, chamadas }
  }

  const dadosBase = (extra: { classificacao?: Partial<Doc>; temporada?: Partial<Doc>; pilotoOculto?: boolean } = {}): Record<string, Doc[]> => ({
    temporadas: [{ id: 1, nome: 'Teste 2026', ano: 2026, status: 'em-andamento', regra: 7, ...extra.temporada }],
    'temporada-categorias': [{ id: 50, temporada: 1, categoria: 3, ordem: 1, modo: 'automatico', publicada: true, ajustes: [], ...extra.classificacao }],
    'regras-pontuacao': [{ id: 7, nome: 'Regra de teste', tabelas: [{ id: 'x', nome: 'Padrão', pontos: [10, 8, 6] }], pontosVoltaRapida: 1 }],
    etapas: [
      { id: 11, temporada: 1, numero: 1, status: 'realizada', inicio: '2026-03-10T13:00:00.000Z', categorias: [3] },
      { id: 12, temporada: 1, numero: 2, status: 'agendada', inicio: '2026-04-10T13:00:00.000Z', categorias: [3] },
    ],
    corridas: [
      {
        id: 21,
        etapa: 11,
        categorias: [3],
        nome: 'Final',
        tipo: 'final',
        tabela: 'Padrão',
        contaParaClassificacao: true,
        fator: 1,
        status: 'oficial',
        voltaMaisRapidaManual: { inscricao: null, motivo: null },
        resultados: [
          { inscricao: 101, posicaoChegada: 1, status: 'classificado', melhorVoltaMs: 50_900, penalidade: { tipo: null, valor: null, motivo: null } },
          { inscricao: 102, posicaoChegada: 2, status: 'classificado', melhorVoltaMs: 50_100 },
          { inscricao: 103, posicaoChegada: 3, status: 'classificado', ajustarPosicao: true, posicaoOficial: 1, motivoAjuste: 'Recurso' },
        ],
      },
    ],
    inscricoes: [
      { id: 101, temporada: 1, categoria: 3, piloto: 201, numero: 33, equipe: 301, condicao: 'titular', status: 'ativa' },
      { id: 102, temporada: 1, categoria: 3, piloto: 202, numero: 7, condicao: 'titular', status: 'ativa' },
      { id: 103, temporada: 1, categoria: 3, piloto: 203, numero: 12, condicao: 'titular', status: 'ativa' },
    ],
    pilotos: [
      { id: 201, nome: 'Piloto Um da Silva', nomeExibicao: 'Piloto Um', slug: 'piloto-um', visibilidade: 'visivel', dataNascimento: '2010-01-01' },
      { id: 202, nome: 'Piloto Dois', slug: 'piloto-dois', visibilidade: extra.pilotoOculto ? 'oculto' : 'visivel' },
      { id: 203, nome: 'Piloto Três', slug: 'piloto-tres', visibilidade: 'visivel' },
    ],
    equipes: [{ id: 301, nome: 'Equipe Teste', sigla: 'ET' }],
  })

  it('modo automático: usa os nomes de campo do Payload (fator, melhorVoltaMs, ajustarPosicao) e calcula', async () => {
    const { payload } = banco(dadosBase())
    const c = await classificacaoDe({ payload, temporada: 1, categoria: 3, publico: true })
    expect(c?.fonte).toBe('automatica')
    // Correção manual: inscrição 103 em 1º (10); 101 → 2º (8); 102 → 3º (6) + volta mais rápida (1)
    expect(c?.linhas.map((l) => [l.nome, l.pontos])).toEqual([
      ['Piloto Três', 10],
      ['Piloto Um', 8],
      ['Piloto Dois', 7],
    ])
    expect(c?.linhas[1].equipeNome).toBe('Equipe Teste')
    expect(c?.linhas[1].numero).toBe(33)
    expect(c?.lider?.linha.nome).toBe('Piloto Três')
    expect(c?.etapasRealizadas).toBe(1)
  })

  it('modo público: respeita o acesso nas portas e nunca seleciona dados privados do piloto', async () => {
    const { payload, chamadas } = banco(dadosBase({ pilotoOculto: true }))
    const c = await classificacaoDe({ payload, temporada: 1, categoria: 3, publico: true })
    expect(chamadas.find((x) => x.collection === 'temporadas')?.overrideAccess).toBe(false)
    expect(chamadas.find((x) => x.collection === 'temporada-categorias')?.overrideAccess).toBe(false)
    const selPilotos = Object.keys(chamadas.find((x) => x.collection === 'pilotos')?.select ?? {})
    expect(selPilotos).not.toContain('dataNascimento')
    expect(selPilotos).not.toContain('autorizacaoImagem')
    // Piloto oculto continua na classificação (resultado oficial), mas sem link.
    const dois = c?.linhas.find((l) => l.nome === 'Piloto Dois')
    expect(dois?.pilotoSlug).toBeNull()
    expect(c?.linhas.find((l) => l.nome === 'Piloto Um')?.pilotoSlug).toBe('piloto-um')
  })

  it('classificação não publicada: nada no site, mas visível no painel', async () => {
    const { payload } = banco(dadosBase({ classificacao: { publicada: false } }))
    expect(await classificacaoDe({ payload, temporada: 1, categoria: 3, publico: true })).toBeNull()
    expect((await classificacaoDe({ payload, temporada: 1, categoria: 3 }))?.fonte).toBe('automatica')
  })

  it('modo manual usa as linhas digitadas, na ordem da posição', async () => {
    const { payload } = banco(
      dadosBase({
        classificacao: {
          modo: 'manual',
          linhasManuais: [
            { posicao: 2, piloto: 202, pontos: 50, vitorias: 1 },
            { posicao: 1, piloto: 201, numero: 33, equipe: 301, pontos: 61.5, vitorias: 2, podios: 3, corridas: 4 },
          ],
        },
      }),
    )
    const c = await classificacaoDe({ payload, temporada: 1, categoria: 3 })
    expect(c?.fonte).toBe('manual')
    expect(c?.linhas.map((l) => [l.posicao, l.nome, l.pontos, l.manual])).toEqual([
      [1, 'Piloto Um', 61.5, true],
      [2, 'Piloto Dois', 50, true],
    ])
    expect(c?.linhas[0].inscricao).toBe(101)
    expect(c?.lider?.linha.nome).toBe('Piloto Um')
  })

  it('temporada encerrada usa a fotografia final; sem regra avisa', async () => {
    const foto = { versao: 1, geradaEm: '2026-12-01T00:00:00.000Z', etapasRealizadas: 8, criterios: null, linhas: [{ chave: '9', nome: 'Campeão de Teste', posicao: 1, pontos: 99, inscricoes: [], porEtapa: [] }] }
    const { payload } = banco(dadosBase({ temporada: { status: 'encerrada' }, classificacao: { fotografiaFinal: foto } }))
    const c = await classificacaoDe({ payload, temporada: 1, categoria: 3, publico: true })
    expect(c?.fonte).toBe('fotografia')
    expect(c?.encerrada).toBe(true)
    expect(c?.linhas[0].nome).toBe('Campeão de Teste')

    const semRegra = banco(dadosBase({ temporada: { regra: null } }))
    const r = await classificacaoDe({ payload: semRegra.payload, temporada: 1, categoria: 3 })
    expect(r?.fonte).toBe('sem-regra')
    expect(r?.avisos[0]).toContain('regra de pontuação')
  })

  it('classificacoesDaTemporada devolve todas as categorias publicadas', async () => {
    const { payload } = banco(dadosBase())
    const todas = await classificacoesDaTemporada({ payload, temporada: 1, publico: true })
    expect(todas).toHaveLength(1)
    expect(todas[0].categoria).toBe(3)
  })

  it('paraRegra lê o documento de regras-pontuacao (critérios em linhas, descartes em grupo)', () => {
    const r = paraRegra({
      tabelas: [{ nome: 'A', pontos: [5, 3] }],
      descartes: { quantidade: 2, unidade: 'corrida', aPartirDeEtapas: 4, ultimaEtapaDescartavel: false },
      criteriosDesempate: [{ id: 'a', criterio: 'mais-poles' }, { id: 'b', criterio: 'invalido' }, { id: 'c', criterio: 'mais-vitorias' }],
    })
    expect(r.descartes).toEqual({ quantidade: 2, unidade: 'corrida', aPartirDeEtapas: 4, ultimaEtapaDescartavel: false })
    expect(r.criteriosDesempate).toEqual(['mais-poles', 'mais-vitorias'])
    expect(r.tabelas?.[0].pontos).toEqual([5, 3])
  })
})
