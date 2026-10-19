/**
 * Programação de uma etapa (horários de cada categoria) — funções PURAS, testadas em tests/int.
 *
 * Agrupa as corridas por categoria (corrida de duas categorias que largam juntas forma o grupo "A + B"), na
 * ordem do primeiro horário. Dentro da categoria, quando alguma sessão está marcada para subcategorias
 * (corridas.subcategorias — cada subcategoria com o seu horário), os horários saem separados: primeiro
 * "Todas as subcategorias" (sessões sem marcação), depois cada subcategoria na ordem cadastrada na categoria.
 * Sem nenhuma sessão marcada, a lista é única, como sempre foi.
 *
 * Seletor "Escolha a subcategoria" (calendário e página da etapa): para cada subcategoria (ou categoria sem
 * subcategorias) da etapa, a lista dos horários DELA — as sessões marcadas para ela mais as sessões da
 * categoria sem subcategoria marcada —, na ordem Warm-up, Classificação, Corrida 1, Corrida 2 e as outras
 * sessões depois. Essas listas saem prontas no HTML (escondidas); o seletor só mostra a escolhida.
 *
 * Rótulos claros das sessões (iguais aos do resultado da etapa): "Warm-up", "Classificação" (tomada de
 * tempo), "Corrida 1", "Corrida 2". O nome digitado no painel só é trocado quando quer dizer a mesma coisa
 * ("Tomada de tempo" → "Classificação", "Bateria 2" → "Corrida 2"); qualquer outro nome fica como está.
 */
import type { Categoria, Corrida } from '@/payload-types'
import { formatarHora } from '@/lib/datas'
import { agruparHorariosPorSubcategoria, chaveDeSubcategoria, nomesCadastrados, normalizarSubcategoria, subcategoriasDaSessao, type GrupoHorarios } from '@/lib/subcategorias'
import { semDemo } from '../TextoDemo'

/** Subcategorias de cada categoria (pelo id), para mostrar junto da categoria na programação. */
export type MapaSubcategorias = Map<string, { nome?: string | null }[] | null | undefined>

/** Tipo da sessão para a ordem e o rótulo: warm-up, classificação (tomada de tempo), corrida ou outra. */
export type TipoSessao = 'warm-up' | 'classificacao' | 'corrida' | 'outra'

export type SessaoProgramada = {
  /** Nome como cadastrado no painel (sem o prefixo de demonstração). */
  nome: string
  hora: string | null
  /** Rótulo claro: "Warm-up", "Classificação", "Corrida 1"… ou o próprio nome. */
  rotulo: string
  /** O nome do painel, quando diz algo que o rótulo não diz (ex.: tipo warm-up chamado "Aquecimento livre"). */
  nota: string | null
  tipo: TipoSessao
}

export type GrupoCategoria = {
  categoria: string
  ids: string[]
  /** Chaves das categorias do grupo (para o seletor: data-categoria no HTML). */
  chaves: string[]
  cor: string | null
  /** Todas as sessões da categoria, na ordem do horário. */
  corridas: SessaoProgramada[]
  /** Horários separados por subcategoria; null = categoria sem sessões marcadas (lista única). */
  subcategorias: GrupoHorarios<SessaoProgramada>[] | null
}

const ehCategoria = (x: unknown): x is Categoria => typeof x === 'object' && x !== null && 'id' in x

/* ───────────────────────────── rótulo e ordem das sessões ───────────────────────────── */

const WARM_UP = /^(?:warm ?up|aquecimento)(?: ?(\d+))?$/
const CLASSIFICACAO = /^(?:classificacao|tomada de tempos?|tomada|treino classificatorio|qualify|qualifying|quali)(?: ?(\d+))?$/
const CORRIDA = /^(?:corrida|bateria|race|heat)(?: ?(\d+))?$/

type Rotulada = { rotulo: string; nota: string | null; tipo: TipoSessao; numero: number | null }

