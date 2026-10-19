/**
 * Regra do BKS (informada pelo cliente): cada subcategoria é um grid próprio; a posição do piloto na etapa é a
 * MÉDIA das posições dele nas corridas da subcategoria (2º e 2º → 2º na etapa) e os pontos/classificação são
 * contados separadamente por subcategoria. Decisões do integrador (DECISOES_MEDIA em src/lib/classificacao.ts):
 * média igual → melhor posição na Corrida 2, depois na classificação (tomada de tempo), depois empate; abandono,
 * não largou, desclassificado ou não correr → última posição do grid.
 * Nomes, números, tempos e pontos abaixo são dados de TESTE, não dados oficiais da ASKART.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  calcularClassificacao,
  criarFotografiaFinal,
  DECISOES_MEDIA,
  lerFotografiaFinal,
  ROTULOS_CALCULO_DA_ETAPA,
  type Corrida,
  type EntradaClassificacao,
  type Etapa,
  type Inscricao,
  type LinhaClassificacao,
  type LinhaResultado,
  type Regra,
  type ResultadoClassificacao,
} from '@/lib/classificacao'
import {
  classificacaoDe,
  classificacoesDaTemporada,
  liderDaClassificacao,
  paraCorrida,
  paraRegra,
  resultadosDaEtapa,
  type ResultadoCategoriaNaEtapa,
} from '@/lib/carregar-competicao'
import { resultadoSomadoDaEtapa } from '@/lib/estatisticas'
import { podiosPorSubcategoria, separarClassificacao } from '@/lib/subcategorias'
import { explicacaoDaMedia, formatarMedia, montarMatrizes, type TabelaMatriz } from '@/components/site/resultados/matriz'
import { CONTEXTO_CALCULO_ANTIGO, protegerRegraEmUso, soPreencheCalculoAntigo } from '@/hooks/competicao/regras'
import { gravarFotografiasFinais, linhasCalculadasParaManual } from '@/hooks/competicao/encerramento'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: unknown }) => createElement('a', { href }, children as never),
}))

// ───────── construtores (motor) ─────────

const CAT = 'cat'
const TABELA = [25, 22, 20, 18, 16, 15, 14]

const ins = (id: string, subcategoria: string | null = 'Junior', extra: Partial<Inscricao> = {}): Inscricao => ({
  id,
  categoria: CAT,
  piloto: `p-${id}`,
  nome: id,
  numero: id.charCodeAt(0),
  condicao: 'titular',
  status: 'ativa',
  subcategoria,
  ...extra,
})

const etapa = (id: string, numero: number): Etapa => ({ id, numero, status: 'realizada', inicio: `2026-0${numero}-10T13:00:00.000Z` })

/** Linhas classificadas na ordem de chegada informada. */
const chegada = (...ids: string[]): LinhaResultado[] => ids.map((id, i) => ({ inscricao: id, posicaoChegada: i + 1, status: 'classificado' }))

let seq = 0
const corrida = (etapaId: string, nome: string, resultados: LinhaResultado[], extra: Partial<Corrida> = {}): Corrida => ({
  id: `c${++seq}`,
  etapa: etapaId,
  categorias: [CAT],
  nome,
  tipo: 'bateria',
  status: 'oficial',
  contaParaClassificacao: true,
  resultados,
  ...extra,
})
const tomada = (etapaId: string, resultados: LinhaResultado[], extra: Partial<Corrida> = {}) =>
  corrida(etapaId, 'Classificação', resultados, { tipo: 'tomada-de-tempo', contaParaClassificacao: false, ...extra })

const regraMedia = (extra: Partial<Regra> = {}): Regra => ({
  calculoDaEtapa: 'media-das-corridas',
  tabelas: [{ nome: 'Padrão', pontos: TABELA }],
  ...extra,
})

const calc = (e: Partial<EntradaClassificacao> & Pick<EntradaClassificacao, 'corridas' | 'inscricoes'>) =>
  calcularClassificacao({ regra: regraMedia(), categoria: CAT, etapas: [etapa('e1', 1)], ...e })

const porNome = (r: ResultadoClassificacao) => Object.fromEntries(r.linhas.map((l) => [l.nome, l]))
/** [nome, posição na etapa, média, pontos da etapa] de cada linha, na ordem da classificação. */
const naEtapa = (r: ResultadoClassificacao, idEtapa = 'e1') =>
  r.linhas.map((l) => {
    const e = l.porEtapa.find((x) => x.etapa === idEtapa)
    return [l.nome, e?.posicao ?? null, e?.media ?? null, e?.pontos ?? null]
  })
/** Linhas da etapa ordenadas pela posição na etapa (grupo a grupo, como no resultado da etapa). */
const ordemDaEtapa = (r: ResultadoClassificacao, idEtapa = 'e1') =>
  resultadoSomadoDaEtapa(r, idEtapa).map((l) => [l.nome, l.subcategoria ?? null, l.posicao, l.media ?? null, l.pontos])

// ───────── motor: regra do BKS ─────────

