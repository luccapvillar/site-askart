/**
 * Motor de classificação (docs/ARQUITETURA.md §4 e §5) — funções PURAS, sem banco e sem Payload.
 *
 * Recebe a regra de pontuação, as etapas, as corridas (com resultados), as inscrições e os ajustes de uma
 * temporada × categoria e devolve a classificação calculada. O adaptador que busca os documentos no banco
 * fica em `src/lib/carregar-competicao.ts`.
 *
 * Decisões de regra (valem para todo o site; o texto de ajuda do painel deve dizer o mesmo):
 * - Só contam etapas com status `realizada` e corridas com status `oficial`. "Conta para a classificação"
 *   desligado = a corrida não dá pontos de tabela, volta mais rápida nem participação (a tomada de tempo
 *   continua valendo para a pole).
 * - Warm-up (`warm-up`) nunca conta: não dá pontos, pole, volta mais rápida, participação nem estatísticas,
 *   seja qual for o "conta para a classificação". Só tem posições (para mostrar o resultado da sessão).
 * - Pontos de tabela = tabela da corrida × fator da etapa × fator da corrida. Pole, volta mais rápida e
 *   participação são bônus fixos (não multiplicam).
 * - Vitórias, pódios, corridas, contagem de posições e voltas mais rápidas são contados POR CORRIDA que conta
 *   (baterias, pré-final, final…), nunca na tomada de tempo. Resultados descartados continuam contando
 *   nessas estatísticas e nos desempates (o descarte só tira PONTOS).
 * - Pole = P1 (entre os pilotos da classificação) da 1ª tomada de tempo oficial da etapa que inclui a
 *   categoria. Uma tomada comum a duas categorias somadas dá uma pole só; tomadas separadas, uma cada.
 * - "Pontos manuais" de uma linha substituem os pontos daquela corrida (tabela + volta mais rápida +
 *   participação). A pole é da etapa e não é afetada.
 * - Penalidade de pontos (na linha da corrida) e ajustes (na classificação) são aplicados DEPOIS dos descartes
 *   e nunca são descartados.
 * - Penalidade de posições: quem perde N posições vai para (posição que teria) + N e os demais ocupam as
 *   vagas que sobram, na ordem. Correção manual da posição oficial (com motivo) sempre prevalece.
 * - Convidado nunca pontua nem aparece na classificação. Em `reclassificar-elegiveis` os titulares sobem
 *   (o 2º na pista, atrás de um convidado, recebe os pontos e a vitória de 1º); em `manter-posicoes` cada um
 *   fica com a sua posição e os pontos do convidado simplesmente não são dados a ninguém.
 * - Desempate: só os critérios cadastrados na regra, na ordem dela. Nada é presumido: sem critérios (ou
 *   persistindo o empate) vale a ordem alfabética, e o motor avisa o administrador quando isso decidiu algo.
 * - Pontos têm 1 casa decimal: todas as contas são feitas em DÉCIMOS inteiros (sem erro de ponto flutuante).
 *
 * Cálculo da etapa (`regra.calculoDaEtapa`, ver "cálculo pela média" mais abaixo):
 * - `media-das-corridas` — REGRA DO BKS informada pelo cliente: a categoria é só o tipo de kart; cada
 *   subcategoria é um grid próprio (warm-up, tomada de tempo, Corrida 1 e Corrida 2). A posição do piloto na
 *   etapa é a da MÉDIA das suas posições nas corridas da subcategoria (2º e 2º → 2º na etapa) e os pontos da
 *   tabela são dados por essa posição. Pole e volta mais rápida são da subcategoria, e a classificação do
 *   campeonato é separada por subcategoria (cada uma com os seus pontos e posições).
 * - `por-corrida` (antigo) — cada corrida dá pontos pela tabela; a etapa é a soma; classificação única.
 *   Regra sem o campo (gravada antes de ele existir) continua assim.
 */
import { instanteDeChave } from './datas'
import { normalizarSubcategoria } from './subcategorias'

export type Id = string | number

// ───────────────────────────── valores dos campos (iguais aos do painel) ─────────────────────────────

export type StatusEtapa = 'agendada' | 'confirmada' | 'adiada' | 'cancelada' | 'realizada'
export type StatusCorrida = 'rascunho' | 'oficial' | 'cancelada'
export type TipoCorrida = 'warm-up' | 'tomada-de-tempo' | 'classificatoria' | 'bateria' | 'pre-final' | 'final'

/** Warm-up: sessão de aquecimento, só com posições; o motor nunca a usa para pontos, pole ou estatísticas. */
export const ehWarmUp = (c: { tipo?: TipoCorrida | string | null } | null | undefined) => c?.tipo === 'warm-up'
export type StatusResultado = 'classificado' | 'nao-classificado' | 'abandono' | 'desclassificado' | 'nao-largou'
export type TipoPenalidade = 'tempo' | 'posicoes' | 'pontos' | 'advertencia'
export type CondicaoInscricao = 'titular' | 'convidado'
export type StatusInscricao = 'ativa' | 'desistente' | 'transferida' | 'excluida'
export type RequisitoParticipacao = 'presente' | 'largou' | 'classificado'
export type RegraAbandono = 'pela-posicao' | 'so-participacao' | 'zero'
export type RegraConvidados = 'reclassificar-elegiveis' | 'manter-posicoes'
export type UnidadeDescarte = 'etapa' | 'corrida'
export type CriterioDesempate = 'mais-vitorias' | 'contagem-de-posicoes' | 'melhor-resultado-ultima-etapa' | 'mais-poles'
export type TipoAjuste = 'penalidade' | 'bonificacao' | 'correcao'
/**
 * Como a etapa é pontuada: `media-das-corridas` (regra do BKS: posição na etapa pela média das posições nas
 * corridas, por subcategoria) ou `por-corrida` (antigo: pontos em cada corrida, somados).
 */
export type CalculoDaEtapa = 'media-das-corridas' | 'por-corrida'
/** Desempate de média igual no cálculo pela média (ver DECISOES_MEDIA). */
export type CriterioDesempateMedia = 'ultima-corrida' | 'classificacao'

/** Critério que separou dois pilotos empatados em pontos. */
export type CriterioAplicado = CriterioDesempate | 'ordem-alfabetica'

export const ROTULOS_CRITERIO: Record<CriterioAplicado, string> = {
  'mais-vitorias': 'Mais vitórias',
  'contagem-de-posicoes': 'Mais 1º lugares, depois 2º lugares e assim por diante',
  'melhor-resultado-ultima-etapa': 'Melhor resultado na última etapa (voltando etapa a etapa)',
  'mais-poles': 'Mais poles',
  'ordem-alfabetica': 'Ordem alfabética (empate não resolvido pelo regulamento)',
}

// ───────────────────────────── tipos de entrada ─────────────────────────────

/** Tabela de pontos da regra: `pontos[0]` = pontos do 1º, `pontos[1]` = do 2º… (posições além da lista = 0). */
export interface TabelaPontos {
  /** id da linha do array no Payload (opcional). */
  id?: Id | null
  nome?: string | null
  pontos: number[]
}

/** Descartes (grupo `descartes` de regras-pontuacao). */
export interface RegraDescartes {
  /** Quantos resultados (piores) são descartados. 0/vazio = sem descarte. */
  quantidade?: number | null
  /** Descarta etapas inteiras ou corridas avulsas. Padrão: etapa. */
  unidade?: UnidadeDescarte | null
  /**
   * Descarte só passa a valer quando a categoria tiver ESTE número de etapas realizadas (vazio = sempre).
   * Em qualquer caso só se descarta quando sobra pelo menos um resultado (unidades realizadas > quantidade).
   */
  aPartirDeEtapas?: number | null
  /** A última etapa do calendário da temporada pode ser descartada? Padrão: sim. */
  ultimaEtapaDescartavel?: boolean | null
}

/** Regra de pontuação (coleção regras-pontuacao). Campos vazios assumem REGRA_PADRAO. */
export interface Regra {
  tabelas?: TabelaPontos[] | null
  pontosPole?: number | null
  pontosVoltaRapida?: number | null
  pontosParticipacao?: number | null
  /** Quem ganha os pontos de participação em cada corrida que conta. */
  requisitoParticipacao?: RequisitoParticipacao | null
  /** `pela-posicao`: quem abandona é classificado depois dos que terminaram (por voltas) e pontua pela posição;
   *  `so-participacao`: só os pontos de participação; `zero`: nada. */
  abandono?: RegraAbandono | null
  /** % mínimo das voltas do vencedor (ou das voltas previstas) para ser classificado. 0/vazio = sem mínimo. */
  percentualMinimoVoltas?: number | null
  convidados?: RegraConvidados | null
  descartes?: RegraDescartes | null
  /**
   * Critérios de desempate do regulamento, na ordem em que são aplicados. Vazio/ausente = nenhum critério
   * (empate em pontos fica na ordem alfabética, com aviso ao administrador).
   */
  criteriosDesempate?: CriterioDesempate[] | null
  /** Como a etapa é pontuada. Vazio = `por-corrida` (regra gravada antes do campo existir). */
  calculoDaEtapa?: CalculoDaEtapa | null
}

export interface Etapa {
  id: Id
  numero: number
  nome?: string | null
  /** Data/hora de início (ISO). Usada para a ordem cronológica (etapa adiada realizada depois de outra). */
  inicio?: string | Date | null
  status: StatusEtapa
  /** Fator de pontuação da etapa (ex.: 2 = pontos em dobro). Padrão 1. */
  fatorPontuacao?: number | null
  /** Categorias que correm a etapa (vazio = todas). */
  categorias?: Id[] | null
}

export interface Penalidade {
  tipo: TipoPenalidade
  /** `tempo`: segundos somados ao tempo total; `posicoes`: quantas posições perde; `pontos`: pontos perdidos. */
  valor?: number | null
  motivo?: string | null
}

/** Uma linha de `corridas.resultados`. */
export interface LinhaResultado {
  inscricao: Id | null
  /** Posição na pista (ordem de chegada). */
  posicaoChegada?: number | null
  /** Padrão: classificado. */
  status?: StatusResultado | null
  voltas?: number | null
  /** Melhor volta em milissegundos. */
  melhorVolta?: number | null
  /** Tempo total de prova em milissegundos (necessário para aplicar penalidade de tempo automaticamente). */
  tempoTotal?: number | null
  /** Penalidade única (formato da ARQUITETURA). */
  penalidade?: Penalidade | null
  /** Várias penalidades (aceito também, somadas à `penalidade`). */
  penalidades?: Penalidade[] | null
  /** Posição oficial gravada. Só é tratada como CORREÇÃO MANUAL quando há `motivoPosicaoOficial`. */
  posicaoOficial?: number | null
  motivoPosicaoOficial?: string | null
  /** Substitui os pontos calculados desta corrida para esta inscrição. */
  pontosManuais?: number | null
  /** Marcação manual de volta mais rápida (substitui o cálculo pela menor melhor volta). */
  voltaMaisRapida?: boolean | null
  observacao?: string | null
}

export interface Corrida {
  id: Id
  etapa: Id
  /** Categorias que largam juntas nesta corrida (normalmente uma). */
  categorias?: Id[] | null
  /**
   * Subcategorias para as quais a sessão vale (vazio = todas as da categoria). No cálculo pela média, a
   * corrida só entra na média das subcategorias marcadas.
   */
  subcategorias?: string[] | null
  nome?: string | null
  tipo?: TipoCorrida | null
  /** Tabela de pontos da regra a usar (id da linha ou nome). Vazio = 1ª tabela da regra. */
  tabela?: Id | null
  /** Padrão: sim. */
  contaParaClassificacao?: boolean | null
  /** Fator da corrida (ex.: 0,5 em corrida interrompida). Padrão 1. */
  fatorPontuacao?: number | null
  inicio?: string | Date | null
  voltasPrevistas?: number | null
  status: StatusCorrida
  /** Inscrição(ões) com a volta mais rápida definida à mão (substitui o cálculo). */
  voltaMaisRapidaManual?: Id | Id[] | null
  resultados?: LinhaResultado[] | null
}

