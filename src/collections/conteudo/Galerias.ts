import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, lerPublicado, membros } from '../../access'
import { campoSlug } from '../../fields/slug'
import { camposPublicacao, preencherPublicarEm, somenteEditoresPublicam } from '../../fields/visibilidade'
import { campoTextoBusca, hookTextoBusca } from '../../lib/busca'
import { colaboradorSoRascunho, escreverRascunho, semLixeira } from './acesso'
import { OPCOES_EXIBICAO_GALERIA } from './bloco-galeria'
import {
  campoCampeonato,
  campoCategoriasKart,
  campoEtapa,
  campoPilotos,
  campoTemporada,
  FORMATO_DATA,
  GRUPO_CONTEUDO,
  REL,
  SO_IMAGENS,
  versoesEditoriais,
} from './comum'
import { completarAssociacoes, preencherCapaDaGaleria, slugUnico } from './hooks'

/**
 * Galerias de fotos (/galeria). As fotos ficam na coleção "Fotos e vídeos" (com legenda e crédito);
 * a galeria só escolhe quais e em que ordem. Basta escolher a etapa: temporada e campeonato vêm dela.
 */
export const Galerias: CollectionConfig = comAcessoRestrito({
  slug: 'galerias',
  labels: { singular: 'Galeria', plural: 'Galerias de fotos' },
  orderable: true,
  trash: true,
  versions: versoesEditoriais(),
  admin: {
    group: GRUPO_CONTEUDO,
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'capa', 'data', 'etapa', '_status'],
    listSearchableFields: ['titulo', 'textoBusca'],
    description:
      'Crie a galeria, clique em "Enviar novos" no campo Fotos e arraste várias fotos de uma vez. Arraste as fotos para mudar a ordem e as galerias para mudar a ordem no site.',
  },
  access: {
    read: semLixeira(lerPublicado),
    create: escreverRascunho,
    update: escreverRascunho,
    delete: editores,
    readVersions: membros,
  },
  fields: [
    { name: 'titulo', label: 'Título', type: 'text', required: true, maxLength: 160 },
    {
      name: 'fotos',
      label: 'Fotos',
      type: 'upload',
      relationTo: REL.midia,
      hasMany: true,
      required: true,
      filterOptions: SO_IMAGENS,
      admin: {
        isSortable: true,
        description:
          'Escolha fotos já enviadas ou envie novas (dá para enviar várias de uma vez). Arraste para mudar a ordem.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'capa',
          label: 'Capa',
          type: 'upload',
          relationTo: REL.midia,
          filterOptions: SO_IMAGENS,
          admin: { width: '50%', description: 'Opcional. Vazio = primeira foto da galeria.' },
        },
        {
          name: 'exibicao',
          label: 'Como mostrar no site',
          type: 'select',
          required: true,
          defaultValue: 'grade',
          options: OPCOES_EXIBICAO_GALERIA,
          admin: { width: '50%', description: 'Grade: fotos lado a lado. Carrossel: uma por vez. Mosaico: tamanhos variados.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'tipo',
          label: 'Assunto',
          type: 'select',
          index: true,
          options: [
            { label: 'Etapa / corrida', value: 'etapa' },
            { label: 'Treino', value: 'treino' },
            { label: 'Evento', value: 'evento' },
            { label: 'Kartódromo e estrutura', value: 'kartodromo' },
            { label: 'Institucional', value: 'institucional' },
            { label: 'Outro', value: 'outro' },
          ],
          admin: { width: '50%', description: 'Opcional. Usado para organizar e filtrar as galerias.' },
        },
        {
          name: 'data',
          label: 'Data das fotos',
          type: 'date',
          index: true,
          admin: { width: '50%', date: FORMATO_DATA, description: 'Opcional.' },
        },
      ],
    },
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'textarea',
      maxLength: 1000,
      admin: { description: 'Opcional.' },
    },
    {
      type: 'collapsible',
      label: 'Associações',
      admin: {
        initCollapsed: false,
        description: 'Onde mais a galeria aparece. Escolha a etapa e a temporada e o campeonato são preenchidos sozinhos.',
      },
      fields: [
        campoEtapa('Opcional. A galeria aparece na página da etapa.'),
        {
          type: 'row',
          fields: [
            campoTemporada('Preenchida sozinha pela etapa (ou escolha, se não houver etapa).', '50%'),
            campoCampeonato('Preenchido sozinho pela temporada.', '50%'),
          ],
        },
        {
          name: 'noticia',
          label: 'Notícia',
          type: 'relationship',
          relationTo: REL.noticias,
          index: true,
          admin: { description: 'Opcional. A galeria aparece no fim da notícia.' },
        },
        campoPilotos('Opcional. A galeria aparece na página dos pilotos escolhidos.'),
        campoCategoriasKart('Opcional.'),
      ],
    },
    campoSlug('titulo'),
    ...camposPublicacao(),
    campoTextoBusca(),
  ],
  hooks: {
    beforeOperation: [colaboradorSoRascunho],
    beforeValidate: [slugUnico(REL.galerias)],
    beforeChange: [
      somenteEditoresPublicam,
      preencherPublicarEm,
      preencherCapaDaGaleria,
      completarAssociacoes({ campeonato: true }),
      hookTextoBusca(['titulo', 'descricao']),
    ],
  },
})
