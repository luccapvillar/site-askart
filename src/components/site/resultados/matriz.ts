/**
 * Matriz do resultado de uma etapa (uma categoria) — função PURA, sem React, testada em tests/int.
 *
 * Colunas: Warm-up, Classificação (tomada de tempo), Corrida 1, Corrida 2 (e Corrida 3… se houver) e
 * Resultado da etapa. Linhas: todos os pilotos que aparecem em qualquer sessão, na ordem do resultado da
 * etapa; quem não tem resultado da etapa vem depois, pela classificação.
 *
 * Roxo (convenção de cronometragem) = o melhor do grid em cada coluna:
 * - Warm-up e Classificação: a volta mais rápida da sessão (sem tempos lançados, o 1º colocado);
 * - Corridas e Resultado da etapa: o vencedor (1º);
 * - além disso, a volta mais rápida de cada corrida (a oficial, quando houver; senão a menor melhor volta).
 */
import type { CorridaComResultado, LinhaCorridaExibida, ResultadoCategoriaNaEtapa } from '@/lib/carregar-competicao'
import type { Id, StatusResultado } from '@/lib/classificacao'
import type { LinhaResultadoDaEtapa } from '@/lib/estatisticas'

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
  posicao: number | null
  /** Situação por extenso curto ("Abandono", "Desclassificado", "Não largou", "Não classificado", "Sem posição"). */
  situacao: string | null
  pontos: number | null
  /** Penalidade de pontos (negativa) já descontada no total da etapa. */
  penalidade: number | null
  /** Melhor volta em milissegundos. */
  melhorVolta: number | null
  /** Melhor resultado do grid nesta coluna (célula em roxo). */
  melhorDoGrid: boolean
  /** Volta mais rápida da corrida (volta em roxo). */
  voltaMaisRapida: boolean
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
  /** Uma célula por coluna, na ordem de `colunas`. */
  celulas: CelulaMatriz[]
}

export interface MatrizEtapa {
  colunas: ColunaMatriz[]
  linhas: LinhaMatriz[]
}

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

/** Linha com a menor melhor volta da sessão (desclassificado e "não largou" fora); empate: melhor posição. */
function linhaDaMelhorVolta(linhas: LinhaCorridaExibida[]): LinhaCorridaExibida | null {
  const candidatas = linhas.filter(
    (l) => typeof l.melhorVolta === 'number' && l.melhorVolta > 0 && l.status !== 'desclassificado' && l.status !== 'nao-largou',
  )
  candidatas.sort(
    (a, b) => (a.melhorVolta as number) - (b.melhorVolta as number) || (a.posicaoCategoria ?? Infinity) - (b.posicaoCategoria ?? Infinity),
  )
  return candidatas[0] ?? null
}

/** Volta mais rápida de uma corrida: a oficial (que pontua) quando houver; senão a menor melhor volta. */
function chaveDaVoltaMaisRapida(c: CorridaComResultado): string | null {
  if (c.voltaMaisRapida !== null && c.voltaMaisRapida !== undefined) {
    const oficial = c.linhas.find((l) => String(l.inscricao) === String(c.voltaMaisRapida))
    if (oficial) return chaveDaLinha(oficial)
  }
  const melhor = linhaDaMelhorVolta(c.linhas)
  return melhor ? chaveDaLinha(melhor) : null
}

/** Melhor do grid numa sessão cronometrada (warm-up, classificação): a volta mais rápida; sem tempos, o 1º. */
function chaveDoMelhorDaSessao(c: CorridaComResultado): string | null {
  const melhor = linhaDaMelhorVolta(c.linhas) ?? c.linhas.find((l) => l.posicaoCategoria === 1) ?? null
  return melhor ? chaveDaLinha(melhor) : null
}

type Grupo = { tipo: Exclude<TipoColuna, 'etapa'>; base: string; ausente: (n: number | null) => string; minimo: number }

const GRUPOS: Grupo[] = [
  { tipo: 'warm-up', base: 'Warm-up', ausente: () => 'Sem resultado de warm-up nesta etapa', minimo: 1 },
  { tipo: 'classificacao', base: 'Classificação', ausente: () => 'Sem resultado de classificação nesta etapa', minimo: 1 },
  { tipo: 'corrida', base: 'Corrida', ausente: (n) => `Sem resultado da Corrida ${n} nesta etapa`, minimo: 2 },
]

const grupoDa = (c: CorridaComResultado): Grupo['tipo'] =>
  c.tipo === 'warm-up' ? 'warm-up' : c.tipo === 'tomada-de-tempo' ? 'classificacao' : 'corrida'

