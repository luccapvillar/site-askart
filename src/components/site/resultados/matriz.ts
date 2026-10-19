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
 * Sessão marcada para algumas subcategorias (corridas.subcategorias, horários diferentes) só vira coluna nas
 * tabelas delas; sessão sem marcação vale para todas.
 *
 * Pontos (os do motor, src/lib/classificacao.ts):
 * - regra do BKS (`calculoDaEtapa: 'media-das-corridas'`): as corridas não têm pontos próprios; a coluna
 *   "Resultado da etapa" mostra a posição NA SUBCATEGORIA pela média das corridas, a média e os pontos
 *   ("2º · média 2,0 · 22 pts"), e a corrida em que o piloto abandonou (ou não correu) mostra que valeu como
 *   o último do grid na média ("vale 6º na média");
 * - cálculo antigo (por corrida): pontos em cada corrida e o total da etapa, com a posição relativa e a geral.
 *
 * Roxo = o MELHOR TEMPO (menor melhor volta) de cada sessão dentro da tabela (da subcategoria, ou da
 * categoria quando não há subcategorias), seja de quem for — o vencedor não fica roxo por ter vencido.
 * Empate de tempo: todos os empatados em roxo. Sessão sem tempos lançados não tem roxo. Tempos de
 * desclassificado e de quem não largou não contam.
 */
import type { CorridaComResultado, LinhaCorridaExibida, LinhaEtapaExibida, ResultadoCategoriaNaEtapa } from '@/lib/carregar-competicao'
import { DECISOES_MEDIA, type CriterioDesempateMedia, type Id, type StatusResultado } from '@/lib/classificacao'
import {
  agruparPorSubcategoria,
  chaveDeSubcategoria,
  nomeOficial,
  nomesCadastrados,
  normalizarSubcategoria as normalizar,
  posicaoRelativa as relativa,
  SEM_SUBCATEGORIA,
  subcategoriasDaSessao,
} from '@/lib/subcategorias'

export { SEM_SUBCATEGORIA }

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
  /** Regra do BKS, coluna da etapa: média das posições nas corridas (ex.: 2 = 2º e 2º). */
  media: number | null
  /**
   * Regra do BKS, colunas das corridas: a posição com que a corrida entrou na média quando ela é diferente da
   * mostrada — o piloto não terminou (abandono, não largou, desclassificado) ou não correu (vale a última do
   * grid), ou um convidado à frente não conta. null nos demais casos.
   */
  contaComo: number | null
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

const SITUACAO: Partial<Record<StatusResultado, string>> = {
  abandono: 'Abandono',
  desclassificado: 'Desclassificado',
  'nao-largou': 'Não largou',
  'nao-classificado': 'Não classificado',
}

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
type Base = { colunas: ColunaInterna[]; pilotos: Piloto[]; etapaDe: Map<string, LinhaEtapaExibida>; pelaMedia: boolean }
type Entrada = Pick<ResultadoCategoriaNaEtapa, 'corridas' | 'etapa' | 'semRegra' | 'calculoDaEtapa'>

/** Média com uma casa e vírgula: 2 → "2,0"; 2,5 → "2,5"; 2,333 → "2,3". */
export const formatarMedia = (n: number) => n.toFixed(1).replace('.', ',')

const DESEMPATE_DA_MEDIA: Record<CriterioDesempateMedia, string> = {
  'ultima-corrida': 'a melhor posição na última corrida',
  classificacao: 'a melhor posição na classificação (tomada de tempo)',
}