describe('regra do BKS: posição na etapa pela média das corridas', () => {
  it('exemplo do cliente: 2º nas duas corridas → 2º na etapa, com os pontos do 2º', () => {
    const r = calc({
      inscricoes: [ins('A'), ins('B'), ins('C')],
      corridas: [corrida('e1', 'Corrida 1', chegada('B', 'A', 'C')), corrida('e1', 'Corrida 2', chegada('B', 'A', 'C'))],
    })
    expect(r.porSubcategoria).toBe(true)
    expect(r.criterios.calculoDaEtapa).toBe('media-das-corridas')
    const a = porNome(r).A.porEtapa[0]
    expect(a).toEqual(expect.objectContaining({ posicao: 2, media: 2, pontos: 22, participou: true }))
    expect(a.posicoesNaMedia?.map((x) => [x.posicao, x.ultima])).toEqual([
      [2, false],
      [2, false],
    ])
    expect(naEtapa(r)).toEqual([
      ['B', 1, 1, 25],
      ['A', 2, 2, 22],
      ['C', 3, 3, 20],
    ])
    // Classificação da subcategoria: posições e pontos próprios.
    expect(r.linhas.map((l) => [l.nome, l.subcategoria, l.posicao, l.pontos])).toEqual([
      ['B', 'Junior', 1, 25],
      ['A', 'Junior', 2, 22],
      ['C', 'Junior', 3, 20],
    ])
  })

  it('média igual: desempata a melhor posição na Corrida 2 (a última corrida da etapa)', () => {
    const r = calc({
      inscricoes: [ins('A'), ins('B'), ins('C'), ins('D')],
      corridas: [corrida('e1', 'Corrida 1', chegada('A', 'B', 'C', 'D')), corrida('e1', 'Corrida 2', chegada('B', 'A', 'D', 'C'))],
    })
    // A 1º+2º = 1,5; B 2º+1º = 1,5 → B (melhor na Corrida 2). C 3º+4º = 3,5; D 4º+3º = 3,5 → D.
    expect(ordemDaEtapa(r)).toEqual([
      ['B', 'Junior', 1, 1.5, 25],
      ['A', 'Junior', 2, 1.5, 22],
      ['D', 'Junior', 3, 3.5, 20],
      ['C', 'Junior', 4, 3.5, 18],
    ])
  })

  it('a "última corrida" é a última pelo horário, mesmo cadastrada antes', () => {
    const r = calc({
      inscricoes: [ins('A'), ins('B')],
      corridas: [
        corrida('e1', 'Corrida 2', chegada('B', 'A'), { inicio: '2026-01-10T15:00:00.000Z' }),
        corrida('e1', 'Corrida 1', chegada('A', 'B'), { inicio: '2026-01-10T14:00:00.000Z' }),
      ],
    })
    expect(ordemDaEtapa(r).map((l) => l[0])).toEqual(['B', 'A'])
  })

  it('persistindo o empate: a classificação (tomada de tempo) decide; sem ela, fica empatado (mesma posição e pontos)', () => {
    const corridas = [
      corrida('e1', 'Corrida 1', [...chegada('C', 'D'), { inscricao: 'A', status: 'abandono' }, { inscricao: 'B', status: 'abandono' }]),
      corrida('e1', 'Corrida 2', [...chegada('C', 'D'), { inscricao: 'A', status: 'nao-largou' }, { inscricao: 'B', status: 'desclassificado' }]),
    ]
    const inscricoes = [ins('A'), ins('B'), ins('C'), ins('D')]
    // A e B: última posição (4º) nas duas corridas → média 4,0 e 4º na Corrida 2.
    const comTomada = calc({ inscricoes, corridas: [tomada('e1', chegada('C', 'B', 'D', 'A')), ...corridas] })
    expect(ordemDaEtapa(comTomada)).toEqual([
      ['C', 'Junior', 1, 1, 25],
      ['D', 'Junior', 2, 2, 22],
      ['B', 'Junior', 3, 4, 20],
      ['A', 'Junior', 4, 4, 18],
    ])
    const semTomada = calc({ inscricoes, corridas })
    expect(ordemDaEtapa(semTomada)).toEqual([
      ['C', 'Junior', 1, 1, 25],
      ['D', 'Junior', 2, 2, 22],
      ['A', 'Junior', 3, 4, 20],
      ['B', 'Junior', 3, 4, 20],
    ])
  })

  it('abandono conta como a última posição do grid (mesmo com posição oficial atrás de quem terminou)', () => {
    const r = calc({
      inscricoes: ['A', 'B', 'C', 'D', 'E'].map((id) => ins(id)),
      corridas: [
        corrida('e1', 'Corrida 1', [...chegada('B', 'C', 'D', 'E'), { inscricao: 'A', posicaoChegada: 5, voltas: 3, status: 'abandono' }]),
        corrida('e1', 'Corrida 2', chegada('A', 'B', 'C', 'D', 'E')),
      ],
    })
    // A: 5º (último do grid de 5) + 1º = 3,0. B 1,5; C 2,5; D 3,5; E 4,5.
    expect(ordemDaEtapa(r)).toEqual([
      ['B', 'Junior', 1, 1.5, 25],
      ['C', 'Junior', 2, 2.5, 22],
      ['A', 'Junior', 3, 3, 20],
      ['D', 'Junior', 4, 3.5, 18],
      ['E', 'Junior', 5, 4.5, 16],
    ])
    expect(porNome(r).A.porEtapa[0].posicoesNaMedia?.map((x) => [x.posicao, x.ultima])).toEqual([
      [5, true],
      [1, false],
    ])
  })

  it('não largou e desclassificado também valem a última posição; vários na mesma corrida ficam todos na última', () => {
    const r = calc({
      inscricoes: ['A', 'B', 'C', 'D'].map((id) => ins(id)),
      corridas: [
        corrida('e1', 'Corrida 1', [...chegada('A', 'B'), { inscricao: 'C', status: 'abandono' }, { inscricao: 'D', status: 'nao-largou' }]),
        corrida('e1', 'Corrida 2', [...chegada('A', 'C', 'D'), { inscricao: 'B', status: 'desclassificado' }]),
      ],
    })
    // A 1,0; B 2º + 4º (DSQ) = 3,0; C 4º + 2º = 3,0 → C (melhor na Corrida 2); D 4º + 3º = 3,5.
    expect(ordemDaEtapa(r)).toEqual([
      ['A', 'Junior', 1, 1, 25],
      ['C', 'Junior', 2, 3, 22],
      ['B', 'Junior', 3, 3, 20],
      ['D', 'Junior', 4, 3.5, 18],
    ])
    expect(porNome(r).B.porEtapa[0].desclassificado).toBe(true)
    expect(DECISOES_MEDIA.contamComoUltima).toEqual(expect.arrayContaining(['abandono', 'nao-largou', 'desclassificado', 'nao-classificado']))
  })

  it('piloto que só correu uma das corridas: a outra vale a última posição do grid', () => {
    const r = calc({
      inscricoes: ['A', 'B', 'C', 'D'].map((id) => ins(id)),
      corridas: [corrida('e1', 'Corrida 1', chegada('A', 'B', 'C', 'D')), corrida('e1', 'Corrida 2', chegada('B', 'C', 'D'))],
    })
    // A: 1º + (não correu = 4º) = 2,5; B 1,5; C 2,5 → C (2º na Corrida 2) à frente de A; D 3,5.
    expect(ordemDaEtapa(r)).toEqual([
      ['B', 'Junior', 1, 1.5, 25],
      ['C', 'Junior', 2, 2.5, 22],
      ['A', 'Junior', 3, 2.5, 20],
      ['D', 'Junior', 4, 3.5, 18],
    ])
    expect(porNome(r).A.porEtapa[0].posicoesNaMedia?.map((x) => [x.posicao, x.ultima])).toEqual([
      [1, false],
      [4, true],
    ])
  })

  it('quem só fez a tomada de tempo (nenhuma corrida) não tem posição na etapa nem pontos de tabela', () => {
    const r = calc({
      inscricoes: [ins('A'), ins('B'), ins('T')],
      corridas: [tomada('e1', chegada('T', 'A', 'B')), corrida('e1', 'Corrida 1', chegada('A', 'B')), corrida('e1', 'Corrida 2', chegada('A', 'B'))],
    })
    expect(porNome(r).T.porEtapa[0]).toEqual(expect.objectContaining({ participou: true, posicao: null, pontos: 0 }))
    // A e B: grid de 2 (T não correu nenhuma corrida e não entra na conta da última posição).
    expect(ordemDaEtapa(r).slice(0, 2)).toEqual([
      ['A', 'Junior', 1, 1, 25],
      ['B', 'Junior', 2, 2, 22],
    ])
  })

  it('warm-up nunca conta; tomada de tempo não dá pontos de tabela (só pole e desempate), mesmo marcada para contar', () => {
    const r = calc({
      regra: regraMedia({ pontosPole: 3 }),
      inscricoes: [ins('A'), ins('B')],
      corridas: [
        corrida('e1', 'Warm-up', chegada('B', 'A'), { tipo: 'warm-up', contaParaClassificacao: true }),
        tomada('e1', chegada('B', 'A'), { contaParaClassificacao: true }),
        corrida('e1', 'Corrida 1', chegada('A', 'B')),
        corrida('e1', 'Corrida 2', chegada('A', 'B')),
      ],
    })
    expect(ordemDaEtapa(r)).toEqual([
      ['A', 'Junior', 1, 1, 25],
      ['B', 'Junior', 2, 2, 25], // 22 do 2º + 3 da pole; nada pela tomada nem pelo warm-up
    ])
    expect(porNome(r).B.porEtapa[0].posicoesNaMedia).toHaveLength(2)
  })

  it('penalidades valem antes da média: posições (reordena a corrida) e pontos (descontados da etapa)', () => {
    const r = calc({
      inscricoes: ['A', 'B', 'C', 'D'].map((id) => ins(id)),
      corridas: [
        corrida('e1', 'Corrida 1', [
          { inscricao: 'A', posicaoChegada: 1, status: 'classificado', penalidade: { tipo: 'posicoes', valor: 2 } },
          ...chegada('B', 'C', 'D').map((l, i) => ({ ...l, posicaoChegada: i + 2 })),
        ]),
        corrida('e1', 'Corrida 2', [
          ...chegada('A'),
          { inscricao: 'B', posicaoChegada: 2, status: 'classificado', penalidade: { tipo: 'pontos', valor: 5 } },
          ...chegada('C', 'D').map((l, i) => ({ ...l, posicaoChegada: i + 3 })),
        ]),
      ],
    })
    // Corrida 1 oficial: B, C, A, D. A: 3º + 1º = 2,0; B: 1º + 2º = 1,5 → B 1º na etapa (25 − 5 de penalidade).
    expect(ordemDaEtapa(r)).toEqual([
      ['B', 'Junior', 1, 1.5, 25],
      ['A', 'Junior', 2, 2, 22],
      ['C', 'Junior', 3, 2.5, 20],
      ['D', 'Junior', 4, 4, 18],
    ])
    expect(resultadoSomadoDaEtapa(r, 'e1').find((l) => l.nome === 'B')).toEqual(expect.objectContaining({ ajustes: -5, total: 20 }))
    expect(r.linhas.map((l) => [l.nome, l.posicao, l.pontos])).toEqual([
      ['A', 1, 22],
      ['B', 2, 20],
      ['C', 3, 20],
      ['D', 4, 18],
    ])
  })

  it('convidados: "reclassificar" tira o convidado do grid; "manter posições" deixa ele ocupar a posição (sem pontuar)', () => {
    const inscricoes = [ins('A'), ins('B'), ins('G', 'Junior', { condicao: 'convidado' })]
    const corridas = [corrida('e1', 'Corrida 1', chegada('G', 'A', 'B')), corrida('e1', 'Corrida 2', chegada('G', 'A', 'B'))]
    const reclassificar = calc({ inscricoes, corridas })
    expect(ordemDaEtapa(reclassificar)).toEqual([
      ['A', 'Junior', 1, 1, 25],
      ['B', 'Junior', 2, 2, 22],
    ])
    const manter = calc({ regra: regraMedia({ convidados: 'manter-posicoes' }), inscricoes, corridas })
    expect(ordemDaEtapa(manter)).toEqual([
      ['A', 'Junior', 2, 2, 22],
      ['B', 'Junior', 3, 3, 20],
    ])
    expect(manter.linhas.map((l) => l.nome)).not.toContain('G')
  })
})

