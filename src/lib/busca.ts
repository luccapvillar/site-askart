/**
 * Busca sem acento (docs/ARQUITETURA.md §5): o Postgres diferencia "Guará" de "Guara" e "João" de "Joao".
 * Por isso cada coleção pesquisável guarda, num campo oculto `textoBusca`, os seus textos principais
 * normalizados (sem acento, minúsculos, espaços simples). O site e o painel pesquisam nesse campo
 * com o termo também normalizado.
 *
 * Mesmo critério de src/hooks/competicao/texto.ts (frente Competição): se mudar aqui, mude lá também.
 */
import type { CollectionBeforeChangeHook, Field, FieldAccess } from 'payload'

/** Tamanho máximo guardado (o começo de um texto longo já basta para a busca). */
export const LIMITE_TEXTO_BUSCA = 20_000

type Parte = string | number | null | undefined | false

/**
 * "  João   da SILVA " → "joao da silva". Aceita várias partes, que são unidas por espaço
 * (valores vazios são ignorados).
 */
export function normalizarBusca(...partes: Parte[]): string {
  return partes
    .filter((p): p is string | number => p !== null && p !== undefined && p !== false && p !== '')
    .map(String)
    .join(' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Valor de um caminho com pontos ("grupo.campo") dentro de um objeto. */
function valorNoCaminho(obj: unknown, caminho: string): unknown {
  let atual: unknown = obj
  for (const parte of caminho.split('.')) {
    if (atual === null || atual === undefined || typeof atual !== 'object') return undefined
    atual = (atual as Record<string, unknown>)[parte]
  }
  return atual
}

/**
 * Junta os textos de um nó de rich text (Lexical): só os nós de texto (`type: "text"`), em ordem.
 * Também percorre blocos e listas (ex.: os blocos de uma página), ignorando ids, tipos e demais campos técnicos.
 */
function textosDeEstrutura(valor: unknown, saida: string[], profundidade = 0): void {
  if (profundidade > 40 || valor === null || valor === undefined) return
  if (Array.isArray(valor)) {
    for (const item of valor) textosDeEstrutura(item, saida, profundidade + 1)
    return
  }
  if (typeof valor !== 'object') return
  const no = valor as Record<string, unknown>
  if (no.type === 'text' && typeof no.text === 'string') {
    saida.push(no.text)
    return
  }
  for (const filho of Object.values(no)) {
    if (filho && typeof filho === 'object') textosDeEstrutura(filho, saida, profundidade + 1)
  }
}

/**
 * Texto "legível" de um valor de campo: texto/número direto, lista de textos ou rich text (Lexical).
 * Relacionamentos (ids) não entram.
 */
export function textoDe(valor: unknown): string {
  if (valor === null || valor === undefined || valor === false) return ''
  if (typeof valor === 'string') return valor
  if (typeof valor === 'number') return String(valor)
  if (Array.isArray(valor) && valor.every((v) => typeof v === 'string' || typeof v === 'number')) {
    return valor.join(' ')
  }
  const saida: string[] = []
  textosDeEstrutura(valor, saida)
  return saida.join(' ')
}

/** Monta o texto de busca a partir dos campos indicados de um documento. */
export function montarTextoBusca(doc: Record<string, unknown>, campos: string[]): string {
  const texto = normalizarBusca(...campos.map((campo) => textoDe(valorNoCaminho(doc, campo))))
  return texto.length > LIMITE_TEXTO_BUSCA ? texto.slice(0, LIMITE_TEXTO_BUSCA) : texto
}

/**
 * beforeChange da coleção: grava `textoBusca` com os campos indicados (aceita "grupo.campo").
 * Usa o valor novo e, se ele não vier na requisição, o valor que já estava salvo.
 */
export const hookTextoBusca =
  (campos: string[]): CollectionBeforeChangeHook =>
  ({ data, originalDoc }) => {
    if (!data) return data
    const atual: Record<string, unknown> = { ...(originalDoc ?? {}), ...data }
    data.textoBusca = montarTextoBusca(atual, campos) || null
    return data
  }

const ninguemDigita: FieldAccess = () => false

/**
 * Campo oculto `textoBusca`, com índice. Ninguém digita nele: é preenchido por `hookTextoBusca`
 * (o hook da coleção roda depois da checagem de acesso dos campos, então o valor calculado é mantido).
 */
export const campoTextoBusca = (): Field => ({
  name: 'textoBusca',
  label: 'Texto de busca',
  type: 'text',
  index: true,
  access: { create: ninguemDigita, update: ninguemDigita },
  admin: { hidden: true, disableBulkEdit: true },
})
