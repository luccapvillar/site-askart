/**
 * Regras puras da frente Competição (sem banco), testadas em tests/int/competicao.int.spec.ts:
 * pontos com uma casa decimal, cores, tabelas de pontos, ajustes, status automático da etapa
 * e o planejamento do botão "Gerar corridas".
 */
import { normalizarBusca } from './texto'
import type { ID } from './util'
import { idDe } from './util'

/** Pontos aceitam no máximo uma casa decimal (12,5 sim; 12,25 não). */
export function temNoMaximoUmaCasa(valor: number): boolean {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return false
  return Math.abs(Math.round(valor * 10) - valor * 10) < 1e-9
}

/** Validação de campo `number` para pontos (aceita vazio). */
export const validarPontos =
  (opcoes: { negativos?: boolean } = {}) =>
  (valor: unknown): string | true => {
    if (valor === null || valor === undefined || valor === '') return true
    const lista = Array.isArray(valor) ? valor : [valor]
    for (const v of lista) {
      if (typeof v !== 'number' || !Number.isFinite(v)) return 'Informe um número.'
      if (!opcoes.negativos && v < 0) return 'Os pontos não podem ser negativos.'
      if (!temNoMaximoUmaCasa(v)) return 'Use no máximo uma casa decimal (ex.: 12,5).'
    }
    return true
  }

/** Fator de pontuação: maior que zero, até duas casas (0,5 · 1 · 1,5 · 2). */
export function validarFator(valor: unknown): string | true {
  if (valor === null || valor === undefined || valor === '') return true
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) return 'O fator deve ser maior que zero (ex.: 1 normal, 2 = pontos em dobro, 0,5 = metade).'
  if (Math.abs(Math.round(valor * 100) - valor * 100) > 1e-9) return 'Use no máximo duas casas decimais.'
  if (valor > 10) return 'Fator muito alto: confira o valor (ex.: 2 = pontos em dobro).'
  return true
}

/** Inteiro dentro de um intervalo (aceita vazio). */
export const validarInteiro =
  (min: number, max: number, rotulo = 'O valor') =>
  (valor: unknown): string | true => {
    if (valor === null || valor === undefined || valor === '') return true
    if (typeof valor !== 'number' || !Number.isInteger(valor)) return `${rotulo} deve ser um número inteiro.`
    if (valor < min || valor > max) return `${rotulo} deve estar entre ${min} e ${max}.`
    return true
  }

const COR_HEX = /^#[0-9a-f]{6}$/i

/** Cor no formato #RRGGBB (o valor vai para CSS: nada além disso é aceito). */
export function validarCorHex(valor: unknown): string | true {
  if (valor === null || valor === undefined || valor === '') return true
  if (typeof valor !== 'string' || !COR_HEX.test(valor.trim())) {
    return 'Use o formato #RRGGBB, com 6 dígitos (ex.: #1A7F37).'
  }
  return true
}

export const normalizarCorHex = (valor: unknown) =>
  typeof valor === 'string' && valor.trim() ? valor.trim().toUpperCase() : valor

/** Link externo: só http:// ou https:// com endereço válido (nada de "javascript:" ou texto solto). Aceita vazio. */
export function validarUrl(valor: unknown): string | true {
  if (valor === null || valor === undefined || valor === '') return true
  if (typeof valor !== 'string') return 'Informe um link começando com https://'
  const texto = valor.trim()
  if (/\s/.test(texto)) return 'O link não pode ter espaços.'
  try {
    const url = new URL(texto)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'O link deve começar com https://'
    if (!url.hostname.includes('.')) return 'Confira o endereço do link (ex.: https://exemplo.com.br/...).'
  } catch {
    return 'Link inválido. Copie o endereço completo, começando com https://'
  }
  return true
}

/**
 * Encontra a tabela de pontos pelo nome, sem diferenciar maiúsculas e acentos.
 * Devolve o nome como está cadastrado na regra, ou null se não existir.
 */
export function encontrarTabela(nome: string | null | undefined, tabelas: Array<{ nome?: string | null }>): string | null {
  if (!nome?.trim()) return null
  const alvo = normalizarBusca(nome)
  const achada = tabelas.find((t) => t.nome && normalizarBusca(t.nome) === alvo)
  return achada?.nome ?? null
}

export type TipoAjuste = 'penalidade' | 'bonificacao' | 'correcao'

/**
 * Sinal dos pontos de um ajuste: penalidade sempre tira, bonificação sempre soma,
 * correção fica como foi digitada (pode ser + ou -). Assim "penalidade 5" vira -5.
 */
export function pontosDoAjuste(tipo: TipoAjuste | null | undefined, pontos: number | null | undefined): number | null {
  if (pontos === null || pontos === undefined || !Number.isFinite(pontos)) return null
  if (tipo === 'penalidade') return -Math.abs(pontos)
  if (tipo === 'bonificacao') return Math.abs(pontos)
  return pontos
}

