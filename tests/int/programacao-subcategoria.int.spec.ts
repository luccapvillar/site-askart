/**
 * Calendário e página da etapa: seletor "Escolha a subcategoria" (cada subcategoria com o seu horário de
 * Warm-up, Classificação, Corrida 1 e Corrida 2) e "Gerar corridas" por subcategoria.
 * Nomes, horários e categorias abaixo são dados de TESTE, não dados oficiais da ASKART.
 */
import { act, createElement, Fragment, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { agruparProgramacao, horariosPorEscolha, opcoesDeSubcategoria, rotuloDaSessao } from '@/components/site/bks/programacao'
import { aplicarEscolha, escolhaDoEndereco, mensagemSemHorarios, SeletorSubcategoria } from '@/components/site/bks/SeletorSubcategoria'
import { chaveCorrida, FORMATO_POR_SUBCATEGORIA, planejarCorridas } from '@/hooks/competicao/validacoes'
import type { Corrida } from '@/payload-types'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: unknown }) => createElement('a', { href }, children as never),
}))

const F400 = {
  id: 3,
  nome: 'F400',
  slug: 'f400',
  cor: '#1A7F37',
  modalidade: 'profissional',
  subcategorias: [{ nome: 'Novatos' }, { nome: 'Junior' }, { nome: 'Graduados' }],
}
const CADETE = { id: 4, nome: 'Cadete', slug: 'cadete', cor: null, modalidade: 'profissional', subcategorias: [] }
const MIRIM = { id: 5, nome: 'Mirim', slug: 'mirim', cor: null, modalidade: 'profissional', subcategorias: null }
const INDOOR = { id: 6, nome: 'Kart indoor', slug: 'kart-indoor', cor: null, modalidade: 'indoor', subcategorias: [{ nome: '80KGs (15HP)' }] }

let seq = 0
/** Sessão de teste. Hora em UTC (no site, Brasília: −3 h); sem hora = horário ainda não definido. */
const sessao = (nome: string, hora: string | null, categorias: object[], subcategorias: string[] | null = null, tipo = 'bateria') =>
  ({
    id: ++seq,
    etapa: 11,
    nome,
    tipo,
    status: 'rascunho',
    inicio: hora ? `2026-11-08T${hora}:00.000Z` : null,
    categorias,
    subcategorias,
  }) as unknown as Corrida

// Fora de ordem de propósito: a ordem da subcategoria escolhida é Warm-up, Classificação, Corrida 1, Corrida 2.
const corridas = [
  sessao('Briefing', '10:30', [F400]),
  sessao('Corrida 2', '13:30', [F400], ['Novatos']),
  sessao('Bateria 1', '12:30', [F400], ['novatos']),
  sessao('Tomada de tempo', '11:40', [F400], ['Novatos'], 'tomada-de-tempo'),
  sessao('Warm-up', '11:00', [F400], ['Novatos'], 'warm-up'),
  sessao('Warm-up', '11:10', [F400], ['Junior'], 'warm-up'),
  sessao('Final', '16:00', [F400], [], 'final'),
  sessao('Treino', '14:00', [CADETE]),
  sessao('Corrida 1', '15:00', [CADETE, MIRIM]),
]

