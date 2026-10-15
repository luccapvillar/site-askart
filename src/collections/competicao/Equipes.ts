import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, lerVisivel } from '../../access'
import { campoVisibilidade } from '../../fields/visibilidade'
import { COLECOES } from '../../hooks/competicao/api'
import { buscaEquipe } from '../../hooks/competicao/cadastros'
import { bloquearExclusaoComVinculos } from '../../hooks/competicao/exclusao'
import { campoCidade, campoTextoBusca, campoUF, REL } from './campos'

/** Equipes. A equipe de cada piloto em cada temporada fica na inscrição. */
export const Equipes: CollectionConfig = comAcessoRestrito({
  slug: COLECOES.equipes,
  labels: { singular: 'Equipe', plural: 'Equipes' },
  defaultSort: 'nome',
  admin: {
    group: 'Competição',
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'sigla', 'cidade', 'uf', 'visibilidade'],
    listSearchableFields: ['nome', 'sigla', 'textoBusca'],
    description: 'Equipes dos pilotos. A equipe de cada piloto em cada temporada é escolhida na inscrição.',
  },
  access: {
    read: lerVisivel,
    create: editores,
    update: editores,
    delete: editores,
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'nome', label: 'Nome', type: 'text', required: true, admin: { width: '70%' } },
        { name: 'sigla', label: 'Sigla', type: 'text', admin: { width: '30%', description: 'Opcional.' } },
      ],
    },
    {
      name: 'logo',
      label: 'Logo',
      type: 'upload',
      relationTo: REL.midia,
      admin: { description: 'Opcional.' },
    },
    { type: 'row', fields: [campoCidade(), campoUF()] },
    campoVisibilidade(),
    campoTextoBusca(),
  ],
  hooks: {
    beforeChange: [buscaEquipe],
    beforeDelete: [bloquearExclusaoComVinculos({ alvo: COLECOES.equipes, oQue: 'esta equipe' })],
  },
})
