/**
 * Adaptador banco → motor de classificação (docs/ARQUITETURA.md §4 e §5).
 *
 * Busca os documentos da Competição pela Local API do Payload e monta a entrada de
 * `calcularClassificacao` (src/lib/classificacao.ts). Também resolve os casos especiais:
 * - modo manual / temporada só com classificação final → usa `linhasManuais`;
 * - temporada encerrada com fotografia → usa `fotografiaFinal` (congelada);
 * - regra própria da categoria (temporada-categorias.regra) ou a da temporada.
 *
 * Acesso (`publico`):
 * - As "portas" respeitam as regras de acesso: a temporada, a etapa e a classificação (temporada-categorias)
 *   são conferidas com overrideAccess = !publico, e no modo público a classificação precisa estar `publicada`.
 *   O conteúdo da classificação liberada é lido depois sem filtro de campos (ver carregarDadosTemporada).
 * - Os DADOS DO CÁLCULO (regra, etapas, corridas, inscrições, nomes de pilotos/equipes) são lidos sempre
 *   com overrideAccess, mas só com os campos públicos (`select`): ocultar a página de uma etapa ou o perfil
 *   de um piloto não pode mudar os pontos oficiais. Piloto oculto aparece pelo nome, sem link (slug nulo).
 *   Dados privados de pilotos (nascimento, autorização de imagem) nunca são selecionados.
 *
 * Exporta também `classificacoesDaTemporada` (todas as categorias), `classificacoesParaEstatisticas`
 * (entrada de src/lib/estatisticas.ts para histórico, estatísticas e página do piloto) e `resultadosDaEtapa`
 * (resultado oficial de cada corrida e da etapa, por categoria — sub-aba "Resultados").
 *
 * Só usa `import type` de 'payload' (nada roda do Payload aqui), então pode ser testado com um
 * Payload simulado. Consultas com `req` (dentro de hook/endpoint) são feitas uma de cada vez, na mesma
 * transação; sem `req` (site), em paralelo.
 */
import type { Payload, PayloadRequest, Where } from 'payload'
import {
  calcularClassificacao,
  calcularResultadoCorrida,
  lerFotografiaFinal,
  liderDe,
  type Ajuste,
  type CondicaoInscricao,
  type Corrida,
  type CriterioDesempate,
  type CriteriosAplicados,
  type DestaqueManual,
  type EntradaClassificacao,
  type Etapa,
  type Id,
  type Inscricao,
  type Lider,
  type LinhaClassificacao,
  type LinhaResultado,
  type LinhaResultadoCalculada,
  type Penalidade,
  type Regra,
  type RegraAbandono,
  type RegraConvidados,
  type RequisitoParticipacao,
  type StatusCorrida,
  type StatusEtapa,
  type StatusInscricao,
  type StatusResultado,
  type TipoAjuste,
  type TipoCorrida,
  type UnidadeDescarte,
} from './classificacao'
import { resultadoSomadoDaEtapa, type ClassificacaoDaTemporada, type LinhaResultadoDaEtapa } from './estatisticas'

/** Slugs das coleções (iguais aos da ARQUITETURA §4). */
export const SLUGS = {
  temporadas: 'temporadas',
  temporadaCategorias: 'temporada-categorias',
  regras: 'regras-pontuacao',
  etapas: 'etapas',
  corridas: 'corridas',
  inscricoes: 'inscricoes',
  pilotos: 'pilotos',
  equipes: 'equipes',
  categorias: 'categorias',
} as const

// ───────────────────────────── acesso ao Payload (interface mínima) ─────────────────────────────

type Doc = Record<string, unknown> & { id: Id }

type ArgsBusca = {
  collection: string
  where?: Where
  depth?: number
  limit?: number
  pagination?: boolean
  overrideAccess?: boolean
  select?: Record<string, unknown>
  sort?: string
  req?: PayloadRequest
}

/** O que o adaptador usa do Payload (a coleção vai como texto: não depende de payload-types regenerado). */
interface BuscaPayload {
  find(args: ArgsBusca): Promise<{ docs: unknown[] }>
}

type Contexto = { p: BuscaPayload; req?: PayloadRequest }

/** Campos pedidos ao banco (um nível de subcampos quando necessário). */
type Selecao = Record<string, true | Record<string, true>>

async function buscar(ctx: Contexto, collection: string, where: Where, select: Selecao, overrideAccess = true): Promise<Doc[]> {
  const r = await ctx.p.find({
    collection,
    where,
    select,
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess,
    ...(ctx.req ? { req: ctx.req } : {}),
  })
  return r.docs as Doc[]
}

async function buscarUm(ctx: Contexto, collection: string, where: Where, select: Selecao, overrideAccess = true): Promise<Doc | null> {
  const r = await ctx.p.find({
    collection,
    where,
    select,
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess,
    ...(ctx.req ? { req: ctx.req } : {}),
  })
  return (r.docs[0] as Doc | undefined) ?? null
}

/** Várias consultas: em paralelo no site; uma de cada vez quando há `req` (mesma transação do Postgres). */
async function emSequenciaOuParalelo<T>(ctx: Contexto, tarefas: (() => Promise<T>)[]): Promise<T[]> {
  if (!ctx.req) return Promise.all(tarefas.map((t) => t()))
  const saida: T[] = []
  for (const t of tarefas) saida.push(await t())
  return saida
}

// ───────────────────────────── conversões (documento → tipos do motor) ─────────────────────────────

/** Id de um relacionamento (id puro ou documento populado). */
export function idDe(v: unknown): Id | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number' || typeof v === 'string') return v
  if (typeof v === 'object' && v && 'id' in v) {
    const id = (v as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

const idsDe = (v: unknown): Id[] => (Array.isArray(v) ? v.map(idDe).filter((x): x is Id => x !== null) : [])
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null)
const de = <T extends string>(v: unknown, opcoes: readonly T[]): T | null => (typeof v === 'string' && (opcoes as readonly string[]).includes(v) ? (v as T) : null)
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null)
const lista = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : [])
const unicos = (ids: Id[]) => [...new Map(ids.map((i) => [String(i), i] as const)).values()]

