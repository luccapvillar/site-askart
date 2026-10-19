/**
 * Página inicial: topo da ASKART (reconhecimento do padrão antigo do BKS) e líderes agrupados por categoria
 * com todas as subcategorias. Nomes, números e pontos abaixo são dados de TESTE, não dados oficiais da ASKART.
 */
import { describe, expect, it } from 'vitest'
import { montarLideres, type ClassificacaoParaLideres, type CategoriaDosLideres } from '@/components/site/inicio/lideres'
import { ehBotoesAntigosDoTopo, ehSubtituloAntigoDoTopo, ehTituloAntigoDoTopo } from '@/lib/topo-inicio'

describe('topo da página inicial: padrão antigo do BKS', () => {
  it('reconhece o título antigo (nome do campeonato, com ou sem o ano)', () => {
    expect(ehTituloAntigoDoTopo('Brasília Kart Series 2026')).toBe(true)
    expect(ehTituloAntigoDoTopo('  brasilia kart series ')).toBe(true)
    expect(ehTituloAntigoDoTopo('BKS 2026')).toBe(true)
    expect(ehTituloAntigoDoTopo('ASKART')).toBe(false)
    expect(ehTituloAntigoDoTopo('Brasília Kart Series: inscrições abertas')).toBe(false)
    expect(ehTituloAntigoDoTopo(null)).toBe(false)
  })

  it('reconhece o subtítulo antigo e preserva o que foi escrito à mão', () => {
    expect(
      ehSubtituloAntigoDoTopo(
        'Calendário, classificação e resultados do campeonato organizado pela ASKART no Kartódromo Ayrton Senna do Guará, em Brasília.',
      ),
    ).toBe(true)
    expect(ehSubtituloAntigoDoTopo('Calendário, classificação e resultados do campeonato organizado pela ASKART no Kartódromo do Guará, em Brasília')).toBe(true)
    expect(ehSubtituloAntigoDoTopo('Texto escrito pelo moderador.')).toBe(false)
    expect(ehSubtituloAntigoDoTopo('')).toBe(false)
  })

  it('reconhece só os botões antigos ("Calendário" e "Classificação" do BKS)', () => {
    expect(
      ehBotoesAntigosDoTopo([
        { caminho: '/bks', rotulo: 'Calendário 2026' },
        { caminho: '/bks/classificacao', rotulo: 'Classificação' },
      ]),
    ).toBe(true)
    expect(ehBotoesAntigosDoTopo([{ caminho: '/bks', rotulo: 'Calendário' }])).toBe(true)
    expect(ehBotoesAntigosDoTopo([{ caminho: '/bks', rotulo: 'Calendário' }, { caminho: '/noticias', rotulo: 'Notícias' }])).toBe(false)
    expect(ehBotoesAntigosDoTopo([{ caminho: '/bks', rotulo: 'Conheça o BKS' }])).toBe(false)
    expect(ehBotoesAntigosDoTopo([])).toBe(false)
  })
})

/* ───────────────────────────── líderes ───────────────────────────── */

const F400: CategoriaDosLideres = {
  nome: 'F400',
  cor: '#c4261d',
  subcategorias: ['Novatos', 'Junior', 'Graduados', 'Sênior', 'GSS/60+'].map((nome) => ({ nome })),
}
const C125: CategoriaDosLideres = { nome: '125cc', cor: '#edd357', subcategorias: ['Novatos', 'Junior', 'Graduados', 'Sênior'].map((nome) => ({ nome })) }
const CADETE: CategoriaDosLideres = { nome: 'Cadete', cor: '#2f6db3', subcategorias: [] }
const CATEGORIAS: Record<string, CategoriaDosLideres> = { 1: F400, 2: C125, 3: CADETE }