export interface Inscricao {
  id: Id
  categoria: Id
  piloto: Id
  /** Nome a exibir (nome de exibição do piloto ou nome). */
  nome: string
  pilotoSlug?: string | null
  numero?: number | string | null
  equipe?: Id | null
  equipeNome?: string | null
  /**
   * Subcategoria da inscrição (ex.: "Novatos"). No cálculo pela média é o GRID do piloto (posição e pontos
   * contados dentro dela); no cálculo por corrida só separa as tabelas do site.
   */
  subcategoria?: string | null
  /** Padrão: titular. */
  condicao?: CondicaoInscricao | null
  /** Padrão: ativa. */
  status?: StatusInscricao | null
}

/**
 * Ajuste de pontos da classificação (temporada-categorias.ajustes). Sinal: `penalidade` sempre tira,
 * `bonificacao` sempre soma, `correcao` usa o sinal digitado.
 */
export interface Ajuste {
  inscricao: Id
  /** Etapa do ajuste (opcional): só vale quando a etapa já foi realizada e aparece na coluna dela. */
  etapa?: Id | null
  tipo?: TipoAjuste | null
  pontos: number
  motivo?: string | null
}

export interface EntradaClassificacao {
  regra: Regra
  /** Categoria da classificação. */
  categoria: Id
  /** Outras categorias cujos resultados entram nesta classificação (ex.: geral que soma duas categorias). */
  incluiResultadosDe?: Id[] | null
  /** Todas as etapas da temporada (qualquer status). */
  etapas: Etapa[]
  /** Corridas da temporada (qualquer status; o motor filtra). */
  corridas: Corrida[]
  /** Inscrições da temporada (pelo menos as das categorias do grupo). */
  inscricoes: Inscricao[]
  ajustes?: Ajuste[] | null
  /** Calcula a classificação "após a etapa X" (inclusive). */
  ateEtapa?: Id | null
  /** Calcula posicaoAnterior (classificação até a etapa anterior). Padrão: sim. */
  comPosicaoAnterior?: boolean
}

// ───────────────────────────── tipos de saída ─────────────────────────────

/** Posição de um piloto numa corrida, como entrou na média da etapa (cálculo pela média). */
export interface PosicaoNaMedia {
  corrida: Id
  /** Posição usada na média (dentro da subcategoria). */
  posicao: number
  /** Contou como a última posição do grid (abandono, não largou, desclassificado ou não correu). */
  ultima: boolean
}

export interface ResultadoEtapaLinha {
  etapa: Id
  numero: number
  /** Pontos da etapa antes de penalidades/ajustes (corridas + pole). */
  pontos: number
  /**
   * Posição do piloto na etapa (entre os pilotos da classificação; no cálculo pela média, dentro da
   * subcategoria); null = sem posição oficial na etapa.
   */
  posicao: number | null
  /** Cálculo pela média: média das posições nas corridas (ex.: 2 = 2º e 2º). Ausente no cálculo por corrida. */
  media?: number | null
  /** Cálculo pela média: a posição de cada corrida que entrou na média, na ordem das corridas. */
  posicoesNaMedia?: PosicaoNaMedia[]
  /** Etapa inteira descartada. */
  descartado: boolean
  /** Pontos descartados nesta etapa (no descarte por corrida pode ser parte da etapa). */
  pontosDescartados: number
  /** Corridas descartadas (descarte por corrida). */
  corridasDescartadas: Id[]
  /** Penalidades de pontos das corridas + ajustes ligados a esta etapa (nunca descartados). */
  ajustes: number
  participou: boolean
  desclassificado: boolean
  pole: boolean
}

export interface LinhaClassificacao {
  /** Chave estável da linha (id do piloto). */
  chave: string
  posicao: number
  /** Posição na classificação até a etapa anterior (null = não havia classificação anterior ou o piloto não estava nela). */
  posicaoAnterior: number | null
  /** Inscrição principal (da categoria da classificação, quando existir). */
  inscricao: Id | null
  inscricoes: Id[]
  piloto: Id | null
  nome: string
  pilotoSlug?: string | null
  numero: number | string | null
  equipe: Id | null
  equipeNome?: string | null
  categoria: Id | null
  /**
   * Cálculo pela média: a subcategoria (grid) em que o piloto pontua — posição e pontos são DENTRO dela
   * (null = sem subcategoria). Ausente no cálculo por corrida.
   */
  subcategoria?: string | null
  pontos: number
  /** Soma das etapas antes dos descartes e ajustes. */
  pontosBrutos: number
  pontosDescartados: number
  /** Penalidades de pontos + ajustes (com sinal). */
  ajustes: number
  vitorias: number
  podios: number
  corridas: number
  poles: number
  voltasRapidas: number
  /** Etapas em que o piloto correu. */
  etapas: number
  porEtapa: ResultadoEtapaLinha[]
  /** Critério que o separou do piloto de cima, quando empatados em pontos. */
  desempate: CriterioAplicado | null
  /** Linha digitada no modo manual. */
  manual?: boolean
  observacao?: string | null
}

export interface EmpateResolvido {
  pontos: number
  posicoes: number[]
  /** Para cada par (posição i, i+1) do grupo, o critério que decidiu. */
  resolvidoPor: CriterioAplicado[]
  /** Cálculo pela média: subcategoria do empate (null = sem subcategoria). */
  subcategoria?: string | null
}

export interface CriteriosAplicados {
  desempate: CriterioDesempate[]
  descartes: {
    unidade: UnidadeDescarte
    quantidade: number
    aPartirDeEtapas: number
    ultimaEtapaDescartavel: boolean
    /** Já está valendo nesta classificação? */
    aplicado: boolean
  } | null
  convidados: RegraConvidados
  abandono: RegraAbandono
  requisitoParticipacao: RequisitoParticipacao
  percentualMinimoVoltas: number
  empates: EmpateResolvido[]
  /** Como a etapa foi pontuada (ausente em fotografias gravadas antes do campo existir = por corrida). */
  calculoDaEtapa?: CalculoDaEtapa
}

export interface ResultadoClassificacao {
  /** No cálculo pela média: agrupadas por subcategoria e, dentro de cada uma, na ordem da classificação. */
  linhas: LinhaClassificacao[]
  /** true = pontos e posições contados por subcategoria (cálculo pela média): `posicao` é dentro dela. */
  porSubcategoria: boolean
  criterios: CriteriosAplicados
  /** Etapas realizadas que contam para esta categoria (até `ateEtapa`, se informado). */
  etapasRealizadas: number
  /** Etapas consideradas, em ordem cronológica. */
  etapas: { id: Id; numero: number; nome: string | null }[]
  /** Avisos para o administrador (dados incompletos ou inconsistentes). */
  avisos: string[]
}

// ───────────────────────────── padrões e utilitários ─────────────────────────────

/**
 * Valores usados quando o campo da regra está vazio (o painel exige abandono e convidados; o requisito de
 * participação só aparece quando há pontos de participação). Não são regras da ASKART: são o comportamento
 * neutro do sistema para dados incompletos.
 */
export const REGRA_PADRAO = {
  requisitoParticipacao: 'largou' as RequisitoParticipacao,
  abandono: 'so-participacao' as RegraAbandono,
  convidados: 'reclassificar-elegiveis' as RegraConvidados,
  unidadeDescarte: 'etapa' as UnidadeDescarte,
  /**
   * Regra gravada antes do campo existir (vazio) continua como era. As regras novas nascem com
   * `media-das-corridas` (padrão do painel) e as existentes são atualizadas por scripts/atualizacoes.ts.
   */
  calculoDaEtapa: 'por-corrida' as CalculoDaEtapa,
}

/**
 * Cálculo pela média — decisões que o cliente NÃO informou (definidas pelo integrador; para mudar, é aqui).
 * O que o cliente informou: cada subcategoria é um grid; a posição na etapa é a média das posições nas
 * corridas (2º e 2º → 2º na etapa); pontos e classificação são separados por subcategoria.
 */
export const DECISOES_MEDIA = {
  /**
   * Média igual: desempata, nesta ordem, a melhor posição na ÚLTIMA corrida da etapa (a Corrida 2) e a melhor
   * posição na classificação (tomada de tempo) da subcategoria. Persistindo, fica o EMPATE: mesma posição
   * na etapa e mesmos pontos (o seguinte pula: 2º, 2º, 4º).
   */
  desempate: ['ultima-corrida', 'classificacao'] as CriterioDesempateMedia[],
  /** Situações numa corrida que contam como a ÚLTIMA posição do grid (não correr a corrida também conta). */
  contamComoUltima: ['abandono', 'nao-classificado', 'desclassificado', 'nao-largou'] as StatusResultado[],
  /**
   * Qual é a "última posição do grid" da subcategoria naquela corrida:
   * - `pilotos-da-etapa` (padrão): nº de pilotos do grid da subcategoria na etapa, isto é, os que constam no
   *   resultado de alguma corrida dela. Quando todos constam na corrida (o normal, com abandono e "não largou"
   *   lançados), é o nº de pilotos da corrida; e quem nem aparece numa corrida (só correu a outra) fica atrás
   *   de todos os que terminaram, sem empatar com o último que terminou;
   * - `pilotos-da-corrida`: só os pilotos da subcategoria que constam no resultado daquela corrida.
   */
  ultimaPosicao: 'pilotos-da-etapa' as 'pilotos-da-etapa' | 'pilotos-da-corrida',
}

/** Rótulos do cálculo da etapa (painel e site). */
export const ROTULOS_CALCULO_DA_ETAPA: Record<CalculoDaEtapa, string> = {
  'media-das-corridas': 'Média das posições nas corridas, por subcategoria (regra do BKS)',
  'por-corrida': 'Pontos em cada corrida (antigo)',
}

const k = (id: Id | null | undefined): string => (id === null || id === undefined ? '' : String(id))

const numeroOu = (v: unknown, padrao: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : padrao

/** Converte pontos em décimos inteiros, arredondando meio para longe de zero (sem ruído de ponto flutuante). */
export function paraDecimos(pontos: number): number {
  if (!Number.isFinite(pontos)) return 0
  const x = Number((Math.abs(pontos) * 10).toFixed(6))
  return Math.sign(pontos) * Math.round(x)
}

export const deDecimos = (decimos: number): number => decimos / 10

/** Arredonda para 1 casa decimal. */
export const arredondar1 = (pontos: number): number => deDecimos(paraDecimos(pontos))

const tempo = (v: string | Date | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null
  const t = v instanceof Date ? v.getTime() : new Date(v).getTime()
  return Number.isFinite(t) ? t : null
}

/** Sem acento, minúsculo e sem espaços extras (para achar a tabela pelo nome). */
const normalizarNome = (t: string) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

const comparaNome = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true })

/**
 * Ordem cronológica das etapas: por data de início quando todas têm data; senão pelo número.
 * (Uma etapa adiada e realizada depois de outra entra na ordem real em que aconteceu.)
 */
