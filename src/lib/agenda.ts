/**
 * Agenda de treinos do kartódromo (docs/ARQUITETURA.md §4 "Kartódromo" e §5).
 *
 * Agenda = grade semanal fixa (coleção `horarios-treino`) + exceções e treinos avulsos (coleção `treinos`).
 * A grade nunca "acaba" sozinha: um horário vale enquanto estiver visível e dentro de "válido de/até"
 * (vazio = sem limite). Nada de "repetir por N semanas".
 *
 * Regras de `expandirAgenda` (função pura, testada em tests/int/agenda.int.spec.ts):
 *  1. Cada horário visível da grade gera uma ocorrência em cada dia do intervalo com o mesmo dia da semana,
 *     se o dia estiver dentro da vigência (limites inclusivos).
 *  2. Exceção com "substitui" na mesma data troca aquela ocorrência (horário, categorias, tipo, status).
 *     Campos vazios herdam do horário substituído. Cancelar um horário que não acontece naquele dia não
 *     mostra nada; qualquer outra exceção nesse caso aparece como treino avulso.
 *  3. Bloqueio (status "bloqueado" SEM "substitui") marca como bloqueadas as ocorrências do dia que se
 *     sobrepõem no horário e nas categorias (vazio = todas). Se o bloqueio pega só parte das categorias, a
 *     ocorrência é dividida: a parte bloqueada e a parte que continua valendo. Bloqueio que não atinge
 *     nenhuma ocorrência aparece sozinho (ex.: "pista fechada para manutenção"). Cancelados não mudam.
 *  4. Treinos avulsos (sem "substitui") aparecem como estão (extra, liberado, lotado, cancelado).
 *  5. Ordem: dia, hora de início, hora de fim (grade antes de avulso no empate).
 *
 * Datas: o dia é sempre a chave "AAAA-MM-DD", sem fuso. O campo "só data" do painel grava o dia escolhido
 * ao meio-dia UTC; por isso a parte de data UTC do valor gravado é o dia certo em qualquer fuso
 * (ver `chaveDaData`). Já "hoje", "esta semana" etc. são calculados no fuso de Brasília (src/lib/datas.ts).
 */
import type { CollectionSlug, Payload, PayloadRequest, Where } from 'payload'
import {
  chaveDia,
  diaSemanaDeChave,
  HORARIOS_15MIN,
  instanteDeChave,
  intervaloDoPeriodo,
  minutosEntre,
  NOMES_DIAS,
  somarDias,
  type Periodo,
} from './datas'

/* ----------------------------------------------------------------------------------------------
 * Constantes e tipos
 * -------------------------------------------------------------------------------------------- */

export type ID = string | number

/** Slugs das coleções usadas pela agenda (docs/ARQUITETURA.md §4). */
export const SLUGS_KARTODROMO = {
  horarios: 'horarios-treino',
  treinos: 'treinos',
  tipos: 'tipos-treino',
  categorias: 'categorias',
} as const

export type DiaSemana = 'domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado'

/** Índice = dia da semana do JavaScript (0 = domingo … 6 = sábado). */
export const DIAS_SEMANA: readonly DiaSemana[] = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Opções do seletor "Dia da semana", de segunda a domingo (a semana do site começa na segunda). */
export const OPCOES_DIA_SEMANA = [1, 2, 3, 4, 5, 6, 0].map((i) => ({ label: maiuscula(NOMES_DIAS[i]), value: DIAS_SEMANA[i] }))

export type StatusTreino = 'liberado' | 'extra' | 'lotado' | 'cancelado' | 'bloqueado'

export const ROTULOS_STATUS: Record<StatusTreino, string> = {
  liberado: 'Liberado',
  extra: 'Horário extra',
  lotado: 'Lotado',
  cancelado: 'Cancelado',
  bloqueado: 'Bloqueado',
}

export const OPCOES_STATUS = (Object.keys(ROTULOS_STATUS) as StatusTreino[]).map((value) => ({
  label: ROTULOS_STATUS[value],
  value,
}))

/** Status em que o treino acontece (os outros: cancelado e bloqueado). */
const ACONTECE = new Set<StatusTreino>(['liberado', 'extra', 'lotado'])
export const statusAcontece = (status: StatusTreino) => ACONTECE.has(status)

export type Visibilidade = 'visivel' | 'oculto' | 'arquivado'

/** Horários "HH:mm" de 15 em 15 minutos: início 00:00…23:45; fim 00:15…24:00 (24:00 = meia-noite, fim do dia). */
export const HORARIOS_INICIO: readonly string[] = HORARIOS_15MIN
export const HORARIOS_FIM: readonly string[] = [...HORARIOS_15MIN.slice(1), '24:00']

/** Limite de dias calculados de uma vez (evita laços enormes por engano; ~13 meses). */
export const MAX_DIAS_AGENDA = 400

export interface CategoriaRef {
  id: ID
  nome?: string | null
  sigla?: string | null
  slug?: string | null
  cor?: string | null
}

export interface TipoTreinoRef {
  id: ID
  nome?: string | null
  slug?: string | null
  cor?: string | null
  descricao?: string | null
}

type Relacao<T> = ID | T | null | undefined

/** Horário da grade semanal (documento de `horarios-treino`, com ou sem relacionamentos populados). */
export interface HorarioGrade {
  id: ID
  diaSemana?: DiaSemana | string | null
  horaInicio?: string | null
  horaFim?: string | null
  categorias?: Array<Relacao<CategoriaRef>> | null
  tipo?: Relacao<TipoTreinoRef>
  observacao?: string | null
  validoDe?: string | Date | null
  validoAte?: string | Date | null
  visibilidade?: Visibilidade | string | null
  titulo?: string | null
}