/** Linhas de teste: por subcategoria, posição dentro dela (regra do BKS: pontos por subcategoria). */
function linhas(subs: [string | null, number[]][]) {
  return subs.flatMap(([sub, pontos]) =>
    pontos.map((p, i) => ({ posicao: i + 1, subcategoria: sub, pontos: p, nome: `Piloto ${sub ?? 'cat'} ${i + 1}`, numero: 10 + i, equipeNome: null })),
  )
}

describe('líderes da página inicial agrupados por categoria', () => {
  const classificacoes: ClassificacaoParaLideres[] = [
    {
      categoria: 1,
      porSubcategoria: true,
      linhas: linhas([
        ['Novatos', [40, 35]],
        ['Junior', [38, 30]],
        ['Graduados', [41]],
        ['Sênior', [44, 44]],
        ['GSS/60+', [20, 18]],
      ]),
      lider: null,
    },
    {
      categoria: 2,
      porSubcategoria: true,
      linhas: linhas([
        ['Novatos', [33, 31]],
        ['Junior', [25]],
        ['Graduados', [29, 12]],
        ['Sênior', [22, 21]],
      ]),
      lider: null,
    },
    {
      categoria: 3,
      porSubcategoria: true,
      linhas: linhas([[null, [50, 47]]]),
      lider: { linha: { posicao: 1, pontos: 50, nome: 'Piloto Cadete', numero: 7 }, tipo: 'lider', rotulo: 'Líder' },
    },
  ]
  const grupos = montarLideres(classificacoes, (id) => CATEGORIAS[String(id)] ?? null, 6)

  it('mostra TODAS as subcategorias da F400 e da 125cc, na ordem da categoria, sem cortar a 125cc', () => {
    expect(grupos.map((g) => g.categoria?.nome)).toEqual(['F400', '125cc', 'Cadete'])
    expect(grupos[0].cartoes.map((c) => c.subcategoria)).toEqual(['Novatos', 'Junior', 'Graduados', 'Sênior', 'GSS/60+'])
    expect(grupos[1].cartoes.map((c) => c.subcategoria)).toEqual(['Novatos', 'Junior', 'Graduados', 'Sênior'])
    expect(grupos[1].cartoes.map((c) => c.lider?.pontos)).toEqual([33, 25, 29, 22])
  })

  it('a vantagem é sobre o 2º da mesma subcategoria (null sem 2º; 0 = empate)', () => {
    expect(grupos[0].cartoes.map((c) => c.lider?.vantagem)).toEqual([5, 8, null, 0, 2])
  })

  it('categoria sem subcategorias tem um cartão só, com o líder da categoria', () => {
    expect(grupos[2].porSubcategoria).toBe(false)
    expect(grupos[2].cartoes).toHaveLength(1)
    expect(grupos[2].cartoes[0]).toMatchObject({ subcategoria: null, lider: { nome: 'Piloto Cadete', pontos: 50 } })
  })

  it('subcategoria cadastrada ainda sem pontos aparece com o cartão vazio', () => {
    const [f400] = montarLideres(
      [{ categoria: 1, porSubcategoria: true, linhas: linhas([['Novatos', [12]], ['Junior', [0]]]), lider: null }],
      (id) => CATEGORIAS[String(id)] ?? null,
    )
    expect(f400.cartoes.map((c) => [c.subcategoria, c.lider?.pontos ?? null])).toEqual([
      ['Novatos', 12],
      ['Junior', null],
      ['Graduados', null],
      ['Sênior', null],
      ['GSS/60+', null],
    ])
  })

  it('antes da primeira etapa (ninguém com pontos) a categoria não entra; o limite conta categorias inteiras', () => {
    expect(montarLideres([{ categoria: 2, porSubcategoria: true, linhas: linhas([['Novatos', [0]]]), lider: null }], (id) => CATEGORIAS[String(id)] ?? null)).toEqual([])
    const doisPrimeiros = montarLideres(classificacoes, (id) => CATEGORIAS[String(id)] ?? null, 2)
    expect(doisPrimeiros.map((g) => g.cartoes.length)).toEqual([5, 4])
  })
})