const STATUS_ETAPA = ['agendada', 'confirmada', 'adiada', 'cancelada', 'realizada'] as const
const STATUS_CORRIDA = ['rascunho', 'oficial', 'cancelada'] as const
const TIPOS_CORRIDA = ['warm-up', 'tomada-de-tempo', 'classificatoria', 'bateria', 'pre-final', 'final'] as const
const STATUS_RESULTADO = ['classificado', 'nao-classificado', 'abandono', 'desclassificado', 'nao-largou'] as const
const TIPOS_PENALIDADE = ['tempo', 'posicoes', 'pontos', 'advertencia'] as const
const CONDICOES = ['titular', 'convidado'] as const
const STATUS_INSCRICAO = ['ativa', 'desistente', 'transferida', 'excluida'] as const
const REQUISITOS = ['presente', 'largou', 'classificado'] as const
const ABANDONOS = ['pela-posicao', 'so-participacao', 'zero'] as const
const CONVIDADOS = ['reclassificar-elegiveis', 'manter-posicoes'] as const
const UNIDADES = ['etapa', 'corrida'] as const
const CRITERIOS = ['mais-vitorias', 'contagem-de-posicoes', 'melhor-resultado-ultima-etapa', 'mais-poles'] as const
const TIPOS_AJUSTE = ['penalidade', 'bonificacao', 'correcao'] as const

/** Primeiro valor definido entre vários nomes de campo (tolerância a pequenas diferenças de nome). */
const campo = (d: Record<string, unknown> | null | undefined, ...nomes: string[]): unknown => {
  if (!d) return undefined
  for (const n of nomes) if (d[n] !== undefined && d[n] !== null) return d[n]
  return undefined
}

/** Pontos de uma tabela: lista numérica (`number` hasMany) ou linhas `{ pontos }` / `{ valor }`. */
function pontosDaTabela(v: unknown): number[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => (typeof x === 'number' ? x : num(campo(obj(x), 'pontos', 'valor')) ?? 0))
}

/** Documento de regras-pontuacao → Regra do motor. */
export function paraRegra(d: Record<string, unknown> | null | undefined): Regra {
  if (!d) return {}
  const descartes = obj(campo(d, 'descartes'))
  const criterios = campo(d, 'criteriosDesempate', 'desempate')
  return {
    tabelas: lista(d.tabelas).map((t) => ({ id: idDe(t.id), nome: texto(t.nome), pontos: pontosDaTabela(t.pontos) })),
    pontosPole: num(campo(d, 'pontosPole')),
    pontosVoltaRapida: num(campo(d, 'pontosVoltaRapida', 'pontosVoltaMaisRapida')),
    pontosParticipacao: num(campo(d, 'pontosParticipacao')),
    requisitoParticipacao: de<RequisitoParticipacao>(campo(d, 'requisitoParticipacao', 'participacaoRequisito'), REQUISITOS),
    abandono: de<RegraAbandono>(campo(d, 'abandono'), ABANDONOS),
    percentualMinimoVoltas: num(campo(d, 'percentualMinimoVoltas')),
    convidados: de<RegraConvidados>(campo(d, 'convidados'), CONVIDADOS),
    descartes: descartes
      ? {
          quantidade: num(campo(descartes, 'quantidade')),
          unidade: de<UnidadeDescarte>(campo(descartes, 'unidade'), UNIDADES),
          aPartirDeEtapas: num(campo(descartes, 'aPartirDeEtapas', 'aPartirDe', 'aPartirDeEtapa', 'etapasMinimas')),
          ultimaEtapaDescartavel: bool(campo(descartes, 'ultimaEtapaDescartavel', 'ultimaDescartavel')),
        }
      : null,
    // Lista de seleção (select hasMany) ou array de linhas { criterio }.
    criteriosDesempate: Array.isArray(criterios)
      ? criterios
          .map((c) => (typeof c === 'string' ? c : campo(obj(c), 'criterio', 'valor')))
          .filter((c): c is CriterioDesempate => typeof c === 'string' && (CRITERIOS as readonly string[]).includes(c))
      : null,
  }
}

export function paraEtapa(d: Doc): Etapa {
  return {
    id: d.id,
    numero: num(d.numero) ?? 0,
    nome: texto(d.nome),
    inicio: texto(d.inicio),
    status: de<StatusEtapa>(d.status, STATUS_ETAPA) ?? 'agendada',
    fatorPontuacao: num(campo(d, 'fatorPontuacao', 'fator')),
    categorias: idsDe(d.categorias),
  }
}

function paraPenalidade(v: unknown): Penalidade | null {
  const p = obj(v)
  const tipo = de(p?.tipo, TIPOS_PENALIDADE)
  return p && tipo ? { tipo, valor: num(p.valor), motivo: texto(p.motivo) } : null
}

/** Linha de corridas.resultados → LinhaResultado do motor. */
export function paraLinhaResultado(l: Record<string, unknown>): LinhaResultado {
  // Correção manual da posição oficial: chave "ajustarPosicao" + motivo (sem a chave, a posição gravada é a calculada).
  const ajustar = bool(l.ajustarPosicao) === true
  return {
    inscricao: idDe(l.inscricao),
    posicaoChegada: num(l.posicaoChegada),
    status: de<StatusResultado>(l.status, STATUS_RESULTADO) ?? 'classificado',
    voltas: num(l.voltas),
    melhorVolta: num(campo(l, 'melhorVoltaMs', 'melhorVolta')),
    tempoTotal: num(campo(l, 'tempoTotalMs', 'tempoTotal')),
    penalidade: paraPenalidade(l.penalidade),
    penalidades: lista(l.penalidades).map(paraPenalidade).filter((p): p is Penalidade => p !== null),
    posicaoOficial: ajustar ? num(l.posicaoOficial) : null,
    motivoPosicaoOficial: ajustar ? texto(l.motivoAjuste) ?? 'Ajuste manual' : null,
    pontosManuais: num(l.pontosManuais),
    voltaMaisRapida: bool(l.voltaMaisRapida),
  }
}