export type StatusEtapa = 'agendada' | 'confirmada' | 'adiada' | 'cancelada' | 'realizada'
export type StatusCorrida = 'rascunho' | 'oficial' | 'cancelada'

/**
 * Status automático da etapa a partir das corridas (null = não mexer):
 * vira "realizada" quando todas as corridas que contam (não canceladas) estão oficiais;
 * se estava "realizada" e alguma voltou a rascunho, volta para "confirmada".
 * Etapa cancelada nunca muda sozinha.
 */
export function statusEtapaAutomatico(
  atual: StatusEtapa | null | undefined,
  corridas: Array<{ status?: StatusCorrida | null; contaParaClassificacao?: boolean | null; tipo?: TipoCorrida | null }>,
): StatusEtapa | null {
  if (atual === 'cancelada') return null
  const contam = corridas.filter((c) => corridaContaPontos(c) && c.status !== 'cancelada')
  if (contam.length === 0) return null
  const todasOficiais = contam.every((c) => c.status === 'oficial')
  if (todasOficiais && atual !== 'realizada') return 'realizada'
  if (!todasOficiais && atual === 'realizada') return 'confirmada'
  return null
}

/** Chave única de uma corrida: etapa + categorias + nome (sem acento/caixa). Impede "Final" duplicada. */
export function chaveCorrida(etapa: unknown, categorias: unknown[], nome: string | null | undefined) {
  const ids = categorias
    .map((c) => idDe(c))
    .filter((c): c is ID => c !== null)
    .map(String)
    .sort()
  return `${idDe(etapa) ?? ''}|${ids.join(',')}|${normalizarBusca(nome ?? '')}`
}

export type TipoCorrida = 'warm-up' | 'tomada-de-tempo' | 'classificatoria' | 'bateria' | 'pre-final' | 'final'

/**
 * A corrida dá pontos (e entra nas conferências de "falta oficializar")? Warm-up nunca dá, mesmo com
 * "Conta para a classificação" marcado; as demais seguem a caixa (padrão: sim).
 */
export const corridaContaPontos = (c: { tipo?: TipoCorrida | string | null; contaParaClassificacao?: boolean | null }) =>
  c.tipo !== 'warm-up' && c.contaParaClassificacao !== false

export interface ItemFormato {
  nome?: string | null
  tipo?: TipoCorrida | null
  tabela?: string | null
  contaParaClassificacao?: boolean | null
  fator?: number | null
}

export interface CorridaPlanejada {
  etapa: ID
  categorias: ID[]
  nome: string
  tipo: TipoCorrida
  tabela: string | null
  contaParaClassificacao: boolean
  fator: number
  status: 'rascunho'
  chaveUnica: string
}

/**
 * "Gerar corridas": formato da temporada × categorias da etapa, sem repetir as que já existem.
 * Cada categoria ganha suas corridas (uma categoria por corrida).
 */
export function planejarCorridas(
  etapa: ID,
  formato: ItemFormato[],
  categorias: ID[],
  chavesExistentes: Set<string>,
): { criar: CorridaPlanejada[]; jaExistiam: number } {
  const criar: CorridaPlanejada[] = []
  let jaExistiam = 0
  const vistas = new Set(chavesExistentes)
  for (const categoria of categorias) {
    for (const item of formato) {
      const nome = item.nome?.trim()
      if (!nome) continue
      const chave = chaveCorrida(etapa, [categoria], nome)
      if (vistas.has(chave)) {
        jaExistiam++
        continue
      }
      vistas.add(chave)
      criar.push({
        etapa,
        categorias: [categoria],
        nome,
        tipo: item.tipo || 'bateria',
        tabela: item.tabela?.trim() || null,
        // Warm-up nasce sem contar para a classificação (o motor o ignora de qualquer forma).
        contaParaClassificacao: corridaContaPontos({ tipo: item.tipo, contaParaClassificacao: item.contaParaClassificacao }),
        fator: typeof item.fator === 'number' && item.fator > 0 ? item.fator : 1,
        status: 'rascunho',
        chaveUnica: chave,
      })
    }
  }
  return { criar, jaExistiam }
}

/** Critérios de desempate não podem se repetir na lista. */
export function criteriosRepetidos(lista: Array<{ criterio?: string | null }> | null | undefined): string[] {
  const vistos = new Set<string>()
  const repetidos = new Set<string>()
  for (const item of lista ?? []) {
    if (!item?.criterio) continue
    if (vistos.has(item.criterio)) repetidos.add(item.criterio)
    vistos.add(item.criterio)
  }
  return [...repetidos]
}