export function ordenarEtapas<T extends Pick<Etapa, 'numero' | 'inicio'>>(etapas: T[]): T[] {
  const todasComData = etapas.every((e) => tempo(e.inicio) !== null)
  return [...etapas].sort((a, b) => {
    if (todasComData) {
      const d = (tempo(a.inicio) as number) - (tempo(b.inicio) as number)
      if (d !== 0) return d
    }
    return a.numero - b.numero
  })
}

const ORDEM_TIPO: Record<TipoCorrida, number> = {
  'warm-up': 0,
  'tomada-de-tempo': 1,
  classificatoria: 2,
  bateria: 3,
  'pre-final': 4,
  final: 5,
}

/**
 * Sessões de uma etapa em ordem: pelo horário quando todas têm horário; senão pelo tipo (warm-up, tomada de
 * tempo, classificatória, bateria, pré-final, final) e pelo nome ("Corrida 2" antes de "Corrida 10").
 */
export function ordenarSessoes<T extends Pick<Corrida, 'inicio' | 'tipo' | 'nome'>>(corridas: T[]): T[] {
  const todasComHorario = corridas.every((c) => tempo(c.inicio) !== null)
  const porTipoENome = (a: T, b: T) =>
    ORDEM_TIPO[a.tipo ?? 'bateria'] - ORDEM_TIPO[b.tipo ?? 'bateria'] ||
    (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR', { sensitivity: 'base', numeric: true })
  return corridas
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (todasComHorario ? (tempo(a.c.inicio) as number) - (tempo(b.c.inicio) as number) : 0) || porTipoENome(a.c, b.c) || a.i - b.i)
    .map((x) => x.c)
}

function ordenarCorridas(corridas: Corrida[]): Corrida[] {
  const todasComData = corridas.every((c) => tempo(c.inicio) !== null)
  if (!todasComData) return corridas
  return corridas
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (tempo(a.c.inicio) as number) - (tempo(b.c.inicio) as number) || a.i - b.i)
    .map((x) => x.c)
}

function tabelaDaCorrida(regra: Regra, corrida: Corrida, avisos: string[]): number[] {
  const tabelas = regra.tabelas ?? []
  if (!tabelas.length) return []
  const ref = corrida.tabela
  if (ref === null || ref === undefined || ref === '') return tabelas[0].pontos ?? []
  const alvo = normalizarNome(k(ref))
  const t = tabelas.find((x) => k(x.id) === k(ref) || normalizarNome(x.nome ?? '') === alvo)
  if (!t) {
    avisos.push(`A corrida "${corrida.nome ?? corrida.id}" usa a tabela "${ref}", que não existe na regra: ela ficou sem pontos de tabela.`)
    return []
  }
  return t.pontos ?? []
}

function fator(v: number | null | undefined, onde: string, avisos: string[]): number {
  if (v === null || v === undefined) return 1
  if (!Number.isFinite(v) || v < 0) {
    avisos.push(`Fator de pontuação inválido em ${onde}: foi usado 1.`)
    return 1
  }
  return v
}

function penalidadesDa(linha: LinhaResultado): Penalidade[] {
  const lista: Penalidade[] = []
  if (linha.penalidade?.tipo) lista.push(linha.penalidade)
  for (const p of linha.penalidades ?? []) if (p?.tipo) lista.push(p)
  return lista
}

const somaPenalidade = (linha: LinhaResultado, tipo: TipoPenalidade) =>
  penalidadesDa(linha)
    .filter((p) => p.tipo === tipo)
    .reduce((s, p) => s + Math.abs(numeroOu(p.valor, 0)), 0)

const idsDe = (v: Id | Id[] | null | undefined): string[] =>
  v === null || v === undefined ? [] : (Array.isArray(v) ? v : [v]).map(k).filter(Boolean)

// ───────────────────────────── resultado de uma corrida ─────────────────────────────

export interface OpcoesResultadoCorrida {
  /** Inscrições (para saber categoria, piloto e se é convidado). */
  inscricoes?: Inscricao[] | Map<string, Inscricao> | null
  /** Grupo de categorias da classificação: a posição que pontua é a posição DENTRO do grupo. Vazio = todas. */
  categorias?: Id[] | null
  /** Fator de pontuação da etapa. */
  fatorEtapa?: number | null
}

export interface LinhaResultadoCalculada {
  /** Índice da linha na lista original de resultados. */
  indice: number
  inscricao: Id | null
  piloto: Id | null
  nome: string | null
  numero: number | string | null
  categoria: Id | null
  convidado: boolean
  statusInformado: StatusResultado
  /** Status depois das regras (ex.: classificado com poucas voltas vira `nao-classificado`). */
  status: StatusResultado
  posicaoChegada: number | null
  /** Voltas completadas (como lançado; null = não informado). */
  voltas: number | null
  /** Melhor volta em milissegundos (como lançada; null = não informada). */
  melhorVolta: number | null
  /** Posição oficial geral da corrida (todas as categorias), depois de penalidades. */
  posicaoOficial: number | null
  /** A posição oficial veio de correção manual (com motivo). */
  posicaoOficialManual: boolean
  /** Posição entre as categorias do grupo. */
  posicaoCategoria: number | null
  /** Posição usada para pontos, vitórias e pódios (sem convidados, conforme a regra). */
  posicaoParaPontos: number | null
  pontosTabela: number
  pontosVoltaRapida: number
  pontosParticipacao: number
  /** Soma calculada (tabela + volta mais rápida + participação). */
  pontosCalculados: number
  pontosManuais: number | null
  /** Pontos que valem (manuais, quando houver; 0 para convidado e desclassificado). */
  pontos: number
  /** Pontos perdidos por penalidade (valor negativo), descontados depois dos descartes. */
  penalidadePontos: number
  voltaMaisRapida: boolean
  largou: boolean
  desclassificado: boolean
  penalidades: Penalidade[]
}

export interface ResultadoCorrida {
  corrida: Id
  conta: boolean
  linhas: LinhaResultadoCalculada[]
  /** Inscrição com a volta mais rápida no grupo (null = ninguém). */
  voltaMaisRapida: Id | null
  /** Voltas de referência para o percentual mínimo. */
  voltasReferencia: number | null
  avisos: string[]
}

const ORDEM_STATUS: Record<StatusResultado, number> = {
  classificado: 0,
  abandono: 1,
  'nao-classificado': 2,
  desclassificado: 3,
  'nao-largou': 4,
}

/**
 * Calcula posições oficiais e pontos de UMA corrida. Usado pelo motor e pela tela "Lançar resultados"
 * (prévia), e pode ser usado no hook da corrida para gravar `posicaoOficial`.
 *
 * Ordem oficial: classificados pela chegada (penalidade de tempo reordena quando há tempo total de todos),
 * depois quem abandonou com o mínimo de voltas (pela chegada, senão por mais voltas); quem perde N posições
 * vai para (posição que teria) + N; correções manuais (com motivo) ficam fixas na posição digitada.
 * Desclassificado, não largou e não classificado (abaixo do mínimo de voltas) ficam sem posição, e os de
 * trás sobem.
 *
 * A posição oficial é GERAL (todas as categorias que largaram juntas); `posicaoCategoria` e
 * `posicaoParaPontos` são calculadas dentro do grupo `opcoes.categorias`.
 * Abandono só pontua pela posição (e conta vitória/pódio) quando a regra é `pela-posicao`.
 */