export function paraCorrida(d: Doc): Corrida {
  const vmr = campo(d, 'voltaMaisRapidaManual')
  // Grupo { inscricao, motivo } ou relacionamento direto (um ou vários).
  const manual = Array.isArray(vmr) ? idsDe(vmr) : obj(vmr) && !('id' in (vmr as object)) ? idDe((vmr as Record<string, unknown>).inscricao) : idDe(vmr)
  return {
    id: d.id,
    etapa: idDe(d.etapa) ?? '',
    categorias: idsDe(d.categorias),
    nome: texto(d.nome),
    tipo: de<TipoCorrida>(d.tipo, TIPOS_CORRIDA) ?? 'bateria',
    tabela: texto(d.tabela) ?? idDe(d.tabela),
    contaParaClassificacao: bool(d.contaParaClassificacao) ?? true,
    fatorPontuacao: num(campo(d, 'fator', 'fatorPontuacao')),
    inicio: texto(d.inicio),
    voltasPrevistas: num(d.voltasPrevistas),
    status: de<StatusCorrida>(d.status, STATUS_CORRIDA) ?? 'rascunho',
    voltaMaisRapidaManual: manual,
    resultados: lista(d.resultados).map(paraLinhaResultado),
  }
}

export type Nomes = { pilotos: Map<string, Doc>; equipes: Map<string, Doc> }

/** Nome exibido do piloto (nome de exibição, senão o nome). */
const nomePiloto = (p: Doc | undefined) => texto(p?.nomeExibicao) ?? texto(p?.nome) ?? 'Piloto sem nome'

/**
 * Link do perfil do piloto. No site, só quando o perfil é público (visível ou arquivado): piloto oculto
 * continua na classificação pelo nome (o resultado é oficial), mas sem link para uma página que não abre.
 */
const slugDoPiloto = (p: Doc | undefined, publico: boolean): string | null => {
  if (!p) return null
  const v = p.visibilidade
  const publicoOk = v === undefined || v === null || v === 'visivel' || v === 'arquivado'
  return !publico || publicoOk ? texto(p.slug) : null
}

const nomeEquipe = (e: Doc | undefined) => texto(e?.nome) ?? texto(e?.sigla)

export function paraInscricao(d: Doc, nomes: Nomes, publico: boolean): Inscricao {
  const piloto = idDe(d.piloto)
  const equipe = idDe(d.equipe)
  const p = piloto === null ? undefined : nomes.pilotos.get(String(piloto))
  const e = equipe === null ? undefined : nomes.equipes.get(String(equipe))
  return {
    id: d.id,
    categoria: idDe(d.categoria) ?? '',
    piloto: piloto ?? `inscricao:${d.id}`,
    nome: nomePiloto(p),
    pilotoSlug: slugDoPiloto(p, publico),
    numero: (num(d.numero) ?? texto(d.numero)) as number | string | null,
    equipe,
    equipeNome: nomeEquipe(e),
    condicao: de<CondicaoInscricao>(d.condicao, CONDICOES) ?? 'titular',
    status: de<StatusInscricao>(d.status, STATUS_INSCRICAO) ?? 'ativa',
  }
}

export function paraAjuste(a: Record<string, unknown>): Ajuste | null {
  const inscricao = idDe(a.inscricao)
  const pontos = num(a.pontos)
  if (inscricao === null || pontos === null) return null
  return { inscricao, etapa: idDe(a.etapa), tipo: de<TipoAjuste>(a.tipo, TIPOS_AJUSTE), pontos, motivo: texto(a.motivo) }
}

// ───────────────────────────── carga dos dados de uma temporada ─────────────────────────────

const SELECT_TEMPORADA = { nome: true, ano: true, status: true, regra: true, fonteDados: true, campeonato: true } as const
const SELECT_CLASSIFICACAO = {
  temporada: true,
  categoria: true,
  ordem: true,
  regra: true,
  incluiResultadosDe: true,
  modo: true,
  ajustes: true,
  destaqueManual: true,
  linhasManuais: true,
  fotografiaFinal: true,
  campeao: true,
  vice: true,
  terceiro: true,
  publicada: true,
} as const
// Sem os campos "join" (temporadas/classificações que usam a regra), que só servem ao painel.
const SELECT_REGRA = {
  nome: true,
  // Campos da tabela nomeados um a um: com `tabelas: true` o Payload 3.90 devolve `pontos` (número múltiplo
  // dentro de lista) vazio, e a classificação sairia zerada.
  tabelas: { nome: true, pontos: true },
  pontosPole: true,
  pontosVoltaRapida: true,
  pontosParticipacao: true,
  requisitoParticipacao: true,
  abandono: true,
  percentualMinimoVoltas: true,
  convidados: true,
  descartes: true,
  criteriosDesempate: true,
} as const
const SELECT_ETAPA = { numero: true, nome: true, inicio: true, status: true, fatorPontuacao: true, categorias: true } as const
const SELECT_CORRIDA = {
  etapa: true,
  categorias: true,
  nome: true,
  tipo: true,
  tabela: true,
  contaParaClassificacao: true,
  fator: true,
  inicio: true,
  voltasPrevistas: true,
  status: true,
  resultados: true,
  voltaMaisRapidaManual: true,
} as const
const SELECT_INSCRICAO = { categoria: true, piloto: true, numero: true, equipe: true, condicao: true, status: true } as const
const SELECT_PILOTO = { nome: true, nomeExibicao: true, slug: true, visibilidade: true } as const
const SELECT_EQUIPE = { nome: true, sigla: true } as const
const SELECT_CATEGORIA = { nome: true, sigla: true, slug: true } as const

export interface DadosTemporada {
  temporada: Doc
  /** Classificações (temporada-categorias) acessíveis (no modo público, só as publicadas). */
  classificacoes: Doc[]
  regras: Map<string, Doc>
  etapas: Etapa[]
  corridas: Corrida[]
  inscricoes: Inscricao[]
  /** Pilotos e equipes (só campos públicos), pelo id. */
  nomes: Nomes
  publico: boolean
}

export interface OpcoesCarga {
  payload: Payload
  temporada: Id
  /** true = leitura do site (respeita acesso e exige classificação publicada). */
  publico?: boolean
  /** Repassado às consultas (mesma transação quando chamado de hook/endpoint). */
  req?: PayloadRequest
  /** Limita às classificações destas categorias (vazio = todas da temporada). */
  categorias?: Id[]
  /** Recalcula mesmo com fotografia final gravada (encerramento da temporada). */
  ignorarFotografia?: boolean
  /** Carrega os resultados mesmo quando fotografia/modo manual bastariam (ex.: classificação "após a etapa X"). */
  comResultados?: boolean
}

