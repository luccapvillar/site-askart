/**
 * Subcategorias na classificação, na programação da etapa e nas corridas (horários diferentes por
 * subcategoria). Nomes, números, horários e pontos abaixo são dados de TESTE, não dados oficiais da ASKART.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { classificacoesDaTemporada, comSubcategorias, resultadosDaEtapa } from '@/lib/carregar-competicao'
import type { Inscricao, LinhaClassificacao } from '@/lib/classificacao'
import { agruparHorariosPorSubcategoria, separarClassificacao } from '@/lib/subcategorias'
import { agruparProgramacao } from '@/components/site/bks/programacao'
import { montarMatrizes } from '@/components/site/resultados/matriz'
import { prepararCorrida } from '@/hooks/competicao/corridas'
import { tituloCorrida } from '@/hooks/competicao/texto'
import { chaveCorrida, conferirSubcategoriasDaCorrida, planejarCorridas } from '@/hooks/competicao/validacoes'
import type { Corrida } from '@/payload-types'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: unknown }) => createElement('a', { href }, children as never),
}))

// ───────── banco simulado (só o que o adaptador e os hooks usam) ─────────

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

const banco = (dados: Record<string, Doc[]>) => ({
  find: async (args: { collection: string; where?: Where; limit?: number }) => {
    const docs = (dados[args.collection] ?? []).filter((d) => casa(d, args.where))
    return { docs: args.limit === 1 ? docs.slice(0, 1) : docs }
  },
  findByID: async (args: { collection: string; id: unknown }) => (dados[args.collection] ?? []).find((d) => String(d.id) === String(args.id)) ?? null,
})

const SUBCATEGORIAS = [{ nome: 'Novatos' }, { nome: 'Junior' }, { nome: 'Graduados' }]

/**
 * Temporada de teste, categoria 3 (Novatos, Junior, Graduados). Uma bateria oficial: chegada Bruno, Ana, Davi,
 * Caio, Edu → 10, 8, 6, 5, 4 pontos. Ana e Caio: Novatos; Bruno e Edu: Junior; Davi: sem subcategoria.
 */