/** Lista em português: "a", "a e b", "a, b e c". */
const emLista = (itens: string[]) => (itens.length <= 1 ? (itens[0] ?? '') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`)

/**
 * Como o resultado da etapa é calculado na regra do BKS (legenda da tabela), escrito a partir das decisões do
 * motor (DECISOES_MEDIA): mudou a regra lá, o texto acompanha.
 */
export function explicacaoDaMedia(): string {
  const desempate = DECISOES_MEDIA.desempate.map((c) => DESEMPATE_DA_MEDIA[c]).filter(Boolean)
  const ultima = DECISOES_MEDIA.contamComoUltima.map((st) => (SITUACAO[st] ?? st).toLowerCase())
  return [
    'Resultado da etapa: posição dentro da subcategoria pela média das posições nas corridas dela',
    desempate.length ? ` (média igual: desempata ${desempate.join(', depois ')})` : '',
    `. ${emLista([...ultima, 'não correr']).replace(/^./, (l) => l.toUpperCase())} vale a última posição do grid.`,
  ].join('')
}

/** Colunas e pilotos (já na ordem de exibição) de uma categoria. */
function prepararBase(resultado: Entrada): Base {
  const semRegra = resultado.semRegra === true
  // Regra do BKS: as corridas não têm pontos próprios (a etapa é pontuada pela média das posições).
  const pelaMedia = resultado.calculoDaEtapa === 'media-das-corridas'
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
        comPontos: Boolean(c && g.tipo === 'corrida' && c.conta && !semRegra && !pelaMedia),
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
    subtitulo: pelaMedia && !semRegra ? 'média das corridas' : null,
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
  return { colunas, pilotos: ordenados, etapaDe, pelaMedia }
}

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
    media: null,
    contaComo: null,
    pontos: null,
    penalidade: null,
    melhorVolta: null,
    melhorTempo: false,
    pole: false,
  }
  const posicoes = (col: ColunaInterna, geral: number | null) => {
    if (!porSubcategoria) return { posicao: geral, posicaoGeral: null }
    const posicao = relativa(geral, posicoesDaColuna.get(col.chave) ?? [])
    // Regra do BKS: "(Xº geral)" só quando diz algo a mais (sessão em que correram outras subcategorias).
    return { posicao, posicaoGeral: base.pelaMedia && geral === posicao ? null : geral }
  }

  const celula = (col: ColunaInterna, p: Piloto): CelulaMatriz => {
    if (col.ausente) return vazia
    if (col.tipo === 'etapa') {
      const e = base.etapaDe.get(p.chave)
      if (!e) return vazia
      return {
        ...vazia,
        tem: true,
        // Regra do BKS: a posição na etapa já é a da subcategoria (pela média), sem posição geral.
        ...(base.pelaMedia ? { posicao: e.posicao, posicaoGeral: null } : posicoes(col, e.posicao)),
        situacao: e.posicao === null ? (e.desclassificado ? 'Desclassificado' : 'Sem posição') : null,
        media: base.pelaMedia && e.posicao !== null && typeof e.media === 'number' ? e.media : null,
        pontos: e.total,
        penalidade: e.ajustes < 0 ? e.ajustes : null,
      }
    }
    const sessao = col.sessao as CorridaComResultado
    // Regra do BKS: a posição com que esta corrida entrou na média do piloto (quando entrou).
    const naMedia = base.pelaMedia ? base.etapaDe.get(p.chave)?.posicoesNaMedia?.find((x) => String(x.corrida) === String(sessao.id)) : undefined
    const l = sessao.linhas.find((x) => chaveDaLinha(x) === p.chave)
    if (!l) return naMedia ? { ...vazia, contaComo: naMedia.posicao } : vazia
    const pontua = col.comPontos && !l.convidado
    const melhor = melhorDaColuna.get(col.chave) ?? null
    const pos = posicoes(col, l.posicaoCategoria)
    return {
      tem: true,
      ...pos,
      situacao: SITUACAO[l.status] ?? (l.posicaoCategoria === null ? 'Sem posição' : null),
      media: null,
      contaComo: naMedia && (naMedia.ultima || naMedia.posicao !== pos.posicao) ? naMedia.posicao : null,
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

/**
 * Tabelas do resultado de uma categoria: uma por subcategoria (as que têm piloto na etapa, na ordem
 * cadastrada na categoria; subcategoria gravada que não está mais na lista vem depois, pelo nome; quem não
 * tem subcategoria fica em "Sem subcategoria", no fim). Categoria sem subcategorias — ou nenhum piloto com
 * subcategoria — tem uma tabela só, como antes.
 *
 * Sessões com horário próprio de subcategoria (corridas.subcategorias preenchido) só entram nas tabelas das
 * subcategorias marcadas: a "Tomada de tempo" dos Novatos não vira coluna vazia na tabela dos Graduados.
 * Sessão sem marcação vale para todas; a tabela "Sem subcategoria" mostra todas as sessões.
 */
export function montarMatrizes(
  resultado: Entrada,
  subcategorias: Array<{ nome?: string | null } | string | null | undefined> | null | undefined = [],
): MatrizesEtapa {
  const base = prepararBase(resultado)
  const cadastradas = nomesCadastrados(subcategorias)
  // Grafia como está na categoria ("junior" gravado antes de uma correção → "Junior").
  const pilotos = base.pilotos.map((p) => ({ ...p, subcategoria: nomeOficial(p.subcategoria, cadastradas) }))
  const colunas = base.colunas.map(({ sessao: _s, primeiraDoGrupo: _p, ...c }) => c)

  // Regra do BKS: cada subcategoria é um grid com posições próprias — separa sempre que algum piloto tem
  // subcategoria (mesmo que o nome não esteja mais cadastrado na categoria), senão as posições se repetiriam.
  const porSubcategoria = (base.pelaMedia || cadastradas.length > 0) && pilotos.some((p) => p.subcategoria !== null)
  if (!porSubcategoria) {
    return {
      porSubcategoria: false,
      colunas,
      tabelas: [{ chave: 'categoria', nome: null, semSubcategoria: false, ...montarTabela(base, pilotos, false) }],
    }
  }

  const sessoes = resultado.corridas ?? []
  const valeParaTodas = sessoes.every((c) => !subcategoriasDaSessao(c.subcategorias, cadastradas).length)
  /** Base (colunas e ordem) só com as sessões da subcategoria; sem marcação em nenhuma sessão, a da categoria. */
  const baseDa = (nome: string | null): Base =>
    valeParaTodas || nome === null
      ? base
      : prepararBase({
          ...resultado,
          corridas: sessoes.filter((c) => {
            const subs = subcategoriasDaSessao(c.subcategorias, cadastradas)
            return !subs.length || subs.includes(nome)
          }),
        })

  const usadas = new Set<string>()
  const tabelas = agruparPorSubcategoria(pilotos, (p) => p.subcategoria, cadastradas).map((g, i) => {
    const nome = g.nome ?? SEM_SUBCATEGORIA
    let chave = g.nome === null ? 'sem-subcategoria' : chaveDeSubcategoria(g.nome)
    if (usadas.has(chave)) chave = `${chave}-${i + 1}`
    usadas.add(chave)
    const baseGrupo = baseDa(g.nome)
    // Ordem das linhas pelas sessões da própria subcategoria (quem não aparece nelas mantém a ordem geral).
    const ordem = new Map(baseGrupo.pilotos.map((p, j) => [p.chave, j] as const))
    const doGrupo = baseGrupo === base ? g.itens : [...g.itens].sort((a, b) => (ordem.get(a.chave) ?? Infinity) - (ordem.get(b.chave) ?? Infinity))
    return { chave, nome, semSubcategoria: g.nome === null, ...montarTabela(baseGrupo, doGrupo, true) }
  })
  return { porSubcategoria: true, colunas, tabelas }
}