/** Ids de piloto e equipe citados nas linhas manuais e nas fotografias (para buscar os nomes atuais). */
function idsCitados(classificacoes: Doc[], campo: 'piloto' | 'equipe'): Id[] {
  return classificacoes.flatMap((c) => [
    ...lista(c.linhasManuais).map((l) => idDe(l[campo])),
    ...(lerFotografiaFinal(c.fotografiaFinal)?.linhas ?? []).map((l) => idDe(l[campo])),
  ]).filter((x): x is Id => x !== null)
}

/**
 * Carrega de uma vez tudo o que o cálculo precisa de uma temporada (até 9 consultas, independentemente do
 * número de categorias). Devolve null quando a temporada não existe ou não é visível.
 * Resultados (regras, etapas, corridas) só são lidos quando alguma classificação pedida é automática.
 */
export async function carregarDadosTemporada(opcoes: OpcoesCarga): Promise<DadosTemporada | null> {
  const publico = opcoes.publico === true
  const ctx: Contexto = { p: opcoes.payload as unknown as BuscaPayload, req: opcoes.req }
  const temporada = await buscarUm(ctx, SLUGS.temporadas, { id: { equals: opcoes.temporada } }, SELECT_TEMPORADA, !publico)
  if (!temporada) return null

  const filtroClassif: Where[] = [{ temporada: { equals: temporada.id } }]
  if (opcoes.categorias?.length) filtroClassif.push({ categoria: { in: opcoes.categorias } })
  if (publico) filtroClassif.push({ publicada: { equals: true } })
  let classificacoes: Doc[]
  if (publico) {
    // Porta com as regras de acesso (quais classificações o público pode ver)…
    const visiveis = await buscar(ctx, SLUGS.temporadaCategorias, { and: filtroClassif }, { categoria: true }, false)
    // …e o conteúdo completo delas sem o filtro de campos: um campo restrito ao painel (ex.: motivo de um
    // ajuste) não pode sumir da leitura e mudar os pontos mostrados no site.
    classificacoes = visiveis.length
      ? await buscar(ctx, SLUGS.temporadaCategorias, { id: { in: visiveis.map((c) => c.id) } }, SELECT_CLASSIFICACAO)
      : []
  } else {
    classificacoes = await buscar(ctx, SLUGS.temporadaCategorias, { and: filtroClassif }, SELECT_CLASSIFICACAO)
  }

  const vazio: DadosTemporada = {
    temporada,
    classificacoes,
    regras: new Map(),
    etapas: [],
    corridas: [],
    inscricoes: [],
    nomes: { pilotos: new Map(), equipes: new Map() },
    publico,
  }
  // No site, sem classificação publicada não há nada a calcular.
  if (publico && !classificacoes.length) return vazio

  // Resultados só fazem falta quando alguma classificação pedida será calculada (modo automático).
  const encerrada = temporada.status === 'encerrada'
  const soFinal = temporada.fonteDados === 'so-classificacao-final'
  const dispensaResultados = (c: Doc) =>
    soFinal || c.modo === 'manual' || (encerrada && !opcoes.ignorarFotografia && lerFotografiaFinal(c.fotografiaFinal) !== null)
  const todasTemDocumento =
    !opcoes.categorias?.length || opcoes.categorias.every((cat) => classificacoes.some((c) => String(idDe(c.categoria)) === String(cat)))
  const precisaResultados =
    opcoes.comResultados === true || !(classificacoes.length > 0 && todasTemDocumento && classificacoes.every(dispensaResultados))

  let regras: Doc[] = []
  let etapas: Etapa[] = []
  let corridas: Corrida[] = []
  if (precisaResultados) {
    const idsRegras = unicos([idDe(temporada.regra), ...classificacoes.map((c) => idDe(c.regra))].filter((x): x is Id => x !== null))
    regras = idsRegras.length ? await buscar(ctx, SLUGS.regras, { id: { in: idsRegras } }, SELECT_REGRA) : []
    etapas = (await buscar(ctx, SLUGS.etapas, { temporada: { equals: temporada.id } }, SELECT_ETAPA)).map(paraEtapa)
    // Só as corridas oficiais de etapas realizadas entram no cálculo.
    const realizadas = etapas.filter((e) => e.status === 'realizada').map((e) => e.id)
    corridas = realizadas.length
      ? (await buscar(ctx, SLUGS.corridas, { and: [{ etapa: { in: realizadas } }, { status: { equals: 'oficial' } }] }, SELECT_CORRIDA)).map(paraCorrida)
      : []
  }

  const docsInscricoes = await buscar(ctx, SLUGS.inscricoes, { temporada: { equals: temporada.id } }, SELECT_INSCRICAO)
  const nomes = await carregarNomes(
    ctx,
    [...docsInscricoes.map((i) => idDe(i.piloto)).filter((x): x is Id => x !== null), ...idsCitados(classificacoes, 'piloto')],
    [...docsInscricoes.map((i) => idDe(i.equipe)).filter((x): x is Id => x !== null), ...idsCitados(classificacoes, 'equipe')],
  )

  return {
    ...vazio,
    regras: new Map(regras.map((r) => [String(r.id), r] as const)),
    etapas,
    corridas,
    inscricoes: docsInscricoes.map((d) => paraInscricao(d, nomes, publico)),
    nomes,
  }
}

/** Pilotos e equipes pelo id, só com campos públicos (dados privados de menores nunca são lidos). */
async function carregarNomes(ctx: Contexto, idsPilotos: Id[], idsEquipes: Id[]): Promise<Nomes> {
  const p = unicos(idsPilotos)
  const e = unicos(idsEquipes)
  const [pilotos, equipes] = await emSequenciaOuParalelo(ctx, [
    () => (p.length ? buscar(ctx, SLUGS.pilotos, { id: { in: p } }, SELECT_PILOTO) : Promise.resolve([])),
    () => (e.length ? buscar(ctx, SLUGS.equipes, { id: { in: e } }, SELECT_EQUIPE) : Promise.resolve([])),
  ])
  return {
    pilotos: new Map(pilotos.map((x) => [String(x.id), x] as const)),
    equipes: new Map(equipes.map((x) => [String(x.id), x] as const)),
  }
}

// ───────────────────────────── classificação de uma categoria ─────────────────────────────

export type FonteClassificacao = 'automatica' | 'manual' | 'fotografia' | 'sem-regra'

