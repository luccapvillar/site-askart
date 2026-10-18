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
  Partial<
    Pick<
      LinhaClassificacao,
      'chave' | 'piloto' | 'pilotoSlug' | 'numero' | 'equipeNome' | 'categoria' | 'vitorias' | 'podios' | 'corridas' | 'poles' | 'voltasRapidas'
    >
  >

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
   * Classificação que soma resultados de outras categorias (`incluiResultadosDe`). Nela, só contam para os
   * totais as linhas de pilotos da própria categoria — e as de outra categoria apenas quando essa categoria
   * não tem classificação própria na lista (senão as mesmas vitórias seriam contadas duas vezes). Linhas sem
   * a categoria informada numa classificação agregada são ignoradas.
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

type LinhaValida = { classificacao: ClassificacaoDaTemporada; linha: LinhaParaTotais }

/**
 * Linhas que valem para as estatísticas: cada piloto conta UMA vez por temporada × categoria.
 * Preferência: a classificação própria da categoria do piloto; depois a agregada da categoria dele; por
 * último uma agregada de outra categoria (só quando a dele não tem classificação na lista).
 */
function linhasValidas(classificacoes: ClassificacaoDaTemporada[]): LinhaValida[] {
  const temPropria = new Set(classificacoes.filter((c) => !c.agregada).map((c) => `${k(c.temporada)}|${k(c.categoria)}`))
  const escolhidas = new Map<string, LinhaValida & { prioridade: number }>()
  for (const c of classificacoes) {
    for (const l of c.linhas) {
      const categoria = k(l.categoria) || (c.agregada ? '' : k(c.categoria))
      if (!categoria) continue
      const daPropria = categoria === k(c.categoria)
      if (!daPropria && temPropria.has(`${k(c.temporada)}|${categoria}`)) continue
      const prioridade = (daPropria ? 2 : 0) + (c.agregada ? 0 : 1)
      const chave = `${k(c.temporada)}|${categoria}|${chaveDaLinha(l)}`
      const atual = escolhidas.get(chave)
      if (!atual || prioridade > atual.prioridade) escolhidas.set(chave, { classificacao: c, linha: l, prioridade })
    }
  }
  return [...escolhidas.values()].map(({ classificacao, linha }) => ({ classificacao, linha }))
}

/**
 * Totais de carreira e por temporada de cada piloto, a partir das classificações (automáticas, manuais ou
 * fotografias finais). Ver `agregada` para as classificações que somam categorias.
 */
export function totaisPorPiloto(classificacoes: ClassificacaoDaTemporada[]): TotaisDoPiloto[] {
  const mapa = new Map<string, TotaisDoPiloto & { _pontos: number; _temporadas: Set<string> }>()
  for (const { classificacao: c, linha: l } of linhasValidas(classificacoes)) {
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

/** Recordes: maiores pontuações numa única temporada × categoria. */
export function maioresPontuacoes(classificacoes: ClassificacaoDaTemporada[], limite = 10) {
  return linhasValidas(classificacoes)
    .map((x) => ({ ...x, pontos: n(x.linha.pontos) }))
    .filter((x) => x.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || comparaNome(a.linha.nome, b.linha.nome))
    .slice(0, limite)
}

export interface CampeoesDaTemporada {
  temporada: Id
  temporadaNome: string | null
  ano: number | null
  categoria: Id
  categoriaNome: string | null
  /** 1º, 2º e 3º da classificação final (pode ter menos de 3). */
  podio: LinhaParaTotais[]
}

/**
 * Campeões (pódio final) das temporadas encerradas, da mais recente para a mais antiga — para o histórico.
 * Usa a classificação oficial de cada categoria (inclusive a que soma categorias).
 */
export function campeoesPorTemporada(classificacoes: ClassificacaoDaTemporada[]): CampeoesDaTemporada[] {
  return classificacoes
    .filter((c) => c.encerrada && c.linhas.length > 0)
    .map((c) => ({
      temporada: c.temporada,
      temporadaNome: c.temporadaNome ?? null,
      ano: c.ano ?? null,
      categoria: c.categoria,
      categoriaNome: c.categoriaNome ?? null,
      podio: [...c.linhas].filter((l) => l.posicao >= 1 && l.posicao <= 3).sort((a, b) => a.posicao - b.posicao),
    }))
    .sort((a, b) => (b.ano ?? 0) - (a.ano ?? 0) || comparaNome(a.categoriaNome ?? '', b.categoriaNome ?? ''))
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
      inscricao: x.linha.inscricao,
      nome: x.linha.nome,
      pilotoSlug: x.linha.pilotoSlug ?? null,
      numero: x.linha.numero,
      equipeNome: x.linha.equipeNome ?? null,
      posicao: x.etapa.posicao,
      /** Pontos da etapa (corridas + pole), antes de penalidades. */
      pontos: x.etapa.pontos,
      /** Penalidades de pontos e ajustes ligados à etapa (com sinal). */
      ajustes: x.etapa.ajustes,
      pole: x.etapa.pole,
      desclassificado: x.etapa.desclassificado,
    }))
}

