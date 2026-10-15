/**
 * Estatísticas (docs/ARQUITETURA.md §5 e ESPECIFICACAO item 24) — funções PURAS.
 *
 * Duas fontes, de propósito:
 * - Totais por piloto (carreira e por temporada) vêm das LINHAS DE CLASSIFICAÇÃO, que existem nos dois
 *   modos (automático e manual) e na fotografia final das temporadas encerradas. Assim temporadas
 *   históricas, que só têm a classificação final, também alimentam "mais vitórias", "mais pódios" etc.
 * - Métricas por etapa (evolução de pontos, desempenho por etapa) vêm dos RESULTADOS, pelo motor de
 *   classificação (src/lib/classificacao.ts); só existem em temporadas com resultados corrida a corrida.
 */
import {
  calcularClassificacao,
  deDecimos,
  paraDecimos,
  type EntradaClassificacao,
  type Id,
  type LinhaClassificacao,
  type ResultadoClassificacao,
} from './classificacao'

const k = (id: Id | null | undefined) => (id === null || id === undefined ? '' : String(id))
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const comparaNome = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true })

// ───────────────────────────── totais por piloto ─────────────────────────────

/** Linha mínima de classificação (calculada, manual ou da fotografia final). */
export type LinhaParaTotais = Pick<LinhaClassificacao, 'nome' | 'posicao' | 'pontos'> &
  Partial<Pick<LinhaClassificacao, 'chave' | 'piloto' | 'pilotoSlug' | 'numero' | 'equipeNome' | 'vitorias' | 'podios' | 'corridas' | 'poles' | 'voltasRapidas'>>

export type FonteClassificacao = 'automatica' | 'manual' | 'fotografia'

export interface ClassificacaoDaTemporada {
  temporada: Id
  temporadaNome?: string | null
  ano?: number | null
  categoria: Id
  categoriaNome?: string | null
  /** Temporada encerrada: o 1º colocado conta como título. */
  encerrada?: boolean
  fonte?: FonteClassificacao
  /**
   * Classificação que soma resultados de outras categorias (`incluiResultadosDe`). Fica de fora dos totais
   * de carreira, senão as mesmas vitórias seriam contadas duas vezes.
   */
  agregada?: boolean
  linhas: LinhaParaTotais[]
}

export interface TotaisDaTemporada {
  temporada: Id
  temporadaNome: string | null
  ano: number | null
  categoria: Id
  categoriaNome: string | null
  fonte: FonteClassificacao | null
  posicao: number
  pontos: number
  vitorias: number
  podios: number
  corridas: number
  poles: number
  voltasRapidas: number
  numero: number | string | null
  equipeNome: string | null
  campeao: boolean
}

export interface TotaisDoPiloto {
  /** Chave do piloto (id). */
  chave: string
  nome: string
  pilotoSlug: string | null
  /** Uma entrada por temporada × categoria, da mais recente para a mais antiga. */
  temporadas: TotaisDaTemporada[]
  pontos: number
  vitorias: number
  podios: number
  /** Participações (corridas disputadas). */
  corridas: number
  poles: number
  voltasRapidas: number
  titulos: number
  /** Número de temporadas diferentes disputadas. */
  temporadasDisputadas: number
  melhorPosicao: number | null
}

const chaveDaLinha = (l: LinhaParaTotais) => k(l.piloto) || k(l.chave) || `nome:${l.nome}`

/**
 * Totais de carreira e por temporada de cada piloto, a partir das classificações (automáticas ou manuais).
 * Classificações `agregada` não entram (evita contar duas vezes).
 */