export function calcularResultadoCorrida(
  corrida: Corrida,
  regra: Regra,
  opcoes: OpcoesResultadoCorrida = {},
): ResultadoCorrida {
  const avisos: string[] = []
  const nomeCorrida = corrida.nome ?? String(corrida.id)
  const mapaIns =
    opcoes.inscricoes instanceof Map
      ? opcoes.inscricoes
      : new Map((opcoes.inscricoes ?? []).map((i) => [k(i.id), i] as const))
  const grupo = opcoes.categorias?.length ? new Set(opcoes.categorias.map(k)) : null
  const abandono = regra.abandono ?? REGRA_PADRAO.abandono
  const convidados = regra.convidados ?? REGRA_PADRAO.convidados
  const requisito = regra.requisitoParticipacao ?? REGRA_PADRAO.requisitoParticipacao
  const pct = Math.max(0, numeroOu(regra.percentualMinimoVoltas, 0))
  const tipo = corrida.tipo ?? 'bateria'
  const ehTomada = tipo === 'tomada-de-tempo'
  // Warm-up nunca conta (nem com a caixa marcada): só posições.
  const conta = corrida.contaParaClassificacao !== false && tipo !== 'warm-up'

  // 1) Normaliza as linhas (descarta sem inscrição e duplicadas).
  type Interna = {
    linha: LinhaResultado
    indice: number
    ins: Inscricao | undefined
    status: StatusResultado
    statusInformado: StatusResultado
    posicionado: boolean
    posicaoOficial: number | null
    manual: boolean
  }
  const vistas = new Set<string>()
  const internas: Interna[] = []
  ;(corrida.resultados ?? []).forEach((linha, indice) => {
    const chave = k(linha?.inscricao)
    if (!chave) {
      avisos.push(`${nomeCorrida}: linha ${indice + 1} sem piloto/inscrição foi ignorada.`)
      return
    }
    if (vistas.has(chave)) {
      avisos.push(`${nomeCorrida}: a mesma inscrição aparece mais de uma vez; só a primeira linha foi considerada.`)
      return
    }
    vistas.add(chave)
    const statusInformado = linha.status ?? 'classificado'
    internas.push({
      linha,
      indice,
      ins: mapaIns.get(chave),
      status: statusInformado,
      statusInformado,
      posicionado: false,
      posicaoOficial: null,
      manual: false,
    })
  })

  // 2) Percentual mínimo de voltas (referência: voltas do vencedor = maior nº de voltas entre os classificados).
  const voltasClassificados = internas
    .filter((x) => x.status === 'classificado' && typeof x.linha.voltas === 'number')
    .map((x) => x.linha.voltas as number)
  const voltasReferencia = voltasClassificados.length
    ? Math.max(...voltasClassificados)
    : typeof corrida.voltasPrevistas === 'number'
      ? corrida.voltasPrevistas
      : null
  const atingeMinimo = (x: Interna) =>
    !pct || voltasReferencia === null || typeof x.linha.voltas !== 'number'
      ? true
      : x.linha.voltas * 100 >= voltasReferencia * pct

  // Classificado com menos voltas que o mínimo vira "não classificado". Abandono recebe posição oficial
  // (depois de quem terminou) se tiver o mínimo de voltas; se ele pontua pela posição depende da regra.
  for (const x of internas) {
    if (x.status === 'classificado' && !atingeMinimo(x)) x.status = 'nao-classificado'
    if (x.status === 'classificado' || (x.status === 'abandono' && atingeMinimo(x))) x.posicionado = true
  }
  /** Pontua pela posição (tabela, vitória, pódio, volta mais rápida, requisito "classificado"). */
  const pontuaPelaPosicao = (x: Interna) =>
    x.posicaoOficial !== null && (x.status === 'classificado' || (x.status === 'abandono' && abandono === 'pela-posicao'))

  // 3) Correções manuais da posição oficial (precisam de motivo). DSQ e "não largou" nunca têm posição.
  for (const x of internas) {
    const motivo = (x.linha.motivoPosicaoOficial ?? '').trim()
    if (!motivo || typeof x.linha.posicaoOficial !== 'number' || x.linha.posicaoOficial < 1) continue
    if (x.status === 'desclassificado' || x.status === 'nao-largou') {
      avisos.push(`${nomeCorrida}: posição oficial manual ignorada para piloto desclassificado ou que não largou.`)
      continue
    }
    x.manual = true
    x.posicionado = true
  }

  // 4) Ordem automática dos posicionados.
  const porChegada = (a: Interna, b: Interna) =>
    (a.linha.posicaoChegada ?? Infinity) - (b.linha.posicaoChegada ?? Infinity) ||
    (b.linha.voltas ?? -1) - (a.linha.voltas ?? -1) ||
    a.indice - b.indice
  const automaticos = internas.filter((x) => x.posicionado && !x.manual)
  let classificados = automaticos.filter((x) => x.status === 'classificado').sort(porChegada)
  const abandonos = automaticos.filter((x) => x.status !== 'classificado').sort(porChegada)

  if (classificados.some((x) => x.linha.posicaoChegada == null)) {
    avisos.push(`${nomeCorrida}: há classificados sem posição de chegada; eles foram colocados no fim, por número de voltas.`)
  }

  // Penalidade de tempo: reordena pelo tempo total + penalidade, entre pilotos com o mesmo número de voltas.
  const comTempo = classificados.filter((x) => somaPenalidade(x.linha, 'tempo') > 0)
  if (comTempo.length) {
    if (classificados.every((x) => typeof x.linha.tempoTotal === 'number')) {
      const ajustado = (x: Interna) => (x.linha.tempoTotal as number) + somaPenalidade(x.linha, 'tempo') * 1000
      classificados = [...classificados].sort(
        (a, b) => (b.linha.voltas ?? 0) - (a.linha.voltas ?? 0) || ajustado(a) - ajustado(b) || porChegada(a, b),
      )
    } else {
      avisos.push(
        `${nomeCorrida}: há penalidade de tempo, mas falta o tempo total de algum classificado. A ordem de chegada foi mantida — informe os tempos ou corrija a posição oficial (com motivo).`,
      )
    }
  }

  // 5) Encaixe nas posições oficiais (1..total):
  //    a) correções manuais (com motivo) ficam na posição digitada;
  //    b) quem perdeu N posições vai para (posição que teria sem a penalidade) + N;
  //    c) os demais ocupam as vagas que sobraram, na ordem automática.
  //    Ex.: chegada A, B, C, D e A perde 2 → B, C, A, D. A e B perdendo 1 cada → C, A, B.
  const ordemBase = [...classificados, ...abandonos]
  const manuais = internas
    .filter((x) => x.manual)
    .sort((a, b) => (a.linha.posicaoOficial as number) - (b.linha.posicaoOficial as number) || a.indice - b.indice)
  const total = ordemBase.length + manuais.length

  /** Põe `x` na vaga `alvo`; ocupada → próxima livre para trás; sem nenhuma atrás → última livre. */
  const ocupar = (vagas: (Interna | null)[], x: Interna, alvo: number) => {
    let p = Math.min(Math.max(1, Math.trunc(alvo)), vagas.length) - 1
    while (p < vagas.length && vagas[p]) p++
    if (p >= vagas.length) p = vagas.lastIndexOf(null)
    vagas[p] = x
  }
  const montarVagas = (penalizados: [Interna, number][], avisar: boolean) => {
    const vagas: (Interna | null)[] = Array.from({ length: total }, () => null)
    for (const x of manuais) {
      const alvo = Math.min(Math.max(1, Math.trunc(x.linha.posicaoOficial as number)), total)
      if (avisar && vagas[alvo - 1]) {
        avisos.push(`${nomeCorrida}: duas correções manuais para a posição ${alvo}; uma foi movida para a próxima posição livre.`)
      }
      ocupar(vagas, x, alvo)
    }
    for (const [x, alvo] of penalizados) ocupar(vagas, x, alvo)
    const fixos = new Set(penalizados.map(([x]) => x))
    let cursor = 0
    for (const x of ordemBase) {
      if (fixos.has(x)) continue
      while (vagas[cursor]) cursor++
      vagas[cursor] = x
    }
    return vagas
  }

  // Posição que cada um teria sem penalidade de posições.
  const posicaoBase = new Map<Interna, number>()
  montarVagas([], true).forEach((x, i) => {
    if (x) posicaoBase.set(x, i + 1)
  })
  const penalizados = ordemBase
    .map((x) => [x, Math.trunc(somaPenalidade(x.linha, 'posicoes'))] as const)
    .filter(([, n]) => n > 0)
    .map(([x, n]) => [x, (posicaoBase.get(x) as number) + n] as [Interna, number])
    .sort((a, b) => a[1] - b[1] || (posicaoBase.get(a[0]) as number) - (posicaoBase.get(b[0]) as number))
  if (penalizados.length) {
    montarVagas(penalizados, false).forEach((x, i) => {
      if (x) x.posicaoOficial = i + 1
    })
  } else {
    for (const [x, p] of posicaoBase) x.posicaoOficial = p
  }

  // 6) Grupo (categorias da classificação), convidados e posição para pontos.
  const noGrupo = internas.filter((x) => !grupo || (x.ins && grupo.has(k(x.ins.categoria))))
  const ehConvidado = (x: Interna) => x.ins?.condicao === 'convidado'
  const posicionadosGrupo = noGrupo.filter((x) => x.posicaoOficial !== null).sort((a, b) => (a.posicaoOficial as number) - (b.posicaoOficial as number))
  const posCategoria = new Map<Interna, number>()
  posicionadosGrupo.forEach((x, i) => posCategoria.set(x, i + 1))
  // Posição para pontos: a ordem oficial do grupo, pulando os convidados (reclassificar) ou não (manter).
  const posPontos = new Map<Interna, number>()
  if (convidados === 'reclassificar-elegiveis') {
    posicionadosGrupo.filter((x) => !ehConvidado(x)).forEach((x, i) => pontuaPelaPosicao(x) && posPontos.set(x, i + 1))
  } else {
    posicionadosGrupo.filter((x) => !ehConvidado(x) && pontuaPelaPosicao(x)).forEach((x) => posPontos.set(x, posCategoria.get(x) as number))
  }

  // 7) Volta mais rápida (só em corrida que conta e não é tomada de tempo), entre os posicionados do grupo.
  let vmr: Interna | null = null
  const daVoltaRapida = conta && !ehTomada
  if (daVoltaRapida) {
    const marcadas = new Set(idsDe(corrida.voltaMaisRapidaManual))
    const manuaisVmr = noGrupo.filter((x) => x.linha.voltaMaisRapida === true || marcadas.has(k(x.linha.inscricao)))
    const elegiveis = manuaisVmr.filter((x) => !ehConvidado(x) && x.statusInformado !== 'desclassificado')
    if (elegiveis.length) {
      vmr = elegiveis.sort((a, b) => (a.posicaoOficial ?? Infinity) - (b.posicaoOficial ?? Infinity) || a.indice - b.indice)[0]
    } else {
      const candidatos = (soElegiveis: boolean) =>
        posicionadosGrupo
          .filter(pontuaPelaPosicao)
          .filter((x) => typeof x.linha.melhorVolta === 'number' && (x.linha.melhorVolta as number) > 0)
          .filter((x) => !soElegiveis || !ehConvidado(x))
          .sort((a, b) => (a.linha.melhorVolta as number) - (b.linha.melhorVolta as number) || (a.posicaoOficial as number) - (b.posicaoOficial as number))
      // Marcação manual para um convidado do grupo vale como se ele tivesse feito a volta.
      const convidadoMarcado = manuaisVmr.some((x) => ehConvidado(x))
      const melhor = convidadoMarcado ? manuaisVmr.find(ehConvidado) ?? null : candidatos(false)[0] ?? null
      if (melhor && !ehConvidado(melhor)) vmr = melhor
      else if (melhor && convidados === 'reclassificar-elegiveis') vmr = candidatos(true)[0] ?? null
    }
  }

  // 8) Pontos.
  const tabela = conta ? tabelaDaCorrida(regra, corrida, avisos) : []
  const fatorTotal = fator(opcoes.fatorEtapa, 'etapa', avisos) * fator(corrida.fatorPontuacao, nomeCorrida, avisos)
  const pVmr = paraDecimos(numeroOu(regra.pontosVoltaRapida, 0))
  const pPart = paraDecimos(numeroOu(regra.pontosParticipacao, 0))

  const linhas: LinhaResultadoCalculada[] = noGrupo.map((x) => {
    const convidado = ehConvidado(x)
    const desclassificado = x.status === 'desclassificado'
    const largou = x.status !== 'nao-largou'
    const posicaoParaPontos = posPontos.get(x) ?? null
    let tab = 0
    let vr = 0
    let part = 0
    if (conta && !convidado && !desclassificado) {
      if (posicaoParaPontos !== null) tab = paraDecimos(numeroOu(tabela[posicaoParaPontos - 1], 0) * fatorTotal)
      if (vmr === x) vr = pVmr
      if (!ehTomada && pPart) {
        const ok = requisito === 'presente' ? true : requisito === 'largou' ? largou : pontuaPelaPosicao(x)
        const zeradoPorAbandono = x.status === 'abandono' && abandono === 'zero'
        if (ok && !zeradoPorAbandono) part = pPart
      }
    }
    const calculados = tab + vr + part
    const manuais = typeof x.linha.pontosManuais === 'number' && Number.isFinite(x.linha.pontosManuais) ? paraDecimos(x.linha.pontosManuais) : null
    const valem = !conta || convidado ? 0 : manuais ?? calculados
    const penal = convidado ? 0 : -paraDecimos(somaPenalidade(x.linha, 'pontos'))
    return {
      indice: x.indice,
      inscricao: x.linha.inscricao,
      piloto: x.ins?.piloto ?? null,
      nome: x.ins?.nome ?? null,
      numero: x.ins?.numero ?? null,
      categoria: x.ins?.categoria ?? null,
      convidado,
      statusInformado: x.statusInformado,
      status: x.status,
      posicaoChegada: x.linha.posicaoChegada ?? null,
      voltas: typeof x.linha.voltas === 'number' && Number.isFinite(x.linha.voltas) ? x.linha.voltas : null,
      melhorVolta: typeof x.linha.melhorVolta === 'number' && x.linha.melhorVolta > 0 ? x.linha.melhorVolta : null,
      posicaoOficial: x.posicaoOficial,
      posicaoOficialManual: x.manual,
      posicaoCategoria: posCategoria.get(x) ?? null,
      posicaoParaPontos,
      pontosTabela: deDecimos(tab),
      pontosVoltaRapida: deDecimos(vr),
      pontosParticipacao: deDecimos(part),
      pontosCalculados: deDecimos(calculados),
      pontosManuais: manuais === null ? null : deDecimos(manuais),
      pontos: deDecimos(valem),
      penalidadePontos: deDecimos(penal) || 0,
      voltaMaisRapida: vmr === x,
      largou,
      desclassificado,
      penalidades: penalidadesDa(x.linha),
    }
  })

  linhas.sort(
    (a, b) =>
      (a.posicaoOficial ?? Infinity) - (b.posicaoOficial ?? Infinity) ||
      ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] ||
      (a.posicaoChegada ?? Infinity) - (b.posicaoChegada ?? Infinity) ||
      a.indice - b.indice,
  )

  return {
    corrida: corrida.id,
    conta,
    linhas,
    voltaMaisRapida: vmr?.linha.inscricao ?? null,
    voltasReferencia,
    avisos,
  }
}

// ───────────────────────────── classificação da temporada × categoria ─────────────────────────────

type EtapaAcum = {
  pontos: number // décimos: corridas + pole (antes de penalidades)
  extras: number // décimos não descartáveis no descarte por corrida (pole e tabela da tomada)
  corridas: Map<string, number> // corrida (que conta) → décimos
  penalidades: number
  ajustes: number
  dsq: boolean
  dsqCorridas: Set<string>
  participou: boolean
  temPosicao: boolean
  posicoes: Map<string, number | null> // corrida que conta → posição para pontos
  pole: boolean
  media: number | null // cálculo pela média: média das posições nas corridas
  posicoesNaMedia: PosicaoNaMedia[] | null // cálculo pela média: posição de cada corrida
}