// ───────── subcategorias ─────────

/** Novatos: N1, N2, N3; Junior: J1, J2 — todos largando juntos (corridas sem subcategoria marcada). */
const grids = () => [ins('N1', 'Novatos'), ins('N2', 'Novatos'), ins('N3', 'Novatos'), ins('J1', 'Junior'), ins('J2', 'Junior')]
const voltas = (ordem: string[], tempos: Record<string, number>): LinhaResultado[] =>
  chegada(...ordem).map((l) => ({ ...l, melhorVolta: tempos[l.inscricao as string] ?? null }))
const etapaMista = () => [
  tomada('e1', chegada('J2', 'N2', 'N1', 'J1', 'N3')),
  corrida('e1', 'Corrida 1', voltas(['J1', 'N1', 'J2', 'N2', 'N3'], { J1: 50_000, N1: 50_100, J2: 49_500, N2: 49_000, N3: 50_500 })),
  corrida('e1', 'Corrida 2', chegada('N1', 'J1', 'N3', 'J2', 'N2')),
]

describe('regra do BKS: subcategorias independentes', () => {
  it('cada subcategoria tem a sua posição na etapa (posição relativa na chegada geral), os seus pontos e a sua pole', () => {
    const r = calc({ regra: regraMedia({ pontosPole: 3, pontosVoltaRapida: 1 }), inscricoes: grids(), corridas: etapaMista() })
    // Novatos: N1 1º+1º; N2 2º+3º = 2,5; N3 3º+2º = 2,5 → N3 (melhor na Corrida 2). Junior: J1 1º+1º; J2 2º+2º.
    // Pole de cada subcategoria (tomada geral J2, N2, …): J2 e N2. Volta mais rápida da Corrida 1 em cada uma: N2 e J2.
    expect(ordemDaEtapa(r)).toEqual([
      ['J1', 'Junior', 1, 1, 25],
      ['J2', 'Junior', 2, 2, 26], // 22 + 3 (pole) + 1 (volta mais rápida)
      ['N1', 'Novatos', 1, 1, 25],
      ['N3', 'Novatos', 2, 2.5, 22],
      ['N2', 'Novatos', 3, 2.5, 24], // 20 + 3 + 1
    ])
    const l = porNome(r)
    expect([l.J2.porEtapa[0].pole, l.N2.porEtapa[0].pole, l.N1.porEtapa[0].pole, l.J1.porEtapa[0].pole]).toEqual([true, true, false, false])
    expect([l.J2.poles, l.N2.poles, l.J2.voltasRapidas, l.N2.voltasRapidas]).toEqual([1, 1, 1, 1])
    // Vitórias e pódios contados dentro da subcategoria.
    expect([l.N1.vitorias, l.J1.vitorias, l.N2.podios]).toEqual([2, 2, 2])
    // Classificação do campeonato separada: cada subcategoria com o seu 1º.
    expect(r.porSubcategoria).toBe(true)
    expect(r.linhas.map((x) => [x.subcategoria, x.posicao, x.nome, x.pontos])).toEqual([
      ['Junior', 1, 'J2', 26],
      ['Junior', 2, 'J1', 25],
      ['Novatos', 1, 'N1', 25],
      ['Novatos', 2, 'N2', 24],
      ['Novatos', 3, 'N3', 22],
    ])
  })

  it('corridas marcadas para uma subcategoria só entram na média dela (a última corrida é a da subcategoria)', () => {
    const r = calc({
      inscricoes: [ins('N1', 'Novatos'), ins('N2', 'novatos'), ins('J1', 'Junior'), ins('J2', 'Junior')],
      corridas: [
        corrida('e1', 'Corrida 1', [...chegada('N1', 'N2'), { inscricao: 'J1', posicaoChegada: 3, status: 'classificado' }], {
          subcategorias: ['Novatos'],
          inicio: '2026-01-10T13:00:00.000Z',
        }),
        corrida('e1', 'Corrida 1', chegada('J1', 'J2'), { subcategorias: ['Junior'], inicio: '2026-01-10T13:30:00.000Z' }),
        corrida('e1', 'Corrida 2', chegada('N2', 'N1'), { subcategorias: ['NOVATOS'], inicio: '2026-01-10T14:00:00.000Z' }),
        corrida('e1', 'Corrida 2', chegada('J2', 'J1'), { subcategorias: ['Junior'], inicio: '2026-01-10T14:30:00.000Z' }),
      ],
    })
    // J1 aparece (por engano) na Corrida 1 dos Novatos: não conta para ele nem aumenta o grid dos Novatos.
    expect(ordemDaEtapa(r)).toEqual([
      ['J2', 'Junior', 1, 1.5, 25],
      ['J1', 'Junior', 2, 1.5, 22],
      ['N2', 'Novatos', 1, 1.5, 25],
      ['N1', 'Novatos', 2, 1.5, 22],
    ])
    expect(porNome(r).J1.porEtapa[0].posicoesNaMedia).toHaveLength(2)
  })

  it('campeonato: soma das etapas da subcategoria, com os desempates da regra aplicados dentro dela', () => {
    const r = calcularClassificacao({
      regra: regraMedia({ criteriosDesempate: ['melhor-resultado-ultima-etapa'] }),
      categoria: CAT,
      etapas: [etapa('e1', 1), etapa('e2', 2)],
      inscricoes: [ins('N1', 'Novatos'), ins('N2', 'Novatos'), ins('J1', 'Junior')],
      corridas: [
        corrida('e1', 'Corrida 1', chegada('N1', 'J1', 'N2')),
        corrida('e1', 'Corrida 2', chegada('N1', 'J1', 'N2')),
        corrida('e2', 'Corrida 1', chegada('J1', 'N2', 'N1')),
        corrida('e2', 'Corrida 2', chegada('J1', 'N2', 'N1')),
      ],
    })
    // Novatos: N1 25 + 22, N2 22 + 25 = 47 cada → N2 (1º na última etapa). Junior: J1 sozinho, 1º nas duas.
    expect(r.linhas.map((l) => [l.subcategoria, l.posicao, l.nome, l.pontos, l.posicaoAnterior])).toEqual([
      ['Junior', 1, 'J1', 50, 1],
      ['Novatos', 1, 'N2', 47, 2],
      ['Novatos', 2, 'N1', 47, 1],
    ])
    expect(r.linhas[2].desempate).toBe('melhor-resultado-ultima-etapa')
    expect(r.criterios.empates).toEqual([
      expect.objectContaining({ pontos: 47, posicoes: [1, 2], resolvidoPor: ['melhor-resultado-ultima-etapa'], subcategoria: 'Novatos' }),
    ])
  })

  it('categoria sem subcategorias (Cadete, Mirim): a categoria inteira é um grid, com a mesma regra', () => {
    const r = calc({
      inscricoes: [ins('A', null), ins('B', null), ins('C', null)],
      corridas: [corrida('e1', 'Corrida 1', chegada('A', 'B', 'C')), corrida('e1', 'Corrida 2', chegada('A', 'C', 'B'))],
    })
    // B 2º+3º = 2,5; C 3º+2º = 2,5 → C (melhor na Corrida 2).
    expect(ordemDaEtapa(r)).toEqual([
      ['A', null, 1, 1, 25],
      ['C', null, 2, 2.5, 22],
      ['B', null, 3, 2.5, 20],
    ])
    expect(r.linhas.map((l) => [l.nome, l.subcategoria, l.posicao])).toEqual([
      ['A', null, 1],
      ['C', null, 2],
      ['B', null, 3],
    ])
    // Uma tabela só no site, com a posição da classificação.
    const separada = separarClassificacao(r.linhas, [], { pontosPorSubcategoria: true })
    expect(separada.porSubcategoria).toBe(false)
    expect(separada.grupos[0].linhas.map((l) => [l.linha.nome, l.posicao, l.posicaoGeral])).toEqual([
      ['A', 1, null],
      ['C', 2, null],
      ['B', 3, null],
    ])
  })

  it('quem está sem subcategoria numa categoria que tem: grid próprio "sem subcategoria", no fim', () => {
    const r = calc({
      inscricoes: [ins('N1', 'Novatos'), ins('N2', 'Novatos'), ins('S', null)],
      corridas: [corrida('e1', 'Corrida 1', chegada('S', 'N1', 'N2')), corrida('e1', 'Corrida 2', chegada('S', 'N2', 'N1'))],
    })
    expect(r.linhas.map((l) => [l.subcategoria, l.posicao, l.nome, l.pontos])).toEqual([
      ['Novatos', 1, 'N2', 25], // N1 1,5 e N2 1,5 → N2 (melhor na Corrida 2)
      ['Novatos', 2, 'N1', 22],
      [null, 1, 'S', 25],
    ])
  })
})