/**
 * Rótulo claro de uma sessão. Warm-up e Classificação valem pelo tipo escolhido no painel ou pelo nome;
 * "Corrida N" só pelo nome ("Bateria 2", "Corrida 2" — o tipo "bateria" é o padrão do painel e pode estar em
 * qualquer sessão, como "Briefing"). Outros nomes ficam como foram digitados.
 */
export function rotuloDaSessao(sessao: { nome?: string | null; tipo?: string | null }): Rotulada {
  const nome = semDemo(sessao.nome).trim()
  const n = normalizarSubcategoria(nome)
  const numero = (m: RegExpMatchArray | null) => (m?.[1] ? Number(m[1]) : null)
  const comNumero = (base: string, num: number | null) => (num === null ? base : `${base} ${num}`)
  const warm = n.match(WARM_UP)
  if (warm || sessao.tipo === 'warm-up') {
    const num = numero(warm)
    return { rotulo: comNumero('Warm-up', num), nota: warm || !nome ? null : nome, tipo: 'warm-up', numero: num }
  }
  const classif = n.match(CLASSIFICACAO)
  if (classif || sessao.tipo === 'tomada-de-tempo') {
    const num = numero(classif)
    return { rotulo: comNumero('Classificação', num), nota: classif || !nome ? null : nome, tipo: 'classificacao', numero: num }
  }
  const corrida = n.match(CORRIDA)
  if (corrida) {
    const num = numero(corrida)
    return { rotulo: comNumero('Corrida', num), nota: null, tipo: 'corrida', numero: num }
  }
  return { rotulo: nome || 'Sessão', nota: null, tipo: 'outra', numero: null }
}

const ORDEM_TIPO: Record<TipoSessao, number> = { 'warm-up': 0, classificacao: 1, corrida: 2, outra: 3 }

type ParaOrdenar = { tipo: TipoSessao; numero: number | null; instante: number }

/** Ordem da subcategoria escolhida: Warm-up, Classificação, Corrida 1, Corrida 2… e as outras sessões depois. */
const porTipo = (a: ParaOrdenar, b: ParaOrdenar) =>
  ORDEM_TIPO[a.tipo] - ORDEM_TIPO[b.tipo] || (a.numero ?? Infinity) - (b.numero ?? Infinity) || a.instante - b.instante

/** Ordem da programação completa: pelo horário; sessões ainda sem horário no fim, na ordem dos tipos. */
const porHorario = (a: ParaOrdenar, b: ParaOrdenar) => a.instante - b.instante || porTipo(a, b)

/** Ordena mantendo a ordem original nos empates (Array.sort é estável). Sem horário = Infinity. */
function ordenar<T extends ParaOrdenar>(lista: T[], comparar: (a: ParaOrdenar, b: ParaOrdenar) => number): T[] {
  return [...lista].sort((a, b) => {
    const c = comparar(a, b)
    return Number.isNaN(c) ? 0 : c
  })
}

const instanteDe = (c: Pick<Corrida, 'inicio'>) => (c.inicio ? new Date(c.inicio).getTime() : Infinity)

function sessaoDe(c: Corrida): SessaoProgramada & ParaOrdenar {
  const r = rotuloDaSessao(c)
  return {
    nome: semDemo(c.nome),
    hora: c.inicio ? formatarHora(c.inicio) : null,
    rotulo: r.rotulo,
    nota: r.nota,
    tipo: r.tipo,
    numero: r.numero,
    instante: instanteDe(c),
  }
}

const semOrdem = ({ numero: _n, instante: _i, ...s }: SessaoProgramada & ParaOrdenar): SessaoProgramada => s

/* ───────────────────────────── chaves do seletor ───────────────────────────── */

/** Chave da categoria no seletor e no HTML: o slug ("f400"), ou o nome em forma de chave. */
export const chaveDaCategoria = (c: Pick<Categoria, 'id' | 'nome'> & { slug?: string | null }) =>
  chaveDeSubcategoria(c.slug?.trim() || semDemo(c.nome) || `categoria ${c.id}`)

