/**
 * Bloco "Galeria": mostra uma galeria cadastrada no meio de um texto (notícias) ou de uma página livre.
 * Usado nos dois lugares com o mesmo formato, para o site renderizar de um jeito só.
 */
import type { Block } from 'payload'
import { REL } from './comum'

export const OPCOES_EXIBICAO_GALERIA = [
  { label: 'Grade', value: 'grade' },
  { label: 'Carrossel', value: 'carrossel' },
  { label: 'Mosaico', value: 'mosaico' },
]

export const blocoGaleria: Block = {
  slug: 'galeria',
  labels: { singular: 'Galeria de fotos', plural: 'Galerias de fotos' },
  fields: [
    {
      name: 'galeria',
      label: 'Galeria',
      type: 'relationship',
      relationTo: REL.galerias,
      required: true,
      admin: { description: 'Escolha uma galeria já cadastrada (ou crie uma nova pelo botão +).' },
    },
    {
      name: 'exibicao',
      label: 'Como mostrar',
      type: 'select',
      defaultValue: 'padrao',
      options: [{ label: 'Como definido na galeria', value: 'padrao' }, ...OPCOES_EXIBICAO_GALERIA],
    },
  ],
}