type PilotoAcum = {
  chave: string
  principal: Inscricao
  inscricoes: Inscricao[]
  etapas: Map<string, EtapaAcum>
  vitorias: number
  podios: number
  corridas: number
  poles: number
  voltasRapidas: number
  contagem: number[]
  ajustesGerais: number
}

const novaEtapaAcum = (): EtapaAcum => ({
  pontos: 0,
  extras: 0,
  corridas: new Map(),
  penalidades: 0,
  ajustes: 0,
  dsq: false,
  dsqCorridas: new Set(),
  participou: false,
  temPosicao: false,
  posicoes: new Map(),
  pole: false,
  media: null,
  posicoesNaMedia: null,
})

const sinalAjuste = (a: Ajuste): number => {
  const v = numeroOu(a.pontos, 0)
  if (a.tipo === 'penalidade') return -Math.abs(v)
  if (a.tipo === 'bonificacao') return Math.abs(v)
  return v
}

/** Etapas da temporada relevantes para o grupo (pela lista de categorias da etapa; vazia = todas). */
const etapaDoGrupo = (e: Etapa, grupo: Set<string>) => !e.categorias?.length || e.categorias.some((c) => grupo.has(k(c)))

/** Categorias de uma corrida: as informadas nela ou, se vazias, as das inscrições dos resultados. */
const categoriasDaCorrida = (c: Corrida, mapaIns: Map<string, Inscricao>): Set<string> =>
  new Set(
    c.categorias?.length
      ? c.categorias.map(k)
      : (c.resultados ?? []).map((l) => k(mapaIns.get(k(l?.inscricao))?.categoria)).filter(Boolean),
  )

const corridaDoGrupo = (c: Corrida, grupo: Set<string>, mapaIns: Map<string, Inscricao>) =>
  [...categoriasDaCorrida(c, mapaIns)].some((x) => grupo.has(x))

// ───────────────────────────── cálculo pela média (regra do BKS) ─────────────────────────────

/** Chave do grid de uma subcategoria: o nome normalizado ("junior" = "Junior"); '' = sem subcategoria. */
export const chaveDoGrid = (subcategoria: string | null | undefined): string =>
  typeof subcategoria === 'string' ? normalizarSubcategoria(subcategoria) : ''

/**
 * A corrida vale para o grid? Corrida sem subcategorias marcadas vale para todas; marcada, só para as
 * marcadas. Quem não tem subcategoria vale em qualquer corrida em que aparece.
 */
const corridaValeParaGrid = (c: Corrida, grid: string): boolean => {
  const marcadas = (c.subcategorias ?? []).map(chaveDoGrid).filter(Boolean)
  return !marcadas.length || grid === '' || marcadas.includes(grid)
}

/** Piloto de um grid numa etapa. `piloto` null = convidado (só ocupa posição quando a regra é "manter posições"). */
type Competidor = { chave: string; nome: string; piloto: PilotoAcum | null; grid: string; nomeGrid: string | null }

interface EntradaMedia {
  etapa: Etapa
  /** Corridas oficiais da etapa, do grupo, sem warm-up. */
  corridas: Corrida[]
  regra: Regra
  mapaIns: Map<string, Inscricao>
  grupo: Set<string>
  pilotoDaInscricao: (id: Id | null | undefined) => PilotoAcum | null
  acumEtapa: (p: PilotoAcum, etapaId: string) => EtapaAcum
  /** Nome exibido de cada grid (o primeiro encontrado), preenchido aqui. */
  nomesGrid: Map<string, string>
  /** null = não avisa (cálculo da posição anterior). */
  avisos: string[] | null
}

const comparaNumero = (a: number, b: number) => (a === b ? 0 : a < b ? -1 : 1)

/**
 * Pontua UMA etapa pelo cálculo da média (regra do BKS). Para cada grid (subcategoria; sem subcategoria =
 * um grid só):
 * 1. corridas do grid = as que contam (nunca warm-up nem tomada de tempo) marcadas para a subcategoria (ou
 *    sem marcação) e em que algum piloto dela aparece;
 * 2. posição em cada corrida = posição oficial RELATIVA dentro da subcategoria (penalidades de tempo e de
 *    posições já aplicadas); abandono, não classificado, desclassificado, não largou e não correr contam
 *    como a última posição do grid (DECISOES_MEDIA);
 * 3. média das posições → ordem (desempates de DECISOES_MEDIA) → posição na etapa → pontos da tabela por essa
 *    posição × fator da etapa;
 * 4. bônus por subcategoria: pole (1º da tomada de tempo da subcategoria) e volta mais rápida da subcategoria
 *    em cada corrida; pontos de participação por corrida, como no cálculo por corrida.
 * Convidados: em "reclassificar" ficam de fora (os titulares sobem); em "manter posições" ocupam a posição.
 * Devolve a posição de cada piloto na etapa (dentro do grid dele) e as corridas que contaram.
 */
function pontuarEtapaPelaMedia(entrada: EntradaMedia): { posicoes: Map<string, number>; contadas: Corrida[] } {
  const { etapa, regra, mapaIns, grupo, avisos } = entrada
  const idEtapa = k(etapa.id)
  const nomeEtapa = etapa.nome?.trim() || `Etapa ${etapa.numero}`
  const avisosLocais: string[] = []
  const avisar = (texto: string) => avisos?.push(texto)
  const manter = (regra.convidados ?? REGRA_PADRAO.convidados) === 'manter-posicoes'
  const ehTomada = (c: Corrida) => (c.tipo ?? 'bateria') === 'tomada-de-tempo'

  // Resultado de cada corrida (posição oficial com penalidades de tempo e de posições já aplicadas).
  const resultados = new Map<Corrida, ResultadoCorrida>()
  for (const c of entrada.corridas) {
    const r = calcularResultadoCorrida(c, regra, { inscricoes: mapaIns, categorias: [...grupo], fatorEtapa: etapa.fatorPontuacao })
    if (avisos) avisos.push(...r.avisos)
    resultados.set(c, r)
  }
  const resultadoDa = (c: Corrida) => resultados.get(c) as ResultadoCorrida
  const contadas = ordenarSessoes(entrada.corridas.filter((c) => resultadoDa(c).conta && !ehTomada(c)))
  const tomadas = ordenarSessoes(entrada.corridas.filter(ehTomada))

  // Participação e penalidades de pontos: como no cálculo por corrida (todas as sessões da etapa).
  for (const c of entrada.corridas) {
    for (const l of resultadoDa(c).linhas) {
      const p = entrada.pilotoDaInscricao(l.inscricao)
      if (!p) continue
      const e = entrada.acumEtapa(p, idEtapa)
      e.participou = true
      e.penalidades += paraDecimos(l.penalidadePontos)
    }
  }

  const competidorDa = (l: LinhaResultadoCalculada): Competidor | null => {
    const ins = mapaIns.get(k(l.inscricao))
    if (!ins) return null
    if (l.convidado) {
      if (!manter || ins.status === 'excluida') return null
      const sub = ins.subcategoria?.trim() || null
      return { chave: `convidado:${k(ins.id)}`, nome: ins.nome, piloto: null, grid: chaveDoGrid(sub), nomeGrid: sub }
    }
    const p = entrada.pilotoDaInscricao(l.inscricao)
    if (!p) return null
    const sub = p.principal.subcategoria?.trim() || null
    return { chave: p.chave, nome: p.principal.nome, piloto: p, grid: chaveDoGrid(sub), nomeGrid: sub }
  }

  // Linhas de cada sessão, só de quem tem a sessão valendo para o seu grid (um piloto conta uma vez por sessão).
  type LinhaGrid = { comp: Competidor; linha: LinhaResultadoCalculada }
  const linhasDa = new Map<Corrida, LinhaGrid[]>()
  for (const c of [...contadas, ...tomadas]) {
    const vistos = new Set<string>()
    const lista: LinhaGrid[] = []
    for (const linha of resultadoDa(c).linhas) {
      const comp = competidorDa(linha)
      if (!comp || vistos.has(comp.chave) || !corridaValeParaGrid(c, comp.grid)) continue
      vistos.add(comp.chave)
      if (comp.nomeGrid && !entrada.nomesGrid.has(comp.grid)) entrada.nomesGrid.set(comp.grid, comp.nomeGrid)
      lista.push({ comp, linha })
    }
    linhasDa.set(c, lista)
  }
  const doGrid = (c: Corrida, grid: string) => (linhasDa.get(c) ?? []).filter((x) => x.comp.grid === grid)

  /** Posição relativa dentro do grid (só quem tem posição oficial e não está entre os que contam como último). */
  const ranking = (c: Corrida, grid: string): Map<string, number> =>
    new Map(
      doGrid(c, grid)
        .filter((x) => x.linha.posicaoOficial !== null && !DECISOES_MEDIA.contamComoUltima.includes(x.linha.status))
        .sort((a, b) => (a.linha.posicaoOficial as number) - (b.linha.posicaoOficial as number))
        .map((x, i) => [x.comp.chave, i + 1] as const),
    )

  /** Volta mais rápida do grid numa corrida (marcação manual primeiro; convidado marcado = ninguém). */
  const voltaRapidaDoGrid = (c: Corrida, grid: string): PilotoAcum | null => {
    const linhas = doGrid(c, grid)
    const marcadas = new Set(idsDe(c.voltaMaisRapidaManual))
    const manuais = linhas.filter((x) => c.resultados?.[x.linha.indice]?.voltaMaisRapida === true || marcadas.has(k(x.linha.inscricao)))
    const elegiveis = manuais.filter((x) => x.comp.piloto && x.linha.statusInformado !== 'desclassificado')
    const porPosicao = (a: LinhaGrid, b: LinhaGrid) => (a.linha.posicaoOficial ?? Infinity) - (b.linha.posicaoOficial ?? Infinity) || a.linha.indice - b.linha.indice
    if (elegiveis.length) return [...elegiveis].sort(porPosicao)[0].comp.piloto
    if (manuais.some((x) => !x.comp.piloto)) return null
    const melhor = linhas
      .filter((x) => x.linha.posicaoOficial !== null && !DECISOES_MEDIA.contamComoUltima.includes(x.linha.status) && x.linha.melhorVolta !== null)
      .sort((a, b) => (a.linha.melhorVolta as number) - (b.linha.melhorVolta as number) || porPosicao(a, b))[0]
    return melhor?.comp.piloto ?? null
  }

  const fatorEtapa = fator(etapa.fatorPontuacao, 'etapa', avisosLocais)
  const pPole = paraDecimos(numeroOu(regra.pontosPole, 0))
  const pVmr = paraDecimos(numeroOu(regra.pontosVoltaRapida, 0))
  const posicoes = new Map<string, number>()

  // Avisos de lançamentos que o cálculo pela média não usa.
  for (const c of contadas) {
    const nomeCorrida = c.nome ?? String(c.id)
    if (resultadoDa(c).linhas.some((l) => l.pontosManuais !== null && !l.convidado)) {
      avisar(`${nomeEtapa} — ${nomeCorrida}: há "pontos manuais" lançados, mas no cálculo pela média os pontos vêm da posição na etapa. Para corrigir pontos, use um ajuste na classificação.`)
    }
    if (typeof c.fatorPontuacao === 'number' && c.fatorPontuacao !== 1) {
      avisar(`${nomeEtapa} — ${nomeCorrida}: o fator da corrida não se aplica no cálculo pela média (só o fator da etapa).`)
    }
  }

  const grids = [...new Set([...contadas, ...tomadas].flatMap((c) => (linhasDa.get(c) ?? []).map((x) => x.comp.grid)))]
  for (const grid of grids) {
    const rotulo = grid ? `da subcategoria ${entrada.nomesGrid.get(grid) ?? grid}` : 'sem subcategoria'
    const corridas = contadas.filter((c) => doGrid(c, grid).length > 0)
    const tomada = tomadas.find((t) => doGrid(t, grid).length > 0) ?? null
    const naTomada = tomada ? ranking(tomada, grid) : new Map<string, number>()

    // Pole da subcategoria: 1º da tomada de tempo dela (convidado na frente em "manter posições" = sem pole).
    if (tomada) {
      const primeiro = doGrid(tomada, grid).find((x) => naTomada.get(x.comp.chave) === 1)?.comp.piloto
      if (primeiro) {
        const e = entrada.acumEtapa(primeiro, idEtapa)
        if (!e.pole) {
          e.pole = true
          primeiro.poles++
          e.pontos += pPole
          e.extras += pPole
        }
      }
    }
    if (!corridas.length) continue

    // Membros do grid: todos os que aparecem em alguma corrida dele.
    const membros = new Map<string, Competidor>()
    for (const c of corridas) for (const x of doGrid(c, grid)) if (!membros.has(x.comp.chave)) membros.set(x.comp.chave, x.comp)
    const rankings = corridas.map((c) => ranking(c, grid))
    const listados = corridas.map((c) => doGrid(c, grid).length)
    type Calc = { comp: Competidor; soma: number; posicoes: PosicaoNaMedia[] }
    const calculos: Calc[] = [...membros.values()].map((comp) => {
      const pos = corridas.map((c, i): PosicaoNaMedia => {
        const p = rankings[i].get(comp.chave)
        if (p !== undefined) return { corrida: c.id, posicao: p, ultima: false }
        const ultima = DECISOES_MEDIA.ultimaPosicao === 'pilotos-da-corrida' ? listados[i] : membros.size
        return { corrida: c.id, posicao: ultima, ultima: true }
      })
      return { comp, soma: pos.reduce((s, x) => s + x.posicao, 0), posicoes: pos }
    })

    const ultimaCorrida = corridas.length - 1
    const criterios: Record<CriterioDesempateMedia, (a: Calc, b: Calc) => number> = {
      'ultima-corrida': (a, b) => a.posicoes[ultimaCorrida].posicao - b.posicoes[ultimaCorrida].posicao,
      classificacao: (a, b) => comparaNumero(naTomada.get(a.comp.chave) ?? Infinity, naTomada.get(b.comp.chave) ?? Infinity),
    }
    // Todos do grid têm o mesmo número de corridas na média: comparar a soma é comparar a média (sem arredondar).
    const compara = (a: Calc, b: Calc) => {
      if (a.soma !== b.soma) return a.soma - b.soma
      for (const criterio of DECISOES_MEDIA.desempate) {
        const d = criterios[criterio]?.(a, b) ?? 0
        if (d !== 0) return d
      }
      return 0
    }
    const ordenados = [...calculos].sort((a, b) => compara(a, b) || comparaNome(a.comp.nome, b.comp.nome) || (a.comp.chave < b.comp.chave ? -1 : 1))

    // Tabela de pontos: a das corridas (todas iguais); diferentes → a primeira da regra, com aviso.
    const tabelas = corridas.map((c) => tabelaDaCorrida(regra, c, avisosLocais))
    let tabela = tabelas[0] ?? []
    if (tabelas.some((t) => t !== tabela)) {
      tabela = regra.tabelas?.[0]?.pontos ?? []
      avisar(`${nomeEtapa}: as corridas ${rotulo} usam tabelas de pontos diferentes; no cálculo pela média a etapa usou a primeira tabela da regra.`)
    }

    let posicaoAnterior = 0
    ordenados.forEach((x, i) => {
      // Empate que nenhum critério resolveu: mesma posição (e mesmos pontos); o seguinte pula (2º, 2º, 4º).
      const posicao = i > 0 && compara(ordenados[i - 1], x) === 0 ? posicaoAnterior : i + 1
      posicaoAnterior = posicao
      const p = x.comp.piloto
      if (!p) return // convidado (manter posições): ocupa a posição, mas não pontua
      const e = entrada.acumEtapa(p, idEtapa)
      e.temPosicao = true
      e.media = Math.round((x.soma / corridas.length) * 100) / 100
      e.posicoesNaMedia = x.posicoes
      posicoes.set(p.chave, posicao)
      const pts = paraDecimos(numeroOu(tabela[posicao - 1], 0) * fatorEtapa)
      e.pontos += pts
      e.extras += pts
    })

    // Estatísticas por corrida (dentro da subcategoria), participação e volta mais rápida.
    corridas.forEach((c, i) => {
      for (const { comp, linha } of doGrid(c, grid)) {
        const p = comp.piloto
        if (!p) continue
        const e = entrada.acumEtapa(p, idEtapa)
        const part = paraDecimos(linha.pontosParticipacao)
        e.pontos += part
        e.extras += part
        if (linha.largou) p.corridas++
        if (linha.desclassificado) {
          e.dsq = true
          e.dsqCorridas.add(k(c.id))
        }
        const pos = rankings[i].get(comp.chave) ?? null
        e.posicoes.set(k(c.id), pos)
        if (pos !== null) {
          p.contagem[pos] = (p.contagem[pos] ?? 0) + 1
          if (pos === 1) p.vitorias++
          if (pos <= 3) p.podios++
        }
      }
      const vmr = voltaRapidaDoGrid(c, grid)
      if (vmr) {
        vmr.voltasRapidas++
        const e = entrada.acumEtapa(vmr, idEtapa)
        e.pontos += pVmr
        e.extras += pVmr
      }
    })
  }
  if (avisos) avisos.push(...avisosLocais)
  return { posicoes, contadas }
}

