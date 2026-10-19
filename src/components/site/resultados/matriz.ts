/**
 * Matriz do resultado de uma etapa (uma categoria) — funções PURAS, sem React, testadas em tests/int.
 *
 * Colunas: Warm-up, Classificação (tomada de tempo), Corrida 1, Corrida 2 (e Corrida 3… se houver) e
 * Resultado da etapa. Linhas: todos os pilotos que aparecem em qualquer sessão, na ordem do resultado da
 * etapa; quem não tem resultado da etapa vem depois, pela classificação.
 *
 * Subcategorias (pedido do cliente): quando a categoria tem subcategorias e os pilotos da etapa têm a
 * subcategoria na inscrição, sai UMA TABELA POR SUBCATEGORIA (`montarMatrizes`), na ordem cadastrada na
 * categoria; quem está sem subcategoria vai para "Sem subcategoria". Em cada tabela, a posição de cada
 * sessão é a posição DENTRO da subcategoria (ordem relativa pela posição geral), com a posição geral ao lado.
 * Os pontos continuam os do motor do campeonato (a subcategoria não muda pontos).
 *
 * Roxo = o MELHOR TEMPO (menor melhor volta) de cada sessão dentro da tabela (da subcategoria, ou da
 * categoria quando não há subcategorias), seja de quem for — o vencedor não fica roxo por ter vencido.
 * Empate de tempo: todos os empatados em roxo. Sessão sem tempos lançados não tem roxo. Tempos de
 * desclassificado e de quem não largou não contam.
 */
import type { CorridaComResultado, LinhaCorridaExibida, LinhaEtapaExibida, ResultadoCategoriaNaEtapa } from '@/lib/carregar-competicao'
import type { Id, StatusResultado } from '@/lib/classificacao'

export type TipoColuna = 'warm-up' | 'classificacao' | 'corrida' | 'etapa'

export interface ColunaMatriz {
  chave: string
  tipo: TipoColuna
  /** "Warm-up", "Classificação", "Corrida 1"…, "Resultado da etapa". */
  titulo: string
  /** Texto curto abaixo do título (nome lançado quando difere do título; "não vale pontos"). */
  subtitulo: string | null
  /** Sessão sem resultado publicado: cada célula mostra "—" com esta explicação. */
  ausente: string | null
  /** A coluna mostra pontos. */
  comPontos: boolean
  /** Sessão de origem (null na coluna da etapa e nas sessões ausentes). */
  corrida: Id | null
}

export interface CelulaMatriz {
  /** O piloto tem resultado nesta coluna. */
  tem: boolean
  /** Posição exibida: dentro da subcategoria (tabelas por subcategoria) ou na categoria. */
  posicao: number | null
  /** Posição geral na categoria — só nas tabelas por subcategoria (para "1º (3º geral)"). */
  posicaoGeral: number | null
  /** Situação por extenso curto ("Abandono", "Desclassificado", "Não largou", "Não classificado", "Sem posição"). */
  situacao: string | null
  pontos: number | null
  /** Penalidade de pontos (negativa) já descontada no total da etapa. */
  penalidade: number | null
  /** Melhor volta em milissegundos. */
  melhorVolta: number | null
  /** Melhor tempo da sessão dentro da tabela (célula em roxo). Empate: todos os empatados. */
  melhorTempo: boolean
  /** Pole position da etapa (na coluna da classificação). */
  pole: boolean
}

export interface LinhaMatriz {
  chave: string
  nome: string
  numero: number | string | null
  pilotoSlug: string | null
  equipeNome: string | null
  convidado: boolean
  /** Subcategoria da inscrição (como cadastrada na categoria), ou null. */
  subcategoria: string | null
  /** Uma célula por coluna, na ordem de `colunas`. */
  celulas: CelulaMatriz[]
}

export interface MatrizEtapa {
  colunas: ColunaMatriz[]
  linhas: LinhaMatriz[]
}

/** Uma tabela do resultado: a de uma subcategoria, ou a da categoria inteira. */
export interface TabelaMatriz extends MatrizEtapa {
  /** Chave estável, boa para ids de HTML ("novatos", "gss-60", "sem-subcategoria"; "categoria" sem subcategorias). */
  chave: string
  /** Nome da subcategoria ("Sem subcategoria" para quem não tem); null na tabela única da categoria. */
  nome: string | null
  semSubcategoria: boolean
}

export interface MatrizesEtapa {
  /** true = uma tabela por subcategoria (com posição relativa); false = uma tabela só, como antes. */
  porSubcategoria: boolean
  colunas: ColunaMatriz[]
  tabelas: TabelaMatriz[]
}

export const SEM_SUBCATEGORIA = 'Sem subcategoria'

const SITUACAO: Partial<Record<StatusResultado, string>> = {
  abandono: 'Abandono',
  desclassificado: 'Desclassificado',
  'nao-largou': 'Não largou',
  'nao-classificado': 'Não classificado',
}