// ───────── cálculo antigo (por corrida) ─────────

describe('cálculo antigo ("Pontos em cada corrida") continua igual', () => {
  const entrada = (regra: Regra) => ({
    regra: { tabelas: [{ nome: 'Padrão', pontos: TABELA }], pontosPole: 3, pontosVoltaRapida: 1, ...regra },
    categoria: CAT,
    etapas: [etapa('e1', 1)],
    inscricoes: grids(),
    corridas: etapaMista(),
  })

  it('regra sem o campo (gravada antes dele) = "por corrida": pontos em cada corrida, somados, classificação única', () => {
    const sem = calcularClassificacao(entrada({}))
    const porCorrida = calcularClassificacao(entrada({ calculoDaEtapa: 'por-corrida' }))
    expect(porCorrida).toEqual(sem)
    expect(sem.porSubcategoria).toBe(false)
    expect(sem.criterios.calculoDaEtapa).toBe('por-corrida')
    // Corrida 1 (J1 N1 J2 N2 N3): 25 22 20 18+1 16; Corrida 2 (N1 J1 N3 J2 N2): 25 22 20 18 16; pole geral: J2.
    expect(sem.linhas.map((l) => [l.posicao, l.nome, l.pontos])).toEqual([
      [1, 'J1', 47],
      [2, 'N1', 47],
      [3, 'J2', 41],
      [4, 'N3', 36],
      [5, 'N2', 35],
    ])
    expect(sem.linhas.every((l) => !('subcategoria' in l))).toBe(true)
    expect(sem.linhas.every((l) => l.porEtapa.every((e) => !('media' in e) && !('posicoesNaMedia' in e)))).toBe(true)
    expect(porNome(sem).N2.porEtapa[0].pole).toBe(false)
  })

  it('rótulos das opções (painel)', () => {
    expect(ROTULOS_CALCULO_DA_ETAPA).toEqual({
      'media-das-corridas': 'Média das posições nas corridas, por subcategoria (regra do BKS)',
      'por-corrida': 'Pontos em cada corrida (antigo)',
    })
  })
})

