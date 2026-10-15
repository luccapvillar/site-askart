import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, todos } from '../../access'
import { campoSlug } from '../../fields/slug'
import { GRUPO_CONTEUDO, REL } from './comum'
import { bloquearExclusaoEmUso, nomeUnico } from './hooks'

/**
 * Valores iniciais definidos na ARQUITETURA (§4). Não são criados sozinhos: a carga inicial
 * (migração/seed da frente plataforma) deve usar esta lista.
 */
export const TIPOS_DOCUMENTO_INICIAIS = [
  'Regulamento',
  'Comunicado',
  'Informativo',
  'Tabela',
  'Documento oficial',
  'Outro',
] as const

/** Tipos de documento (filtro da página /documentos). A ordem da lista é a do site: arraste para mudar. */
export const TiposDocumento: CollectionConfig = comAcessoRestrito({
  slug: 'tipos-documento',
  labels: { singular: 'Tipo de documento', plural: 'Tipos de documento' },
  orderable: true,
  disableDuplicate: true,
  defaultPopulate: { nome: true, slug: true },
  admin: {
    group: GRUPO_CONTEUDO,
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'slug'],
    listSearchableFields: ['nome'],
    description: 'Tipos usados para organizar os documentos (Regulamento, Comunicado…). Arraste para mudar a ordem no site.',
  },
  access: {
    read: todos,
    create: editores,
    update: editores,
    delete: editores,
  },
  fields: [
    {
      name: 'nome',
      label: 'Nome',
      type: 'text',
      required: true,
      maxLength: 60,
      admin: { description: 'Como aparece no filtro de documentos do site.' },
    },
    campoSlug('nome'),
  ],
  hooks: {
    beforeValidate: [nomeUnico(REL.tiposDocumento, 'um tipo de documento')],
    beforeDelete: [
      bloquearExclusaoEmUso({
        alvo: REL.tiposDocumento,
        oQue: 'este tipo de documento',
        dica: 'Troque o tipo desses documentos antes de excluir.',
      }),
    ],
  },
})
