import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, lerVisivel, membros } from '../../access'
import { campoVisibilidade } from '../../fields/visibilidade'
import { campoTextoBusca, hookTextoBusca } from '../../lib/busca'
import { GRUPO_CONTEUDO } from './comum'
import { editorSimples } from './editores'

/** Perguntas frequentes (pedido do cliente: "aba com dúvidas recorrentes"). Arraste para ordenar. */
export const Perguntas: CollectionConfig = comAcessoRestrito({
  slug: 'perguntas',
  labels: { singular: 'Pergunta frequente', plural: 'Perguntas frequentes' },
  orderable: true,
  trash: true,
  admin: {
    group: GRUPO_CONTEUDO,
    useAsTitle: 'pergunta',
    defaultColumns: ['pergunta', 'secao', 'visibilidade'],
    listSearchableFields: ['pergunta', 'textoBusca'],
    description: 'Dúvidas recorrentes, mostradas na aba do kartódromo, na do BKS e na página de contato.',
  },
  access: { read: lerVisivel, create: editores, update: editores, delete: editores, readVersions: membros },
  fields: [
    { name: 'pergunta', label: 'Pergunta', type: 'text', required: true, maxLength: 200 },
    { name: 'resposta', label: 'Resposta', type: 'richText', editor: editorSimples, required: true },
    {
      name: 'secao',
      label: 'Onde aparece',
      type: 'select',
      required: true,
      defaultValue: 'kartodromo',
      options: [
        { label: 'Kartódromo (treinos, taxas, como chegar)', value: 'kartodromo' },
        { label: 'BKS (campeonato, inscrições, regulamento)', value: 'bks' },
        { label: 'Geral (contato e outros assuntos)', value: 'geral' },
      ],
    },
    campoVisibilidade(),
    campoTextoBusca(),
  ],
  hooks: { beforeChange: [hookTextoBusca(['pergunta', 'resposta'])] },
})