describe('avisos do cálculo pela média', () => {
  it('pontos manuais, fator da corrida e descarte de corridas avulsas não se aplicam: o administrador é avisado', () => {
    const r = calc({
      regra: regraMedia({ descartes: { quantidade: 1, unidade: 'corrida' } }),
      inscricoes: [ins('A'), ins('B')],
      corridas: [
        corrida('e1', 'Corrida 1', [{ ...chegada('A')[0], pontosManuais: 99 }, ...chegada('B').map((l) => ({ ...l, posicaoChegada: 2 }))]),
        corrida('e1', 'Corrida 2', chegada('A', 'B'), { fatorPontuacao: 2 }),
      ],
    })
    expect(porNome(r).A.pontos).toBe(25)
    expect(r.avisos.join('\n')).toContain('pontos manuais')
    expect(r.avisos.join('\n')).toContain('fator da corrida não se aplica')
    expect(r.avisos.join('\n')).toContain('o descarte foi feito por etapas inteiras')
    expect(r.criterios.descartes?.unidade).toBe('etapa')
  })
})

// ───────── adaptador, resultado da etapa e site ─────────

type Doc = Record<string, unknown> & { id: number }
type Where = Record<string, unknown>
const idTexto = (x: unknown) => String(x && typeof x === 'object' && 'id' in x ? (x as { id: unknown }).id : x)
const casa = (doc: Doc, where?: Where): boolean => {
  if (!where) return true
  return Object.entries(where).every(([campo, cond]) => {
    if (campo === 'and') return (cond as Where[]).every((w) => casa(doc, w))
    const c = cond as { equals?: unknown; not_equals?: unknown; in?: unknown[] }
    const v = doc[campo]
    if ('equals' in c) return idTexto(v) === String(c.equals)
    if ('not_equals' in c) return idTexto(v) !== String(c.not_equals)
    if ('in' in c) return (c.in ?? []).map(String).includes(idTexto(v))
    return true
  })
}
const banco = (dados: Record<string, Doc[]>) => {
  const gravados: { collection: string; id: unknown; data: Record<string, unknown> }[] = []
  const payload = {
    find: async (args: { collection: string; where?: Where; limit?: number }) => {
      const docs = (dados[args.collection] ?? []).filter((d) => casa(d, args.where))
      return { docs: args.limit === 1 ? docs.slice(0, 1) : docs }
    },
    findByID: async (args: { collection: string; id: unknown }) => (dados[args.collection] ?? []).find((d) => String(d.id) === String(args.id)) ?? null,
    update: async (args: { collection: string; id: unknown; data: Record<string, unknown> }) => {
      gravados.push({ collection: args.collection, id: args.id, data: args.data })
      return { id: args.id, ...args.data }
    },
  }
  return { payload, gravados }
}

const SUBCATEGORIAS = [{ nome: 'Novatos' }, { nome: 'Junior' }, { nome: 'Graduados' }]
const linha = (inscricao: number, posicaoChegada: number | null, status = 'classificado') => ({ inscricao, posicaoChegada, status })

/**
 * Etapa de teste do BKS, categoria F400 (Novatos, Junior, Graduados), regra pela média.
 * Ana (101), Caio (103) e Edu (105): Novatos; Bruno (102) e Davi (104): Junior. Sessões para todas as subcategorias.
 * Classificação: Bruno, Ana, Caio, Davi, Edu. Corrida 1: Ana, Bruno, Edu, Caio; Davi abandonou.
 * Corrida 2: Caio, Ana, Davi, Bruno, Edu.
 */
function temporadaBks(opcoes: { calculo?: string | null; encerrada?: boolean; fotografia?: unknown } = {}): Record<string, Doc[]> {
  const base = { etapa: 11, categorias: [3], status: 'oficial', contaParaClassificacao: true }
  const calculo = opcoes.calculo === undefined ? 'media-das-corridas' : opcoes.calculo
  return {
    temporadas: [{ id: 1, nome: 'BKS Teste', ano: 2026, status: opcoes.encerrada ? 'encerrada' : 'em-andamento', regra: 7, fonteDados: 'completa' }],
    'temporada-categorias': [
      { id: 50, temporada: 1, categoria: 3, ordem: 1, regra: null, modo: 'automatico', publicada: true, fotografiaFinal: opcoes.fotografia ?? null },
    ],
    'regras-pontuacao': [
      { id: 7, nome: 'Regra de teste', tabelas: [{ id: 'x', nome: 'Padrão', pontos: [25, 22, 20, 18, 16] }], pontosPole: 3, ...(calculo ? { calculoDaEtapa: calculo } : {}) },
    ],
    etapas: [{ id: 11, temporada: 1, numero: 1, status: 'realizada', inicio: '2026-03-10T11:00:00.000Z', categorias: [3] }],
    corridas: [
      { id: 20, ...base, nome: 'Warm-up', tipo: 'warm-up', contaParaClassificacao: false, inicio: '2026-03-10T11:00:00.000Z', resultados: [linha(105, 1), linha(101, 2)] },
      {
        id: 21,
        ...base,
        nome: 'Classificação',
        tipo: 'tomada-de-tempo',
        contaParaClassificacao: false,
        inicio: '2026-03-10T12:00:00.000Z',
        resultados: [linha(102, 1), linha(101, 2), linha(103, 3), linha(104, 4), linha(105, 5)],
      },
      {
        id: 22,
        ...base,
        nome: 'Corrida 1',
        tipo: 'bateria',
        inicio: '2026-03-10T13:00:00.000Z',
        resultados: [linha(101, 1), linha(102, 2), linha(105, 3), linha(103, 4), linha(104, null, 'abandono')],
      },
      {
        id: 23,
        ...base,
        nome: 'Corrida 2',
        tipo: 'bateria',
        inicio: '2026-03-10T14:00:00.000Z',
        resultados: [linha(103, 1), linha(101, 2), linha(104, 3), linha(102, 4), linha(105, 5)],
      },
    ],
    inscricoes: [
      { id: 101, temporada: 1, categoria: 3, piloto: 201, numero: 33, condicao: 'titular', status: 'ativa', subcategoria: 'Novatos' },
      { id: 102, temporada: 1, categoria: 3, piloto: 202, numero: 7, condicao: 'titular', status: 'ativa', subcategoria: 'Junior' },
      { id: 103, temporada: 1, categoria: 3, piloto: 203, numero: 12, condicao: 'titular', status: 'ativa', subcategoria: 'Novatos' },
      { id: 104, temporada: 1, categoria: 3, piloto: 204, numero: 4, condicao: 'titular', status: 'ativa', subcategoria: 'Junior' },
      { id: 105, temporada: 1, categoria: 3, piloto: 205, numero: 5, condicao: 'titular', status: 'ativa', subcategoria: 'Novatos' },
    ],
    pilotos: [
      { id: 201, nome: 'Ana', slug: 'ana', visibilidade: 'visivel' },
      { id: 202, nome: 'Bruno', slug: 'bruno', visibilidade: 'visivel' },
      { id: 203, nome: 'Caio', slug: 'caio', visibilidade: 'visivel' },
      { id: 204, nome: 'Davi', slug: 'davi', visibilidade: 'visivel' },
      { id: 205, nome: 'Edu', slug: 'edu', visibilidade: 'visivel' },
    ],
    equipes: [],
    categorias: [{ id: 3, nome: 'F400', sigla: 'F4', slug: 'f400', subcategorias: SUBCATEGORIAS }],
  }
}

