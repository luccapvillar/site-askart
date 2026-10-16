/**
 * Filtros da prévia: as mesmas regras que o público teria, sem exigir "publicado".
 *
 * As regras de leitura (src/access) já trazem visibilidade, agendamento, janela de exibição e lixeira.
 * Na prévia o site lê as últimas versões (`draft: true`); se a regra fosse aplicada como está, o
 * `_status = published` esconderia justamente os rascunhos. Então a regra é montada como para um
 * visitante anônimo e só as condições de `_status` saem.
 */
import type { Access, CollectionSlug, Payload, PayloadRequest, Where } from 'payload'

/** Tira as condições de `_status` de um filtro (`true` = sem restrição). */
export function semStatus(where: Where): Where | true {
  const saida: Where = {}
  for (const [chave, valor] of Object.entries(where)) {
    if (chave === '_status') continue
    if ((chave === 'and' || chave === 'or') && Array.isArray(valor)) {
      const partes = (valor as Where[]).map((w) => semStatus(w))
      // "ou" com um ramo sempre verdadeiro não restringe nada
      if (chave === 'or' && partes.some((p) => p === true)) continue
      const restantes = partes.filter((p): p is Where => p !== true)
      if (restantes.length) saida[chave] = restantes
      continue
    }
    saida[chave] = valor as Where[string]
  }
  return Object.keys(saida).length ? saida : true
}

/**
 * Regra de leitura do público para a coleção, sem `_status`.
 * `false` = o público não lê esta coleção (a prévia também não).
 */
export async function filtroDoPublicoSemStatus(payload: Payload, colecao: CollectionSlug): Promise<Where | boolean> {
  const regra = payload.collections[colecao]?.config.access?.read as Access | undefined
  if (!regra) return false
  const req = { user: null, payload, context: {}, headers: new Headers(), query: {} } as unknown as PayloadRequest
  const resultado = await regra({ req })
  if (typeof resultado === 'boolean') return resultado
  return semStatus(resultado as Where)
}