export interface ClassificacaoCarregada {
  fonte: FonteClassificacao
  temporada: { id: Id; nome: string | null; ano: number | null; status: string | null }
  categoria: Id
  /** Documento temporada-categorias (null = ainda não criado; só acontece no painel). */
  classificacao: Id | null
  publicada: boolean
  encerrada: boolean
  /** Categorias somadas a esta classificação (vazio = só a própria). */
  incluiResultadosDe: Id[]
  linhas: LinhaClassificacao[]
  criterios: CriteriosAplicados | null
  etapasRealizadas: number
  etapas: { id: Id; numero: number; nome: string | null }[]
  lider: Lider | null
  /** Pódio final gravado ao encerrar (inscrições). */
  podioFinal: { campeao: Id | null; vice: Id | null; terceiro: Id | null }
  avisos: string[]
}

/** Linhas digitadas no modo manual → linhas de classificação. */
function linhasManuais(classificacao: Doc, dados: DadosTemporada, categoria: Id): LinhaClassificacao[] {
  const nomes = dados.nomes
  const inscricaoDoPiloto = new Map(
    dados.inscricoes.filter((i) => String(i.categoria) === String(categoria)).map((i) => [String(i.piloto), i] as const),
  )
  const brutas = lista(classificacao.linhasManuais).map((l, i) => {
    const piloto = idDe(l.piloto)
    const equipe = idDe(l.equipe)
    const p = piloto === null ? undefined : nomes.pilotos.get(String(piloto))
    const e = equipe === null ? undefined : nomes.equipes.get(String(equipe))
    const ins = piloto === null ? undefined : inscricaoDoPiloto.get(String(piloto))
    return {
      ordem: i,
      linha: {
        chave: piloto !== null ? String(piloto) : `manual:${i}`,
        posicao: num(l.posicao) ?? 0,
        posicaoAnterior: null,
        inscricao: ins?.id ?? null,
        inscricoes: ins ? [ins.id] : [],
        piloto,
        nome: p ? nomePiloto(p) : texto(l.nome) ?? 'Piloto sem nome',
        pilotoSlug: slugDoPiloto(p, dados.publico),
        numero: (num(l.numero) ?? texto(l.numero) ?? ins?.numero ?? null) as number | string | null,
        equipe: equipe ?? ins?.equipe ?? null,
        equipeNome: nomeEquipe(e) ?? (equipe === null ? ins?.equipeNome ?? null : null),
        categoria,
        pontos: num(l.pontos) ?? 0,
        pontosBrutos: num(l.pontos) ?? 0,
        pontosDescartados: 0,
        ajustes: 0,
        vitorias: num(l.vitorias) ?? 0,
        podios: num(l.podios) ?? 0,
        corridas: num(l.corridas) ?? 0,
        poles: num(l.poles) ?? 0,
        voltasRapidas: num(l.voltasRapidas) ?? 0,
        etapas: 0,
        porEtapa: [],
        desempate: null,
        manual: true,
        observacao: texto(l.observacao),
      } satisfies LinhaClassificacao,
    }
  })
  // Ordena pela posição digitada (sem posição: pelos pontos) e renumera 1..N sem buracos.
  brutas.sort(
    (a, b) =>
      (a.linha.posicao || Infinity) - (b.linha.posicao || Infinity) || b.linha.pontos - a.linha.pontos || a.ordem - b.ordem,
  )
  return brutas.map((b, i) => ({ ...b.linha, posicao: i + 1 }))
}

/**
 * Fotografia final: posições, pontos e números ficam congelados; nome, link do perfil e nome da equipe vêm
 * do cadastro atual (uma informação, um dono — corrigir a grafia de um nome vale também no histórico).
 */
function atualizarExibicao(linhas: LinhaClassificacao[], dados: DadosTemporada): LinhaClassificacao[] {
  return linhas.map((l) => {
    const piloto = idDe(l.piloto)
    const equipe = idDe(l.equipe)
    const p = piloto === null ? undefined : dados.nomes.pilotos.get(String(piloto))
    const e = equipe === null ? undefined : dados.nomes.equipes.get(String(equipe))
    return {
      ...l,
      inscricoes: Array.isArray(l.inscricoes) ? l.inscricoes : [],
      porEtapa: Array.isArray(l.porEtapa) ? l.porEtapa : [],
      nome: p ? nomePiloto(p) : texto(l.nome) ?? 'Piloto sem nome',
      // Piloto que não está mais no cadastro: sem link no site.
      pilotoSlug: p ? slugDoPiloto(p, dados.publico) : dados.publico ? null : (l.pilotoSlug ?? null),
      equipeNome: nomeEquipe(e) ?? l.equipeNome ?? null,
    }
  })
}

/** Monta a entrada do motor para uma categoria a partir dos dados já carregados (null = sem regra). */
export function entradaDe(dados: DadosTemporada, categoria: Id, opcoes: { ateEtapa?: Id | null } = {}): EntradaClassificacao | null {
  const classificacao = dados.classificacoes.find((c) => String(idDe(c.categoria)) === String(categoria)) ?? null
  const idRegra = idDe(classificacao?.regra) ?? idDe(dados.temporada.regra)
  const regraDoc = idRegra === null ? undefined : dados.regras.get(String(idRegra))
  if (!regraDoc) return null
  return {
    regra: paraRegra(regraDoc),
    categoria,
    incluiResultadosDe: idsDe(classificacao?.incluiResultadosDe),
    etapas: dados.etapas,
    corridas: dados.corridas,
    inscricoes: dados.inscricoes,
    ajustes: lista(classificacao?.ajustes).map(paraAjuste).filter((a): a is Ajuste => a !== null),
    ateEtapa: opcoes.ateEtapa ?? null,
  }
}

/**
 * Classificação de uma categoria a partir dos dados carregados:
 * fotografia (temporada encerrada) → manual (modo manual ou temporada só com classificação final) → automática.
 * Devolve null quando, no modo público, não há classificação publicada para a categoria.
 */
