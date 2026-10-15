import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, membros, todos } from '../../access'
import { campoSlug } from '../../fields/slug'
import { GRUPO_CONTEUDO, REL } from './comum'
import { bloquearExclusaoEmUso, nomeUnico } from './hooks'

/**
 * Tags das notícias (filtro /noticias?tag=). Uma coleção, em vez de texto livre, evita variações
 * de grafia ("Kartódromo", "kartodromo"). Qualquer membro cria uma tag na hora, dentro da notícia;
 * renomear e excluir é com os editores.
 */
export const Tags: CollectionConfig = comAcessoRestrito({
  slug: 'tags',
  labels: { singular: 'Tag', plural: 'Tags' },
  defaultSort: 'nome',
  disableDuplicate: true,
  defaultPopulate: { nome: true, slug: true },
  admin: {
    group: GRUPO_CONTEUDO,
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'slug'],
    listSearchableFields: ['nome'],
    description: 'Palavras-chave das notícias. Podem ser criadas na própria notícia.',
  },
  access: {
    read: todos,
    create: membros,
    update: editores,
    delete: editores,
  },
  fields: [
    {
      name: 'nome',
      label: 'Nome',
      type: 'text',
      required: true,
      maxLength: 40,
      admin: { description: 'Curto e sem "#". Ex.: Treino livre.' },
    },
    campoSlug('nome'),
  ],
  hooks: {
    beforeValidate: [nomeUnico(REL.tags, 'uma tag')],
    beforeDelete: [
      bloquearExclusaoEmUso({ alvo: REL.tags, oQue: 'esta tag', dica: 'Tire a tag dessas notícias antes de excluir.' }),
    ],
  },
})
