import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, lerPublicadoNaJanela, membros } from '../../access'
import { camposJanela, camposPublicacao, preencherPublicarEm, somenteEditoresPublicam } from '../../fields/visibilidade'
import { campoTextoBusca, hookTextoBusca } from '../../lib/busca'
import { colaboradorSoRascunho, escreverRascunho, semLixeira } from './acesso'
import { GRUPO_CONTEUDO, REL, versoesEditoriais } from './comum'
import { editorSimples } from './editores'
import { exigirIntervalo } from './hooks'

export const TIPOS_AVISO = [
  { label: 'Alteração de treino', value: 'alteracao-treino' },
  { label: 'Alteração de etapa', value: 'alteracao-etapa' },
  { label: 'Mudança de horário', value: 'mudanca-horario' },
  { label: 'Cancelamento', value: 'cancelamento' },
  { label: 'Comunicado oficial', value: 'comunicado-oficial' },
  { label: 'Informação importante', value: 'informacao-importante' },
]

export const NIVEIS_AVISO = [
  { label: 'Informativo', value: 'informativo' },
  { label: 'Atenção', value: 'atencao' },
  { label: 'Urgente', value: 'urgente' },
]

/**
 * Avisos e comunicados oficiais (/comunicados). Os marcados como destaque aparecem na barra do topo
 * do site enquanto estiverem no período de exibição.
 */
export const Avisos: CollectionConfig = comAcessoRestrito({
  slug: 'avisos',
  labels: { singular: 'Aviso', plural: 'Avisos e comunicados' },
  trash: true,
  versions: versoesEditoriais(),
  defaultSort: '-publicarEm',
  admin: {
    group: GRUPO_CONTEUDO,
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'tipo', 'nivel', 'destaque', 'exibirAte', '_status'],
    listSearchableFields: ['titulo', 'textoBusca'],
    description:
      'Comunicados oficiais e avisos rápidos (mudança de treino, de etapa, cancelamento…). Use "Exibir até" para o aviso sair do site sozinho.',
  },
  access: {
    read: semLixeira(lerPublicadoNaJanela),
    create: escreverRascunho,
    update: escreverRascunho,
    delete: editores,
    readVersions: membros,
  },
  fields: [
    { name: 'titulo', label: 'Título', type: 'text', required: true, maxLength: 160 },
    {
      type: 'row',
      fields: [
        {
          name: 'tipo',
          label: 'Tipo',
          type: 'select',
          required: true,
          defaultValue: 'comunicado-oficial',
          index: true,
          options: TIPOS_AVISO,
          admin: { width: '50%' },
        },
        {
          name: 'nivel',
          label: 'Nível',
          type: 'select',
          required: true,
          defaultValue: 'informativo',
          index: true,
          options: NIVEIS_AVISO,
          admin: { width: '50%', description: 'Define a cor do aviso. Use "Urgente" só para o que muda a vida do piloto hoje.' },
        },
      ],
    },
    {
      name: 'texto',
      label: 'Texto',
      type: 'richText',
      editor: editorSimples,
      required: true,
    },
    {
      name: 'destaque',
      label: 'Mostrar na barra do topo do site',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { description: 'Marque para avisos que todos precisam ver. Sai da barra sozinho depois de "Exibir até".' },
    },
    {
      name: 'anexo',
      label: 'Documento anexo',
      type: 'relationship',
      relationTo: REL.documentos,
      admin: { description: 'Opcional. Ex.: o PDF do comunicado oficial (cadastrado em Documentos).' },
    },
    {
      type: 'collapsible',
      label: 'Relacionado a',
      admin: { initCollapsed: false, description: 'Opcional. O aviso aparece também na página da etapa ou na agenda de treinos.' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'etapa',
              label: 'Etapa',
              type: 'relationship',
              relationTo: REL.etapas,
              index: true,
              admin: { width: '50%' },
            },
            {
              name: 'treino',
              label: 'Treino',
              type: 'relationship',
              relationTo: REL.treinos,
              index: true,
              admin: { width: '50%' },
            },
          ],
        },
      ],
    },
    ...camposPublicacao(),
    ...camposJanela(),
    campoTextoBusca(),
  ],
  hooks: {
    beforeOperation: [colaboradorSoRascunho],
    beforeValidate: [
      exigirIntervalo({ inicio: 'exibirDe', fim: 'exibirAte', mensagem: '"Exibir até" precisa ser depois de "Exibir a partir de".' }),
    ],
    beforeChange: [somenteEditoresPublicam, preencherPublicarEm, hookTextoBusca(['titulo', 'texto'])],
  },
})
