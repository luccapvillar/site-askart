import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, lerVisivel } from '../../access'
import { campoSlug } from '../../fields/slug'
import { campoVisibilidade } from '../../fields/visibilidade'
import { COLECOES } from '../../hooks/competicao/api'
import { buscaPorNomeESigla, propagarNomeCategoria } from '../../hooks/competicao/cadastros'
import { bloquearExclusaoComVinculos } from '../../hooks/competicao/exclusao'
import { slugSemColisao } from '../../hooks/competicao/slug'
import { campoCor, campoTextoBusca, REL } from './campos'

/**
 * Modalidade da categoria: divide a aba BKS do site em "Karts profissionais" e "Karts indoor". Uma etapa
 * aparece na área de cada modalidade que tiver pelo menos uma categoria nela.
 */
export const OPCOES_MODALIDADE = [
  { label: 'Karts profissionais', value: 'profissional' },
  { label: 'Karts indoor', value: 'indoor' },
] as const

export type ModalidadeCategoria = (typeof OPCOES_MODALIDADE)[number]['value']

/** Categorias de kart indoor informadas pelo cliente (só os nomes, exatamente como ele escreveu). */
export const CATEGORIAS_INDOOR_OFICIAIS = ['Novatos - 95KGs (15HP)', '80KGs (15HP)', '95KGs (15HP)', '110KGs (15HP)'] as const

/**
 * Categorias de kart (ex.: as categorias oficiais que a ASKART informar). Os pilotos de cada
 * categoria vêm das inscrições de cada temporada.
 */
export const Categorias: CollectionConfig = comAcessoRestrito({
  slug: COLECOES.categorias,
  labels: { singular: 'Categoria', plural: 'Categorias' },
  orderable: true,
  disableDuplicate: true,
  admin: {
    group: 'Competição',
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'modalidade', 'sigla', 'cor', 'visibilidade'],
    listSearchableFields: ['nome', 'sigla', 'textoBusca'],
    description:
      'Categorias de kart. Arraste para definir a ordem em que aparecem no site. Para tirar uma categoria do site, use "No site: Oculto" — excluir só é possível quando ela não tem histórico.',
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
        {
          name: 'nome',
          label: 'Nome',
          type: 'text',
          required: true,
          admin: { width: '70%', description: 'Nome como aparece no site e nas classificações.' },
        },
        {
          name: 'sigla',
          label: 'Sigla',
          type: 'text',
          admin: { width: '30%', description: 'Opcional. Usada em tabelas no celular.' },
        },
      ],
    },
    campoSlug('nome'),
    {
      name: 'modalidade',
      label: 'Modalidade',
      type: 'select',
      required: true,
      defaultValue: 'profissional',
      options: OPCOES_MODALIDADE.map((o) => ({ ...o })),
      admin: {
        description:
          'Em qual parte da aba BKS a categoria aparece no site: "Karts profissionais" ou "Karts indoor" (datas, horários, classificação e resultados de cada uma).',
      },
    },
    {
      name: 'subcategorias',
      label: 'Subcategorias',
      type: 'array',
      labels: { singular: 'Subcategoria', plural: 'Subcategorias' },
      admin: { description: 'Opcional. Só o nome de cada uma, na ordem em que aparecem no site (ex.: Novatos, Junior).' },
      fields: [{ name: 'nome', label: 'Nome', type: 'text', required: true, maxLength: 40 }],
    },
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'richText',
      admin: { description: 'Opcional. Ex.: faixa de idade, motor, peso mínimo — conforme o regulamento.' },
    },
    {
      name: 'imagem',
      label: 'Imagem',
      type: 'upload',
      relationTo: REL.midia,
      admin: { description: 'Opcional. Foto ou logo da categoria.' },
    },
    campoCor('Opcional. Cor de destaque da categoria no site, no formato #RRGGBB (ex.: #1A7F37).'),
    campoVisibilidade(),
    campoTextoBusca(),
  ],
  hooks: {
    beforeValidate: [slugSemColisao(COLECOES.categorias)],
    beforeChange: [buscaPorNomeESigla],
    afterChange: [propagarNomeCategoria],
    beforeDelete: [bloquearExclusaoComVinculos({ alvo: COLECOES.categorias, oQue: 'esta categoria' })],
  },
})