/** Valor de uma opção do seletor: "f400-novatos" (subcategoria) ou "cadete" (categoria sem subcategorias). */
export const valorDaEscolha = (chaveCategoria: string, subcategoria: string | null) =>
  subcategoria ? `${chaveCategoria}-${chaveDeSubcategoria(subcategoria)}` : chaveCategoria

/* ───────────────────────────── programação completa ───────────────────────────── */

/**
 * Corridas de uma etapa agrupadas por categoria, na ordem do primeiro horário; dentro de cada categoria,
 * por subcategoria quando há sessões marcadas. A ordem das subcategorias é a cadastrada na categoria (vinda
 * junto da corrida ou, na falta dela, do `mapa`).
 */
export function agruparProgramacao(corridas: Corrida[], mapa?: MapaSubcategorias): GrupoCategoria[] {
  type Sessao = SessaoProgramada & ParaOrdenar
  type Interno = Omit<GrupoCategoria, 'subcategorias' | 'corridas'> & {
    primeiro: number
    cadastradas: { nome?: string | null }[]
    marcadas: { sessao: Sessao; subcategorias: unknown }[]
  }
  const grupos = new Map<string, Interno>()
  for (const c of corridas) {
    const cats = (c.categorias ?? []).filter(ehCategoria)
    const nome = cats.map((x) => semDemo(x.nome)).join(' + ') || 'Todas as categorias'
    const g: Interno = grupos.get(nome) ?? {
      categoria: nome,
      ids: cats.map((x) => String(x.id)),
      chaves: cats.map(chaveDaCategoria),
      cor: cats[0]?.cor ?? null,
      primeiro: Infinity,
      // Corrida de várias categorias: as subcategorias de todas, na ordem de cada uma
      cadastradas: cats.flatMap((x) => x.subcategorias ?? mapa?.get(String(x.id)) ?? []),
      marcadas: [],
    }
    const sessao = sessaoDe(c)
    g.primeiro = Math.min(g.primeiro, sessao.instante)
    g.marcadas.push({ sessao, subcategorias: c.subcategorias })
    grupos.set(nome, g)
  }
  return [...grupos.values()]
    .sort((a, b) => a.primeiro - b.primeiro)
    .map(({ primeiro: _p, cadastradas, marcadas, ...g }) => {
      const emOrdem = ordenar(
        marcadas.map((m) => ({ ...m, tipo: m.sessao.tipo, numero: m.sessao.numero, instante: m.sessao.instante })),
        porHorario,
      )
      const porSub = agruparHorariosPorSubcategoria(emOrdem, (m) => m.subcategorias, cadastradas)
      return {
        ...g,
        corridas: emOrdem.map((m) => semOrdem(m.sessao)),
        subcategorias: porSub && porSub.map((sg) => ({ ...sg, sessoes: sg.sessoes.map((m) => semOrdem(m.sessao)) })),
      }
    })
}

/* ───────────────────────────── horários da subcategoria escolhida ───────────────────────────── */

export type SessaoDaEscolha = SessaoProgramada & {
  /** Corrida de mais de uma categoria: as outras que largam junto ("Mirim"). */
  juntoCom: string | null
}

export type HorariosDaEscolha = {
  /** Valor da opção do seletor ("f400-novatos"). */
  valor: string
  chaveCategoria: string
  categoria: string
  cor: string | null
  /** Nome da subcategoria; null = categoria sem subcategorias. */
  subcategoria: string | null
  /** "F400 — Novatos" ou "Cadete". */
  rotulo: string
  sessoes: SessaoDaEscolha[]
}

/**
 * Para cada subcategoria das categorias da etapa (ou a categoria, quando não tem subcategorias), os horários
 * dela: as sessões marcadas para ela e as sessões da categoria sem subcategoria marcada ("todas"), na ordem
 * Warm-up, Classificação, Corrida 1, Corrida 2 e as outras depois. Só entram as que têm alguma sessão.
 */