const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

/** Chave do piloto numa linha de corrida (igual à `chave` do resultado da etapa: id do piloto). */
const chaveDaLinha = (l: Pick<LinhaCorridaExibida, 'piloto' | 'inscricao'>) =>
  l.piloto !== null && l.piloto !== undefined && String(l.piloto) !== '' ? String(l.piloto) : `inscricao:${String(l.inscricao)}`

/** "1º" */
export const formatarPosicao = (n: number) => `${n}º`

/** Pontos com uma casa decimal (vírgula) quando não inteiros. */
export const formatarPontos = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','))

/** Volta em mm:ss.mmm (ex.: 62345 → "01:02.345"). */
export function formatarVolta(ms: number): string {
  const total = Math.max(0, Math.round(ms))
  const min = Math.floor(total / 60_000)
  const seg = Math.floor((total % 60_000) / 1000)
  const mil = total % 1000
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}.${String(mil).padStart(3, '0')}`
}

/** Melhor volta válida de uma linha (ms), ou null. */
const voltaDa = (l: Pick<LinhaCorridaExibida, 'melhorVolta'>) =>
  typeof l.melhorVolta === 'number' && Number.isFinite(l.melhorVolta) && l.melhorVolta > 0 ? l.melhorVolta : null

/** O tempo conta para o roxo? (desclassificado e "não largou" ficam fora) */
const tempoValido = (l: LinhaCorridaExibida) => voltaDa(l) !== null && l.status !== 'desclassificado' && l.status !== 'nao-largou'

type Grupo = { tipo: Exclude<TipoColuna, 'etapa'>; base: string; ausente: (n: number | null) => string; minimo: number }

const GRUPOS: Grupo[] = [
  { tipo: 'warm-up', base: 'Warm-up', ausente: () => 'Sem resultado de warm-up nesta etapa', minimo: 1 },
  { tipo: 'classificacao', base: 'Classificação', ausente: () => 'Sem resultado de classificação nesta etapa', minimo: 1 },
  { tipo: 'corrida', base: 'Corrida', ausente: (n) => `Sem resultado da Corrida ${n} nesta etapa`, minimo: 2 },
]

const grupoDa = (c: CorridaComResultado): Grupo['tipo'] =>
  c.tipo === 'warm-up' ? 'warm-up' : c.tipo === 'tomada-de-tempo' ? 'classificacao' : 'corrida'

type ColunaInterna = ColunaMatriz & { sessao: CorridaComResultado | null; primeiraDoGrupo: boolean }
type Piloto = Omit<LinhaMatriz, 'celulas'>
type Base = { colunas: ColunaInterna[]; pilotos: Piloto[]; etapaDe: Map<string, LinhaEtapaExibida> }
type Entrada = Pick<ResultadoCategoriaNaEtapa, 'corridas' | 'etapa' | 'semRegra'>

/** Colunas e pilotos (já na ordem de exibição) de uma categoria. */
function prepararBase(resultado: Entrada): Base {
  const semRegra = resultado.semRegra === true
  const sessoes = [...(resultado.corridas ?? [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
  const etapa: LinhaEtapaExibida[] = semRegra ? [] : (resultado.etapa ?? [])

  // ── colunas ──
  const colunas: ColunaInterna[] = []
  for (const g of GRUPOS) {
    const doGrupo = sessoes.filter((c) => grupoDa(c) === g.tipo)
    const total = Math.max(g.minimo, doGrupo.length)
    for (let i = 0; i < total; i++) {
      const c = doGrupo[i] ?? null
      // Corridas sempre numeradas; warm-up e classificação só quando há mais de uma.
      const numerada = g.tipo === 'corrida' || doGrupo.length > 1
      const titulo = numerada ? `${g.base} ${i + 1}` : g.base
      const nome = c?.nome?.trim() || null
      const notas = [
        nome && normalizar(nome) !== normalizar(titulo) ? nome : null,
        c && g.tipo === 'corrida' && !c.conta ? 'não vale pontos' : null,
      ].filter(Boolean)
      colunas.push({
        chave: c ? `sessao:${String(c.id)}` : `${g.tipo}:${i + 1}`,
        tipo: g.tipo,
        titulo,
        subtitulo: notas.length ? notas.join(' · ') : null,
        ausente: c ? null : g.ausente(i + 1),
        comPontos: Boolean(c && g.tipo === 'corrida' && c.conta && !semRegra),
        corrida: c?.id ?? null,
        sessao: c,
        primeiraDoGrupo: i === 0,
      })
    }
  }
  colunas.push({
    chave: 'etapa',
    tipo: 'etapa',
    titulo: 'Resultado da etapa',
    subtitulo: null,
    ausente: semRegra ? 'Pontuação da categoria ainda não definida' : etapa.length ? null : 'Resultado da etapa ainda sem corridas oficiais',
    comPontos: !semRegra,
    corrida: null,
    sessao: null,
    primeiraDoGrupo: true,
  })

  // ── pilotos (todos os que aparecem em alguma sessão ou no resultado da etapa) ──
  const pilotos = new Map<string, Piloto>()
  const etapaDe = new Map(etapa.map((l) => [l.chave, l] as const))
  const sub = (v: string | null | undefined) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  for (const l of etapa) {
    pilotos.set(l.chave, {
      chave: l.chave,
      nome: l.nome,
      numero: l.numero ?? null,
      pilotoSlug: l.pilotoSlug ?? null,
      equipeNome: l.equipeNome ?? null,
      convidado: false,
      subcategoria: sub(l.subcategoria),
    })
  }
  for (const c of sessoes) {
    for (const l of c.linhas) {
      const chave = chaveDaLinha(l)
      const atual = pilotos.get(chave)
      if (atual) {
        atual.convidado ||= l.convidado
        atual.subcategoria ??= sub(l.subcategoria)
        continue
      }
      pilotos.set(chave, {
        chave,
        nome: l.nome ?? 'Piloto sem nome',
        numero: l.numero ?? null,
        pilotoSlug: l.pilotoSlug ?? null,
        equipeNome: l.equipeNome ?? null,
        convidado: l.convidado,
        subcategoria: sub(l.subcategoria),
      })
    }
  }

  // ── ordem das linhas: resultado da etapa; depois, pela classificação (e pelo warm-up) ──
  const ordemEtapa = new Map(etapa.map((l, i) => [l.chave, i] as const))
  const posicaoNa = (tipo: TipoColuna, chave: string) => {
    const col = colunas.find((c) => c.tipo === tipo && c.sessao)
    const l = col?.sessao?.linhas.find((x) => chaveDaLinha(x) === chave)
    return l?.posicaoCategoria ?? Infinity
  }
  const ordenados = [...pilotos.values()].sort((a, b) => {
    const ea = ordemEtapa.get(a.chave) ?? Infinity
    const eb = ordemEtapa.get(b.chave) ?? Infinity
    if (ea !== eb) return ea - eb
    return (
      posicaoNa('classificacao', a.chave) - posicaoNa('classificacao', b.chave) ||
      posicaoNa('warm-up', a.chave) - posicaoNa('warm-up', b.chave) ||
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base', numeric: true })
    )
  })
  return { colunas, pilotos: ordenados, etapaDe }
}

/** Posição relativa: 1 + quantos do grupo estão à frente (empate na posição geral = mesma posição). */
const relativa = (geral: number | null, gerais: number[]) => (geral === null ? null : 1 + gerais.filter((g) => g < geral).length)

/**
 * Uma tabela com os `pilotos` dados. `porSubcategoria`: posição dentro do grupo (com a geral ao lado).
 * O roxo (melhor tempo) é sempre calculado só entre os pilotos da tabela.
 */
function montarTabela(base: Base, pilotos: Piloto[], porSubcategoria: boolean): MatrizEtapa {
  const doGrupo = new Set(pilotos.map((p) => p.chave))

  // Por sessão: posições gerais do grupo (para a relativa) e o melhor tempo do grupo.
  const posicoesDaColuna = new Map<string, number[]>()
  const melhorDaColuna = new Map<string, number | null>()
  for (const col of base.colunas) {
    if (col.tipo === 'etapa') {
      const gerais = pilotos.map((p) => base.etapaDe.get(p.chave)?.posicao ?? null).filter((n): n is number => n !== null)
      posicoesDaColuna.set(col.chave, gerais)
      continue
    }
    if (!col.sessao) continue
    const linhas = col.sessao.linhas.filter((l) => doGrupo.has(chaveDaLinha(l)))
    posicoesDaColuna.set(
      col.chave,
      linhas.map((l) => l.posicaoCategoria).filter((n): n is number => typeof n === 'number'),
    )
    const tempos = linhas.filter(tempoValido).map((l) => voltaDa(l) as number)
    melhorDaColuna.set(col.chave, tempos.length ? Math.min(...tempos) : null)
  }

  const vazia: CelulaMatriz = {
    tem: false,
    posicao: null,
    posicaoGeral: null,
    situacao: null,
    pontos: null,
    penalidade: null,
    melhorVolta: null,
    melhorTempo: false,
    pole: false,
  }
  const posicoes = (col: ColunaInterna, geral: number | null) =>
    porSubcategoria
      ? { posicao: relativa(geral, posicoesDaColuna.get(col.chave) ?? []), posicaoGeral: geral }
      : { posicao: geral, posicaoGeral: null }

  const celula = (col: ColunaInterna, p: Piloto): CelulaMatriz => {
    if (col.ausente) return vazia
    if (col.tipo === 'etapa') {
      const e = base.etapaDe.get(p.chave)
      if (!e) return vazia
      return {
        ...vazia,
        tem: true,
        ...posicoes(col, e.posicao),
        situacao: e.posicao === null ? (e.desclassificado ? 'Desclassificado' : 'Sem posição') : null,
        pontos: e.total,
        penalidade: e.ajustes < 0 ? e.ajustes : null,
      }
    }
    const sessao = col.sessao as CorridaComResultado
    const l = sessao.linhas.find((x) => chaveDaLinha(x) === p.chave)
    if (!l) return vazia
    const pontua = col.comPontos && !l.convidado
    const melhor = melhorDaColuna.get(col.chave) ?? null
    return {
      tem: true,
      ...posicoes(col, l.posicaoCategoria),
      situacao: SITUACAO[l.status] ?? (l.posicaoCategoria === null ? 'Sem posição' : null),
      pontos: pontua ? l.pontos : null,
      penalidade: pontua && l.penalidadePontos < 0 ? l.penalidadePontos : null,
      melhorVolta: voltaDa(l),
      melhorTempo: melhor !== null && tempoValido(l) && voltaDa(l) === melhor,
      pole: col.tipo === 'classificacao' && col.primeiraDoGrupo && base.etapaDe.get(p.chave)?.pole === true,
    }
  }

  return {
    colunas: base.colunas.map(({ sessao: _s, primeiraDoGrupo: _p, ...c }) => c),
    linhas: pilotos.map((p) => ({ ...p, celulas: base.colunas.map((col) => celula(col, p)) })),
  }
}

/** Monta colunas, linhas e o roxo de UMA categoria numa tabela só (posições e melhor tempo da categoria). */
export function montarMatriz(resultado: Entrada): MatrizEtapa {
  const base = prepararBase(resultado)
  return montarTabela(base, base.pilotos, false)
}

/** Chave para ids de HTML: "GSS/60+" → "gss-60". */
const chaveDe = (nome: string) => normalizar(nome).replace(/ /g, '-') || 'subcategoria'

/**
 * Tabelas do resultado de uma categoria: uma por subcategoria (as que têm piloto na etapa, na ordem
 * cadastrada na categoria; subcategoria gravada que não está mais na lista vem depois, pelo nome; quem não
 * tem subcategoria fica em "Sem subcategoria", no fim). Categoria sem subcategorias — ou nenhum piloto com
 * subcategoria — tem uma tabela só, como antes.
 */
export function montarMatrizes(
  resultado: Entrada,
  subcategorias: Array<{ nome?: string | null } | string | null | undefined> | null | undefined = [],
): MatrizesEtapa {
  const base = prepararBase(resultado)
  const cadastradas = (subcategorias ?? [])
    .map((s) => (typeof s === 'string' ? s : s?.nome)?.trim() ?? '')
    .filter((n, i, todas) => n && todas.indexOf(n) === i)
  // Grafia como está na categoria ("junior" gravado antes de uma correção → "Junior").
  const oficial = (nome: string | null) => {
    if (!nome) return null
    return cadastradas.find((c) => c === nome) ?? cadastradas.find((c) => normalizar(c) === normalizar(nome)) ?? nome
  }
  const pilotos = base.pilotos.map((p) => ({ ...p, subcategoria: oficial(p.subcategoria) }))
  const colunas = base.colunas.map(({ sessao: _s, primeiraDoGrupo: _p, ...c }) => c)

  const porSubcategoria = cadastradas.length > 0 && pilotos.some((p) => p.subcategoria !== null)
  if (!porSubcategoria) {
    return {
      porSubcategoria: false,
      colunas,
      tabelas: [{ chave: 'categoria', nome: null, semSubcategoria: false, ...montarTabela(base, pilotos, false) }],
    }
  }

  const extras = [...new Set(pilotos.map((p) => p.subcategoria).filter((s): s is string => s !== null && !cadastradas.includes(s)))].sort(
    (a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true }),
  )
  const grupos: { nome: string | null; pilotos: Piloto[] }[] = [...cadastradas, ...extras, null]
    .map((nome) => ({ nome, pilotos: pilotos.filter((p) => p.subcategoria === nome) }))
    .filter((g) => g.pilotos.length > 0)

  const usadas = new Set<string>()
  const tabelas = grupos.map((g, i) => {
    const nome = g.nome ?? SEM_SUBCATEGORIA
    let chave = g.nome === null ? 'sem-subcategoria' : chaveDe(g.nome)
    if (usadas.has(chave)) chave = `${chave}-${i + 1}`
    usadas.add(chave)
    return { chave, nome, semSubcategoria: g.nome === null, ...montarTabela(base, g.pilotos, true) }
  })
  return { porSubcategoria: true, colunas, tabelas }
}