type Nucleo = {
  linhas: LinhaClassificacao[]
  /** Cálculo pela média: pontos e posições por subcategoria. */
  porSubcategoria: boolean
  criterios: CriteriosAplicados
  etapasConsideradas: Etapa[]
  avisos: string[]
}

function calcularNucleo(entrada: EntradaClassificacao, etapasConsideradas: Etapa[], comAvisos: boolean): Nucleo {
  const avisos: string[] = []
  const regra = entrada.regra ?? {}
  const grupo = new Set([k(entrada.categoria), ...(entrada.incluiResultadosDe ?? []).map(k)].filter(Boolean))
  const mapaIns = new Map(entrada.inscricoes.map((i) => [k(i.id), i] as const))
  const idsConsiderados = new Set(etapasConsideradas.map((e) => k(e.id)))

  // Corridas oficiais das etapas consideradas, do grupo, em ordem cronológica dentro de cada etapa.
  // Warm-up fica de fora sempre (não dá pontos, pole, participação nem estatísticas).
  const corridasPorEtapa = new Map<string, Corrida[]>()
  for (const c of entrada.corridas) {
    if (c.status !== 'oficial' || ehWarmUp(c) || !idsConsiderados.has(k(c.etapa)) || !corridaDoGrupo(c, grupo, mapaIns)) continue
    const lista = corridasPorEtapa.get(k(c.etapa)) ?? []
    lista.push(c)
    corridasPorEtapa.set(k(c.etapa), lista)
  }
  for (const [id, lista] of corridasPorEtapa) corridasPorEtapa.set(id, ordenarCorridas(lista))

  // Etapas que efetivamente contam para o grupo (realizadas e com alguma corrida oficial do grupo).
  const etapas = etapasConsideradas.filter((e) => corridasPorEtapa.has(k(e.id)))

  // Última etapa do calendário (para "última etapa não descartável"): a mais tardia não cancelada do grupo.
  const calendario = ordenarEtapas(entrada.etapas.filter((e) => e.status !== 'cancelada' && etapaDoGrupo(e, grupo)))
  const ultimaDoCalendario = calendario.length ? k(calendario[calendario.length - 1].id) : null

  // Pilotos da classificação (titulares do grupo; inscrição excluída não entra).
  const pilotos = new Map<string, PilotoAcum>()
  const pilotoDaInscricao = (id: Id | null | undefined): PilotoAcum | null => {
    const ins = mapaIns.get(k(id))
    if (!ins || !grupo.has(k(ins.categoria)) || ins.condicao === 'convidado' || ins.status === 'excluida') return null
    const chave = k(ins.piloto) || `inscricao:${k(ins.id)}`
    let p = pilotos.get(chave)
    if (!p) {
      p = { chave, principal: ins, inscricoes: [], etapas: new Map(), vitorias: 0, podios: 0, corridas: 0, poles: 0, voltasRapidas: 0, contagem: [], ajustesGerais: 0 }
      pilotos.set(chave, p)
    }
    if (!p.inscricoes.some((x) => k(x.id) === k(ins.id))) p.inscricoes.push(ins)
    // A inscrição principal é a da categoria da classificação (quando o piloto tem mais de uma no grupo).
    if (k(ins.categoria) === k(entrada.categoria) && k(p.principal.categoria) !== k(entrada.categoria)) p.principal = ins
    return p
  }
  for (const ins of entrada.inscricoes) {
    if ((ins.status ?? 'ativa') === 'ativa') pilotoDaInscricao(ins.id)
  }
  const acumEtapa = (p: PilotoAcum, etapaId: string) => {
    let e = p.etapas.get(etapaId)
    if (!e) {
      e = novaEtapaAcum()
      p.etapas.set(etapaId, e)
    }
    return e
  }

  // Corridas que contam (para descarte por corrida): lista por etapa.
  const contadasPorEtapa = new Map<string, Corrida[]>()

  // Cálculo pela média (regra do BKS): cada etapa é pontuada por subcategoria (ver pontuarEtapaPelaMedia).
  const calculoDaEtapa: CalculoDaEtapa = regra.calculoDaEtapa ?? REGRA_PADRAO.calculoDaEtapa
  const media = calculoDaEtapa === 'media-das-corridas'
  const nomesGrid = new Map<string, string>()
  // Posição de cada piloto em cada etapa: etapa → piloto → posição.
  const posicaoNaEtapa = new Map<string, Map<string, number>>()

  for (const etapa of etapas) {
    const idEtapa = k(etapa.id)
    const corridas = corridasPorEtapa.get(idEtapa) ?? []
    if (media) {
      const r = pontuarEtapaPelaMedia({
        etapa,
        corridas,
        regra,
        mapaIns,
        grupo,
        pilotoDaInscricao,
        acumEtapa,
        nomesGrid,
        avisos: comAvisos ? avisos : null,
      })
      contadasPorEtapa.set(idEtapa, r.contadas)
      posicaoNaEtapa.set(idEtapa, r.posicoes)
      continue
    }
    const fatorEtapa = etapa.fatorPontuacao
    const contadas: Corrida[] = []
    // Pole: para cada categoria do grupo, a 1ª tomada de tempo oficial da etapa que a inclui. Tomada comum a
    // categorias somadas vale uma vez (uma pole); tomadas separadas dão uma pole cada.
    const tomadas = corridas.filter((c) => (c.tipo ?? 'bateria') === 'tomada-de-tempo')
    const tomadasPole = new Set<Corrida>()
    for (const cat of grupo) {
      const t = tomadas.find((c) => categoriasDaCorrida(c, mapaIns).has(cat))
      if (t) tomadasPole.add(t)
    }

    for (const corrida of corridas) {
      const r = calcularResultadoCorrida(corrida, regra, { inscricoes: mapaIns, categorias: [...grupo], fatorEtapa })
      if (comAvisos) avisos.push(...r.avisos)
      const ehTomada = (corrida.tipo ?? 'bateria') === 'tomada-de-tempo'
      const contaComoCorrida = r.conta && !ehTomada
      if (contaComoCorrida) contadas.push(corrida)

      for (const l of r.linhas) {
        const p = pilotoDaInscricao(l.inscricao)
        if (!p) continue
        const e = acumEtapa(p, idEtapa)
        e.participou = true
        const pts = paraDecimos(l.pontos)
        e.pontos += pts
        e.penalidades += paraDecimos(l.penalidadePontos)
        if (ehTomada) {
          e.extras += pts
          // `!e.pole`: o mesmo piloto não ganha duas poles na mesma etapa (ex.: inscrito em duas categorias somadas).
          if (tomadasPole.has(corrida) && l.posicaoParaPontos === 1 && !e.pole) {
            e.pole = true
            p.poles++
            const pp = paraDecimos(numeroOu(regra.pontosPole, 0))
            e.pontos += pp
            e.extras += pp
          }
          continue
        }
        if (!contaComoCorrida) continue
        e.corridas.set(k(corrida.id), pts)
        if (l.desclassificado) {
          e.dsq = true
          e.dsqCorridas.add(k(corrida.id))
        }
        if (l.largou) p.corridas++
        e.posicoes.set(k(corrida.id), l.posicaoParaPontos)
        if (l.posicaoParaPontos !== null) {
          e.temPosicao = true
          p.contagem[l.posicaoParaPontos] = (p.contagem[l.posicaoParaPontos] ?? 0) + 1
          if (l.posicaoParaPontos === 1) p.vitorias++
          if (l.posicaoParaPontos <= 3) p.podios++
        }
        if (l.voltaMaisRapida) p.voltasRapidas++
      }
    }
    contadasPorEtapa.set(idEtapa, contadas)
  }

  // Ajustes da classificação.
  for (const a of entrada.ajustes ?? []) {
    const p = pilotoDaInscricao(a.inscricao)
    if (!p) {
      if (comAvisos) avisos.push('Há um ajuste de pontos para uma inscrição que não está nesta classificação (convidado, excluída ou de outra categoria); ele foi ignorado.')
      continue
    }
    const d = paraDecimos(sinalAjuste(a))
    if (a.etapa === null || a.etapa === undefined || k(a.etapa) === '') {
      p.ajustesGerais += d
    } else if (idsConsiderados.has(k(a.etapa))) {
      if (etapas.some((e) => k(e.id) === k(a.etapa))) acumEtapa(p, k(a.etapa)).ajustes += d
      else p.ajustesGerais += d
    }
    // Ajuste de etapa ainda não realizada (ou depois de `ateEtapa`) só entra quando a etapa contar.
  }

  // Pilotos com inscrição não ativa (desistente/transferida) só aparecem se correram ou têm ajuste.
  for (const [chave, p] of pilotos) {
    const algumaAtiva = p.inscricoes.some((i) => (i.status ?? 'ativa') === 'ativa')
    const temAlgo = [...p.etapas.values()].some((e) => e.participou || e.ajustes) || p.ajustesGerais !== 0
    if (!algumaAtiva && !temAlgo) pilotos.delete(chave)
  }

  // Descartes.
  const desc = regra.descartes ?? null
  const qtd = Math.max(0, Math.trunc(numeroOu(desc?.quantidade, 0)))
  // No cálculo pela média as corridas não têm pontos próprios: o descarte é sempre de etapas inteiras.
  const unidade = media ? 'etapa' : (desc?.unidade ?? REGRA_PADRAO.unidadeDescarte)
  if (media && qtd > 0 && desc?.unidade === 'corrida' && comAvisos) {
    avisos.push('A regra descarta corridas avulsas, mas no cálculo pela média os pontos são da etapa: o descarte foi feito por etapas inteiras.')
  }
  const aPartirDe = Math.max(0, Math.trunc(numeroOu(desc?.aPartirDeEtapas, 0)))
  const ultimaDescartavel = desc?.ultimaEtapaDescartavel !== false
  const unidadesRealizadas = unidade === 'etapa' ? etapas.length : [...contadasPorEtapa.values()].reduce((s, l) => s + l.length, 0)
  const descartaAgora = qtd > 0 && etapas.length >= aPartirDe && unidadesRealizadas > qtd

  const descartesEtapa = new Map<string, Set<string>>() // piloto → etapas descartadas
  const descartesCorrida = new Map<string, Set<string>>() // piloto → corridas descartadas
  if (descartaAgora) {
    for (const p of pilotos.values()) {
      if (unidade === 'etapa') {
        const candidatos = etapas
          .map((e, ordem) => ({ id: k(e.id), ordem, pontos: p.etapas.get(k(e.id))?.pontos ?? 0, dsq: p.etapas.get(k(e.id))?.dsq ?? false }))
          .filter((c) => !c.dsq && (ultimaDescartavel || c.id !== ultimaDoCalendario))
          .sort((a, b) => a.pontos - b.pontos || a.ordem - b.ordem)
        descartesEtapa.set(p.chave, new Set(candidatos.slice(0, qtd).map((c) => c.id)))
      } else {
        const candidatos: { id: string; ordem: number; pontos: number }[] = []
        let ordem = 0
        for (const e of etapas) {
          const ea = p.etapas.get(k(e.id))
          for (const c of contadasPorEtapa.get(k(e.id)) ?? []) {
            const id = k(c.id)
            ordem++
            if (ea?.dsqCorridas.has(id)) continue
            if (!ultimaDescartavel && k(e.id) === ultimaDoCalendario) continue
            candidatos.push({ id, ordem, pontos: ea?.corridas.get(id) ?? 0 })
          }
        }
        candidatos.sort((a, b) => a.pontos - b.pontos || a.ordem - b.ordem)
        descartesCorrida.set(p.chave, new Set(candidatos.slice(0, qtd).map((c) => c.id)))
      }
    }
  }

  // Posição de cada piloto em cada etapa (pontos da etapa; empate: melhor posição na última corrida, voltando).
  // No cálculo pela média ela já veio da média das corridas, dentro da subcategoria.
  for (const e of media ? [] : etapas) {
    const id = k(e.id)
    const lista = [...pilotos.values()].filter((p) => p.etapas.get(id)?.temPosicao)
    lista.sort((a, b) => {
      const ea = a.etapas.get(id) as EtapaAcum
      const eb = b.etapas.get(id) as EtapaAcum
      if (eb.pontos !== ea.pontos) return eb.pontos - ea.pontos
      const contadas = contadasPorEtapa.get(id) ?? []
      for (let i = contadas.length - 1; i >= 0; i--) {
        const pa = ea.posicoes.get(k(contadas[i].id)) ?? null
        const pb = eb.posicoes.get(k(contadas[i].id)) ?? null
        if (pa === pb) continue
        if (pa === null) return 1
        if (pb === null) return -1
        return pa - pb
      }
      return comparaNome(a.principal.nome, b.principal.nome) || (a.chave < b.chave ? -1 : 1)
    })
    posicaoNaEtapa.set(id, new Map(lista.map((p, i) => [p.chave, i + 1] as const)))
  }

  // Linhas.
  const etapasNumero = [...etapas].sort((a, b) => a.numero - b.numero)
  const linhas: (LinhaClassificacao & { _contagem: number[]; _ordemEtapas: (number | null)[] })[] = []
  for (const p of pilotos.values()) {
    let brutos = 0
    let descartados = 0
    let ajustes = p.ajustesGerais
    const etDesc = descartesEtapa.get(p.chave) ?? new Set<string>()
    const coDesc = descartesCorrida.get(p.chave) ?? new Set<string>()
    const porEtapa: ResultadoEtapaLinha[] = etapasNumero.map((e) => {
      const id = k(e.id)
      const ea = p.etapas.get(id) ?? novaEtapaAcum()
      let descEtapa = 0
      const corridasDescartadas: Id[] = []
      if (etDesc.has(id)) descEtapa = ea.pontos
      else {
        for (const c of contadasPorEtapa.get(id) ?? []) {
          if (coDesc.has(k(c.id))) {
            corridasDescartadas.push(c.id)
            descEtapa += ea.corridas.get(k(c.id)) ?? 0
          }
        }
      }
      const contadas = contadasPorEtapa.get(id) ?? []
      const etapaInteira = etDesc.has(id) || (contadas.length > 0 && corridasDescartadas.length === contadas.length && ea.extras === 0)
      brutos += ea.pontos
      descartados += descEtapa
      ajustes += ea.penalidades + ea.ajustes
      return {
        etapa: e.id,
        numero: e.numero,
        pontos: deDecimos(ea.pontos),
        posicao: posicaoNaEtapa.get(id)?.get(p.chave) ?? null,
        descartado: etapaInteira,
        pontosDescartados: deDecimos(descEtapa),
        corridasDescartadas,
        ajustes: deDecimos(ea.penalidades + ea.ajustes),
        participou: ea.participou,
        desclassificado: ea.dsq,
        pole: ea.pole,
        ...(media ? { media: ea.media, posicoesNaMedia: ea.posicoesNaMedia ?? [] } : {}),
      }
    })
    const ordemCrono = etapas.map((e) => posicaoNaEtapa.get(k(e.id))?.get(p.chave) ?? null)
    const ins = p.principal
    // Cálculo pela média: o grid (subcategoria) do piloto, com o nome como foi encontrado primeiro.
    const grid = chaveDoGrid(ins.subcategoria)
    if (media && grid && !nomesGrid.has(grid)) nomesGrid.set(grid, (ins.subcategoria ?? '').trim())
    linhas.push({
      chave: p.chave,
      posicao: 0,
      posicaoAnterior: null,
      inscricao: ins.id,
      inscricoes: p.inscricoes.map((i) => i.id),
      piloto: ins.piloto ?? null,
      nome: ins.nome,
      pilotoSlug: ins.pilotoSlug ?? null,
      numero: ins.numero ?? null,
      equipe: ins.equipe ?? null,
      equipeNome: ins.equipeNome ?? null,
      categoria: ins.categoria ?? null,
      ...(media ? { subcategoria: grid ? (nomesGrid.get(grid) ?? null) : null } : {}),
      pontos: deDecimos(brutos - descartados + ajustes),
      pontosBrutos: deDecimos(brutos),
      pontosDescartados: deDecimos(descartados),
      ajustes: deDecimos(ajustes),
      vitorias: p.vitorias,
      podios: p.podios,
      corridas: p.corridas,
      poles: p.poles,
      voltasRapidas: p.voltasRapidas,
      etapas: [...p.etapas.values()].filter((e) => e.participou).length,
      porEtapa,
      desempate: null,
      _contagem: p.contagem,
      _ordemEtapas: ordemCrono,
    })
  }

  // Ordenação: pontos, critérios de desempate na ordem da regra (sem repetir), e por fim ordem alfabética estável.
  const criterios = [...new Set(regra.criteriosDesempate ?? [])]
  type L = (typeof linhas)[number]
  const comparadores: Record<CriterioDesempate, (a: L, b: L) => number> = {
    'mais-vitorias': (a, b) => b.vitorias - a.vitorias,
    'mais-poles': (a, b) => b.poles - a.poles,
    'contagem-de-posicoes': (a, b) => {
      const n = Math.max(a._contagem.length, b._contagem.length)
      for (let i = 1; i < n; i++) {
        const d = (b._contagem[i] ?? 0) - (a._contagem[i] ?? 0)
        if (d !== 0) return d
      }
      return 0
    },
    'melhor-resultado-ultima-etapa': (a, b) => {
      for (let i = a._ordemEtapas.length - 1; i >= 0; i--) {
        const pa = a._ordemEtapas[i]
        const pb = b._ordemEtapas[i]
        if (pa === pb) continue
        if (pa === null) return 1
        if (pb === null) return -1
        return pa - pb
      }
      return 0
    },
  }
  const alfabetica = (a: L, b: L) =>
    comparaNome(a.nome, b.nome) || comparaNome(String(a.numero ?? ''), String(b.numero ?? '')) || (a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0)
  const quemDecide = (a: L, b: L): { criterio: CriterioAplicado; d: number } => {
    for (const c of criterios) {
      const d = comparadores[c]?.(a, b) ?? 0
      if (d !== 0) return { criterio: c, d }
    }
    return { criterio: 'ordem-alfabetica', d: alfabetica(a, b) }
  }
  const empates: EmpateResolvido[] = []
  /** Ordena e numera 1..N um grupo de linhas (a categoria inteira, ou uma subcategoria no cálculo pela média). */
  const numerar = (grupoLinhas: L[], subcategoria?: string | null): L[] => {
    grupoLinhas.sort((a, b) => paraDecimos(b.pontos) - paraDecimos(a.pontos) || quemDecide(a, b).d)
    const empatesDoGrupo: EmpateResolvido[] = []
    const onde = subcategoria === undefined ? '' : subcategoria ? ` (${subcategoria})` : ' (sem subcategoria)'
    grupoLinhas.forEach((l, i) => {
      l.posicao = i + 1
      const anterior = grupoLinhas[i - 1]
      if (anterior && paraDecimos(anterior.pontos) === paraDecimos(l.pontos)) {
        const criterio = quemDecide(anterior, l).criterio
        l.desempate = criterio
        // Empate com pontos que só a ordem alfabética separou: o administrador precisa saber.
        if (comAvisos && criterio === 'ordem-alfabetica' && paraDecimos(l.pontos) !== 0) {
          avisos.push(
            criterios.length
              ? `${anterior.nome} e ${l.nome}${onde} continuam empatados (${l.pontos} pontos) depois de todos os critérios de desempate da regra; ficaram em ordem alfabética.`
              : `A regra não tem critérios de desempate: ${anterior.nome} e ${l.nome}${onde} empataram com ${l.pontos} pontos e ficaram em ordem alfabética. Cadastre os critérios do regulamento.`,
          )
        }
        const ultimo = empatesDoGrupo[empatesDoGrupo.length - 1]
        if (ultimo && ultimo.posicoes[ultimo.posicoes.length - 1] === i) {
          ultimo.posicoes.push(i + 1)
          ultimo.resolvidoPor.push(criterio)
        } else {
          empatesDoGrupo.push({ pontos: l.pontos, posicoes: [i, i + 1], resolvidoPor: [criterio], ...(subcategoria === undefined ? {} : { subcategoria }) })
        }
      }
    })
    empates.push(...empatesDoGrupo)
    return grupoLinhas
  }

  let ordenadas: L[]
  if (!media) ordenadas = numerar(linhas)
  else {
    // Cálculo pela média: uma classificação por subcategoria (pela ordem do nome; "sem subcategoria" no fim).
    // A ordem das subcategorias cadastrada na categoria é aplicada na exibição (src/lib/subcategorias.ts).
    const porGrid = new Map<string, L[]>()
    for (const l of linhas) {
      const grid = chaveDoGrid(l.subcategoria)
      porGrid.set(grid, [...(porGrid.get(grid) ?? []), l])
    }
    const nomeDoGrid = (grid: string) => nomesGrid.get(grid) ?? grid
    const grids = [...porGrid.keys()].sort((a, b) => Number(a === '') - Number(b === '') || comparaNome(nomeDoGrid(a), nomeDoGrid(b)))
    ordenadas = grids.flatMap((grid) => numerar(porGrid.get(grid) as L[], grid ? nomeDoGrid(grid) : null))
  }

  return {
    linhas: ordenadas.map(({ _contagem, _ordemEtapas, ...l }) => l),
    porSubcategoria: media,
    criterios: {
      desempate: [...criterios],
      descartes: qtd > 0 ? { unidade, quantidade: qtd, aPartirDeEtapas: aPartirDe, ultimaEtapaDescartavel: ultimaDescartavel, aplicado: descartaAgora } : null,
      convidados: regra.convidados ?? REGRA_PADRAO.convidados,
      abandono: regra.abandono ?? REGRA_PADRAO.abandono,
      requisitoParticipacao: regra.requisitoParticipacao ?? REGRA_PADRAO.requisitoParticipacao,
      percentualMinimoVoltas: Math.max(0, numeroOu(regra.percentualMinimoVoltas, 0)),
      empates,
      calculoDaEtapa,
    },
    etapasConsideradas: etapas,
    avisos: [...new Set(avisos)],
  }
}