export function montarClassificacao(
  dados: DadosTemporada,
  categoria: Id,
  opcoes: { ateEtapa?: Id | null; agora?: Date; ignorarFotografia?: boolean } = {},
): ClassificacaoCarregada | null {
  const classificacao = dados.classificacoes.find((c) => String(idDe(c.categoria)) === String(categoria)) ?? null
  if (dados.publico && (!classificacao || classificacao.publicada !== true)) return null

  const t = dados.temporada
  const encerrada = t.status === 'encerrada'
  const destaque = obj(classificacao?.destaqueManual)
  const destaqueManual: DestaqueManual | null = destaque
    ? { inscricao: idDe(destaque.inscricao), rotulo: texto(destaque.rotulo), exibirAte: texto(destaque.exibirAte) }
    : null
  const base = {
    temporada: { id: t.id, nome: texto(t.nome), ano: num(t.ano), status: texto(t.status) },
    categoria,
    classificacao: classificacao?.id ?? null,
    publicada: classificacao?.publicada === true,
    encerrada,
    incluiResultadosDe: idsDe(classificacao?.incluiResultadosDe),
    podioFinal: { campeao: idDe(classificacao?.campeao), vice: idDe(classificacao?.vice), terceiro: idDe(classificacao?.terceiro) },
  }
  const agora = opcoes.agora ?? new Date()
  const semCorte = opcoes.ateEtapa === null || opcoes.ateEtapa === undefined
  // Temporada encerrada não tem "destaque" temporário: o 1º é o campeão.
  const destaqueValido = encerrada ? null : destaqueManual

  // 1) Temporada encerrada: a fotografia final é a classificação oficial (congelada).
  const foto = encerrada && semCorte && !opcoes.ignorarFotografia ? lerFotografiaFinal(classificacao?.fotografiaFinal) : null
  if (foto) {
    const linhas = atualizarExibicao(foto.linhas, dados)
    return {
      ...base,
      fonte: 'fotografia',
      linhas,
      criterios: foto.criterios,
      etapasRealizadas: foto.etapasRealizadas,
      etapas: [],
      lider: liderDe(linhas, null, agora),
      avisos: [],
    }
  }

  // 2) Modo manual (ou temporada histórica só com a classificação final).
  const manual = classificacao?.modo === 'manual' || t.fonteDados === 'so-classificacao-final'
  if (manual && classificacao) {
    const linhas = linhasManuais(classificacao, dados, categoria)
    return {
      ...base,
      fonte: 'manual',
      linhas,
      criterios: null,
      etapasRealizadas: 0,
      etapas: [],
      lider: liderDe(linhas, destaqueValido, agora),
      avisos: linhas.length ? [] : ['Classificação em modo manual ainda sem linhas: digite as posições e os pontos.'],
    }
  }

  // 3) Automático.
  const entrada = entradaDe(dados, categoria, { ateEtapa: opcoes.ateEtapa })
  if (!entrada) {
    return {
      ...base,
      fonte: 'sem-regra',
      linhas: [],
      criterios: null,
      etapasRealizadas: 0,
      etapas: [],
      lider: null,
      avisos: ['Esta temporada (ou categoria) ainda não tem regra de pontuação: escolha a regra para calcular a classificação.'],
    }
  }
  const r = calcularClassificacao(entrada)
  if (encerrada && semCorte && !opcoes.ignorarFotografia) {
    r.avisos.push('Temporada encerrada sem fotografia final: a classificação foi recalculada a partir dos resultados.')
  }
  return {
    ...base,
    fonte: 'automatica',
    linhas: r.linhas,
    criterios: r.criterios,
    etapasRealizadas: r.etapasRealizadas,
    etapas: r.etapas,
    lider: liderDe(r.linhas, destaqueValido, agora),
    avisos: r.avisos,
  }
}

/**
 * Classificação de uma temporada × categoria, pronta para o site ou para o painel.
 * `publico: true` respeita o acesso (temporada visível, classificação publicada); null = nada a mostrar.
 */
export async function classificacaoDe(opcoes: {
  payload: Payload
  temporada: Id
  categoria: Id
  publico?: boolean
  req?: PayloadRequest
  /** Classificação "após a etapa X" (inclusive). */
  ateEtapa?: Id | null
  agora?: Date
}): Promise<ClassificacaoCarregada | null> {
  const comCorte = opcoes.ateEtapa !== null && opcoes.ateEtapa !== undefined
  const dados = await carregarDadosTemporada({
    payload: opcoes.payload,
    temporada: opcoes.temporada,
    publico: opcoes.publico,
    req: opcoes.req,
    categorias: [opcoes.categoria],
    comResultados: comCorte,
  })
  if (!dados) return null
  return montarClassificacao(dados, opcoes.categoria, { ateEtapa: opcoes.ateEtapa, agora: opcoes.agora })
}

/**
 * Todas as classificações de uma temporada (uma por categoria com temporada-categorias), na ordem do painel.
 * Usado pelas páginas de temporada, histórico, estatísticas e pelo encerramento da temporada.
 */
export async function classificacoesDaTemporada(
  opcoes: Omit<OpcoesCarga, 'categorias' | 'comResultados'> & { agora?: Date },
): Promise<ClassificacaoCarregada[]> {
  const dados = await carregarDadosTemporada(opcoes)
  if (!dados) return []
  const ordenadas = [...dados.classificacoes].sort((a, b) => (num(a.ordem) ?? 0) - (num(b.ordem) ?? 0))
  return ordenadas
    .map((c) => idDe(c.categoria))
    .filter((c): c is Id => c !== null)
    .map((c) => montarClassificacao(dados, c, { agora: opcoes.agora, ignorarFotografia: opcoes.ignorarFotografia }))
    .filter((c): c is ClassificacaoCarregada => c !== null)
}

// ───────────────────────────── estatísticas (várias temporadas) ─────────────────────────────

/** Classificação carregada → entrada de src/lib/estatisticas.ts. */
export function paraEstatisticas(c: ClassificacaoCarregada, categoriaNome: string | null = null): ClassificacaoDaTemporada {
  return {
    temporada: c.temporada.id,
    temporadaNome: c.temporada.nome,
    ano: c.temporada.ano,
    categoria: c.categoria,
    categoriaNome,
    encerrada: c.encerrada,
    fonte: c.fonte === 'sem-regra' ? undefined : c.fonte,
    agregada: c.incluiResultadosDe.length > 0,
    linhas: c.linhas,
  }
}

/**
 * Classificações (publicadas, no site) de várias temporadas, prontas para totais de carreira, rankings,
 * recordes e campeões (src/lib/estatisticas.ts). Filtra por campeonato e/ou lista de temporadas.
 */
