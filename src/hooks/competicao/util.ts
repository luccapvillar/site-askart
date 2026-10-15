/**
 * Utilitários puros da frente Competição (sem banco): ids de relacionamento, comparação de
 * campos alterados e validação de ids vindos de URL. Testados em tests/int/competicao.int.spec.ts.
 */

export type ID = number | string

/** Relacionamento como chega nos hooks: id, documento populado ou vazio. */
export type Rel = ID | { id: ID } | null | undefined

/** Extrai o id de um relacionamento (id puro ou documento populado). */
export function idDe(valor: unknown): ID | null {
  if (valor === null || valor === undefined || valor === '') return null
  if (typeof valor === 'number' || typeof valor === 'string') return valor
  if (typeof valor === 'object' && 'id' in (valor as object)) {
    const id = (valor as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

/** Ids de um relacionamento múltiplo, sem vazios e sem repetição (mantém a ordem). */
export function idsDe(valor: unknown): ID[] {
  if (!Array.isArray(valor)) return []
  const vistos = new Set<string>()
  const ids: ID[] = []
  for (const item of valor) {
    const id = idDe(item)
    if (id === null || vistos.has(String(id))) continue
    vistos.add(String(id))
    ids.push(id)
  }
  return ids
}

/** Compara ids sem se importar se vieram como número ou texto ("12" === 12). */
export const mesmoId = (a: unknown, b: unknown) => {
  const x = idDe(a)
  const y = idDe(b)
  return x !== null && y !== null && String(x) === String(y)
}

export const contemId = (lista: ID[], id: unknown) => lista.some((x) => mesmoId(x, id))

/**
 * Forma comparável de um valor: documentos populados viram id, objetos têm as chaves ordenadas
 * e datas viram o instante em milissegundos (o painel e o banco formatam ISO de jeitos diferentes).
 */
function comparavel(valor: unknown): unknown {
  if (valor === undefined || valor === '') return null
  // Lista vazia e ausência valem o mesmo
  if (Array.isArray(valor)) return valor.length ? valor.map(comparavel) : null
  if (valor && typeof valor === 'object') {
    const obj = valor as Record<string, unknown>
    // Documento populado de um relacionamento: compara só o id
    if ('id' in obj && ('createdAt' in obj || 'updatedAt' in obj)) return idDe(obj)
    const saida: Record<string, unknown> = {}
    for (const chave of Object.keys(obj).sort()) {
      const v = comparavel(obj[chave])
      // Subcampo vazio e subcampo ausente valem o mesmo
      if (v !== null) saida[chave] = v
    }
    return Object.keys(saida).length ? saida : null
  }
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
    const t = Date.parse(valor)
    if (!Number.isNaN(t)) return t
  }
  if (typeof valor === 'number' || (typeof valor === 'string' && /^\d+$/.test(valor))) {
    // ids e números podem chegar como texto ou número
    return String(valor)
  }
  return valor
}

/** Campos de sistema que nunca contam como "alteração do usuário". */
const CAMPOS_DE_SISTEMA = new Set(['id', 'createdAt', 'updatedAt', 'deletedAt', '_order', 'titulo', 'textoBusca'])

/**
 * Lista os campos de primeiro nível que mudaram entre o documento salvo e os dados novos.
 * Campos ausentes nos dados novos são considerados inalterados.
 */
export function camposAlterados(
  novos: Record<string, unknown> | undefined,
  antigos: Record<string, unknown> | undefined,
  ignorar: string[] = [],
): string[] {
  if (!novos) return []
  const ignorados = new Set([...CAMPOS_DE_SISTEMA, ...ignorar])
  const alterados: string[] = []
  for (const chave of Object.keys(novos)) {
    if (ignorados.has(chave)) continue
    if (novos[chave] === undefined) continue
    const a = JSON.stringify(comparavel(novos[chave]))
    const b = JSON.stringify(comparavel(antigos?.[chave]))
    if (a !== b) alterados.push(chave)
  }
  return alterados
}

/** Mudou algum dos campos indicados? (usado em afterChange para evitar trabalho à toa) */
export function mudouAlgum(
  novo: Record<string, unknown> | undefined,
  anterior: Record<string, unknown> | undefined,
  campos: string[],
): boolean {
  if (!anterior) return true
  return campos.some(
    (campo) => JSON.stringify(comparavel(novo?.[campo])) !== JSON.stringify(comparavel(anterior[campo])),
  )
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Valida um id vindo da URL de um endpoint: inteiro positivo (Postgres) ou UUID. */
export function idDaRota(valor: unknown): ID | null {
  if (typeof valor === 'number' && Number.isInteger(valor) && valor > 0) return valor
  if (typeof valor !== 'string') return null
  const texto = valor.trim()
  if (/^\d{1,15}$/.test(texto) && Number(texto) > 0) return Number(texto)
  if (UUID.test(texto)) return texto
  return null
}

/** Remove os `id` das linhas de arrays (para copiar listas de um documento para outro). */
export function semIdsDeLinha<T extends Record<string, unknown>>(linhas: T[] | null | undefined): Omit<T, 'id'>[] {
  if (!Array.isArray(linhas)) return []
  return linhas.map((linha) => {
    const { id: _id, ...resto } = linha
    for (const [chave, valor] of Object.entries(resto)) {
      if (Array.isArray(valor) && valor.every((v) => v && typeof v === 'object' && !('createdAt' in v))) {
        ;(resto as Record<string, unknown>)[chave] = semIdsDeLinha(valor as Record<string, unknown>[])
      }
    }
    return resto
  })
}
