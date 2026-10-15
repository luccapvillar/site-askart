import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, todos } from '../../access'
import { campoSlug } from '../../fields/slug'
import { campoCor, GRUPO_CONTEUDO, REL } from './comum'
import { bloquearExclusaoEmUso, nomeUnico } from './hooks'

/**
 * Categorias de notícia (filtro /noticias?categoria=). Não confundir com as categorias de kart
 * (Competição). Ex.: uma categoria "Kartódromo" reúne as notícias que aparecem na página do kartódromo.
 */
export const CategoriasNoticia: CollectionConfig = comAcessoRestrito({
  slug: 'categorias-noticia',
  labels: { singular: 'Categoria de notícia', plural: 'Categorias de notícia' },
  defaultSort: 'nome',
  disableDuplicate: true,
  defaultPopulate: { nome: true, slug: true, cor: true },
  admin: {
    group: GRUPO_CONTEUDO,
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'cor', 'slug'],
    listSearchableFields: ['nome'],
    description: 'Assuntos das notícias. Cada notícia tem uma categoria; o site permite filtrar por ela.',
  },
  access: {
    read: todos,
    create: editores,
    update: editores,
    delete: editores,
  },
  fields: [
    { name: 'nome', label: 'Nome', type: 'text', required: true, maxLength: 60 },
    campoCor('Opcional. Cor da etiqueta da categoria no site, no formato #RRGGBB.'),
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'textarea',
      maxLength: 300,
      admin: { description: 'Opcional. Texto curto mostrado no topo da lista de notícias desta categoria.' },
    },
    campoSlug('nome'),
  ],
  hooks: {
    beforeValidate: [nomeUnico(REL.categoriasNoticia, 'uma categoria de notícia')],
    beforeDelete: [
      bloquearExclusaoEmUso({
        alvo: REL.categoriasNoticia,
        oQue: 'esta categoria',
        dica: 'Troque a categoria dessas notícias antes de excluir.',
      }),
    ],
  },
})