/**
 * Classificação de uma temporada × categoria (modo automático).
 * Considera só etapas `realizada` (até `ateEtapa`, se informado) e corridas `oficial`.
 */
export function calcularClassificacao(entrada: EntradaClassificacao): ResultadoClassificacao {
  let realizadas = ordenarEtapas(entrada.etapas.filter((e) => e.status === 'realizada'))
  if (entrada.ateEtapa !== null && entrada.ateEtapa !== undefined && k(entrada.ateEtapa) !== '') {
    const i = realizadas.findIndex((e) => k(e.id) === k(entrada.ateEtapa))
    // Etapa pedida ainda não realizada: classificação até a última realizada antes dela no calendário.
    if (i >= 0) realizadas = realizadas.slice(0, i + 1)
    else {
      const alvo = entrada.etapas.find((e) => k(e.id) === k(entrada.ateEtapa))
      if (alvo) {
        const ordem = ordenarEtapas([...realizadas, alvo])
        realizadas = ordem.slice(0, ordem.indexOf(alvo))
      }
    }
  }

  const atual = calcularNucleo(entrada, realizadas, true)

  if (entrada.comPosicaoAnterior !== false && atual.etapasConsideradas.length >= 2) {
    const ultima = atual.etapasConsideradas[atual.etapasConsideradas.length - 1]
    const anteriores = realizadas.slice(0, realizadas.findIndex((e) => k(e.id) === k(ultima.id)))
    const anterior = calcularNucleo(entrada, anteriores, false)
    const pos = new Map(anterior.linhas.map((l) => [l.chave, l.posicao] as const))
    for (const l of atual.linhas) l.posicaoAnterior = pos.get(l.chave) ?? null
  }

  return {
    linhas: atual.linhas,
    porSubcategoria: atual.porSubcategoria,
    criterios: atual.criterios,
    etapasRealizadas: atual.etapasConsideradas.length,
    etapas: atual.etapasConsideradas.map((e) => ({ id: e.id, numero: e.numero, nome: e.nome ?? null })),
    avisos: atual.avisos,
  }
}