/** Monta colunas, linhas e marcações (roxo) da matriz de UMA categoria. */
export function montarMatriz(resultado: Pick<ResultadoCategoriaNaEtapa, 'corridas' | 'etapa' | 'semRegra'>): MatrizEtapa {
  const semRegra = resultado.semRegra === true
  const sessoes = [...(resultado.corridas ?? [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
  const etapa: LinhaResultadoDaEtapa[] = semRegra ? [] : (resultado.etapa ?? [])

  // ── colunas ──
  type ColunaInterna = ColunaMatriz & { sessao: CorridaComResultado | null; primeiraDoGrupo: boolean }
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
  type Piloto = Omit<LinhaMatriz, 'celulas'>
  const pilotos = new Map<string, Piloto>()
  const etapaDe = new Map(etapa.map((l) => [l.chave, l] as const))
  for (const l of etapa) {
    pilotos.set(l.chave, {
      chave: l.chave,
      nome: l.nome,
      numero: l.numero ?? null,
      pilotoSlug: l.pilotoSlug ?? null,
      equipeNome: l.equipeNome ?? null,
      convidado: false,
    })
  }
  for (const c of sessoes) {
    for (const l of c.linhas) {
      const chave = chaveDaLinha(l)
      const atual = pilotos.get(chave)
      if (atual) {
        atual.convidado ||= l.convidado
        continue
      }
      pilotos.set(chave, {
        chave,
        nome: l.nome ?? 'Piloto sem nome',
        numero: l.numero ?? null,
        pilotoSlug: l.pilotoSlug ?? null,
        equipeNome: l.equipeNome ?? null,
        convidado: l.convidado,
      })
    }
  }

  // ── marcações por sessão ──
  const melhorDaColuna = new Map<string, string | null>()
  const voltaRapidaDaColuna = new Map<string, string | null>()
  for (const col of colunas) {
    if (!col.sessao) continue
    if (col.tipo === 'corrida') {
      const vencedor = col.sessao.linhas.find((l) => l.posicaoCategoria === 1)
      melhorDaColuna.set(col.chave, vencedor ? chaveDaLinha(vencedor) : null)
      voltaRapidaDaColuna.set(col.chave, chaveDaVoltaMaisRapida(col.sessao))
    } else {
      melhorDaColuna.set(col.chave, chaveDoMelhorDaSessao(col.sessao))
    }
  }

  const vazia: CelulaMatriz = {
    tem: false,
    posicao: null,
    situacao: null,
    pontos: null,
    penalidade: null,
    melhorVolta: null,
    melhorDoGrid: false,
    voltaMaisRapida: false,
    pole: false,
  }

  const celula = (col: ColunaInterna, p: Piloto): CelulaMatriz => {
    if (col.ausente) return vazia
    if (col.tipo === 'etapa') {
      const e = etapaDe.get(p.chave)
      if (!e) return vazia
      return {
        ...vazia,
        tem: true,
        posicao: e.posicao,
        situacao: e.posicao === null ? (e.desclassificado ? 'Desclassificado' : 'Sem posição') : null,
        pontos: e.total,
        penalidade: e.ajustes < 0 ? e.ajustes : null,
        melhorDoGrid: e.posicao === 1,
      }
    }
    const sessao = col.sessao as CorridaComResultado
    const l = sessao.linhas.find((x) => chaveDaLinha(x) === p.chave)
    if (!l) return vazia
    const pontua = col.comPontos && !l.convidado
    return {
      tem: true,
      posicao: l.posicaoCategoria,
      situacao: SITUACAO[l.status] ?? (l.posicaoCategoria === null ? 'Sem posição' : null),
      pontos: pontua ? l.pontos : null,
      penalidade: pontua && l.penalidadePontos < 0 ? l.penalidadePontos : null,
      melhorVolta: typeof l.melhorVolta === 'number' && l.melhorVolta > 0 ? l.melhorVolta : null,
      melhorDoGrid: melhorDaColuna.get(col.chave) === p.chave,
      voltaMaisRapida: col.tipo === 'corrida' && voltaRapidaDaColuna.get(col.chave) === p.chave,
      pole: col.tipo === 'classificacao' && col.primeiraDoGrupo && etapaDe.get(p.chave)?.pole === true,
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

  return {
    colunas: colunas.map(({ sessao: _s, primeiraDoGrupo: _p, ...c }) => c),
    linhas: ordenados.map((p) => ({ ...p, celulas: colunas.map((col) => celula(col, p)) })),
  }
}