async function resultadoBks(opcoes: Parameters<typeof temporadaBks>[0] = {}): Promise<ResultadoCategoriaNaEtapa> {
  const r = await resultadosDaEtapa({ payload: banco(temporadaBks(opcoes)).payload as never, etapa: 11, publico: true })
  expect(r?.categorias).toHaveLength(1)
  return r!.categorias[0]
}

describe('leitura (adaptador)', () => {
  it('paraRegra lê "Como a etapa é pontuada"; vazio ou inválido = sem valor (o motor usa "por corrida")', () => {
    expect(paraRegra({ calculoDaEtapa: 'media-das-corridas' }).calculoDaEtapa).toBe('media-das-corridas')
    expect(paraRegra({ calculoDaEtapa: 'por-corrida' }).calculoDaEtapa).toBe('por-corrida')
    expect(paraRegra({}).calculoDaEtapa).toBeNull()
    expect(paraRegra({ calculoDaEtapa: 'outro' }).calculoDaEtapa).toBeNull()
  })

  it('paraCorrida lê as subcategorias da sessão (vazio = todas)', () => {
    expect(paraCorrida({ id: 1, etapa: 2, subcategorias: [' Novatos ', 'Junior'] }).subcategorias).toEqual(['Novatos', 'Junior'])
    expect(paraCorrida({ id: 1, etapa: 2 }).subcategorias).toEqual([])
  })

  it('resultado da etapa: por subcategoria, com posição na etapa, média, pontos e a pole de cada uma', async () => {
    const cat = await resultadoBks()
    expect(cat.calculoDaEtapa).toBe('media-das-corridas')
    expect(cat.corridas.map((c) => [c.nome, c.conta])).toEqual([
      ['Warm-up', false],
      ['Classificação', false],
      ['Corrida 1', true],
      ['Corrida 2', true],
    ])
    // Novatos: Ana 1º+2º = 1,5; Caio 3º+1º = 2,0; Edu 2º+3º = 2,5. Junior: Bruno 1º+2º = 1,5; Davi (abandono = 2º) + 1º = 1,5
    // → Davi (melhor na Corrida 2). Poles: Bruno (Junior) e Ana (Novatos), 3 pontos cada.
    expect(cat.etapa.map((l) => [l.nome, l.subcategoria, l.posicao, l.media, l.total, l.pole])).toEqual([
      ['Davi', 'Junior', 1, 1.5, 25, false],
      ['Bruno', 'Junior', 2, 1.5, 25, true],
      ['Ana', 'Novatos', 1, 1.5, 28, true],
      ['Caio', 'Novatos', 2, 2, 22, false],
      ['Edu', 'Novatos', 3, 2.5, 20, false],
    ])
  })

  it('classificação: pontos e posições próprios de cada subcategoria; sem líder único com mais de uma', async () => {
    const [c] = await classificacoesDaTemporada({ payload: banco(temporadaBks()).payload as never, temporada: 1, publico: true })
    expect(c.porSubcategoria).toBe(true)
    expect(c.linhas.map((l) => [l.subcategoria, l.posicao, l.nome, l.pontos])).toEqual([
      ['Junior', 1, 'Bruno', 25],
      ['Junior', 2, 'Davi', 25],
      ['Novatos', 1, 'Ana', 28],
      ['Novatos', 2, 'Caio', 22],
      ['Novatos', 3, 'Edu', 20],
    ])
    expect(c.lider).toBeNull()
    // Cálculo antigo (regra sem o campo): uma classificação só, como antes.
    const [antiga] = await classificacoesDaTemporada({ payload: banco(temporadaBks({ calculo: null })).payload as never, temporada: 1, publico: true })
    expect(antiga.porSubcategoria).toBe(false)
    expect(antiga.linhas.map((l) => l.posicao)).toEqual([1, 2, 3, 4, 5])
    expect(antiga.lider).not.toBeNull()
  })

  it('líder: com uma subcategoria só vale o 1º dela; com várias, só o destaque manual', () => {
    const l = (nome: string, posicao: number, subcategoria: string | null, pontos = 10) =>
      ({ chave: nome, nome, posicao, pontos, subcategoria }) as unknown as LinhaClassificacao & { subcategoria: string | null }
    const agora = new Date('2026-05-01T12:00:00.000Z')
    expect(liderDaClassificacao([l('A', 1, 'Novatos'), l('B', 2, 'Novatos')], true, null, agora)?.linha.nome).toBe('A')
    expect(liderDaClassificacao([l('A', 1, 'Novatos'), l('J', 1, 'Junior')], true, null, agora)).toBeNull()
    expect(liderDaClassificacao([l('A', 1, 'Novatos'), l('J', 1, 'Junior')], false, null, agora)?.linha.nome).toBe('A')
  })

  it('fotografia final por subcategoria: grava e lê a marca; o site mantém a subcategoria em que o piloto pontuou', async () => {
    const linhas = [
      { chave: '202', posicao: 1, inscricao: 102, inscricoes: [102], piloto: 202, nome: 'Bruno', subcategoria: 'Junior', pontos: 25, porEtapa: [] },
      { chave: '201', posicao: 1, inscricao: 101, inscricoes: [101], piloto: 201, nome: 'Ana', subcategoria: 'Novatos', pontos: 28, porEtapa: [] },
      { chave: '203', posicao: 2, inscricao: 103, inscricoes: [103], piloto: 203, nome: 'Caio', subcategoria: 'Novatos', pontos: 22, porEtapa: [] },
    ] as unknown as LinhaClassificacao[]
    const foto = criarFotografiaFinal({ linhas, porSubcategoria: true, etapasRealizadas: 1 }, new Date('2026-12-01T00:00:00.000Z'))
    expect(lerFotografiaFinal(JSON.parse(JSON.stringify(foto)))?.porSubcategoria).toBe(true)
    expect(lerFotografiaFinal(criarFotografiaFinal({ linhas }))?.porSubcategoria).toBeUndefined()

    // Inscrição do Caio mudou depois do encerramento: a fotografia continua com "Novatos".
    const dados = temporadaBks({ encerrada: true, fotografia: foto })
    dados.inscricoes = dados.inscricoes.map((i) => (i.id === 103 ? { ...i, subcategoria: 'Junior' } : i))
    const c = await classificacaoDe({ payload: banco(dados).payload as never, temporada: 1, categoria: 3, publico: true })
    expect(c?.fonte).toBe('fotografia')
    expect(c?.porSubcategoria).toBe(true)
    expect(c?.linhas.map((l) => [l.nome, l.subcategoria, l.posicao])).toEqual([
      ['Bruno', 'Junior', 1],
      ['Ana', 'Novatos', 1],
      ['Caio', 'Novatos', 2],
    ])
    expect(c?.lider).toBeNull()
    // Pódio de cada subcategoria (ordem cadastrada na categoria), para o histórico de campeões.
    expect(podiosPorSubcategoria(c!.linhas, SUBCATEGORIAS).map((g) => [g.nome, g.podio.map((x) => x.nome)])).toEqual([
      ['Novatos', ['Ana', 'Caio']],
      ['Junior', ['Bruno']],
    ])
  })
})

