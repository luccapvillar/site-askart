import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, lerVisivel, somenteAdmin } from '../../access'
import { campoSlug } from '../../fields/slug'
import { campoVisibilidade } from '../../fields/visibilidade'
import { COLECOES } from '../../hooks/competicao/api'
import {
  buscaPorNomeESigla,
  propagarNomeCampeonato,
  validarTemporadaAtual,
} from '../../hooks/competicao/cadastros'
import { bloquearExclusaoComVinculos } from '../../hooks/competicao/exclusao'
import { slugSemColisao } from '../../hooks/competicao/slug'
import { campoCor } from '../conteudo/comum'
import { campoTextoBusca, REL } from './campos'

/** Campeonatos organizados pela ASKART. Cada um tem várias temporadas (2026, 2027…). */
export const Campeonatos: CollectionConfig = comAcessoRestrito({
  slug: COLECOES.campeonatos,
  labels: { singular: 'Campeonato', plural: 'Campeonatos' },
  orderable: true,
  disableDuplicate: true,
  admin: {
    group: 'Competição',
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'sigla', 'temporadaAtual', 'visibilidade'],
    listSearchableFields: ['nome', 'sigla', 'textoBusca'],
    description:
      'Campeonatos e a temporada atual de cada um. A "temporada atual" é a que aparece em destaque no site e no painel.',
  },
  access: {
    read: lerVisivel,
    create: editores,
    update: editores,
    // Estrutural: só o administrador exclui (e só se não houver temporadas)
    delete: somenteAdmin,
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
      name: 'temporadaAtual',
      label: 'Temporada atual',
      type: 'relationship',
      relationTo: REL.temporadas,
      filterOptions: ({ id }) => (id ? { campeonato: { equals: id } } : { campeonato: { exists: false } }),
      admin: {
        // Só faz sentido depois que o campeonato existe e tem temporadas
        condition: (data) => Boolean(data?.id),
        description:
          'Fonte única de "temporada atual" do site e do painel. Ao virar o ano, troque aqui (ou use "Criar próxima temporada").',
      },
    },
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'richText',
      admin: { description: 'Opcional. Apresentação do campeonato.' },
    },
    {
      type: 'row',
      fields: [
        { name: 'logo', label: 'Logo', type: 'upload', relationTo: REL.midia, admin: { width: '50%' } },
        {
          name: 'banner',
          label: 'Banner',
          type: 'upload',
          relationTo: REL.midia,
          admin: { width: '50%', description: 'Imagem larga do topo da página do campeonato.' },
        },
      ],
    },
    {
      name: 'cores',
      label: 'Cores do campeonato',
      type: 'group',
      admin: {
        description:
          'Opcional. Usadas na aba do campeonato (ex.: BKS em vermelho, azul e branco). Sem cores, o site usa as da ASKART.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            campoCor('Cor principal (faixas e títulos).', 'primaria', 'Principal'),
            campoCor('Cor de apoio (botões e detalhes).', 'secundaria', 'Secundária'),
            campoCor('Cor de destaque (pequenos detalhes).', 'destaque', 'Destaque'),
          ],
        },
      ],
    },
    {
      name: 'historia',
      label: 'História do campeonato',
      type: 'richText',
      admin: { description: 'Opcional. Aparece na sub-aba "História", acima da lista de campeões de cada temporada.' },
    },
    {
      name: 'regulamento',
      label: 'Regulamento',
      type: 'relationship',
      relationTo: 'documentos',
      admin: { description: 'Opcional. Documento do regulamento em vigor (cadastre antes em Documentos).' },
    },
    {
      name: 'temporadas',
      label: 'Temporadas',
      type: 'join',
      collection: REL.temporadas,
      on: 'campeonato',
      defaultSort: '-ano',
      admin: { defaultColumns: ['nome', 'ano', 'status', 'visibilidade'] },
    },
    campoSlug('nome'),
    campoVisibilidade(),
    campoTextoBusca(),
  ],
  hooks: {
    beforeValidate: [validarTemporadaAtual, slugSemColisao(COLECOES.campeonatos)],
    beforeChange: [buscaPorNomeESigla],
    afterChange: [propagarNomeCampeonato],
    beforeDelete: [bloquearExclusaoComVinculos({ alvo: COLECOES.campeonatos, oQue: 'este campeonato' })],
  },
})