function temporadaDeTeste(opcoes: { semCampo?: boolean; encerrada?: boolean } = {}): Record<string, Doc[]> {
  const subs: Record<number, string> = opcoes.semCampo ? {} : { 101: 'Novatos', 102: 'Junior', 103: 'novatos', 105: 'Junior' }
  const linha = (inscricao: number, posicaoChegada: number) => ({ inscricao, posicaoChegada, status: 'classificado' })
  return {
    temporadas: [{ id: 1, nome: 'Teste', ano: 2026, status: opcoes.encerrada ? 'encerrada' : 'em-andamento', regra: 7, fonteDados: 'completa' }],
    'temporada-categorias': [
      {
        id: 50,
        temporada: 1,
        categoria: 3,
        ordem: 1,
        regra: null,
        modo: 'automatico',
        publicada: true,
        // Fotografia gravada antes de existir a subcategoria (sem o campo nas linhas)
        fotografiaFinal: opcoes.encerrada
          ? {
              versao: 1,
              geradaEm: '2026-12-01T00:00:00.000Z',
              etapasRealizadas: 1,
              criterios: null,
              linhas: [
                { chave: '202', posicao: 1, inscricao: 102, inscricoes: [102], piloto: 202, nome: 'Bruno', numero: 7, pontos: 10, porEtapa: [] },
                { chave: '201', posicao: 2, inscricao: 101, inscricoes: [101], piloto: 201, nome: 'Ana', numero: 33, pontos: 8, porEtapa: [] },
                { chave: '204', posicao: 3, inscricao: 104, inscricoes: [104], piloto: 204, nome: 'Davi', numero: 4, pontos: 6, porEtapa: [] },
              ],
            }
          : null,
      },
    ],
    'regras-pontuacao': [{ id: 7, nome: 'Regra de teste', tabelas: [{ id: 'x', nome: 'Padrão', pontos: [10, 8, 6, 5, 4] }] }],
    etapas: [{ id: 11, temporada: 1, numero: 1, status: 'realizada', inicio: '2026-03-10T11:00:00.000Z', categorias: [3] }],
    corridas: [
      {
        id: 21,
        etapa: 11,
        categorias: [3],
        nome: 'Corrida 1',
        tipo: 'bateria',
        status: 'oficial',
        contaParaClassificacao: true,
        inicio: '2026-03-10T13:00:00.000Z',
        resultados: [linha(102, 1), linha(101, 2), linha(104, 3), linha(103, 4), linha(105, 5)],
      },
    ],
    inscricoes: [
      { id: 101, temporada: 1, categoria: 3, piloto: 201, numero: 33, condicao: 'titular', status: 'ativa' },
      { id: 102, temporada: 1, categoria: 3, piloto: 202, numero: 7, condicao: 'titular', status: 'ativa' },
      { id: 103, temporada: 1, categoria: 3, piloto: 203, numero: 12, condicao: 'titular', status: 'ativa' },
      { id: 104, temporada: 1, categoria: 3, piloto: 204, numero: 4, condicao: 'titular', status: 'ativa' },
      { id: 105, temporada: 1, categoria: 3, piloto: 205, numero: 5, condicao: 'titular', status: 'ativa' },
    ].map((i) => (subs[i.id] ? { ...i, subcategoria: subs[i.id] } : i)),
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

const classificacaoDeTeste = async (opcoes: Parameters<typeof temporadaDeTeste>[0] = {}) => {
  const [c] = await classificacoesDaTemporada({ payload: banco(temporadaDeTeste(opcoes)) as never, temporada: 1, publico: true })
  expect(c).toBeDefined()
  return c
}

/** Linha mínima do motor para os testes da separação. */
const linhaMotor = (nome: string, posicao: number, subcategoria: string | null, posicaoAnterior: number | null = null) =>
  ({ chave: nome, nome, posicao, posicaoAnterior, subcategoria, pontos: 0 }) as LinhaClassificacao & { subcategoria: string | null }

// ───────── classificação ─────────

describe('classificação: subcategoria lida das inscrições', () => {
  it('cada linha traz a subcategoria da inscrição (grafia como gravada; null sem subcategoria); pontos e posições não mudam', async () => {
    const c = await classificacaoDeTeste()
    expect(c.fonte).toBe('automatica')
    expect(c.linhas.map((l) => [l.nome, l.posicao, l.pontos, l.subcategoria])).toEqual([
      ['Bruno', 1, 10, 'Junior'],
      ['Ana', 2, 8, 'Novatos'],
      ['Davi', 3, 6, null],
      ['Caio', 4, 5, 'novatos'],
      ['Edu', 5, 4, 'Junior'],
    ])
    const antiga = await classificacaoDeTeste({ semCampo: true })
    expect(antiga.linhas.map((l) => [l.nome, l.posicao, l.pontos])).toEqual(c.linhas.map((l) => [l.nome, l.posicao, l.pontos]))
    expect(antiga.linhas.every((l) => l.subcategoria === null)).toBe(true)
  })

  it('fotografia final gravada sem o campo: a subcategoria aparece (vem da inscrição atual)', async () => {
    const c = await classificacaoDeTeste({ encerrada: true })
    expect(c.fonte).toBe('fotografia')
    expect(c.linhas.map((l) => [l.nome, l.posicao, l.subcategoria])).toEqual([
      ['Bruno', 1, 'Junior'],
      ['Ana', 2, 'Novatos'],
      ['Davi', 3, null],
    ])
  })

  it('sem a inscrição da linha, procura pelo piloto na categoria; inscrição de outra categoria não vale', () => {
    const inscricoes: Inscricao[] = [
      { id: 1, categoria: 3, piloto: 'p1', nome: 'A', status: 'transferida', subcategoria: 'Junior' },
      { id: 2, categoria: 3, piloto: 'p1', nome: 'A', status: 'ativa', subcategoria: 'Novatos' },
      { id: 3, categoria: 9, piloto: 'p2', nome: 'B', status: 'ativa', subcategoria: 'Sênior' },
    ]
    const linhas = [
      { ...linhaMotor('A', 1, null), inscricao: null, inscricoes: [], piloto: 'p1' },
      { ...linhaMotor('B', 2, null), inscricao: 3, inscricoes: [3], piloto: 'p2' },
      { ...linhaMotor('C', 3, null), inscricao: 1, inscricoes: [1], piloto: 'p1' },
    ] as LinhaClassificacao[]
    expect(comSubcategorias(linhas, inscricoes, 3).map((l) => l.subcategoria)).toEqual(['Novatos', null, 'Junior'])
  })
})

describe('classificação separada por subcategoria', () => {
  it('uma tabela por subcategoria (ordem da categoria; "Sem subcategoria" no fim), com a posição dentro dela e a geral', async () => {
    const c = await classificacaoDeTeste()
    const r = separarClassificacao(c.linhas, SUBCATEGORIAS)
    expect(r.porSubcategoria).toBe(true)
    expect(r.grupos.map((g) => [g.chave, g.nome, g.semSubcategoria, g.linhas.map((l) => [l.linha.nome, l.posicao, l.posicaoGeral, l.linha.pontos])])).toEqual([
      ['novatos', 'Novatos', false, [['Ana', 1, 2, 8], ['Caio', 2, 4, 5]]],
      ['junior', 'Junior', false, [['Bruno', 1, 1, 10], ['Edu', 2, 5, 4]]],
      ['sem-subcategoria', 'Sem subcategoria', true, [['Davi', 1, 3, 6]]],
    ])
  })

  it('empate na posição geral = mesma posição na subcategoria (e o próximo pula)', () => {
    const r = separarClassificacao(
      [linhaMotor('A', 1, 'Novatos'), linhaMotor('X', 2, 'Junior'), linhaMotor('B', 3, 'Novatos'), linhaMotor('C', 3, 'Novatos'), linhaMotor('D', 5, 'Novatos')],
      SUBCATEGORIAS,
    )
    expect(r.grupos[0].linhas.map((l) => [l.linha.nome, l.posicao, l.posicaoGeral])).toEqual([
      ['A', 1, 1],
      ['B', 2, 3],
      ['C', 2, 3],
      ['D', 4, 5],
    ])
  })

  it('seta de subiu/caiu compara a posição anterior DENTRO da subcategoria', () => {
    const r = separarClassificacao([linhaMotor('A', 2, 'Novatos', 4), linhaMotor('B', 3, 'Junior', 2), linhaMotor('C', 4, 'Novatos', 1), linhaMotor('N', 1, 'Novatos', null)], SUBCATEGORIAS)
    expect(r.grupos[0].linhas.map((l) => [l.linha.nome, l.posicao, l.posicaoAnterior])).toEqual([
      ['N', 1, null],
      ['A', 2, 2],
      ['C', 3, 1],
    ])
  })

  it('categoria sem subcategorias, ou ninguém com subcategoria: tabela única com a posição geral, como antes', async () => {
    const c = await classificacaoDeTeste()
    for (const r of [separarClassificacao(c.linhas, []), separarClassificacao((await classificacaoDeTeste({ semCampo: true })).linhas, SUBCATEGORIAS)]) {
      expect(r.porSubcategoria).toBe(false)
      expect(r.grupos).toHaveLength(1)
      expect(r.grupos[0]).toEqual(expect.objectContaining({ chave: 'categoria', nome: null }))
      expect(r.grupos[0].linhas.map((l) => [l.posicao, l.posicaoGeral])).toEqual([1, 2, 3, 4, 5].map((p) => [p, null]))
    }
  })

  it('HTML: abas (sem JavaScript, tabelas empilhadas com links), título por subcategoria e "(2º geral)"', async () => {
    const { ClassificacaoCategoria } = await import('@/components/site/bks/Tabelas')
    const c = await classificacaoDeTeste()
    const html = renderToStaticMarkup(createElement(ClassificacaoCategoria, { classificacao: c, nome: 'F400', subcategorias: SUBCATEGORIAS, idBase: 'cat-3' }))
    expect(html.match(/<table/g)).toHaveLength(3)
    for (const id of ['novatos', 'junior', 'sem-subcategoria']) {
      expect(html).toContain(`id="cat-3-${id}"`)
      expect(html).toContain(`href="#cat-3-${id}"`)
      expect(html).toContain(`<h4 id="cat-3-${id}-titulo"`)
    }
    expect(html).not.toContain('Graduados') // sem piloto: sem aba nem tabela
    expect(html).toContain('(2º geral)')
    expect(html).toContain('na subcategoria,')
    expect(html).toContain('Classificação — F400, subcategoria Novatos')
    expect(html).toContain('Posição dentro da subcategoria; entre parênteses, a posição geral na categoria.')
    expect(html).not.toContain('role="tablist"') // as abas só aparecem com JavaScript
    expect(html).not.toContain('<script')

    const unica = renderToStaticMarkup(createElement(ClassificacaoCategoria, { classificacao: c, nome: 'F400', subcategorias: [] }))
    expect(unica.match(/<table/g)).toHaveLength(1)
    expect(unica).not.toContain('geral)')
    expect(unica).not.toContain('subcategoria')
  })
})

// ───────── programação da etapa ─────────

const F400 = { id: 3, nome: 'F400', cor: '#1A7F37', subcategorias: SUBCATEGORIAS }
const CADETE = { id: 4, nome: 'Cadete', cor: '#0B5CAD', subcategorias: [] }
let seq = 0
const sessao = (nome: string, hora: string, categorias: object[], subcategorias?: string[] | null) =>
  ({ id: ++seq, etapa: 11, nome, tipo: 'bateria', status: 'rascunho', inicio: `2026-03-10T${hora}:00.000Z`, categorias, subcategorias }) as unknown as Corrida

describe('programação: horários por subcategoria', () => {
  // Horários em UTC; no site, Brasília (−3 h).
  const corridas = [
    sessao('Briefing', '11:00', [F400]),
    sessao('Treino', '11:30', [CADETE]),
    sessao('Tomada de tempo', '12:00', [F400], ['Graduados']),
    sessao('Tomada de tempo', '12:20', [F400], ['novatos']),
    sessao('Corrida 1', '13:00', [F400], ['Novatos', 'Junior']),
    sessao('Final', '15:00', [F400], []),
  ]

  it('dentro da categoria: "Todas as subcategorias" primeiro, depois a ordem da categoria; sessão de duas aparece nas duas', () => {
    const [f400, cadete] = agruparProgramacao(corridas)
    expect(f400.categoria).toBe('F400')
    expect(f400.corridas).toHaveLength(5)
    expect(f400.subcategorias?.map((g) => [g.chave, g.nome, g.rotulo, g.sessoes.map((s) => `${s.hora} ${s.nome}`)])).toEqual([
      ['todas', null, 'Todas as subcategorias', ['08:00 Briefing', '12:00 Final']],
      ['novatos', 'Novatos', 'Novatos', ['09:20 Tomada de tempo', '10:00 Corrida 1']],
      ['junior', 'Junior', 'Junior', ['10:00 Corrida 1']],
      ['graduados', 'Graduados', 'Graduados', ['09:00 Tomada de tempo']],
    ])
    // Categoria sem sessões marcadas (ou sem subcategorias): lista única, como antes.
    expect(cadete.categoria).toBe('Cadete')
    expect(cadete.subcategorias).toBeNull()
    expect(cadete.corridas.map((s) => `${s.hora} ${s.nome}`)).toEqual(['08:30 Treino'])
  })

  it('nenhuma sessão marcada: sem divisão; ordem das subcategorias também pelo mapa quando a corrida não traz', () => {
    const [semMarca] = agruparProgramacao([sessao('Final', '15:00', [F400]), sessao('Corrida 1', '13:00', [F400], null)])
    expect(semMarca.subcategorias).toBeNull()
    const semPopular = { id: 3, nome: 'F400', cor: null }
    const [g] = agruparProgramacao([sessao('A', '12:00', [semPopular], ['Junior']), sessao('B', '12:30', [semPopular], ['Novatos'])], new Map([['3', SUBCATEGORIAS]]))
    expect(g.subcategorias?.map((x) => x.nome)).toEqual(['Novatos', 'Junior'])
  })

  it('corrida de duas categorias: aceita subcategorias de qualquer uma; nome fora da lista vem depois', () => {
    const f4 = { id: 5, nome: 'F4', subcategorias: [{ nome: 'Sênior' }] }
    const grupos = agruparHorariosPorSubcategoria(
      [
        { nome: 'X', subs: ['Antiga'] },
        { nome: 'Y', subs: ['senior'] },
        { nome: 'Z', subs: ['Junior'] },
      ],
      (s) => s.subs,
      [...F400.subcategorias, ...f4.subcategorias],
    )
    expect(grupos?.map((g) => [g.rotulo, g.sessoes.map((s) => s.nome)])).toEqual([
      ['Junior', ['Z']],
      ['Sênior', ['Y']],
      ['Antiga', ['X']],
    ])
  })

  it('HTML: listas acessíveis por subcategoria, legível no celular (sem tabela), e categoria sem divisão como antes', async () => {
    const { Programacao } = await import('@/components/site/bks/pecas')
    const html = renderToStaticMarkup(createElement(Programacao, { corridas }))
    expect(html).toContain('aria-label="Horários de F400 por subcategoria"')
    expect(html).toContain('aria-label="Horários de F400 — Todas as subcategorias"')
    expect(html).toContain('aria-label="Horários de F400 — Novatos"')
    expect(html).toContain('aria-label="Horários de Cadete"')
    expect(html).not.toContain('<table')
    expect(html.indexOf('Todas as subcategorias')).toBeLessThan(html.indexOf('>Novatos<'))
    expect(html.indexOf('>Novatos<')).toBeLessThan(html.indexOf('>Graduados<'))
  })
})

// ───────── corridas: campo "Subcategorias" ─────────

describe('corridas: validação do campo "Subcategorias"', () => {
  const f400 = { nome: 'F400', subcategorias: [{ nome: 'Novatos' }, { nome: 'Junior' }, { nome: 'Sênior' }, { nome: 'GSS/60+' }] }
  const f4 = { nome: 'F4', subcategorias: [{ nome: 'Graduados' }] }
  const cadete = { nome: 'Cadete', subcategorias: [] }

  it('vazio = todas; corrige a grafia; tira repetidos', () => {
    expect(conferirSubcategoriasDaCorrida(undefined, [f400])).toEqual({ ok: true, valor: [] })
    expect(conferirSubcategoriasDaCorrida([], [f400])).toEqual({ ok: true, valor: [] })
    expect(conferirSubcategoriasDaCorrida([' senior ', 'gss/60+', 'Sênior', ''], [f400])).toEqual({ ok: true, valor: ['Sênior', 'GSS/60+'] })
  })

  it('corrida de mais de uma categoria aceita nomes de qualquer uma', () => {
    expect(conferirSubcategoriasDaCorrida(['Graduados', 'novatos'], [f400, f4])).toEqual({ ok: true, valor: ['Graduados', 'Novatos'] })
  })

  it('nome que não é subcategoria (ou categoria sem subcategorias): mensagem clara', () => {
    expect(conferirSubcategoriasDaCorrida(['Veteranos'], [f400])).toEqual({
      ok: false,
      mensagem: '"Veteranos" não é uma subcategoria da categoria "F400". Use exatamente um destes nomes: "Novatos", "Junior", "Sênior" ou "GSS/60+".',
    })
    expect(conferirSubcategoriasDaCorrida(['Veteranos'], [f400, f4])).toEqual({
      ok: false,
      mensagem:
        '"Veteranos" não é uma subcategoria das categorias "F400" e "F4". Use exatamente um destes nomes: "Novatos", "Junior", "Sênior", "GSS/60+" ou "Graduados".',
    })
    expect(conferirSubcategoriasDaCorrida(['Novatos'], [cadete])).toEqual({
      ok: false,
      mensagem: 'A categoria "Cadete" não tem subcategorias. Deixe este campo em branco.',
    })
    expect(conferirSubcategoriasDaCorrida(['Novatos'], [cadete, { nome: 'Mirim', subcategorias: null }])).toEqual({
      ok: false,
      mensagem: 'As categorias "Cadete" e "Mirim" não têm subcategorias. Deixe este campo em branco.',
    })
  })

  it('chave única: sem subcategorias, igual à de sempre (gerar corridas não muda); com elas, cada subcategoria a sua', () => {
    expect(chaveCorrida(11, [3], 'Tomada de tempo')).toBe('11|3|tomada de tempo')
    expect(chaveCorrida(11, [3], 'Tomada de tempo', [])).toBe('11|3|tomada de tempo')
    expect(chaveCorrida(11, [3], 'Tomada de tempo', ['Novatos'])).toBe('11|3|tomada de tempo|novatos')
    expect(chaveCorrida(11, [3], 'Final', ['Junior', 'Novatos'])).toBe(chaveCorrida(11, [3], 'Final', ['novatos', 'Junior']))
    const { criar } = planejarCorridas(11, [{ nome: 'Final', tipo: 'final' }], [3], new Set())
    expect(criar[0].chaveUnica).toBe('11|3|final')
    expect('subcategorias' in criar[0]).toBe(false)
  })

  it('título da corrida no painel mostra as subcategorias', () => {
    expect(tituloCorrida({ ano: 2026, etapa: '1ª Etapa', categorias: ['F400'], nome: 'Tomada de tempo', subcategorias: ['Novatos', 'Junior'] })).toBe(
      '2026 · 1ª Etapa · F400 (Novatos, Junior) · Tomada de tempo',
    )
    expect(tituloCorrida({ ano: 2026, etapa: '1ª Etapa', categorias: ['F400'], nome: 'Final', subcategorias: [] })).toBe('2026 · 1ª Etapa · F400 · Final')
  })

  describe('no salvamento (hook prepararCorrida)', () => {
    const dados = (): Record<string, Doc[]> => ({
      temporadas: [{ id: 1, nome: 'Teste', ano: 2026, status: 'em-andamento', categorias: [3, 4], regra: null }],
      etapas: [{ id: 11, temporada: 1, numero: 1, status: 'agendada', categorias: [3, 4] }],
      categorias: [
        { id: 3, nome: 'F400', subcategorias: SUBCATEGORIAS },
        { id: 4, nome: 'Cadete', subcategorias: [] },
      ],
      corridas: [{ id: 90, etapa: 11, categorias: [3], nome: 'Tomada de tempo', subcategorias: ['Novatos'], chaveUnica: chaveCorrida(11, [3], 'Tomada de tempo', ['Novatos']) }],
      'temporada-categorias': [],
      inscricoes: [],
    })
    const reqDe = (d: Record<string, Doc[]>) => ({ payload: banco(d), t: (k: string) => k, context: {} }) as never
    const salvar = (data: Record<string, unknown>, originalDoc?: Record<string, unknown>) =>
      prepararCorrida({ data, originalDoc, req: reqDe(dados()), operation: originalDoc ? 'update' : 'create', context: {} } as never) as Promise<Record<string, unknown>>
    const erroDe = async (p: Promise<unknown>) => {
      try {
        await p
      } catch (e) {
        return (e as { data?: { errors?: { path: string; message: string }[] } }).data?.errors ?? [{ path: '?', message: String(e) }]
      }
      return []
    }

    it('grava a grafia da categoria; a mesma sessão para outra subcategoria convive; vazio = todas', async () => {
      const r = await salvar({ etapa: 11, categorias: [3], nome: 'Tomada de tempo', tipo: 'tomada-de-tempo', subcategorias: ['graduados', ''] })
      expect(r.subcategorias).toEqual(['Graduados'])
      expect(r.chaveUnica).toBe('11|3|tomada de tempo|graduados')
      const todas = await salvar({ etapa: 11, categorias: [3], nome: 'Final', tipo: 'final', subcategorias: [] })
      expect(todas.subcategorias).toEqual([])
      expect(todas.chaveUnica).toBe('11|3|final')
    })

    it('recusa nome que não é subcategoria e sessão repetida para a mesma subcategoria', async () => {
      expect(await erroDe(salvar({ etapa: 11, categorias: [3], nome: 'Corrida 1', subcategorias: ['Veteranos'] }))).toEqual([
        { path: 'subcategorias', message: expect.stringContaining('"Veteranos" não é uma subcategoria da categoria "F400"') },
      ])
      expect(await erroDe(salvar({ etapa: 11, categorias: [3], nome: 'Tomada de tempo', subcategorias: ['novatos'] }))).toEqual([
        { path: 'nome', message: 'Já existe "Tomada de tempo" para esta(s) categoria(s) e subcategoria(s) nesta etapa.' },
      ])
    })

    it('trocar a categoria confere as subcategorias que já estavam gravadas', async () => {
      const anterior = { id: 91, etapa: 11, categorias: [3], nome: 'Corrida 2', subcategorias: ['Novatos'] }
      expect(await erroDe(salvar({ etapa: 11, categorias: [4], nome: 'Corrida 2' }, anterior))).toEqual([
        { path: 'subcategorias', message: 'A categoria "Cadete" não tem subcategorias. Deixe este campo em branco.' },
      ])
      const mantida = await salvar({ etapa: 11, categorias: [3], nome: 'Corrida 2' }, anterior)
      expect(mantida.subcategorias).toBeUndefined() // não enviado e categoria igual: fica como está
      expect(mantida.chaveUnica).toBe('11|3|corrida 2|novatos')
    })
  })
})

// ───────── resultado da etapa: sessões de cada subcategoria ─────────

describe('resultado da etapa com horários por subcategoria', () => {
  it('sessão marcada para uma subcategoria só vira coluna na tabela dela; sem marcação, em todas', async () => {
    const d = temporadaDeTeste()
    const base = { etapa: 11, categorias: [3], status: 'oficial', contaParaClassificacao: false, tipo: 'tomada-de-tempo' }
    d.corridas.push(
      { id: 22, ...base, nome: 'Tomada de tempo', inicio: '2026-03-10T12:00:00.000Z', subcategorias: ['Novatos'], resultados: [{ inscricao: 103, posicaoChegada: 1, status: 'classificado' }, { inscricao: 101, posicaoChegada: 2, status: 'classificado' }] },
      { id: 23, ...base, nome: 'Tomada de tempo', inicio: '2026-03-10T12:20:00.000Z', subcategorias: ['Junior'], resultados: [{ inscricao: 105, posicaoChegada: 1, status: 'classificado' }, { inscricao: 102, posicaoChegada: 2, status: 'classificado' }, { inscricao: 104, posicaoChegada: 3, status: 'classificado' }] },
    )
    const r = await resultadosDaEtapa({ payload: banco(d) as never, etapa: 11, publico: true })
    const cat = r!.categorias[0]
    expect(cat.corridas.map((c) => [c.id, c.subcategorias])).toEqual([
      [22, ['Novatos']],
      [23, ['Junior']],
      [21, []],
    ])
    const m = montarMatrizes(cat, SUBCATEGORIAS)
    const titulos = (chave: string) => m.tabelas.find((t) => t.chave === chave)!.colunas.filter((c) => !c.ausente).map((c) => `${c.titulo}:${c.corrida}`)
    expect(titulos('novatos')).toEqual(['Classificação:22', 'Corrida 1:21', 'Resultado da etapa:null'])
    expect(titulos('junior')).toEqual(['Classificação:23', 'Corrida 1:21', 'Resultado da etapa:null'])
    // "Sem subcategoria" vê todas as sessões (Davi correu a tomada dos Junior)
    expect(titulos('sem-subcategoria')).toEqual(['Classificação 1:22', 'Classificação 2:23', 'Corrida 1:21', 'Resultado da etapa:null'])
    // Posição dentro da subcategoria na tomada de tempo dela: Caio 1º, Ana 2º.
    const novatos = m.tabelas.find((t) => t.chave === 'novatos')!
    expect(novatos.linhas.map((l) => [l.nome, l.celulas[1].posicao, l.celulas[1].posicaoGeral])).toEqual([
      ['Ana', 2, 2],
      ['Caio', 1, 1],
    ])
  })
})
