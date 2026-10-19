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

/** Nomes das subcategorias de uma categoria, na ordem cadastrada (sem vazios). */
export const nomesDasSubcategorias = (subcategorias: Array<{ nome?: string | null } | null> | null | undefined): string[] =>
  (subcategorias ?? []).map((s) => s?.nome?.trim() ?? '').filter(Boolean)

/** Lista entre aspas, por extenso: "A", "B" ou "C". */
export function listaComOu(itens: string[]): string {
  const q = itens.map((i) => `"${i}"`)
  return q.length <= 1 ? (q[0] ?? '') : `${q.slice(0, -1).join(', ')} ou ${q.at(-1)}`
}

/** "a categoria "F400"", "as categorias "F400" e "Cadete"" ou "a categoria escolhida". */
function qualCategoria(categoria: string | string[] | null | undefined): { texto: string; plural: boolean } {
  const nomes = (Array.isArray(categoria) ? categoria : [categoria]).map((c) => c?.trim() ?? '').filter(Boolean)
  if (!nomes.length) return { texto: 'a categoria escolhida', plural: false }
  if (nomes.length === 1) return { texto: `a categoria "${nomes[0]}"`, plural: false }
  const q = nomes.map((n) => `"${n}"`)
  return { texto: `as categorias ${q.slice(0, -1).join(', ')} e ${q.at(-1)}`, plural: true }
}

/**
 * Subcategoria de uma inscrição. Vazia é aceita (fica sem subcategoria). Preenchida, tem de ser um dos nomes
 * das subcategorias da categoria; diferenças só de maiúsculas, acentos ou espaços são corrigidas para o nome
 * como está cadastrado ("junior" → "Junior"). Devolve o valor a gravar ou a mensagem de erro.
 * `categoria` pode ser mais de um nome (corrida de categorias que largam juntas): a mensagem fala de todas.
 */
export function conferirSubcategoria(
  valor: unknown,
  subcategorias: Array<{ nome?: string | null } | null> | null | undefined,
  categoria?: string | string[] | null,
): { ok: true; valor: string | null } | { ok: false; mensagem: string } {
  if (valor === null || valor === undefined) return { ok: true, valor: null }
  if (typeof valor !== 'string') return { ok: false, mensagem: 'Escreva o nome da subcategoria.' }
  const digitado = valor.trim().replace(/\s+/g, ' ')
  if (!digitado) return { ok: true, valor: null }
  const nomes = nomesDasSubcategorias(subcategorias)
  const { texto: daCategoria, plural } = qualCategoria(categoria)
  if (!nomes.length) {
    return {
      ok: false,
      mensagem: `${daCategoria[0].toUpperCase()}${daCategoria.slice(1)} não ${plural ? 'têm' : 'tem'} subcategorias. Deixe este campo em branco.`,
    }
  }
  if (nomes.includes(digitado)) return { ok: true, valor: digitado }
  const parecidos = nomes.filter((n) => normalizarBusca(n) === normalizarBusca(digitado))
  if (parecidos.length === 1) return { ok: true, valor: parecidos[0] }
  return {
    ok: false,
    mensagem: `"${digitado}" não é uma subcategoria d${daCategoria}. Use exatamente um destes nomes: ${listaComOu(nomes)}.`,
  }
}

/**
 * Subcategorias de uma corrida (horário próprio de algumas subcategorias). Vazio = vale para todas. Cada nome
 * tem de ser uma subcategoria de uma das categorias da corrida (de qualquer uma, quando são várias); a grafia
 * é corrigida como na inscrição e nomes repetidos ficam uma vez só, na ordem digitada.
 */