/** Treino avulso ou exceção (documento de `treinos`). */
export interface TreinoAvulso {
  id: ID
  /** Data "só dia" como gravada pelo Payload (ou a chave). */
  data?: string | Date | null
  /** Chave AAAA-MM-DD preenchida pelo hook (tem prioridade sobre `data`). */
  dia?: string | null
  horaInicio?: string | null
  horaFim?: string | null
  categorias?: Array<Relacao<CategoriaRef>> | null
  tipo?: Relacao<TipoTreinoRef>
  status?: StatusTreino | string | null
  substitui?: Relacao<{ id: ID }>
  observacao?: string | null
  visibilidade?: Visibilidade | string | null
  titulo?: string | null
}

export interface BloqueioAplicado {
  /** Treino de bloqueio que atingiu a ocorrência. */
  treinoId: ID
  das: string
  ate: string
  /** O bloqueio cobre só parte do horário da ocorrência. */
  parcial: boolean
}

/** Um treino num dia (o que o site mostra). */
export interface OcorrenciaTreino {
  /** Identificador estável (chave de lista no React). */
  chave: string
  /** AAAA-MM-DD */
  dia: string
  diaSemana: DiaSemana
  horaInicio: string
  horaFim: string
  duracaoMin: number
  /** Categorias do horário; vazio = todas (menos as de `exceto`). */
  categorias: CategoriaRef[]
  /** Só quando `categorias` está vazio: todas as categorias, exceto estas (sobra de um bloqueio por categoria). */
  exceto: CategoriaRef[]
  tipo: TipoTreinoRef | null
  status: StatusTreino
  /** Observação do horário ou da exceção. */
  observacao: string | null
  /** Motivo do bloqueio de período que atingiu a ocorrência. */
  motivo: string | null
  bloqueio: BloqueioAplicado | null
  origem: 'grade' | 'avulso'
  /** Horário da grade (o próprio, ou o substituído pela exceção). */
  horarioId: ID | null
  /** Exceção/treino avulso que gerou ou alterou a ocorrência. */
  treinoId: ID | null
  /** Vem de um registro oculto (só aparece nas consultas do painel). */
  oculto: boolean
}

/* ----------------------------------------------------------------------------------------------
 * Datas (chaves de dia) e horários
 * -------------------------------------------------------------------------------------------- */

const RE_CHAVE = /^(\d{4})-(\d{2})-(\d{2})$/
const RE_DATA_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/
const RE_HORA = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/

/** "AAAA-MM-DD" de uma data de calendário que existe (rejeita 2026-02-30). */
export function ehChave(valor: unknown): valor is string {
  if (typeof valor !== 'string') return false
  const m = RE_CHAVE.exec(valor)
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]
}

/**
 * Chave "AAAA-MM-DD" de um campo "só data" (data do treino, válido de/até).
 * Aceita a própria chave, "DD/MM/AAAA", Date ou texto ISO. Para instantes, usa a parte de data UTC:
 * o painel grava o dia escolhido ao meio-dia UTC (12:00Z), datas "AAAA-MM-DD" enviadas pela API viram
 * 00:00Z e a meia-noite de Brasília é 03:00Z — em todos os casos a data UTC é o dia pretendido.
 * (Para "agora" e outros instantes reais, use `chaveDoInstante`, que considera o fuso de Brasília.)
 */