// ───────────────────────────── líder e fotografia final ─────────────────────────────

export interface DestaqueManual {
  inscricao: Id | null
  /** Rótulo exibido no site (padrão "Destaque"; nunca "Líder", que é só do 1º calculado). */
  rotulo?: string | null
  /**
   * Até quando o destaque aparece (vazio = sem prazo). Data e hora: vale até aquele instante; só a data
   * ("AAAA-MM-DD"): vale até o fim daquele dia no horário de Brasília.
   */
  exibirAte?: string | Date | null
}

/** Instante final de um prazo: data sem hora = até 23:59:59,999 daquele dia em Brasília. */
function fimDoPrazo(v: string | Date | null): number | null {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) {
    return instanteDeChave(v.trim(), '23:59').getTime() + 59_999
  }
  return tempo(v)
}

export interface Lider {
  linha: LinhaClassificacao
  tipo: 'lider' | 'destaque'
  rotulo: string
}

/**
 * Líder de uma categoria. O destaque manual (dentro do prazo) prevalece, com o rótulo próprio;
 * senão o 1º colocado, desde que tenha pontos (antes da 1ª etapa não há líder).
 */
export function liderDe(
  linhas: LinhaClassificacao[],
  destaqueManual?: DestaqueManual | null,
  agora: Date | string | number = new Date(),
): Lider | null {
  const instante = agora instanceof Date ? agora.getTime() : new Date(agora).getTime()
  if (destaqueManual?.inscricao !== null && destaqueManual?.inscricao !== undefined && k(destaqueManual.inscricao) !== '') {
    const ate = fimDoPrazo(destaqueManual.exibirAte ?? null)
    const valido = ate === null || ate >= instante
    const alvo = k(destaqueManual.inscricao)
    const linha = valido ? linhas.find((l) => k(l.inscricao) === alvo || (l.inscricoes ?? []).some((i) => k(i) === alvo)) : undefined
    // "Líder" é só do 1º calculado: um destaque escolhido à mão nunca aparece com esse rótulo.
    const rotulo = (destaqueManual.rotulo ?? '').trim()
    if (linha) return { linha, tipo: 'destaque', rotulo: rotulo && normalizarNome(rotulo) !== 'lider' ? rotulo : 'Destaque' }
  }
  const primeiro = [...linhas].sort((a, b) => a.posicao - b.posicao)[0]
  if (!primeiro || !(primeiro.pontos > 0)) return null
  return { linha: primeiro, tipo: 'lider', rotulo: 'Líder' }
}

/** Formato do JSON `temporada-categorias.fotografiaFinal` (gravado ao encerrar a temporada). */
export interface FotografiaFinal {
  versao: 1
  geradaEm: string
  etapasRealizadas: number
  criterios: CriteriosAplicados | null
  /**
   * Classificação por subcategoria (cálculo pela média): cada linha guarda a `subcategoria` em que pontuou e a
   * `posicao` é dentro dela. Ausente/false = classificação única da categoria.
   */
  porSubcategoria?: boolean
  linhas: LinhaClassificacao[]
}

/**
 * Monta a fotografia final a partir da classificação calculada (ou manual) — usada no endpoint "encerrar"
 * da temporada, que grava também campeão, vice e 3º a partir de `linhas[0..2].inscricao`.
 */
export function criarFotografiaFinal(
  resultado: { linhas: LinhaClassificacao[]; criterios?: CriteriosAplicados | null; etapasRealizadas?: number; porSubcategoria?: boolean },
  agora: Date = new Date(),
): FotografiaFinal {
  return {
    versao: 1,
    geradaEm: agora.toISOString(),
    etapasRealizadas: resultado.etapasRealizadas ?? 0,
    criterios: resultado.criterios ?? null,
    ...(resultado.porSubcategoria ? { porSubcategoria: true } : {}),
    linhas: resultado.linhas,
  }
}

/** Lê a fotografia final gravada (tolerante: aceita também uma lista de linhas). null = não há fotografia. */
export function lerFotografiaFinal(json: unknown): FotografiaFinal | null {
  if (!json) return null
  if (Array.isArray(json)) {
    return { versao: 1, geradaEm: '', etapasRealizadas: 0, criterios: null, linhas: json as LinhaClassificacao[] }
  }
  if (typeof json === 'object' && Array.isArray((json as { linhas?: unknown }).linhas)) {
    const f = json as Partial<FotografiaFinal>
    return {
      versao: 1,
      geradaEm: typeof f.geradaEm === 'string' ? f.geradaEm : '',
      etapasRealizadas: typeof f.etapasRealizadas === 'number' ? f.etapasRealizadas : 0,
      criterios: f.criterios ?? null,
      ...(f.porSubcategoria === true ? { porSubcategoria: true } : {}),
      linhas: f.linhas as LinhaClassificacao[],
    }
  }
  return null
}