describe('encerramento com pontos por subcategoria', () => {
  it('fotografia guarda a subcategoria de cada linha; campeão/vice/3º únicos ficam vazios com mais de uma subcategoria', async () => {
    const { payload, gravados } = banco(temporadaBks({ encerrada: true }))
    const n = await gravarFotografiasFinais({ payload, context: {} } as never, 1)
    expect(n).toBe(1)
    const dados = gravados[0].data as { fotografiaFinal: { porSubcategoria?: boolean; linhas: LinhaClassificacao[] }; campeao: unknown }
    expect(dados.fotografiaFinal.porSubcategoria).toBe(true)
    expect(dados.fotografiaFinal.linhas.map((l) => [l.subcategoria, l.posicao, l.nome])).toEqual([
      ['Junior', 1, 'Bruno'],
      ['Junior', 2, 'Davi'],
      ['Novatos', 1, 'Ana'],
      ['Novatos', 2, 'Caio'],
      ['Novatos', 3, 'Edu'],
    ])
    expect([dados.campeao, (dados as Record<string, unknown>).vice, (dados as Record<string, unknown>).terceiro]).toEqual([null, null, null])
  })

  it('ponto de partida do modo manual: subcategorias em sequência, numeradas 1..N (o modo manual tem posição única)', async () => {
    const { payload } = banco(temporadaBks())
    const linhas = await linhasCalculadasParaManual({ payload, context: {} } as never, 1, 3)
    expect(linhas.map((l) => [l.posicao, l.pontos])).toEqual([
      [1, 25],
      [2, 25],
      [3, 28],
      [4, 22],
      [5, 20],
    ])
  })
})

// ───────── matriz da etapa (site) ─────────

const celulaDe = (t: TabelaMatriz, nome: string, coluna: string) => {
  const i = t.colunas.findIndex((c) => c.titulo === coluna)
  return t.linhas.find((l) => l.nome === nome)!.celulas[i]
}