export function conferirSubcategoriasDaCorrida(
  valor: unknown,
  categorias: Array<{ nome?: string | null; sigla?: string | null; subcategorias?: Array<{ nome?: string | null } | null> | null } | null>,
): { ok: true; valor: string[] } | { ok: false; mensagem: string } {
  if (valor === null || valor === undefined) return { ok: true, valor: [] }
  const lista = Array.isArray(valor) ? valor : [valor]
  // Subcategorias de todas as categorias da corrida, sem repetir (ordem: a de cada categoria).
  const todas = [...new Set(categorias.flatMap((c) => nomesDasSubcategorias(c?.subcategorias)))].map((nome) => ({ nome }))
  const rotulos = categorias.map((c) => c?.nome?.trim() || c?.sigla?.trim() || '').filter(Boolean)
  const saida: string[] = []
  for (const item of lista) {
    const conferida = conferirSubcategoria(item, todas, rotulos)
    if (!conferida.ok) return conferida
    if (conferida.valor && !saida.includes(conferida.valor)) saida.push(conferida.valor)
  }
  return { ok: true, valor: saida }
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

/**
 * Chave única de uma corrida: etapa + categorias + nome (sem acento/caixa). Impede "Final" duplicada.
 * Com subcategorias marcadas (horário próprio), elas entram no fim da chave: a "Tomada de tempo" dos Novatos
 * e a dos Graduados convivem na mesma categoria. Sem subcategorias, a chave é a de sempre.
 */
export function chaveCorrida(
  etapa: unknown,
  categorias: unknown[],
  nome: string | null | undefined,
  subcategorias?: Array<string | null | undefined> | null,
) {
  const ids = categorias
    .map((c) => idDe(c))
    .filter((c): c is ID => c !== null)
    .map(String)
    .sort()
  const subs = [...new Set((subcategorias ?? []).map((s) => normalizarBusca(s ?? '')).filter(Boolean))].sort()
  return `${idDe(etapa) ?? ''}|${ids.join(',')}|${normalizarBusca(nome ?? '')}${subs.length ? `|${subs.join(',')}` : ''}`
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
  /** Só nas sessões de uma subcategoria (horário próprio). */
  subcategorias?: string[]
  nome: string
  tipo: TipoCorrida
  tabela: string | null
  contaParaClassificacao: boolean
  fator: number
  status: 'rascunho'
  chaveUnica: string
}

/**
 * Sessões de cada subcategoria quando a temporada não tem o "Formato padrão das etapas" (pedido do cliente:
 * cada subcategoria tem warm-up, classificação, corrida 1 e corrida 2, cada um num horário). Warm-up não dá
 * pontos; a classificação (tomada de tempo) vale para a pole, sem pontos de tabela; as corridas pontuam pela
 * regra da temporada (tabela vazia = a primeira da regra).
 */
export const FORMATO_POR_SUBCATEGORIA: readonly Required<Pick<ItemFormato, 'nome' | 'tipo' | 'contaParaClassificacao'>>[] = [
  { nome: 'Warm-up', tipo: 'warm-up', contaParaClassificacao: false },
  { nome: 'Classificação', tipo: 'tomada-de-tempo', contaParaClassificacao: false },
  { nome: 'Corrida 1', tipo: 'bateria', contaParaClassificacao: true },
  { nome: 'Corrida 2', tipo: 'bateria', contaParaClassificacao: true },
]

/**
 * "Gerar corridas": formato da temporada × categorias da etapa, sem repetir as que já existem.
 * Cada categoria ganha suas corridas (uma categoria por corrida).
 *
 * Categoria COM subcategorias (`subcategoriasDe`): cada subcategoria ganha as suas sessões, com horário
 * próprio (corrida.subcategorias = [nome]) — as do formato da temporada ou, sem formato, Warm-up,
 * Classificação, Corrida 1 e Corrida 2 (FORMATO_POR_SUBCATEGORIA). Não repete a sessão que já existe para a
 * subcategoria nem a que já existe com o mesmo nome para a categoria inteira (vale para todas).
 * Categoria sem subcategorias: o formato da temporada, como sempre (sem formato, nada).
 */
export function planejarCorridas(
  etapa: ID,
  formato: ItemFormato[],
  categorias: ID[],
  chavesExistentes: Set<string>,
  subcategoriasDe?: Map<string, Array<{ nome?: string | null } | string | null> | null | undefined>,
): { criar: CorridaPlanejada[]; jaExistiam: number } {
  const criar: CorridaPlanejada[] = []
  let jaExistiam = 0
  const vistas = new Set(chavesExistentes)
  const doFormato = formato.filter((item) => item.nome?.trim())
  const planejar = (categoria: ID, item: ItemFormato, subcategoria: string | null) => {
    const nome = item.nome!.trim()
    const chave = chaveCorrida(etapa, [categoria], nome, subcategoria ? [subcategoria] : [])
    vistas.add(chave)
    criar.push({
      etapa,
      categorias: [categoria],
      ...(subcategoria ? { subcategorias: [subcategoria] } : {}),
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
  for (const categoria of categorias) {
    const subcategorias = [
      ...new Set(
        (subcategoriasDe?.get(String(categoria)) ?? [])
          .map((s) => (typeof s === 'string' ? s : s?.nome)?.trim() ?? '')
          .filter(Boolean),
      ),
    ]
    if (!subcategorias.length) {
      for (const item of doFormato) {
        if (vistas.has(chaveCorrida(etapa, [categoria], item.nome))) jaExistiam++
        else planejar(categoria, item, null)
      }
      continue
    }
    const sessoes: ItemFormato[] = doFormato.length ? doFormato : FORMATO_POR_SUBCATEGORIA.map((item) => ({ ...item }))
    for (const item of sessoes) {
      // Já existe para a categoria inteira (sem subcategoria): vale para todas, não cria uma por subcategoria
      if (vistas.has(chaveCorrida(etapa, [categoria], item.nome))) {
        jaExistiam++
        continue
      }
      for (const subcategoria of subcategorias) {
        if (vistas.has(chaveCorrida(etapa, [categoria], item.nome, [subcategoria]))) jaExistiam++
        else planejar(categoria, item, subcategoria)
      }
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
