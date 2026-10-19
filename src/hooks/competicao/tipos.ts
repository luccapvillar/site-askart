/**
 * Formato dos documentos da frente Competição como os hooks os leem (depth 0).
 * Espelha as coleções de src/collections/competicao; mantido à mão para não depender de
 * src/payload-types.ts estar regenerado.
 */
import type { LinhaResultado } from './resultados'
import type { ID, Rel } from './util'
import type { ItemFormato, StatusCorrida, StatusEtapa, TipoAjuste, TipoCorrida } from './validacoes'

export type Visibilidade = 'visivel' | 'oculto' | 'arquivado'
export type StatusTemporada = 'planejada' | 'em-andamento' | 'encerrada'
export type StatusInscricao = 'ativa' | 'desistente' | 'transferida' | 'excluida'

interface Base {
  id: ID
  createdAt?: string
  updatedAt?: string
}

export interface CampeonatoDoc extends Base {
  nome: string
  slug?: string | null
  sigla?: string | null
  temporadaAtual?: Rel
  visibilidade?: Visibilidade
}

export interface TemporadaDoc extends Base {
  campeonato: Rel
  nome?: string | null
  slug?: string | null
  ano: number
  status?: StatusTemporada | null
  regra?: Rel
  categorias?: Rel[] | null
  formatoEtapa?: (ItemFormato & { id?: string | null })[] | null
  fonteDados?: 'resultados' | 'so-classificacao-final' | null
  visibilidade?: Visibilidade
}

export interface AjusteDoc {
  id?: string | null
  inscricao?: Rel
  etapa?: Rel
  tipo?: TipoAjuste | null
  pontos?: number | null
  motivo?: string | null
  documento?: Rel
}

export interface LinhaManualDoc {
  id?: string | null
  posicao?: number | null
  piloto?: Rel
  numero?: number | null
  equipe?: Rel
  pontos?: number | null
  vitorias?: number | null
  podios?: number | null
  corridas?: number | null
  observacao?: string | null
}

export interface TemporadaCategoriaDoc extends Base {
  temporada: Rel
  categoria: Rel
  titulo?: string | null
  ordem?: number | null
  regra?: Rel
  incluiResultadosDe?: Rel[] | null
  modo?: 'automatico' | 'manual' | null
  ajustes?: AjusteDoc[] | null
  destaqueManual?: { inscricao?: Rel; rotulo?: string | null; exibirAte?: string | null } | null
  linhasManuais?: LinhaManualDoc[] | null
  fotografiaFinal?: unknown
  campeao?: Rel
  vice?: Rel
  terceiro?: Rel
  publicada?: boolean | null
}

export interface CategoriaDoc extends Base {
  nome: string
  sigla?: string | null
  slug?: string | null
  subcategorias?: { nome?: string | null }[] | null
  cor?: string | null
  visibilidade?: Visibilidade
}

export interface EquipeDoc extends Base {
  nome: string
  sigla?: string | null
  cidade?: string | null
  uf?: string | null
}

export interface PilotoDoc extends Base {
  nome: string
  nomeExibicao?: string | null
  slug?: string | null
  cidade?: string | null
  uf?: string | null
  dataNascimento?: string | null
  visibilidade?: Visibilidade
}

export interface InscricaoDoc extends Base {
  temporada: Rel
  categoria: Rel
  piloto: Rel
  numero?: number | null
  subcategoria?: string | null
  equipe?: Rel
  condicao?: 'titular' | 'convidado' | null
  status?: StatusInscricao | null
  titulo?: string | null
}

export interface TabelaPontosDoc {
  id?: string | null
  nome?: string | null
  pontos?: number[] | null
}

export interface RegraPontuacaoDoc extends Base {
  nome: string
  tabelas?: TabelaPontosDoc[] | null
  [campo: string]: unknown
}

export interface EtapaDoc extends Base {
  temporada: Rel
  numero: number
  nome?: string | null
  inicio?: string | null
  fim?: string | null
  local?: string | null
  categorias?: Rel[] | null
  status?: StatusEtapa | null
  fatorPontuacao?: number | null
  visibilidade?: Visibilidade
  titulo?: string | null
}

export interface CorridaDoc extends Base {
  etapa: Rel
  categorias?: Rel[] | null
  /** Subcategorias para as quais a sessão vale (horário próprio); vazio = todas. */
  subcategorias?: string[] | null
  nome: string
  tipo?: TipoCorrida | null
  tabela?: string | null
  contaParaClassificacao?: boolean | null
  fator?: number | null
  inicio?: string | null
  voltasPrevistas?: number | null
  status?: StatusCorrida | null
  resultados?: LinhaResultado[] | null
  voltaMaisRapidaManual?: { inscricao?: Rel; motivo?: string | null } | null
  titulo?: string | null
  chaveUnica?: string | null
}