/** Linha do resultado somado de uma etapa (uma categoria). */
export interface LinhaResultadoDaEtapa {
  chave: string
  inscricao: Id | null
  piloto: Id | null
  nome: string
  pilotoSlug: string | null
  numero: number | string | null
  equipeNome: string | null
  /** Posição na etapa (1..N, sem buracos); null = sem posição oficial em nenhuma corrida que conta. */
  posicao: number | null
  /** Pontos da etapa (corridas + pole), antes de penalidades. */
  pontos: number
  /** Penalidades de pontos das corridas da etapa (com sinal). */
  ajustes: number
  /** Total que vale na etapa (pontos + penalidades): é o que ordena o resultado. */
  total: number
  pole: boolean
  desclassificado: boolean
}

/**
 * Resultado somado de uma etapa com o MESMO desempate do campeonato: `resultado` precisa ser a
 * classificação calculada só com esta etapa (sem descartes nem ajustes), cuja ordem já é a do campeonato
 * (total, critérios de desempate da regra, ordem alfabética). Só entram os pilotos que correram a etapa;
 * quem tem posição oficial em alguma corrida que conta é numerado 1..N nessa ordem, e os demais (ex.: só
 * fizeram a tomada de tempo, ou não largaram/foram desclassificados em todas) vêm depois, sem posição.
 */
export function resultadoSomadoDaEtapa(resultado: Pick<ResultadoClassificacao, 'linhas'>, etapa: Id): LinhaResultadoDaEtapa[] {
  const alvo = k(etapa)
  const disputaram = resultado.linhas
    .map((l) => ({ linha: l, etapa: l.porEtapa.find((e) => k(e.etapa) === alvo) }))
    .filter((x): x is { linha: LinhaClassificacao; etapa: NonNullable<typeof x.etapa> } => !!x.etapa && x.etapa.participou)
  const comPosicao = disputaram.filter((x) => x.etapa.posicao !== null)
  const semPosicao = disputaram.filter((x) => x.etapa.posicao === null)
  const paraLinha = (x: (typeof disputaram)[number], posicao: number | null): LinhaResultadoDaEtapa => ({
    chave: x.linha.chave,
    inscricao: x.linha.inscricao,
    piloto: x.linha.piloto,
    nome: x.linha.nome,
    pilotoSlug: x.linha.pilotoSlug ?? null,
    numero: x.linha.numero,
    equipeNome: x.linha.equipeNome ?? null,
    posicao,
    pontos: x.etapa.pontos,
    ajustes: x.etapa.ajustes,
    total: deDecimos(paraDecimos(x.etapa.pontos) + paraDecimos(x.etapa.ajustes)),
    pole: x.etapa.pole,
    desclassificado: x.etapa.desclassificado,
  })
  return [...comPosicao.map((x, i) => paraLinha(x, i + 1)), ...semPosicao.map((x) => paraLinha(x, null))]
}
