/**
 * Endereço (slug) sem colisão: se "joao-silva" já existe, usa "joao-silva-2", "joao-silva-3"…
 * Evita o erro técnico de "valor único" quando dois pilotos/categorias têm o mesmo nome.
 * Roda no beforeValidate da coleção, depois que o campo slug (src/fields/slug.ts) já foi gerado.
 */
import type { CollectionBeforeValidateHook, Where } from 'payload'
import { buscar, type SlugCompeticao } from './api'
import { idDe } from './util'

export function slugSemColisao(slugColecao: SlugCompeticao, opcoes: { escopo?: string } = {}): CollectionBeforeValidateHook {
  return async ({ data, originalDoc, req }) => {
    if (!data) return data
    const base = typeof data.slug === 'string' ? data.slug : null
    if (!base) return data
    const id = idDe(originalDoc?.id)
    const condicoes: Where[] = [{ slug: { like: base } }]
    if (id !== null) condicoes.push({ id: { not_equals: id } })
    if (opcoes.escopo) {
      const escopo = idDe(data[opcoes.escopo] ?? originalDoc?.[opcoes.escopo])
      if (escopo !== null) condicoes.push({ [opcoes.escopo]: { equals: escopo } })
    }
    const parecidos = await buscar<{ slug?: string | null }>(req, slugColecao, { where: { and: condicoes } })
    const usados = new Set(parecidos.map((d) => d.slug).filter(Boolean))
    if (!usados.has(base)) return data
    let n = 2
    while (usados.has(`${base}-${n}`)) n++
    data.slug = `${base}-${n}`
    return data
  }
}