// ───────── tela de teste (React no jsdom, sem bibliotecas extras) ─────────

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let telas: Root[] = []
function render(elemento: ReactElement) {
  const conteiner = document.body.appendChild(document.createElement('div'))
  const raiz = createRoot(conteiner)
  act(() => raiz.render(elemento))
  telas.push(raiz)
  return { unmount: () => act(() => raiz.unmount()) }
}
function cleanup() {
  for (const raiz of telas) act(() => raiz.unmount())
  telas = []
  document.body.innerHTML = ''
}
/** Escolhe uma opção do seletor como a pessoa faria (evento "change" do select). */
function escolher(valor: string) {
  const select = document.querySelector('select') as HTMLSelectElement
  act(() => {
    select.value = valor
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

const linhas = (sessoes: { hora: string | null; rotulo: string }[]) => sessoes.map((s) => `${s.hora ?? '—'} ${s.rotulo}`)

describe('rótulos claros das sessões', () => {
  it('Warm-up, Classificação (tomada de tempo), Corrida N; outros nomes ficam como digitados', () => {
    expect(rotuloDaSessao({ nome: 'Warm up', tipo: 'bateria' })).toMatchObject({ rotulo: 'Warm-up', tipo: 'warm-up', nota: null })
    expect(rotuloDaSessao({ nome: 'Tomada de tempo', tipo: 'tomada-de-tempo' })).toMatchObject({ rotulo: 'Classificação', tipo: 'classificacao' })
    expect(rotuloDaSessao({ nome: 'Classificação', tipo: 'bateria' })).toMatchObject({ rotulo: 'Classificação', tipo: 'classificacao' })
    expect(rotuloDaSessao({ nome: 'Bateria 2', tipo: 'bateria' })).toMatchObject({ rotulo: 'Corrida 2', tipo: 'corrida', numero: 2 })
    expect(rotuloDaSessao({ nome: 'corrida1', tipo: 'final' })).toMatchObject({ rotulo: 'Corrida 1', numero: 1 })
    // O tipo "bateria" é o padrão do painel: não transforma "Briefing" em corrida
    expect(rotuloDaSessao({ nome: 'Briefing', tipo: 'bateria' })).toMatchObject({ rotulo: 'Briefing', tipo: 'outra' })
    expect(rotuloDaSessao({ nome: 'Final', tipo: 'final' })).toMatchObject({ rotulo: 'Final', tipo: 'outra' })
    // Tipo escolhido no painel com outro nome: rótulo pelo tipo, nome como nota
    expect(rotuloDaSessao({ nome: 'Aquecimento livre', tipo: 'warm-up' })).toMatchObject({ rotulo: 'Warm-up', nota: 'Aquecimento livre' })
  })
})

describe('horários da subcategoria escolhida', () => {
  const escolhas = horariosPorEscolha(corridas)
  const daEscolha = (valor: string) => escolhas.find((e) => e.valor === valor)

  it('ordem Warm-up, Classificação, Corrida 1, Corrida 2 e as outras sessões depois (pelo horário)', () => {
    expect(linhas(daEscolha('f400-novatos')!.sessoes)).toEqual([
      '08:00 Warm-up',
      '08:40 Classificação',
      '09:30 Corrida 1',
      '10:30 Corrida 2',
      '07:30 Briefing',
      '13:00 Final',
    ])
    expect(daEscolha('f400-novatos')).toMatchObject({ rotulo: 'F400 — Novatos', categoria: 'F400', subcategoria: 'Novatos', chaveCategoria: 'f400' })
  })

  it('inclui as sessões sem subcategoria marcada ("todas") e não mistura as de outra subcategoria', () => {
    expect(linhas(daEscolha('f400-junior')!.sessoes)).toEqual(['08:10 Warm-up', '07:30 Briefing', '13:00 Final'])
    // Graduados não tem sessão própria: só as que valem para todas
    expect(linhas(daEscolha('f400-graduados')!.sessoes)).toEqual(['07:30 Briefing', '13:00 Final'])
  })

  it('subcategoria sem nenhuma sessão (nem "todas") não tem lista; categoria sem subcategorias tem uma só', () => {
    const soNovatos = horariosPorEscolha([sessao('Warm-up', '11:00', [F400], ['Novatos'], 'warm-up')])
    expect(soNovatos.map((e) => e.valor)).toEqual(['f400-novatos'])
    // Corrida 1 antes das outras sessões (mesmo o Treino sendo mais cedo); a corrida com a Mirim entra nas duas
    expect(linhas(daEscolha('cadete')!.sessoes)).toEqual(['12:00 Corrida 1', '11:00 Treino'])
    expect(daEscolha('cadete')!.sessoes[0].juntoCom).toBe('Mirim')
    expect(daEscolha('mirim')!.sessoes.map((s) => [s.rotulo, s.juntoCom])).toEqual([['Corrida 1', 'Cadete']])
  })

  it('sessões ainda sem horário entram na ordem dos tipos', () => {
    const [g] = horariosPorEscolha([
      sessao('Corrida 2', null, [F400], ['Junior']),
      sessao('Corrida 1', null, [F400], ['Junior']),
      sessao('Classificação', null, [F400], ['Junior'], 'tomada-de-tempo'),
      sessao('Warm-up', null, [F400], ['Junior'], 'warm-up'),
    ])
    expect(linhas(g.sessoes)).toEqual(['— Warm-up', '— Classificação', '— Corrida 1', '— Corrida 2'])
  })

  it('programação completa: pelo horário, e as sem horário no fim na ordem dos tipos', () => {
    const [g] = agruparProgramacao([
      sessao('Corrida 1', null, [CADETE]),
      sessao('Final', '15:00', [CADETE], null, 'final'),
      sessao('Warm-up', null, [CADETE], null, 'warm-up'),
      sessao('Tomada de tempo', '12:00', [CADETE], null, 'tomada-de-tempo'),
    ])
    expect(linhas(g.corridas)).toEqual(['09:00 Classificação', '12:00 Final', '— Warm-up', '— Corrida 1'])
    expect(g.chaves).toEqual(['cadete'])
  })
})

describe('opções do seletor', () => {
  it('"F400 — Novatos"… agrupadas por categoria; categoria sem subcategorias é uma opção só', () => {
    const grupos = opcoesDeSubcategoria([F400, CADETE, MIRIM, F400, INDOOR])
    expect(grupos.map((g) => [g.categoria, g.opcoes.map((o) => `${o.valor}=${o.rotulo}`)])).toEqual([
      ['F400', ['f400-novatos=F400 — Novatos', 'f400-junior=F400 — Junior', 'f400-graduados=F400 — Graduados']],
      ['Cadete', ['cadete=Cadete']],
      ['Mirim', ['mirim=Mirim']],
      ['Kart indoor', ['kart-indoor-80kgs-15hp=Kart indoor — 80KGs (15HP)']],
    ])
    expect(grupos[3].opcoes[0]).toMatchObject({ modalidade: 'indoor', ehSubcategoria: true })
    expect(grupos[1].opcoes[0]).toMatchObject({ modalidade: 'profissional', ehSubcategoria: false })
  })

  it('HTML do seletor: rótulo, "Todas as categorias" primeiro, optgroup por categoria', () => {
    const html = renderToStaticMarkup(
      createElement(SeletorSubcategoria, { alvo: 'x', grupos: opcoesDeSubcategoria([F400, CADETE]), ajuda: 'Ajuda.' }),
    )
    expect(html).toMatch(/<label for="[^"]+"[^>]*>Escolha a subcategoria<\/label>/)
    expect(html).toContain('<option value="" selected="">Todas as categorias</option><optgroup label="F400">')
    expect(html).toContain('<option value="f400-novatos">F400 — Novatos</option>')
    expect(html).toContain('</optgroup><option value="cadete">Cadete</option>')
    expect(html).toContain('role="status"')
  })
})

describe('"Gerar corridas" por subcategoria', () => {
  const subs = new Map([
    ['3', [{ nome: 'Novatos' }, { nome: 'Junior' }]],
    ['4', []],
  ])

  it('sem formato na temporada: Warm-up, Classificação, Corrida 1 e Corrida 2 de cada subcategoria, sem horário', () => {
    const { criar, jaExistiam } = planejarCorridas(11, [], [3, 4], new Set(), subs)
    expect(jaExistiam).toBe(0)
    expect(criar.map((c) => `${c.nome}|${c.subcategorias?.join(',')}`)).toEqual([
      'Warm-up|Novatos',
      'Warm-up|Junior',
      'Classificação|Novatos',
      'Classificação|Junior',
      'Corrida 1|Novatos',
      'Corrida 1|Junior',
      'Corrida 2|Novatos',
      'Corrida 2|Junior',
    ])
    // Categoria sem subcategorias e sem formato: nada (comportamento de antes)
    expect(criar.every((c) => c.categorias[0] === 3)).toBe(true)
    expect(criar.map((c) => [c.tipo, c.contaParaClassificacao]).slice(0, 8).filter((_, i) => i % 2 === 0)).toEqual([
      ['warm-up', false],
      ['tomada-de-tempo', false],
      ['bateria', true],
      ['bateria', true],
    ])
    expect(criar.every((c) => c.status === 'rascunho' && !('inicio' in c))).toBe(true)
    // A chave é a mesma que o hook calcula ao salvar (etapa + categoria + nome + subcategoria)
    expect(criar[0].chaveUnica).toBe(chaveCorrida(11, [3], 'Warm-up', ['Novatos']))
    expect(FORMATO_POR_SUBCATEGORIA.map((f) => f.nome)).toEqual(['Warm-up', 'Classificação', 'Corrida 1', 'Corrida 2'])
  })

  it('rodar de novo não duplica; sessão da categoria inteira com o mesmo nome também não é repetida', () => {
    const primeira = planejarCorridas(11, [], [3], new Set(), subs)
    const segunda = planejarCorridas(11, [], [3], new Set(primeira.criar.map((c) => c.chaveUnica)), subs)
    expect(segunda).toEqual({ criar: [], jaExistiam: 8 })
    // "Corrida 1" já existe para a F400 inteira (vale para todas): não cria uma por subcategoria
    const { criar, jaExistiam } = planejarCorridas(11, [], [3], new Set([chaveCorrida(11, [3], 'corrida 1')]), subs)
    expect(criar.map((c) => c.nome)).not.toContain('Corrida 1')
    expect(criar).toHaveLength(6)
    expect(jaExistiam).toBe(1)
  })

  it('com formato na temporada: o formato em cada subcategoria; sem subcategorias, o formato como sempre', () => {
    const formato = [
      { nome: 'Tomada de tempo', tipo: 'tomada-de-tempo' as const, contaParaClassificacao: false },
      { nome: 'Final', tipo: 'final' as const, tabela: 'Final' },
    ]
    const { criar } = planejarCorridas(11, formato, [3, 4], new Set(), subs)
    expect(criar.map((c) => `${c.categorias[0]}:${c.nome}:${c.subcategorias?.join(',') ?? '-'}`)).toEqual([
      '3:Tomada de tempo:Novatos',
      '3:Tomada de tempo:Junior',
      '3:Final:Novatos',
      '3:Final:Junior',
      '4:Tomada de tempo:-',
      '4:Final:-',
    ])
    expect('subcategorias' in criar[4]).toBe(false)
    expect(criar[2]).toMatchObject({ tabela: 'Final', tipo: 'final', contaParaClassificacao: true })
  })
})

describe('HTML da programação para o seletor', () => {
  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    window.localStorage.clear()
    window.history.replaceState(null, '', '/')
  })

  const montar = async () => {
    const { Programacao } = await import('@/components/site/bks/pecas')
    return renderToStaticMarkup(createElement(Programacao, { corridas, categoriasDaEtapa: ['f400', 'cadete', 'mirim'] }))
  }

  it('marca categoria e subcategoria em cada grupo; as listas de cada subcategoria vêm escondidas e em ordem', async () => {
    const html = await montar()
    expect(html).toContain('data-programacao="" data-categorias="f400 cadete mirim"')
    expect(html).toMatch(/<ul[^>]*data-visao="geral"/)
    expect(html).toMatch(/<li[^>]*data-categoria="f400"/)
    expect(html).toMatch(/<li[^>]*data-subcategoria="todas"/)
    expect(html).toMatch(/<li[^>]*data-subcategoria="novatos"/)
    expect(html).toMatch(/<li[^>]*data-categoria="cadete mirim"/)
    expect(html).toMatch(/<div[^>]*data-escolha="f400-novatos" data-categoria="f400" data-subcategoria="novatos" hidden=""/)
    expect(html).toMatch(/<div[^>]*data-escolha="cadete" data-categoria="cadete" hidden=""/)
    expect(html).toMatch(/<p[^>]*data-aviso="" hidden=""><\/p>/)
    const bloco = html.slice(html.indexOf('data-escolha="f400-novatos"'), html.indexOf('data-escolha="f400-junior"'))
    const pos = ['>Warm-up<', '>Classificação<', '>Corrida 1<', '>Corrida 2<', '>Briefing<', '>Final<'].map((t) => bloco.indexOf(t))
    expect(pos.every((p) => p > 0)).toBe(true)
    expect([...pos].sort((a, b) => a - b)).toEqual(pos)
    expect(bloco).toContain('data-sessao="warm-up"')
    expect(bloco).toContain('aria-label="Horários de F400 — Novatos"')
    // Rótulo claro também na programação completa: "Tomada de tempo" aparece como Classificação
    expect(html).not.toContain('>Tomada de tempo<')
  })

  it('sem horário: traço visível e "Horário a definir" para o leitor de tela', async () => {
    const { Programacao } = await import('@/components/site/bks/pecas')
    const html = renderToStaticMarkup(createElement(Programacao, { corridas: [sessao('Warm-up', null, [F400], ['Junior'], 'warm-up')] }))
    expect(html).toContain('<span aria-hidden="true">—</span><span class="visualmente-oculto">Horário a definir</span>')
    expect(html).not.toContain('data-categorias=')
  })

  it('aplicarEscolha: mostra só a lista da escolha; sem ela, o aviso certo; "Todas" volta ao agrupado', async () => {
    document.body.innerHTML = `<div id="alvo">${await montar()}</div>`
    const raiz = document.getElementById('alvo')!
    const opcoes = new Map(opcoesDeSubcategoria([F400, CADETE, MIRIM, { ...F400, id: 9, nome: '125cc', slug: '125cc' }]).flatMap((g) => g.opcoes).map((o) => [o.valor, o]))
    const geral = raiz.querySelector<HTMLElement>('[data-visao="geral"]')!
    const aviso = raiz.querySelector<HTMLElement>('[data-aviso]')!
    const visivel = () => [...raiz.querySelectorAll<HTMLElement>('[data-escolha]')].filter((e) => !e.hidden).map((e) => e.dataset.escolha)

    aplicarEscolha(raiz, opcoes.get('f400-novatos')!)
    expect(geral.hidden).toBe(true)
    expect(visivel()).toEqual(['f400-novatos'])
    expect(aviso.hidden).toBe(true)

    // F400 corre a etapa, mas a subcategoria não tem horários (nem os de todas) → aviso de não divulgado
    document.body.innerHTML = `<div id="alvo">${renderToStaticMarkup(
      createElement((await import('@/components/site/bks/pecas')).Programacao, {
        corridas: [sessao('Warm-up', '11:00', [F400], ['Novatos'], 'warm-up')],
        categoriasDaEtapa: ['f400'],
      }),
    )}</div>`
    const r2 = document.getElementById('alvo')!
    aplicarEscolha(r2, opcoes.get('f400-junior')!)
    expect(r2.querySelector<HTMLElement>('[data-aviso]')!.hidden).toBe(false)
    expect(r2.querySelector('[data-aviso]')!.textContent).toBe('Horários desta subcategoria ainda não divulgados.')
    // Categoria que não está na etapa
    aplicarEscolha(r2, opcoes.get('125cc-novatos')!)
    expect(r2.querySelector('[data-aviso]')!.textContent).toBe('A categoria 125cc não corre nesta etapa.')
    // Todas as categorias: tudo como veio do servidor
    aplicarEscolha(r2, null)
    expect(r2.querySelector<HTMLElement>('[data-aviso]')!.hidden).toBe(true)
    expect(r2.querySelector<HTMLElement>('[data-visao="geral"]')!.hidden).toBe(false)
    expect([...r2.querySelectorAll<HTMLElement>('[data-escolha]')].every((e) => e.hidden)).toBe(true)
  })

  it('mensagens: categoria sem subcategorias e etapa que não lista categorias', () => {
    const [cadete] = opcoesDeSubcategoria([CADETE])[0].opcoes
    expect(mensagemSemHorarios(cadete, null)).toBe('Horários desta categoria ainda não divulgados.')
    expect(mensagemSemHorarios(cadete, ['f400'])).toBe('A categoria Cadete não corre nesta etapa.')
    expect(escolhaDoEndereco('#subcategoria=f400-novatos')).toBe('f400-novatos')
    expect(escolhaDoEndereco('#programacao')).toBeNull()
  })

  it('página da etapa: bloco de outra modalidade some com a escolha', () => {
    document.body.innerHTML =
      '<div id="alvo"><section data-programacao-modalidade="profissional"></section><section data-programacao-modalidade="indoor"></section></div>'
    const [indoor] = opcoesDeSubcategoria([INDOOR])[0].opcoes
    aplicarEscolha(document.getElementById('alvo')!, indoor)
    const blocos = [...document.querySelectorAll<HTMLElement>('[data-programacao-modalidade]')]
    expect(blocos.map((b) => b.hidden)).toEqual([true, false])
    aplicarEscolha(document.getElementById('alvo')!, null)
    expect(blocos.map((b) => b.hidden)).toEqual([false, false])
  })

  it('seletor: escolher mostra os horários, anuncia, guarda no aparelho e no endereço; ao abrir, restaura', async () => {
    const { Programacao } = await import('@/components/site/bks/pecas')
    const grupos = opcoesDeSubcategoria([F400, CADETE, MIRIM])
    const pagina = () =>
      createElement(
        Fragment,
        null,
        createElement(SeletorSubcategoria, { alvo: 'etapas', grupos, ajuda: 'Ajuda.' }),
        createElement('div', { id: 'etapas' }, createElement(Programacao, { corridas, categoriasDaEtapa: ['f400', 'cadete', 'mirim'] })),
      )
    const tela = render(pagina())
    const select = document.querySelector('select') as HTMLSelectElement
    expect(document.querySelector(`label[for="${select.id}"]`)!.textContent).toBe('Escolha a subcategoria')
    const visivel = () => [...document.querySelectorAll<HTMLElement>('[data-escolha]')].filter((e) => !e.hidden).map((e) => e.dataset.escolha)

    escolher('f400-junior')
    expect(visivel()).toEqual(['f400-junior'])
    expect(document.querySelector('[role="status"]')!.textContent).toBe('Mostrando os horários de F400 — Junior')
    expect(window.location.hash).toBe('#subcategoria=f400-junior')
    expect(JSON.parse(window.localStorage.getItem('askart:subcategorias') ?? '[]')).toEqual(['f400-junior'])

    // Abrir de novo (sem o endereço): volta a escolha guardada
    tela.unmount()
    document.body.innerHTML = ''
    window.history.replaceState(null, '', '/bks')
    render(pagina())
    expect((document.querySelector('select') as HTMLSelectElement).value).toBe('f400-junior')
    expect(visivel()).toEqual(['f400-junior'])
    cleanup()

    // O endereço vale mais que o guardado
    window.history.replaceState(null, '', '/bks#subcategoria=cadete')
    render(pagina())
    expect(visivel()).toEqual(['cadete'])

    // "Todas as categorias": volta ao agrupado, tira do endereço e esquece a escolha desta página
    escolher('')
    expect(visivel()).toEqual([])
    expect(document.querySelector<HTMLElement>('[data-visao="geral"]')!.hidden).toBe(false)
    expect(window.location.hash).toBe('')
    expect(window.localStorage.getItem('askart:subcategorias')).toBe('[]')
  })

  it('sem acesso ao armazenamento do aparelho, o seletor continua funcionando', async () => {
    const { Programacao } = await import('@/components/site/bks/pecas')
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    try {
      render(
        createElement(
          Fragment,
          null,
          createElement(SeletorSubcategoria, { alvo: 'etapas', grupos: opcoesDeSubcategoria([F400]), ajuda: 'Ajuda.' }),
          createElement('div', { id: 'etapas' }, createElement(Programacao, { corridas })),
        ),
      )
      escolher('f400-novatos')
      expect(document.querySelector<HTMLElement>('[data-escolha="f400-novatos"]')!.hidden).toBe(false)
    } finally {
      getItem.mockRestore()
      setItem.mockRestore()
    }
  })
})