export function totaisPorPiloto(classificacoes: ClassificacaoDaTemporada[]): TotaisDoPiloto[] {
  const mapa = new Map<string, TotaisDoPiloto & { _pontos: number; _temporadas: Set<string> }>()
  for (const c of classificacoes) {
    if (c.agregada) continue
    for (const l of c.linhas) {
      const chave = chaveDaLinha(l)
      let t = mapa.get(chave)
      if (!t) {
        t = {
          chave,
          nome: l.nome,
          pilotoSlug: l.pilotoSlug ?? null,
          temporadas: [],
          pontos: 0,
          vitorias: 0,
          podios: 0,
          corridas: 0,
          poles: 0,
          voltasRapidas: 0,
          titulos: 0,
          temporadasDisputadas: 0,
          melhorPosicao: null,
          _pontos: 0,
          _temporadas: new Set(),
        }
        mapa.set(chave, t)
      }
      const campeao = !!c.encerrada && l.posicao === 1
      t.temporadas.push({
        temporada: c.temporada,
        temporadaNome: c.temporadaNome ?? null,
        ano: c.ano ?? null,
        categoria: c.categoria,
        categoriaNome: c.categoriaNome ?? null,
        fonte: c.fonte ?? null,
        posicao: l.posicao,
        pontos: n(l.pontos),
        vitorias: n(l.vitorias),
        podios: n(l.podios),
        corridas: n(l.corridas),
        poles: n(l.poles),
        voltasRapidas: n(l.voltasRapidas),
        numero: l.numero ?? null,
        equipeNome: l.equipeNome ?? null,
        campeao,
      })
      t._pontos += paraDecimos(n(l.pontos))
      t.vitorias += n(l.vitorias)
      t.podios += n(l.podios)
      t.corridas += n(l.corridas)
      t.poles += n(l.poles)
      t.voltasRapidas += n(l.voltasRapidas)
      if (campeao) t.titulos++
      t._temporadas.add(k(c.temporada))
      if (l.posicao > 0 && (t.melhorPosicao === null || l.posicao < t.melhorPosicao)) t.melhorPosicao = l.posicao
      if (!t.pilotoSlug && l.pilotoSlug) t.pilotoSlug = l.pilotoSlug
    }
  }
  return [...mapa.values()]
    .map(({ _pontos, _temporadas, ...t }) => ({
      ...t,
      pontos: deDecimos(_pontos),
      temporadasDisputadas: _temporadas.size,
      temporadas: t.temporadas.sort((a, b) => (b.ano ?? 0) - (a.ano ?? 0) || a.posicao - b.posicao),
    }))
    .sort((a, b) => comparaNome(a.nome, b.nome))
}

/** Totais de um piloto (null = sem nenhuma classificação). */
export function totaisDoPiloto(piloto: Id, classificacoes: ClassificacaoDaTemporada[]): TotaisDoPiloto | null {
  const alvo = k(piloto)
  return totaisPorPiloto(classificacoes).find((t) => t.chave === alvo) ?? null
}

// ───────────────────────────── rankings ─────────────────────────────

export type Indicador = 'pontos' | 'vitorias' | 'podios' | 'corridas' | 'poles' | 'voltasRapidas' | 'titulos'

export const ROTULOS_INDICADOR: Record<Indicador, string> = {
  pontos: 'Mais pontos',
  vitorias: 'Mais vitórias',
  podios: 'Mais pódios',
  corridas: 'Mais participações',
  poles: 'Mais poles',
  voltasRapidas: 'Mais voltas mais rápidas',
  titulos: 'Mais títulos',
}

export interface ItemRanking {
  /** Posição com empate compartilhado (1, 1, 3…). */
  posicao: number
  empatado: boolean
  valor: number
  piloto: TotaisDoPiloto
}

/**
 * Ranking por indicador. Empatados dividem a posição (1, 1, 3) e aparecem em ordem alfabética.
 * Quem tem valor zero fica de fora. `limite` corta a lista (mantendo os empatados na última posição).
 */
export function ranking(totais: TotaisDoPiloto[], indicador: Indicador, opcoes: { limite?: number } = {}): ItemRanking[] {
  const valor = (t: TotaisDoPiloto) => n(t[indicador])
  const ordenados = totais
    .filter((t) => valor(t) > 0)
    .sort((a, b) => valor(b) - valor(a) || comparaNome(a.nome, b.nome))
  const itens: ItemRanking[] = []
  ordenados.forEach((t, i) => {
    const anterior = itens[i - 1]
    const posicao = anterior && anterior.valor === valor(t) ? anterior.posicao : i + 1
    itens.push({ posicao, empatado: false, valor: valor(t), piloto: t })
  })
  for (const it of itens) it.empatado = itens.filter((x) => x.posicao === it.posicao).length > 1
  const limite = opcoes.limite
  if (!limite || limite <= 0 || itens.length <= limite) return itens
  const corte = itens[limite - 1].posicao
  return itens.filter((it, i) => i < limite || it.posicao === corte)
}

/** Recordes de uma temporada (ou de qualquer recorte): maior pontuação numa única temporada. */
export function maioresPontuacoes(classificacoes: ClassificacaoDaTemporada[], limite = 10) {
  return classificacoes
    .filter((c) => !c.agregada)
    .flatMap((c) => c.linhas.map((l) => ({ classificacao: c, linha: l, pontos: n(l.pontos) })))
    .filter((x) => x.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || comparaNome(a.linha.nome, b.linha.nome))
    .slice(0, limite)
}

// ───────────────────────────── métricas por etapa (a partir dos resultados) ─────────────────────────────

export interface PontoEvolucao {
  etapa: Id
  numero: number
  /** Pontos acumulados após a etapa (já com descartes e ajustes válidos naquele momento). */
  pontos: number
  posicao: number
}

export interface SerieEvolucao {
  chave: string
  nome: string
  pontos: PontoEvolucao[]
}