export function chaveDaData(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') return null
  if (typeof valor === 'string') {
    const t = valor.trim()
    if (RE_CHAVE.test(t)) return ehChave(t) ? t : null
    const br = RE_DATA_BR.exec(t)
    if (br) {
      const chave = `${br[3]}-${br[2]}-${br[1]}`
      return ehChave(chave) ? chave : null
    }
  }
  const d =
    valor instanceof Date ? valor : typeof valor === 'string' || typeof valor === 'number' ? new Date(valor) : null
  if (!d || Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

/** Chave do dia de um instante no fuso de Brasília (uma chave "AAAA-MM-DD" passa direto). */
export function chaveDoInstante(valor: string | Date | number): string | null {
  if (typeof valor === 'string' && RE_CHAVE.test(valor.trim())) return ehChave(valor.trim()) ? valor.trim() : null
  const d = valor instanceof Date ? valor : new Date(valor)
  return Number.isNaN(d.getTime()) ? null : chaveDia(d)
}

/** Valor gravado no campo "só data" para o dia (meio-dia UTC, como o próprio painel faz). */
export const dataDoDia = (chave: string) => `${chave}T12:00:00.000Z`

export const diaSemanaDaChave = (chave: string): DiaSemana => DIAS_SEMANA[diaSemanaDeChave(chave)]
export const nomeDoDiaSemana = (dia: DiaSemana | string) => {
  const i = DIAS_SEMANA.indexOf(dia as DiaSemana)
  return i >= 0 ? NOMES_DIAS[i] : ''
}

/** "18/10/2026" */
export const formatarChave = (chave: string) => {
  const [a, m, d] = chave.split('-')
  return `${d}/${m}/${a}`
}

/** "18/10" */
export const formatarChaveCurta = (chave: string) => {
  const [, m, d] = chave.split('-')
  return `${d}/${m}`
}

export const ehHora = (valor: unknown): valor is string => typeof valor === 'string' && RE_HORA.test(valor)

export function minutosDoDia(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Início e fim válidos, com o fim depois do início. */
export function intervaloValido(inicio: unknown, fim: unknown): boolean {
  return ehHora(inicio) && ehHora(fim) && minutosDoDia(fim) > minutosDoDia(inicio)
}

type Faixa = { horaInicio?: string | null; horaFim?: string | null }

/** Dois intervalos se sobrepõem? (encostados, como 08:00–10:00 e 10:00–12:00, não se sobrepõem) */
export function horariosSobrepoem(a: Faixa, b: Faixa): boolean {
  if (!intervaloValido(a.horaInicio, a.horaFim) || !intervaloValido(b.horaInicio, b.horaFim)) return false
  return (
    minutosDoDia(a.horaInicio as string) < minutosDoDia(b.horaFim as string) &&
    minutosDoDia(b.horaInicio as string) < minutosDoDia(a.horaFim as string)
  )
}

/** 120 → "2h"; 90 → "1h30"; 45 → "45 min". */
export function formatarDuracao(minutos: number): string {
  if (!Number.isFinite(minutos) || minutos <= 0) return ''
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (!h) return `${m} min`
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

/** Duração mostrada no painel ("2h", "1h30"); vazio se o horário estiver incompleto ou invertido. */
export const duracaoTexto = (inicio: unknown, fim: unknown) =>
  intervaloValido(inicio, fim) ? formatarDuracao(minutosEntre(inicio as string, fim as string)) : ''

/** Lista as chaves de `inicio` a `fim` (inclusivas), limitada a MAX_DIAS_AGENDA dias. */
export function listarDias(inicio: string, fim: string): string[] {
  if (!ehChave(inicio) || !ehChave(fim) || fim < inicio) return []
  const dias: string[] = []
  for (let d = inicio; d <= fim && dias.length < MAX_DIAS_AGENDA; d = somarDias(d, 1)) dias.push(d)
  return dias
}

/** Intervalo de uma visão da página /treinos (hoje, amanhã, semana, próxima semana, calendário do mês). */
export function intervaloDaVisao(
  visao: Periodo | 'calendario',
  agora: string | Date | number = new Date(),
): { inicio: string; fim: string } {
  // Uma chave "AAAA-MM-DD" é lida como o meio-dia daquele dia em Brasília (e não 00:00 UTC, que seria o dia anterior)
  const instante = typeof agora === 'string' && ehChave(agora.trim()) ? instanteDeChave(agora.trim(), '12:00') : agora
  if (visao !== 'calendario') return intervaloDoPeriodo(visao, instante)
  return intervaloDoMes(chaveDoInstante(instante) ?? chaveDia(new Date()))
}

/** Primeiro e último dia do mês da chave. */
export function intervaloDoMes(chave: string): { inicio: string; fim: string } {
  const [a, m] = chave.split('-').map(Number)
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate()
  const mm = String(m).padStart(2, '0')
  return { inicio: `${a}-${mm}-01`, fim: `${a}-${mm}-${String(ultimo).padStart(2, '0')}` }
}

/* ----------------------------------------------------------------------------------------------
 * Títulos calculados (usados como título dos documentos no painel)
 * -------------------------------------------------------------------------------------------- */

/** "sáb 18/10 · 08:00–10:00 · Treino livre" (+ " · Cancelado" quando não está liberado). */
export function tituloTreino(t: {
  dia: string
  horaInicio?: string | null
  horaFim?: string | null
  tipoNome?: string | null
  status?: StatusTreino | string | null
}): string {
  const status = statusDe(t.status)
  const partes = [`${DIAS_CURTOS[diaSemanaDeChave(t.dia)]} ${formatarChaveCurta(t.dia)}`]
  if (t.horaInicio && t.horaFim) partes.push(`${t.horaInicio}–${t.horaFim}`)
  const tipo = texto(t.tipoNome)
  if (tipo) {
    partes.push(tipo)
    if (status !== 'liberado') partes.push(ROTULOS_STATUS[status])
  } else {
    partes.push(status === 'liberado' ? 'Treino' : ROTULOS_STATUS[status])
  }
  return partes.join(' · ')
}

/** "sáb · 08:00–10:00 · Treino livre · Cadete, Júnior · até 31/12/2026" */
export function tituloHorario(h: {
  diaSemana?: string | null
  horaInicio?: string | null
  horaFim?: string | null
  tipoNome?: string | null
  categorias?: string[]
  validoDe?: unknown
  validoAte?: unknown
}): string {
  const i = DIAS_SEMANA.indexOf(h.diaSemana as DiaSemana)
  const partes = [i >= 0 ? DIAS_CURTOS[i] : '?']
  if (h.horaInicio && h.horaFim) partes.push(`${h.horaInicio}–${h.horaFim}`)
  const tipo = texto(h.tipoNome)
  if (tipo) partes.push(tipo)
  const categorias = (h.categorias ?? []).filter(Boolean)
  if (categorias.length) partes.push(categorias.join(', '))
  const de = chaveDaData(h.validoDe)
  const ate = chaveDaData(h.validoAte)
  if (de && ate) partes.push(`de ${formatarChave(de)} a ${formatarChave(ate)}`)
  else if (de) partes.push(`a partir de ${formatarChave(de)}`)
  else if (ate) partes.push(`até ${formatarChave(ate)}`)
  return partes.join(' · ')
}

/* ----------------------------------------------------------------------------------------------
 * Relacionamentos (id ou documento populado) e categorias
 * -------------------------------------------------------------------------------------------- */

const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

export function idDe(valor: unknown): ID | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  if (typeof valor === 'string') return valor.trim() ? valor : null
  if (valor && typeof valor === 'object' && 'id' in valor) return idDe((valor as { id: unknown }).id)
  return null
}

export const mesmoId = (a: unknown, b: unknown) => {
  const x = idDe(a)
  const y = idDe(b)
  return x !== null && y !== null && String(x) === String(y)
}

const statusDe = (valor: unknown): StatusTreino =>
  typeof valor === 'string' && valor in ROTULOS_STATUS ? (valor as StatusTreino) : 'liberado'

/** Lista de categorias sem repetição, sempre como objetos ({ id } quando não populada). */
export function refsCategorias(lista: ReadonlyArray<Relacao<CategoriaRef>> | null | undefined): CategoriaRef[] {
  const vistos = new Set<string>()
  const saida: CategoriaRef[] = []
  for (const item of lista ?? []) {
    const id = idDe(item)
    if (id === null || vistos.has(String(id))) continue
    vistos.add(String(id))
    saida.push(item && typeof item === 'object' ? { ...(item as CategoriaRef), id } : { id })
  }
  return saida
}

function refTipo(valor: Relacao<TipoTreinoRef>): TipoTreinoRef | null {
  const id = idDe(valor)
  if (id === null) return null
  return valor && typeof valor === 'object' ? { ...(valor as TipoTreinoRef), id } : { id }
}

type ConjuntoCategorias = {
  categorias?: ReadonlyArray<Relacao<CategoriaRef>> | null
  exceto?: ReadonlyArray<Relacao<CategoriaRef>> | null
}

const idsTexto = (lista: ReadonlyArray<Relacao<CategoriaRef>> | null | undefined) =>
  refsCategorias(lista).map((c) => String(c.id))

/**
 * As categorias de dois horários têm alguma em comum? Vazio = todas (menos `exceto`, quando houver).
 */
export function categoriasSeCruzam(a: ConjuntoCategorias, b: ConjuntoCategorias): boolean {
  const la = idsTexto(a.categorias)
  const lb = idsTexto(b.categorias)
  if (!la.length && !lb.length) return true
  if (la.length && lb.length) {
    const sb = new Set(lb)
    return la.some((id) => sb.has(id))
  }
  const [lista, todas] = la.length ? [la, b] : [lb, a]
  const excluidas = new Set(idsTexto(todas.exceto))
  return lista.some((id) => !excluidas.has(id))
}

/**
 * Divide as categorias de uma ocorrência pelo bloqueio: a parte atingida e a que sobra.
 * `bloqueada` nulo = o bloqueio não atinge nenhuma categoria; `resto` nulo = atinge todas.
 */
function cortarCategorias(
  o: Pick<OcorrenciaTreino, 'categorias' | 'exceto'>,
  doBloqueio: CategoriaRef[],
): {
  bloqueada: Pick<OcorrenciaTreino, 'categorias' | 'exceto'> | null
  resto: Pick<OcorrenciaTreino, 'categorias' | 'exceto'> | null
} {
  if (!doBloqueio.length) return { bloqueada: { categorias: o.categorias, exceto: o.exceto }, resto: null }
  const noBloqueio = new Set(doBloqueio.map((c) => String(c.id)))
  if (o.categorias.length) {
    const atingidas = o.categorias.filter((c) => noBloqueio.has(String(c.id)))
    if (!atingidas.length) return { bloqueada: null, resto: o }
    const livres = o.categorias.filter((c) => !noBloqueio.has(String(c.id)))
    return {
      bloqueada: { categorias: atingidas, exceto: [] },
      resto: livres.length ? { categorias: livres, exceto: [] } : null,
    }
  }
  // Ocorrência aberta a todas (menos `exceto`): bloqueia as do bloqueio que ainda estavam abertas
  const jaFora = new Set(o.exceto.map((c) => String(c.id)))
  const atingidas = doBloqueio.filter((c) => !jaFora.has(String(c.id)))
  if (!atingidas.length) return { bloqueada: null, resto: o }
  return {
    bloqueada: { categorias: atingidas, exceto: [] },
    resto: { categorias: [], exceto: [...o.exceto, ...atingidas] },
  }
}

/* ----------------------------------------------------------------------------------------------
 * Expansão da agenda (função pura)
 * -------------------------------------------------------------------------------------------- */

export interface EntradaAgenda {
  grade: HorarioGrade[]
  excecoes: TreinoAvulso[]
  /** Primeiro dia (AAAA-MM-DD, inclusivo). */
  inicio: string
  /** Último dia (AAAA-MM-DD, inclusivo). */
  fim: string
  /** Painel: considera também registros ocultos (marcados com `oculto: true`). Arquivados nunca entram. */
  incluirOcultos?: boolean
}

const participa = (visibilidade: unknown, incluirOcultos = false) =>
  visibilidade === null ||
  visibilidade === undefined ||
  visibilidade === 'visivel' ||
  (incluirOcultos && visibilidade === 'oculto')

/** O horário da grade acontece neste dia? (dia da semana e vigência; não olha a visibilidade) */
export function horarioValeNoDia(h: HorarioGrade, dia: string): boolean {
  if (h.diaSemana !== diaSemanaDaChave(dia)) return false
  const de = chaveDaData(h.validoDe)
  const ate = chaveDaData(h.validoAte)
  return (!de || dia >= de) && (!ate || dia <= ate)
}

/** Dia do treino: a chave gravada pelo hook ou, na falta dela, a data. */
export const diaDoTreino = (t: Pick<TreinoAvulso, 'dia' | 'data'>) => (ehChave(t.dia) ? t.dia : chaveDaData(t.data))

function ocorrenciaDaGrade(h: HorarioGrade, dia: string): OcorrenciaTreino {
  const horaInicio = h.horaInicio as string
  const horaFim = h.horaFim as string
  return {
    chave: `g${h.id}-${dia}`,
    dia,
    diaSemana: diaSemanaDaChave(dia),
    horaInicio,
    horaFim,
    duracaoMin: minutosEntre(horaInicio, horaFim),
    categorias: refsCategorias(h.categorias),
    exceto: [],
    tipo: refTipo(h.tipo),
    status: 'liberado',
    observacao: texto(h.observacao),
    motivo: null,
    bloqueio: null,
    origem: 'grade',
    horarioId: h.id,
    treinoId: null,
    oculto: h.visibilidade === 'oculto',
  }
}

/**
 * Ocorrência de uma exceção ou treino avulso. Com `base` (o horário substituído), herda o que estiver
 * vazio: horário, categorias, tipo e — só quando o treino acontece — a observação.
 */
function ocorrenciaDaExcecao(
  e: TreinoAvulso,
  dia: string,
  base: HorarioGrade | null,
  chave: string,
  origem: OcorrenciaTreino['origem'],
): OcorrenciaTreino | null {
  const horaInicio = ehHora(e.horaInicio) ? e.horaInicio : base?.horaInicio
  const horaFim = ehHora(e.horaFim) ? e.horaFim : base?.horaFim
  if (!intervaloValido(horaInicio, horaFim)) return null
  const status = statusDe(e.status)
  const proprias = refsCategorias(e.categorias)
  const observacao = texto(e.observacao) ?? (statusAcontece(status) ? texto(base?.observacao) : null)
  return {
    chave,
    dia,
    diaSemana: diaSemanaDaChave(dia),
    horaInicio: horaInicio as string,
    horaFim: horaFim as string,
    duracaoMin: minutosEntre(horaInicio as string, horaFim as string),
    categorias: proprias.length ? proprias : refsCategorias(base?.categorias),
    exceto: [],
    tipo: refTipo(e.tipo) ?? refTipo(base?.tipo),
    status,
    observacao,
    motivo: null,
    bloqueio: null,
    origem,
    horarioId: base ? base.id : idDe(e.substitui),
    treinoId: e.id,
    oculto: e.visibilidade === 'oculto' || base?.visibilidade === 'oculto',
  }
}

/** Aplica um bloqueio de período às ocorrências do dia. Devolve a nova lista e se algo foi atingido. */
function aplicarBloqueio(ocorrencias: OcorrenciaTreino[], b: TreinoAvulso): { lista: OcorrenciaTreino[]; atingiu: boolean } {
  if (!intervaloValido(b.horaInicio, b.horaFim)) return { lista: ocorrencias, atingiu: false }
  const das = b.horaInicio as string
  const ate = b.horaFim as string
  const categorias = refsCategorias(b.categorias)
  const motivo = texto(b.observacao)
  const lista: OcorrenciaTreino[] = []
  let atingiu = false
  for (const o of ocorrencias) {
    if (!statusAcontece(o.status) || !horariosSobrepoem(o, b)) {
      lista.push(o)
      continue
    }
    const { bloqueada, resto } = cortarCategorias(o, categorias)
    if (!bloqueada) {
      lista.push(o)
      continue
    }
    atingiu = true
    const parcial = minutosDoDia(das) > minutosDoDia(o.horaInicio) || minutosDoDia(ate) < minutosDoDia(o.horaFim)
    lista.push({
      ...o,
      ...bloqueada,
      // Quando a ocorrência é dividida, a parte bloqueada ganha uma chave própria
      chave: resto ? `${o.chave}~b${b.id}` : o.chave,
      status: 'bloqueado',
      motivo,
      bloqueio: { treinoId: b.id, das, ate, parcial },
      oculto: o.oculto || b.visibilidade === 'oculto',
    })
    if (resto) lista.push({ ...o, ...resto })
  }
  return { lista, atingiu }
}

const comparar = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0)

export function compararOcorrencias(a: OcorrenciaTreino, b: OcorrenciaTreino): number {
  return (
    comparar(a.dia, b.dia) ||
    minutosDoDia(a.horaInicio) - minutosDoDia(b.horaInicio) ||
    minutosDoDia(a.horaFim) - minutosDoDia(b.horaFim) ||
    (a.origem === b.origem ? 0 : a.origem === 'grade' ? -1 : 1) ||
    comparar(a.chave, b.chave)
  )
}

/** Grade semanal + exceções → lista de treinos por dia, ordenada (ver as regras no topo do arquivo). */
export function expandirAgenda(entrada: EntradaAgenda): OcorrenciaTreino[] {
  const dias = listarDias(entrada.inicio, entrada.fim)
  if (!dias.length) return []
  const ocultos = entrada.incluirOcultos === true

  // Todos os horários por id (para herança de dados), e os que entram na agenda por dia da semana
  const gradePorId = new Map<string, HorarioGrade>()
  const gradePorDiaSemana = new Map<string, HorarioGrade[]>()
  for (const h of entrada.grade) {
    gradePorId.set(String(h.id), h)
    if (!participa(h.visibilidade, ocultos) || !intervaloValido(h.horaInicio, h.horaFim)) continue
    if (!DIAS_SEMANA.includes(h.diaSemana as DiaSemana)) continue
    const lista = gradePorDiaSemana.get(h.diaSemana as string) ?? []
    lista.push(h)
    gradePorDiaSemana.set(h.diaSemana as string, lista)
  }

  const primeiro = dias[0]
  const ultimo = dias[dias.length - 1]
  const excecoesPorDia = new Map<string, TreinoAvulso[]>()
  for (const e of entrada.excecoes) {
    if (!participa(e.visibilidade, ocultos)) continue
    const dia = diaDoTreino(e)
    if (!dia || dia < primeiro || dia > ultimo) continue
    const lista = excecoesPorDia.get(dia) ?? []
    lista.push(e)
    excecoesPorDia.set(dia, lista)
  }
  // Ordem estável de aplicação: por horário e depois por id
  const ordemExcecao = (a: TreinoAvulso, b: TreinoAvulso) =>
    comparar(a.horaInicio ?? '', b.horaInicio ?? '') || comparar(String(a.id), String(b.id))

  const saida: OcorrenciaTreino[] = []
  for (const dia of dias) {
    let ocorrencias = (gradePorDiaSemana.get(diaSemanaDaChave(dia)) ?? [])
      .filter((h) => horarioValeNoDia(h, dia))
      .map((h) => ocorrenciaDaGrade(h, dia))

    const bloqueios: TreinoAvulso[] = []
    for (const e of (excecoesPorDia.get(dia) ?? []).sort(ordemExcecao)) {
      const status = statusDe(e.status)
      const substituiId = idDe(e.substitui)
      if (substituiId === null) {
        if (status === 'bloqueado') {
          bloqueios.push(e)
          continue
        }
        const avulso = ocorrenciaDaExcecao(e, dia, null, `t${e.id}`, 'avulso')
        if (avulso) ocorrencias.push(avulso)
        continue
      }
      const base = gradePorId.get(String(substituiId)) ?? null
      const i = ocorrencias.findIndex((o) => o.origem === 'grade' && o.treinoId === null && mesmoId(o.horarioId, substituiId))
      if (i >= 0) {
        const trocada = ocorrenciaDaExcecao(e, dia, base, ocorrencias[i].chave, 'grade')
        if (trocada) ocorrencias[i] = trocada
        continue
      }
      // O horário substituído não acontece neste dia: cancelar não tem efeito; o resto vira avulso
      if (status === 'cancelado') continue
      const avulso = ocorrenciaDaExcecao(e, dia, base, `t${e.id}`, 'avulso')
      if (avulso) ocorrencias.push(avulso)
    }

    const semEfeito: OcorrenciaTreino[] = []
    for (const b of bloqueios) {
      const { lista, atingiu } = aplicarBloqueio(ocorrencias, b)
      ocorrencias = lista
      if (atingiu) continue
      const sozinho = ocorrenciaDaExcecao(b, dia, null, `t${b.id}`, 'avulso')
      if (sozinho) semEfeito.push({ ...sozinho, observacao: null, motivo: texto(b.observacao) })
    }
    saida.push(...ocorrencias, ...semEfeito)
  }
  return saida.sort(compararOcorrencias)
}

/* ----------------------------------------------------------------------------------------------
 * Filtros e agrupamento
 * -------------------------------------------------------------------------------------------- */

/** Compara por id ou por slug (filtros por URL usam o slug). */
const casa = (ref: { id: ID; slug?: string | null } | null | undefined, alvo: ID) =>
  !!ref && (String(ref.id) === String(alvo) || (!!ref.slug && ref.slug === String(alvo)))

/** A ocorrência está aberta a esta categoria (id ou slug)? */
export function abertaParaCategoria(o: Pick<OcorrenciaTreino, 'categorias' | 'exceto'>, categoria: ID): boolean {
  if (o.categorias.length) return o.categorias.some((c) => casa(c, categoria))
  return !o.exceto.some((c) => casa(c, categoria))
}

export function filtrarPorCategoria(ocorrencias: OcorrenciaTreino[], categoria?: ID | null): OcorrenciaTreino[] {
  if (categoria === null || categoria === undefined || categoria === '') return ocorrencias
  return ocorrencias.filter((o) => abertaParaCategoria(o, categoria))
}

export function filtrarPorTipo(ocorrencias: OcorrenciaTreino[], tipo?: ID | null): OcorrenciaTreino[] {
  if (tipo === null || tipo === undefined || tipo === '') return ocorrencias
  return ocorrencias.filter((o) => casa(o.tipo, tipo))
}

export function filtrarAgenda(
  ocorrencias: OcorrenciaTreino[],
  filtros: { categoria?: ID | null; tipo?: ID | null; status?: StatusTreino | null } = {},
): OcorrenciaTreino[] {
  let lista = filtrarPorTipo(filtrarPorCategoria(ocorrencias, filtros.categoria), filtros.tipo)
  if (filtros.status) lista = lista.filter((o) => o.status === filtros.status)
  return lista
}

export interface DiaDaAgenda {
  /** AAAA-MM-DD */
  dia: string
  diaSemana: DiaSemana
  /** "sábado" */
  nome: string
  /** "sáb" */
  nomeCurto: string
  /** "18/10" */
  data: string
  hoje: boolean
  ocorrencias: OcorrenciaTreino[]
}

/**
 * Agrupa por dia, na ordem. Com `inicio` e `fim`, devolve todos os dias do intervalo (inclusive os sem
 * treino, para a visão de semana mostrar "Sem treinos programados") e descarta o que estiver fora dele.
 */
export function agruparPorDia(
  ocorrencias: OcorrenciaTreino[],
  opcoes: { inicio?: string; fim?: string; hoje?: string | null } = {},
): DiaDaAgenda[] {
  const porDia = new Map<string, OcorrenciaTreino[]>()
  for (const o of [...ocorrencias].sort(compararOcorrencias)) {
    const lista = porDia.get(o.dia) ?? []
    lista.push(o)
    porDia.set(o.dia, lista)
  }
  const dias =
    opcoes.inicio && opcoes.fim ? listarDias(opcoes.inicio, opcoes.fim) : [...porDia.keys()].sort(comparar)
  return dias.map((dia) => {
    const i = diaSemanaDeChave(dia)
    return {
      dia,
      diaSemana: DIAS_SEMANA[i],
      nome: NOMES_DIAS[i],
      nomeCurto: DIAS_CURTOS[i],
      data: formatarChaveCurta(dia),
      hoje: !!opcoes.hoje && opcoes.hoje === dia,
      ocorrencias: porDia.get(dia) ?? [],
    }
  })
}

/** Texto curto das categorias: "Cadete, Júnior" · "Todas as categorias" · "Todas, exceto Cadete". */
export function textoCategorias(o: Pick<OcorrenciaTreino, 'categorias' | 'exceto'>): string {
  const nome = (c: CategoriaRef) => texto(c.nome) ?? texto(c.sigla) ?? String(c.id)
  if (o.categorias.length) return o.categorias.map(nome).join(', ')
  if (o.exceto.length) return `Todas, exceto ${o.exceto.map(nome).join(', ')}`
  return 'Todas as categorias'
}

/** Observação para exibir: bloqueio parcial, motivo do bloqueio e observação do horário. */
export function textoObservacao(o: Pick<OcorrenciaTreino, 'observacao' | 'motivo' | 'bloqueio'>): string | null {
  const partes: string[] = []
  if (o.bloqueio?.parcial) partes.push(`Bloqueado das ${o.bloqueio.das} às ${o.bloqueio.ate}`)
  if (o.motivo) partes.push(o.motivo)
  if (o.observacao) partes.push(o.observacao)
  return partes.length ? partes.join(' · ') : null
}

/** Formato do componente AgendaTreinos do site (src/components/site/AgendaTreinos.tsx). */
export interface DiaAgendaSite {
  chave: string
  nome: string
  data: string
  hoje?: boolean
  horarios: Array<{
    id: string
    inicio: string
    fim: string
    tipo: string
    cor?: string | null
    categorias: string[]
    status: StatusTreino
    observacao?: string | null
  }>
}

export function paraAgendaSite(dias: DiaDaAgenda[]): DiaAgendaSite[] {
  return dias.map((d) => ({
    chave: d.dia,
    nome: d.nome,
    data: d.data,
    hoje: d.hoje,
    horarios: d.ocorrencias.map((o) => ({
      id: o.chave,
      inicio: o.horaInicio,
      fim: o.horaFim,
      tipo: texto(o.tipo?.nome) ?? (o.status === 'bloqueado' ? 'Pista bloqueada' : 'Treino'),
      cor: o.tipo?.cor ?? null,
      // Vazio = "Todas as categorias" no componente
      categorias: o.categorias.length || o.exceto.length ? [textoCategorias(o)] : [],
      status: o.status,
      observacao: textoObservacao(o),
    })),
  }))
}

/* ----------------------------------------------------------------------------------------------
 * Conflitos (usados pela validação "aviso de sobreposição" das coleções)
 * -------------------------------------------------------------------------------------------- */

/** Vigências (válido de/até) de dois horários têm algum dia em comum? */
export function vigenciasSeCruzam(a: Pick<HorarioGrade, 'validoDe' | 'validoAte'>, b: Pick<HorarioGrade, 'validoDe' | 'validoAte'>) {
  const [aDe, aAte, bDe, bAte] = [a.validoDe, a.validoAte, b.validoDe, b.validoAte].map(chaveDaData)
  return (!aAte || !bDe || bDe <= aAte) && (!bAte || !aDe || aDe <= bAte)
}

/**
 * Outros horários da grade que coincidem com este: mesmo dia da semana, vigências que se cruzam,
 * horários sobrepostos e alguma categoria em comum. Só horários visíveis contam.
 */
export function conflitosDaGrade(horario: HorarioGrade, outros: HorarioGrade[]): HorarioGrade[] {
  if (!participa(horario.visibilidade) || !intervaloValido(horario.horaInicio, horario.horaFim)) return []
  return outros.filter(
    (o) =>
      !mesmoId(o.id, horario.id) &&
      participa(o.visibilidade) &&
      o.diaSemana === horario.diaSemana &&
      vigenciasSeCruzam(horario, o) &&
      horariosSobrepoem(horario, o) &&
      categoriasSeCruzam(horario, o),
  )
}

export interface ConflitoAgenda {
  /** horario-fixo: coincide com a grade; treino: com outro treino/exceção; bloqueio: cai dentro de um bloqueio. */
  motivo: 'horario-fixo' | 'treino' | 'bloqueio'
  horarioId: ID | null
  treinoId: ID | null
  horaInicio: string
  horaFim: string
}

/**
 * O que coincide com este treino/exceção no mesmo dia (mesmas categorias, horários sobrepostos), olhando
 * a agenda daquele dia já calculada com a grade e as outras exceções:
 * - bloqueios não acusam conflito (eles existem justamente para cobrir outros horários);
 * - cancelamento de um horário fixo (com "substitui") também não;
 * - "cancelado" sem "substitui" sobre um horário fixo acusa, para orientar a escolher "Substitui";
 * - o horário substituído pelo próprio treino não conta.
 */
export function conflitosDoTreino(entrada: {
  treino: TreinoAvulso
  grade: HorarioGrade[]
  outros: TreinoAvulso[]
}): ConflitoAgenda[] {
  const { treino, grade } = entrada
  const dia = diaDoTreino(treino)
  if (!dia || !participa(treino.visibilidade)) return []
  const status = statusDe(treino.status)
  if (status === 'bloqueado') return []
  const substituiId = idDe(treino.substitui)
  if (substituiId !== null && status === 'cancelado') return []

  const base = substituiId !== null ? grade.find((h) => mesmoId(h.id, substituiId)) ?? null : null
  const eu = ocorrenciaDaExcecao(treino, dia, base, 'este', 'avulso')
  if (!eu) return []

  const outros = entrada.outros.filter((o) => !mesmoId(o.id, treino.id))
  const conflitos: ConflitoAgenda[] = []
  const registrar = (c: ConflitoAgenda) => {
    const repetido = conflitos.some(
      (x) => x.motivo === c.motivo && mesmoId(x.horarioId, c.horarioId) && mesmoId(x.treinoId, c.treinoId),
    )
    if (!repetido) conflitos.push(c)
  }

  for (const o of expandirAgenda({ grade, excecoes: outros, inicio: dia, fim: dia })) {
    if (!statusAcontece(o.status)) continue
    const fixo = o.origem === 'grade' && o.treinoId === null
    if (substituiId !== null && fixo && mesmoId(o.horarioId, substituiId)) continue
    if (status === 'cancelado' && !fixo) continue
    if (!horariosSobrepoem(o, eu) || !categoriasSeCruzam(o, eu)) continue
    registrar({
      motivo: fixo ? 'horario-fixo' : 'treino',
      horarioId: o.horarioId,
      treinoId: o.treinoId,
      horaInicio: o.horaInicio,
      horaFim: o.horaFim,
    })
  }

  // Treino que acontece dentro de um bloqueio de período apareceria como bloqueado
  if (statusAcontece(status)) {
    for (const b of outros) {
      if (!participa(b.visibilidade) || statusDe(b.status) !== 'bloqueado' || idDe(b.substitui) !== null) continue
      if (diaDoTreino(b) !== dia || !horariosSobrepoem(b, eu) || !categoriasSeCruzam(b, eu)) continue
      registrar({
        motivo: 'bloqueio',
        horarioId: null,
        treinoId: b.id,
        horaInicio: b.horaInicio as string,
        horaFim: b.horaFim as string,
      })
    }
  }
  return conflitos
}

/* ----------------------------------------------------------------------------------------------
 * Adaptador: lê do banco e calcula
 * -------------------------------------------------------------------------------------------- */

export interface OpcoesCarregarAgenda {
  payload: Payload
  /** Primeiro dia: chave AAAA-MM-DD ou instante (convertido para o dia em Brasília). */
  inicio: string | Date
  /** Último dia (inclusivo). */
  fim: string | Date
  /**
   * true (site): lê como visitante anônimo (regras de acesso valem; só registros visíveis; categorias
   * ocultas somem). false (painel): lê tudo, inclusive ocultos, marcados com `oculto: true`.
   */
  publico: boolean
  /** Só para o painel/endpoints (mesma transação). Ignorado quando `publico`, para nunca ler como usuário logado. */
  req?: PayloadRequest
  /** Filtro opcional por categoria (id ou slug). */
  categoria?: ID | null
  /** Filtro opcional por tipo de treino (id ou slug). */
  tipo?: ID | null
}

export interface AgendaCarregada {
  inicio: string
  fim: string
  ocorrencias: OcorrenciaTreino[]
  /** Todos os dias do intervalo, inclusive os sem treino. */
  dias: DiaDaAgenda[]
  /** Tipos de treino na ordem do painel (legenda e filtro). */
  tipos: TipoTreinoRef[]
}

type Leitura = { payload: Payload; publico: boolean; req?: PayloadRequest }

const colecao = (slug: string) => slug as CollectionSlug

/** Busca todas as páginas (o limite por página da API pública não corta a agenda). */
async function buscarTodos<T>(l: Leitura, slug: string, where: Where, sort?: string): Promise<T[]> {
  const colecoes = l.payload.collections as Record<string, unknown>
  if (!colecoes?.[slug]) return []
  const docs: T[] = []
  for (let page = 1; page <= 100; page++) {
    const resultado = await l.payload.find({
      collection: colecao(slug),
      where,
      sort,
      depth: 0,
      limit: 100,
      page,
      overrideAccess: !l.publico,
      ...(l.req ? { req: l.req } : {}),
    })
    docs.push(...(resultado.docs as unknown as T[]))
    if (!resultado.hasNextPage) break
  }
  return docs
}

/**
 * Troca os ids de categoria por { id, nome, sigla, slug, cor }. No site, categorias ocultas são retiradas;
 * se todas as categorias de um registro estiverem ocultas, o registro inteiro sai (um bloqueio só de
 * categorias ocultas não pode virar "todas").
 */
function comCategorias<T extends { categorias?: Array<Relacao<CategoriaRef>> | null }>(
  itens: T[],
  mapa: Map<string, CategoriaRef>,
  publico: boolean,
): T[] {
  const saida: T[] = []
  for (const item of itens) {
    const ids = refsCategorias(item.categorias)
    if (!ids.length) {
      saida.push(item)
      continue
    }
    const refs = ids
      .map((c) => mapa.get(String(c.id)) ?? (publico ? null : c))
      .filter((c): c is CategoriaRef => c !== null)
    if (refs.length) saida.push({ ...item, categorias: refs })
  }
  return saida
}

function comTipo<T extends { tipo?: Relacao<TipoTreinoRef> }>(item: T, mapa: Map<string, TipoTreinoRef>): T {
  const id = idDe(item.tipo)
  return id === null ? item : { ...item, tipo: mapa.get(String(id)) ?? { id } }
}

/** Carrega grade, exceções, tipos e categorias do intervalo e devolve a agenda calculada. */
export async function carregarAgenda(opcoes: OpcoesCarregarAgenda): Promise<AgendaCarregada> {
  const inicio = chaveDoInstante(opcoes.inicio)
  const fim = chaveDoInstante(opcoes.fim)
  if (!inicio || !fim) throw new Error('carregarAgenda: informe início e fim válidos (AAAA-MM-DD).')
  const hoje = chaveDia(new Date())
  if (fim < inicio) return { inicio, fim, ocorrencias: [], dias: [], tipos: [] }

  const l: Leitura = { payload: opcoes.payload, publico: opcoes.publico, req: opcoes.publico ? undefined : opcoes.req }
  const visibilidades = opcoes.publico ? ['visivel'] : ['visivel', 'oculto']

  const grade = await buscarTodos<HorarioGrade>(l, SLUGS_KARTODROMO.horarios, {
    and: [
      { visibilidade: { in: visibilidades } },
      { or: [{ validoAte: { exists: false } }, { validoAte: { greater_than_equal: `${inicio}T00:00:00.000Z` } }] },
      { or: [{ validoDe: { exists: false } }, { validoDe: { less_than_equal: `${fim}T23:59:59.999Z` } }] },
    ],
  })
  const excecoes = await buscarTodos<TreinoAvulso>(l, SLUGS_KARTODROMO.treinos, {
    and: [
      { visibilidade: { in: visibilidades } },
      { dia: { greater_than_equal: inicio } },
      { dia: { less_than_equal: fim } },
    ],
  })
  const tiposDocs = await buscarTodos<TipoTreinoRef>(l, SLUGS_KARTODROMO.tipos, {}, '_order')
  const tipos = tiposDocs.map((t) => ({ id: t.id, nome: t.nome ?? null, slug: t.slug ?? null, cor: t.cor ?? null, descricao: t.descricao ?? null }))
  const mapaTipos = new Map(tipos.map((t) => [String(t.id), t]))

  // Categorias citadas (com o valor original do id, para a consulta respeitar o tipo da coluna)
  const idsCategorias = new Map<string, ID>()
  for (const item of [...grade, ...excecoes]) {
    for (const c of refsCategorias(item.categorias)) idsCategorias.set(String(c.id), c.id)
  }
  const categorias = idsCategorias.size
    ? await buscarTodos<CategoriaRef>(l, SLUGS_KARTODROMO.categorias, { id: { in: [...idsCategorias.values()] } })
    : []
  const mapaCategorias = new Map(
    categorias.map((c) => [String(c.id), { id: c.id, nome: c.nome ?? null, sigla: c.sigla ?? null, slug: c.slug ?? null, cor: c.cor ?? null }]),
  )

  const ocorrencias = filtrarAgenda(
    expandirAgenda({
      grade: comCategorias(grade, mapaCategorias, opcoes.publico).map((h) => comTipo(h, mapaTipos)),
      excecoes: comCategorias(excecoes, mapaCategorias, opcoes.publico).map((e) => comTipo(e, mapaTipos)),
      inicio,
      fim,
      incluirOcultos: !opcoes.publico,
    }),
    { categoria: opcoes.categoria, tipo: opcoes.tipo },
  )

  return { inicio, fim, ocorrencias, dias: agruparPorDia(ocorrencias, { inicio, fim, hoje }), tipos }
}