export async function classificacoesParaEstatisticas(opcoes: {
  payload: Payload
  publico?: boolean
  req?: PayloadRequest
  campeonato?: Id | null
  temporadas?: Id[] | null
  agora?: Date
}): Promise<ClassificacaoDaTemporada[]> {
  const publico = opcoes.publico === true
  const ctx: Contexto = { p: opcoes.payload as unknown as BuscaPayload, req: opcoes.req }
  const filtros: Where[] = []
  if (opcoes.campeonato !== null && opcoes.campeonato !== undefined) filtros.push({ campeonato: { equals: opcoes.campeonato } })
  if (opcoes.temporadas?.length) filtros.push({ id: { in: opcoes.temporadas } })
  const temporadas = await buscar(ctx, SLUGS.temporadas, filtros.length ? { and: filtros } : {}, { ano: true }, !publico)
  temporadas.sort((a, b) => (num(b.ano) ?? 0) - (num(a.ano) ?? 0))

  const porTemporada = await emSequenciaOuParalelo(
    ctx,
    temporadas.map((t) => () => classificacoesDaTemporada({ payload: opcoes.payload, temporada: t.id, publico, req: opcoes.req, agora: opcoes.agora })),
  )
  const classificacoes = porTemporada.flat()
  const idsCategorias = unicos(classificacoes.map((c) => c.categoria))
  // Nome da categoria é informação pública da classificação publicada.
  const categorias = idsCategorias.length ? await buscar(ctx, SLUGS.categorias, { id: { in: idsCategorias } }, SELECT_CATEGORIA) : []
  const nomeCategoria = new Map(categorias.map((c) => [String(c.id), texto(c.nome) ?? texto(c.sigla)] as const))
  return classificacoes.map((c) => paraEstatisticas(c, nomeCategoria.get(String(c.categoria)) ?? null))
}

// ───────────────────────────── resultados de uma etapa ─────────────────────────────

/**
 * Linha de uma corrida no site: posição na categoria (`posicaoCategoria`), status, pontos, número e nome do
 * piloto, `melhorVolta` (ms, quando lançada) e `voltaMaisRapida` (a oficial, que pontua) vêm do motor.
 */
export type LinhaCorridaExibida = LinhaResultadoCalculada & { pilotoSlug: string | null; equipeNome: string | null }

export interface CorridaComResultado {
  id: Id
  nome: string | null
  tipo: TipoCorrida
  inicio: string | null
  /** Ordem da sessão na etapa, para esta categoria (1 = primeira): pelo horário; sem horário, pelo tipo e nome. */
  ordem: number
  /** Conta para a classificação (dá pontos). Warm-up nunca conta. */
  conta: boolean
  /** Linhas na ordem oficial (posicionados primeiro), só da categoria. */
  linhas: LinhaCorridaExibida[]
  /** Inscrição com a volta mais rápida na categoria. */
  voltaMaisRapida: Id | null
}

export interface ResultadoCategoriaNaEtapa {
  categoria: Id
  categoriaNome: string | null
  categoriaSlug: string | null
  /** Sessões oficiais da categoria na etapa (warm-up, tomada de tempo, corridas), em ordem (`ordem`). */
  corridas: CorridaComResultado[]
  /**
   * Resultado somado da etapa (corridas + pole, pela regra da categoria; warm-up nunca entra), com o mesmo
   * desempate do campeonato: total, critérios da regra, ordem alfabética. Sem convidados. Quem correu mas
   * não tem posição oficial em nenhuma corrida que conta vem no fim, com `posicao` nula.
   */
  etapa: LinhaResultadoDaEtapa[]
  /** A categoria ainda não tem regra de pontuação: posições aparecem, pontos ficam zerados. */
  semRegra: boolean
}

export interface ResultadosDaEtapa {
  etapa: { id: Id; numero: number; nome: string | null; inicio: string | null; status: string }
  temporada: { id: Id; nome: string | null; ano: number | null }
  /** Etapa ainda não realizada: só as corridas já oficiais (o resultado da etapa é parcial). */
  parcial: boolean
  categorias: ResultadoCategoriaNaEtapa[]
}

const ORDEM_TIPO: Record<TipoCorrida, number> = {
  'warm-up': 0,
  'tomada-de-tempo': 1,
  classificatoria: 2,
  bateria: 3,
  'pre-final': 4,
  final: 5,
}

const instante = (v: unknown): number | null => {
  const t = typeof v === 'string' || v instanceof Date ? new Date(v).getTime() : NaN
  return Number.isFinite(t) ? t : null
}

/**
 * Sessões de uma etapa em ordem: pelo horário quando todas têm horário; senão pelo tipo (warm-up, tomada de
 * tempo, classificatória, bateria, pré-final, final) e pelo nome ("Corrida 2" antes de "Corrida 10").
 */
export function ordenarSessoes<T extends Pick<Corrida, 'inicio' | 'tipo' | 'nome'>>(corridas: T[]): T[] {
  const todasComHorario = corridas.every((c) => instante(c.inicio) !== null)
  const porTipoENome = (a: T, b: T) =>
    ORDEM_TIPO[a.tipo ?? 'bateria'] - ORDEM_TIPO[b.tipo ?? 'bateria'] ||
    (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR', { sensitivity: 'base', numeric: true })
  return corridas
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (todasComHorario ? (instante(a.c.inicio) as number) - (instante(b.c.inicio) as number) : 0) || porTipoENome(a.c, b.c) || a.i - b.i)
    .map((x) => x.c)
}

/**
 * Resultado oficial de uma etapa, por categoria: cada corrida oficial (posição oficial, pontos, voltas,
 * status, penalidades, volta mais rápida) e o resultado somado da etapa. Base da sub-aba "Resultados".
 * Corridas em rascunho nunca aparecem; etapa cancelada não tem resultado. null = etapa/temporada não
 * existe ou não está visível (no modo público).
 */