export interface EvolucaoClassificacao {
  etapas: { id: Id; numero: number; nome: string | null }[]
  series: SerieEvolucao[]
}

/**
 * Evolução da pontuação: a classificação recalculada após cada etapa realizada (com os descartes e ajustes
 * que valiam naquele momento). Serve para o gráfico de evolução e a "classificação após a Nª etapa".
 */
export function evolucaoClassificacao(entrada: EntradaClassificacao): EvolucaoClassificacao {
  const final = calcularClassificacao({ ...entrada, comPosicaoAnterior: false })
  const series = new Map<string, SerieEvolucao>(final.linhas.map((l) => [l.chave, { chave: l.chave, nome: l.nome, pontos: [] }]))
  for (const e of final.etapas) {
    const r = calcularClassificacao({ ...entrada, ateEtapa: e.id, comPosicaoAnterior: false })
    for (const l of r.linhas) {
      let s = series.get(l.chave)
      if (!s) {
        s = { chave: l.chave, nome: l.nome, pontos: [] }
        series.set(l.chave, s)
      }
      s.pontos.push({ etapa: e.id, numero: e.numero, pontos: l.pontos, posicao: l.posicao })
    }
  }
  const ordemFinal = new Map(final.linhas.map((l) => [l.chave, l.posicao] as const))
  return {
    etapas: final.etapas,
    series: [...series.values()].sort((a, b) => (ordemFinal.get(a.chave) ?? Infinity) - (ordemFinal.get(b.chave) ?? Infinity)),
  }
}

export interface DesempenhoPorEtapa {
  chave: string
  nome: string
  etapas: { etapa: Id; numero: number; pontos: number; posicao: number | null; descartado: boolean; participou: boolean }[]
  /** Etapas disputadas. */
  participacoes: number
  /** Média de pontos nas etapas disputadas (1 casa). */
  mediaPontos: number
  melhorPosicao: number | null
  /** Etapas terminadas entre os 3 primeiros. */
  podiosEmEtapas: number
  /** Etapa com mais pontos (null se não pontuou). */
  melhorEtapa: { etapa: Id; numero: number; pontos: number } | null
}

/** Desempenho de cada piloto etapa a etapa, a partir do resultado do motor. */
export function desempenhoPorEtapa(resultado: Pick<ResultadoClassificacao, 'linhas'>): DesempenhoPorEtapa[] {
  return resultado.linhas.map((l) => {
    const etapas = l.porEtapa.map((e) => ({
      etapa: e.etapa,
      numero: e.numero,
      pontos: e.pontos,
      posicao: e.posicao,
      descartado: e.descartado,
      participou: e.participou,
    }))
    const disputadas = etapas.filter((e) => e.participou)
    const soma = disputadas.reduce((s, e) => s + paraDecimos(e.pontos), 0)
    const posicoes = disputadas.map((e) => e.posicao).filter((p): p is number => p !== null)
    const melhor = [...disputadas].filter((e) => e.pontos > 0).sort((a, b) => b.pontos - a.pontos || a.numero - b.numero)[0]
    return {
      chave: l.chave,
      nome: l.nome,
      etapas,
      participacoes: disputadas.length,
      mediaPontos: disputadas.length ? deDecimos(paraDecimos(soma / disputadas.length / 10)) : 0,
      melhorPosicao: posicoes.length ? Math.min(...posicoes) : null,
      podiosEmEtapas: posicoes.filter((p) => p <= 3).length,
      melhorEtapa: melhor ? { etapa: melhor.etapa, numero: melhor.numero, pontos: melhor.pontos } : null,
    }
  })
}

/** Resultado de uma etapa (para a página da etapa): pilotos na ordem da etapa, com os pontos dela. */
export function resultadoDaEtapa(resultado: Pick<ResultadoClassificacao, 'linhas'>, etapa: Id) {
  const alvo = k(etapa)
  return resultado.linhas
    .map((l) => ({ linha: l, etapa: l.porEtapa.find((e) => k(e.etapa) === alvo) }))
    .filter((x): x is { linha: LinhaClassificacao; etapa: NonNullable<typeof x.etapa> } => !!x.etapa && x.etapa.participou)
    .sort(
      (a, b) =>
        (a.etapa.posicao ?? Infinity) - (b.etapa.posicao ?? Infinity) ||
        b.etapa.pontos - a.etapa.pontos ||
        comparaNome(a.linha.nome, b.linha.nome),
    )
    .map((x) => ({
      chave: x.linha.chave,
      nome: x.linha.nome,
      numero: x.linha.numero,
      equipeNome: x.linha.equipeNome ?? null,
      posicao: x.etapa.posicao,
      pontos: x.etapa.pontos,
      pole: x.etapa.pole,
      desclassificado: x.etapa.desclassificado,
    }))
}