export function horariosPorEscolha(corridas: Corrida[], mapa?: MapaSubcategorias): HorariosDaEscolha[] {
  const categorias = new Map<string, Categoria>()
  for (const c of corridas) for (const cat of (c.categorias ?? []).filter(ehCategoria)) if (!categorias.has(String(cat.id))) categorias.set(String(cat.id), cat)

  const saida: HorariosDaEscolha[] = []
  const usados = new Set<string>()
  for (const cat of categorias.values()) {
    const id = String(cat.id)
    const nomeCategoria = semDemo(cat.nome)
    const chaveCategoria = chaveDaCategoria(cat)
    const cadastradas = nomesCadastrados(cat.subcategorias ?? mapa?.get(id))
    const daCategoria = corridas
      .filter((c) => (c.categorias ?? []).some((x) => ehCategoria(x) && String(x.id) === id))
      .map((c) => {
        const outras = (c.categorias ?? []).filter((x): x is Categoria => ehCategoria(x) && String(x.id) !== id).map((x) => semDemo(x.nome))
        return { ...sessaoDe(c), juntoCom: outras.length ? outras.join(' + ') : null, subs: subcategoriasDaSessao(c.subcategorias, cadastradas) }
      })
    for (const sub of cadastradas.length ? cadastradas : [null]) {
      const valor = valorDaEscolha(chaveCategoria, sub)
      if (usados.has(valor)) continue
      const sessoes = daCategoria.filter((s) => sub === null || !s.subs.length || s.subs.includes(sub))
      if (!sessoes.length) continue
      usados.add(valor)
      saida.push({
        valor,
        chaveCategoria,
        categoria: nomeCategoria,
        cor: cat.cor ?? null,
        subcategoria: sub,
        rotulo: sub ? `${nomeCategoria} — ${sub}` : nomeCategoria,
        sessoes: ordenar(sessoes, porTipo).map(({ subs: _s, ...s }) => ({ ...semOrdem(s), juntoCom: s.juntoCom })),
      })
    }
  }
  return saida
}

/* ───────────────────────────── opções do seletor ───────────────────────────── */

export type OpcaoSubcategoria = {
  valor: string
  /** "F400 — Novatos" ou "Cadete". */
  rotulo: string
  /** Nome da categoria ("F400"). */
  categoria: string
  chaveCategoria: string
  /** false = categoria sem subcategorias (a opção é a própria categoria). */
  ehSubcategoria: boolean
  modalidade: 'profissional' | 'indoor'
}

/** Um grupo do seletor: a categoria com as subcategorias (optgroup) ou, sem subcategorias, uma opção só. */
export type GrupoOpcoes = { categoria: string; chaveCategoria: string; opcoes: OpcaoSubcategoria[] }

type CategoriaDoSeletor = Pick<Categoria, 'id' | 'nome'> & {
  slug?: string | null
  modalidade?: string | null
  subcategorias?: { nome?: string | null }[] | null
}

/**
 * Opções do seletor "Escolha a subcategoria", na ordem das categorias recebidas: cada categoria com
 * subcategorias vira um grupo ("F400 — Novatos", "F400 — Junior"…); sem subcategorias, uma opção com o nome
 * ("Cadete"). Categorias repetidas ficam uma vez.
 */
export function opcoesDeSubcategoria(categorias: CategoriaDoSeletor[]): GrupoOpcoes[] {
  const vistas = new Set<string>()
  const grupos: GrupoOpcoes[] = []
  for (const c of categorias) {
    if (vistas.has(String(c.id))) continue
    vistas.add(String(c.id))
    const categoria = semDemo(c.nome)
    const chaveCategoria = chaveDaCategoria(c)
    const modalidade = c.modalidade === 'indoor' ? 'indoor' : 'profissional'
    const subs = nomesCadastrados(c.subcategorias)
    const opcoes = (subs.length ? subs : [null]).map((sub) => ({
      valor: valorDaEscolha(chaveCategoria, sub),
      rotulo: sub ? `${categoria} — ${sub}` : categoria,
      categoria,
      chaveCategoria,
      ehSubcategoria: sub !== null,
      modalidade,
    })) satisfies OpcaoSubcategoria[]
    grupos.push({ categoria, chaveCategoria, opcoes })
  }
  return grupos
}
