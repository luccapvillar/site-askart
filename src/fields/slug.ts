/** Campo de endereço (slug) gerado a partir de outro campo, editável. */
import type { Field } from 'payload'

export const slugificar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)

export const campoSlug = (origem: string, opcoes: { unico?: boolean } = { unico: true }): Field => ({
  name: 'slug',
  label: 'Endereço (URL)',
  type: 'text',
  index: true,
  unique: opcoes.unico,
  admin: {
    position: 'sidebar',
    description: 'Gerado automaticamente. Só altere se precisar de um endereço diferente.',
  },
  hooks: {
    beforeValidate: [
      ({ value, data, originalDoc }) => {
        if (typeof value === 'string' && value.trim()) return slugificar(value)
        const base = data?.[origem] ?? originalDoc?.[origem]
        return typeof base === 'string' ? slugificar(base) : value
      },
    ],
  },
})