export async function resultadosDaEtapa(opcoes: {
  payload: Payload
  etapa: Id
  publico?: boolean
  req?: PayloadRequest
}): Promise<ResultadosDaEtapa | null> {
  const publico = opcoes.publico === true
  const ctx: Contexto = { p: opcoes.payload as unknown as BuscaPayload, req: opcoes.req }
  const etapaDoc = await buscarUm(ctx, SLUGS.etapas, { id: { equals: opcoes.etapa } }, { ...SELECT_ETAPA, temporada: true }, !publico)
  const idTemporada = idDe(etapaDoc?.temporada)
  if (!etapaDoc || idTemporada === null) return null
  const temporada = await buscarUm(ctx, SLUGS.temporadas, { id: { equals: idTemporada } }, SELECT_TEMPORADA, !publico)
  if (!temporada) return null

  const etapa = paraEtapa(etapaDoc)
  const saida: ResultadosDaEtapa = {
    etapa: { id: etapa.id, numero: etapa.numero, nome: etapa.nome ?? null, inicio: texto(etapaDoc.inicio), status: etapa.status },
    temporada: { id: temporada.id, nome: texto(temporada.nome), ano: num(temporada.ano) },
    parcial: etapa.status !== 'realizada',
    categorias: [],
  }
  if (etapa.status === 'cancelada') return saida

  const corridas = (
    await buscar(ctx, SLUGS.corridas, { and: [{ etapa: { equals: etapa.id } }, { status: { equals: 'oficial' } }] }, SELECT_CORRIDA)
  ).map(paraCorrida)
  if (!corridas.length) return saida

  // Regra de cada categoria (a própria da classificação, senão a da temporada) e ordem do painel.
  const [classificacoes, docsInscricoes] = await emSequenciaOuParalelo(ctx, [
    () => buscar(ctx, SLUGS.temporadaCategorias, { temporada: { equals: temporada.id } }, { categoria: true, ordem: true, regra: true }),
    () => buscar(ctx, SLUGS.inscricoes, { temporada: { equals: temporada.id } }, SELECT_INSCRICAO),
  ])
  const classificacaoDa = new Map(classificacoes.map((c) => [String(idDe(c.categoria)), c] as const))
  const idsRegras = unicos([idDe(temporada.regra), ...classificacoes.map((c) => idDe(c.regra))].filter((x): x is Id => x !== null))
  const nomes = await carregarNomes(
    ctx,
    docsInscricoes.map((i) => idDe(i.piloto)).filter((x): x is Id => x !== null),
    docsInscricoes.map((i) => idDe(i.equipe)).filter((x): x is Id => x !== null),
  )
  const inscricoes = docsInscricoes.map((d) => paraInscricao(d, nomes, publico))
  const mapaIns = new Map(inscricoes.map((i) => [String(i.id), i] as const))

  // Categorias da etapa: as cadastradas nela ou, se vazias, as que aparecem nas corridas.
  const categoriasDaCorrida = (c: Corrida) =>
    c.categorias?.length
      ? c.categorias.map(String)
      : (c.resultados ?? []).map((l) => String(mapaIns.get(String(l.inscricao))?.categoria ?? '')).filter(Boolean)
  const idsCategorias = unicos(
    etapa.categorias?.length ? etapa.categorias : corridas.flatMap((c) => (c.categorias?.length ? c.categorias : categoriasDaCorrida(c))),
  )
  const [regras, categorias] = await emSequenciaOuParalelo(ctx, [
    () => (idsRegras.length ? buscar(ctx, SLUGS.regras, { id: { in: idsRegras } }, SELECT_REGRA) : Promise.resolve([])),
    () => (idsCategorias.length ? buscar(ctx, SLUGS.categorias, { id: { in: idsCategorias } }, SELECT_CATEGORIA) : Promise.resolve([])),
  ])
  const regraDoc = new Map(regras.map((r) => [String(r.id), r] as const))
  const categoriaDoc = new Map(categorias.map((c) => [String(c.id), c] as const))

  for (const categoria of idsCategorias) {
    const chave = String(categoria)
    const corridasCat = ordenarSessoes(corridas.filter((c) => categoriasDaCorrida(c).includes(chave)))
    if (!corridasCat.length) continue
    const idRegra = idDe(classificacaoDa.get(chave)?.regra) ?? idDe(temporada.regra)
    const doc = idRegra === null ? undefined : regraDoc.get(String(idRegra))
    const regra = paraRegra(doc)
    const corridasExibidas: CorridaComResultado[] = corridasCat.map((c, i) => {
      const r = calcularResultadoCorrida(c, regra, { inscricoes: mapaIns, categorias: [categoria], fatorEtapa: etapa.fatorPontuacao })
      return {
        id: c.id,
        nome: c.nome ?? null,
        tipo: c.tipo ?? 'bateria',
        inicio: typeof c.inicio === 'string' ? c.inicio : null,
        ordem: i + 1,
        conta: r.conta,
        voltaMaisRapida: r.voltaMaisRapida,
        linhas: r.linhas.map((l) => {
          const ins = mapaIns.get(String(l.inscricao))
          return { ...l, pilotoSlug: ins?.pilotoSlug ?? null, equipeNome: ins?.equipeNome ?? null }
        }),
      }
    })
    // Resultado somado da etapa: o motor com só esta etapa (tratada como realizada, sem descartes nem ajustes);
    // a ordem das linhas é a do campeonato (mesmo desempate). Warm-up é ignorado pelo motor.
    const soma = calcularClassificacao({
      regra: { ...regra, descartes: null },
      categoria,
      etapas: [{ ...etapa, status: 'realizada' }],
      corridas: corridasCat,
      inscricoes,
      ajustes: [],
      comPosicaoAnterior: false,
    })
    const cat = categoriaDoc.get(chave)
    saida.categorias.push({
      categoria,
      categoriaNome: texto(cat?.nome) ?? texto(cat?.sigla),
      categoriaSlug: texto(cat?.slug),
      corridas: corridasExibidas,
      etapa: resultadoSomadoDaEtapa(soma, etapa.id),
      semRegra: !doc,
    })
  }

  // Ordem do painel (temporada-categorias.ordem), depois pelo nome.
  const ordem = (c: ResultadoCategoriaNaEtapa) => num(classificacaoDa.get(String(c.categoria))?.ordem) ?? Number.MAX_SAFE_INTEGER
  saida.categorias.sort(
    (a, b) => ordem(a) - ordem(b) || (a.categoriaNome ?? '').localeCompare(b.categoriaNome ?? '', 'pt-BR', { sensitivity: 'base' }),
  )
  return saida
}