describe('matriz da etapa com a regra do BKS', () => {
  it('coluna "Resultado da etapa": posição na subcategoria, média e pontos, sem posição geral; corridas sem pontos próprios', async () => {
    const r = montarMatrizes(await resultadoBks(), SUBCATEGORIAS)
    expect(r.porSubcategoria).toBe(true)
    expect(r.tabelas.map((t) => [t.nome, t.linhas.map((l) => l.nome)])).toEqual([
      ['Novatos', ['Ana', 'Caio', 'Edu']],
      ['Junior', ['Davi', 'Bruno']],
    ])
    const [novatos, junior] = r.tabelas
    const etapaCol = r.colunas.find((c) => c.tipo === 'etapa')!
    expect([etapaCol.titulo, etapaCol.subtitulo, etapaCol.comPontos]).toEqual(['Resultado da etapa', 'média das corridas', true])
    expect(r.colunas.filter((c) => c.tipo === 'corrida').every((c) => !c.comPontos)).toBe(true)
    expect(celulaDe(novatos, 'Caio', 'Resultado da etapa')).toEqual(expect.objectContaining({ posicao: 2, posicaoGeral: null, media: 2, pontos: 22 }))
    expect(celulaDe(junior, 'Davi', 'Resultado da etapa')).toEqual(expect.objectContaining({ posicao: 1, posicaoGeral: null, media: 1.5, pontos: 25 }))
    // Sessões: posição dentro da subcategoria, sem pontos.
    expect(celulaDe(novatos, 'Edu', 'Corrida 1')).toEqual(expect.objectContaining({ posicao: 2, posicaoGeral: 3, pontos: null, contaComo: null }))
    // Abandono: mostra a situação e que valeu a última posição do grid na média.
    expect(celulaDe(junior, 'Davi', 'Corrida 1')).toEqual(expect.objectContaining({ situacao: 'Abandono', contaComo: 2 }))
    // Pole de cada subcategoria na coluna da classificação.
    expect([celulaDe(novatos, 'Ana', 'Classificação').pole, celulaDe(junior, 'Bruno', 'Classificação').pole]).toEqual([true, true])
    expect(celulaDe(novatos, 'Caio', 'Classificação').pole).toBe(false)
  })

  it('HTML: "2º · média 2,0 · 22 pts" na coluna da etapa (leitor de tela: "2º, média 2,0, 22 pontos"), legenda da regra', async () => {
    const { MatrizEtapa } = await import('@/components/site/resultados/MatrizEtapa')
    const html = renderToStaticMarkup(
      createElement(MatrizEtapa, { categoria: { id: 3, nome: 'F400', subcategorias: SUBCATEGORIAS }, resultado: await resultadoBks() }),
    )
    const visivel = html
      .replace(/<span class="visualmente-oculto">[^<]*<\/span>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
    const falado = html
      .replace(/<span aria-hidden="true">[^<]*<\/span>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
    expect(visivel).toMatch(/2º ?· média 2,0 ?· 22 pts/)
    expect(falado).toContain('2º, média 2,0, 22 pontos')
    expect(visivel).not.toMatch(/22 pts ?\(\d+º geral\)/)
    expect(visivel).toContain('vale 2º na média')
    expect(html).toContain(explicacaoDaMedia())
    expect(html.match(/>Pole</g)).toHaveLength(2)
    expect(html.match(/<table/g)).toHaveLength(2)
  })

  it('explicação da regra acompanha as decisões do motor; média com uma casa e vírgula', () => {
    expect(explicacaoDaMedia()).toBe(
      'Resultado da etapa: posição dentro da subcategoria pela média das posições nas corridas dela (média igual: desempata a melhor posição na última corrida, depois a melhor posição na classificação (tomada de tempo)). Abandono, não classificado, desclassificado, não largou e não correr vale a última posição do grid.',
    )
    expect([formatarMedia(2), formatarMedia(2.5), formatarMedia(2.333)]).toEqual(['2,0', '2,5', '2,3'])
  })

  it('cálculo antigo: a matriz mostra pontos em cada corrida e a posição geral, como antes', async () => {
    const r = montarMatrizes(await resultadoBks({ calculo: null }), SUBCATEGORIAS)
    expect(r.colunas.filter((c) => c.tipo === 'corrida').every((c) => c.comPontos)).toBe(true)
    const [novatos] = r.tabelas
    expect(celulaDe(novatos, 'Ana', 'Resultado da etapa')).toEqual(expect.objectContaining({ media: null, posicaoGeral: 1 }))
    expect(celulaDe(novatos, 'Ana', 'Corrida 1').contaComo).toBeNull()
  })
})

describe('classificação por subcategoria no site', () => {
  it('tabelas separadas com a posição de cada subcategoria, sem "(Xº geral)"', async () => {
    const [c] = await classificacoesDaTemporada({ payload: banco(temporadaBks()).payload as never, temporada: 1, publico: true })
    const r = separarClassificacao(c.linhas, SUBCATEGORIAS, { pontosPorSubcategoria: true })
    expect(r.pontosPorSubcategoria).toBe(true)
    expect(r.grupos.map((g) => [g.nome, g.linhas.map((l) => [l.linha.nome, l.posicao, l.posicaoGeral, l.linha.pontos])])).toEqual([
      ['Novatos', [['Ana', 1, null, 28], ['Caio', 2, null, 22], ['Edu', 3, null, 20]]],
      ['Junior', [['Bruno', 1, null, 25], ['Davi', 2, null, 25]]],
    ])

    const { ClassificacaoCategoria } = await import('@/components/site/bks/Tabelas')
    const html = renderToStaticMarkup(createElement(ClassificacaoCategoria, { classificacao: c, nome: 'F400', subcategorias: SUBCATEGORIAS, idBase: 'cat-3' }))
    expect(html.match(/<table/g)).toHaveLength(2)
    expect(html).not.toContain('geral)')
    expect(html).toContain('Posição e pontos contados só entre os pilotos da subcategoria.')
    expect(html).toContain('a posição vem da média das posições nas corridas da subcategoria')
    // Mesmo na versão compacta as subcategorias ficam separadas (as posições se repetem entre elas).
    const compacta = renderToStaticMarkup(createElement(ClassificacaoCategoria, { classificacao: c, nome: 'F400', subcategorias: SUBCATEGORIAS, compacta: true }))
    expect(compacta.match(/<table/g)).toHaveLength(2)
  })
})

// ───────── proteção da regra usada por temporada encerrada ─────────

describe('regra de temporada encerrada e o novo campo', () => {
  const reqFalso = (status: string, context: Record<string, unknown> = {}) =>
    ({
      context,
      payload: {
        find: async (args: { collection: string; where?: Where }) => {
          const dados: Record<string, Doc[]> = {
            temporadas: [{ id: 1, nome: 'BKS 2025', status, regra: 7 }],
            'temporada-categorias': [],
            // "etapa.temporada": o filtro do hook pela temporada da etapa (o banco simulado não segue relações)
            corridas: [{ id: 9, etapa: 1, 'etapa.temporada': 1, tabela: 'Padrão' }],
          }
          return { docs: (dados[args.collection] ?? []).filter((d) => casa(d, args.where)) }
        },
      },
    }) as never
  const original = (calculoDaEtapa: string | null) => ({ id: 7, nome: 'Regra', calculoDaEtapa, tabelas: [{ nome: 'Padrão', pontos: [25, 22] }] })
  const proteger = (data: Record<string, unknown>, anterior: Record<string, unknown>, req: never) =>
    protegerRegraEmUso({ data, originalDoc: anterior, operation: 'update', req } as never)

  it('pelo painel, a regra de temporada encerrada não muda o cálculo; vazio → "por corrida" é permitido (não muda nada)', async () => {
    await expect(proteger({ calculoDaEtapa: 'media-das-corridas' }, original(null), reqFalso('encerrada'))).rejects.toThrow(/temporada encerrada/)
    await expect(proteger({ calculoDaEtapa: 'por-corrida' }, original('media-das-corridas'), reqFalso('encerrada'))).rejects.toThrow(/temporada encerrada/)
    await expect(proteger({ calculoDaEtapa: 'por-corrida' }, original(null), reqFalso('encerrada'))).resolves.toEqual({ calculoDaEtapa: 'por-corrida' })
  })

  it('pelo servidor (atualização do site): volta para "por corrida" mesmo com o padrão gravado pela migração', async () => {
    const req = reqFalso('encerrada', { [CONTEXTO_CALCULO_ANTIGO]: true })
    await expect(proteger({ calculoDaEtapa: 'por-corrida' }, original('media-das-corridas'), req)).resolves.toEqual({ calculoDaEtapa: 'por-corrida' })
    // A marca não libera outras mudanças.
    await expect(proteger({ calculoDaEtapa: 'media-das-corridas' }, original(null), req)).rejects.toThrow(/temporada encerrada/)
    expect(soPreencheCalculoAntigo('por-corrida', 'media-das-corridas')).toBe(false)
    expect(soPreencheCalculoAntigo('por-corrida', undefined)).toBe(true)
  })

  it('gravação parcial sem as tabelas não confere tabelas "removidas" (antes recusava, com corrida usando a tabela)', async () => {
    await expect(proteger({ calculoDaEtapa: 'media-das-corridas' }, original(null), reqFalso('em-andamento'))).resolves.toEqual({
      calculoDaEtapa: 'media-das-corridas',
    })
    // Tabela renomeada de verdade continua recusada.
    await expect(
      proteger({ tabelas: [{ nome: 'Outra', pontos: [25, 22] }] }, original('media-das-corridas'), reqFalso('em-andamento')),
    ).rejects.toThrow(/está em uso/)
  })
})
