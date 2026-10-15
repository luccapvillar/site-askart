import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, lerPublicado, membros } from '../../access'
import { campoSlug } from '../../fields/slug'
import { camposPublicacao, preencherPublicarEm, somenteEditoresPublicam } from '../../fields/visibilidade'
import { campoTextoBusca, hookTextoBusca } from '../../lib/busca'
import { colaboradorSoRascunho, escreverRascunho, semLixeira } from './acesso'
import { REGRAS_DOCUMENTOS, TIPOS_DOCUMENTO, validarArquivoEnviado } from './arquivos'
import { campoCampeonato, campoTemporada, FORMATO_DATA, GRUPO_CONTEUDO, idDe, REL } from './comum'
import { arquivarDocumentoSubstituido, bloquearExclusaoEmUso, completarAssociacoes, slugUnico } from './hooks'

/**
 * Regulamentos, comunicados em PDF, tabelas e outros arquivos oficiais.
 * Link público estável: /documentos/{endereço}/arquivo — sempre o arquivo atual. Para atualizar um
 * regulamento sem quebrar links já divulgados, abra o documento e envie o novo arquivo (o endereço não muda).
 * Para guardar a versão anterior separada, crie um documento novo e marque "Substitui": ao publicar,
 * o anterior é arquivado sozinho.
 */
export const Documentos: CollectionConfig = comAcessoRestrito({
  slug: 'documentos',
  labels: { singular: 'Documento', plural: 'Documentos e regulamentos' },
  orderable: true,
  trash: true,
  versions: { drafts: true, maxPerDoc: 50 },
  admin: {
    group: GRUPO_CONTEUDO,
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'tipo', 'revisao', 'vigenteDesde', 'temporada', '_status'],
    listSearchableFields: ['titulo', 'revisao', 'textoBusca', 'filename'],
    description:
      'Regulamentos e documentos oficiais (PDF, Word, Excel, CSV ou imagem; até 25 MB). Arraste para mudar a ordem na página de documentos.',
  },
  access: {
    read: semLixeira(lerPublicado),
    create: escreverRascunho,
    update: escreverRascunho,
    delete: editores,
    readVersions: membros,
  },
  upload: {
    mimeTypes: [...TIPOS_DOCUMENTO],
    focalPoint: false,
    crop: false,
    bulkUpload: false,
    // Imagens enviadas como documento são regravadas sem metadados (remove localização do celular)
    resizeOptions: { width: 4000, height: 4000, fit: 'inside', withoutEnlargement: true },
  },
  fields: [
    {
      name: 'titulo',
      label: 'Título',
      type: 'text',
      required: true,
      maxLength: 160,
      admin: { description: 'Como aparece na lista de documentos. Ex.: "Regulamento Técnico".' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'tipo',
          label: 'Tipo',
          type: 'relationship',
          relationTo: REL.tiposDocumento,
          index: true,
          admin: { width: '40%', allowCreate: false, description: 'Usado no filtro da página de documentos.' },
        },
        {
          name: 'revisao',
          label: 'Revisão',
          type: 'text',
          maxLength: 40,
          admin: { width: '30%', placeholder: 'Rev. 1', description: 'Opcional. Ex.: "Rev. 2".' },
        },
        {
          name: 'vigenteDesde',
          label: 'Vigente desde',
          type: 'date',
          admin: { width: '30%', date: FORMATO_DATA, description: 'Opcional.' },
        },
      ],
    },
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'textarea',
      maxLength: 600,
      admin: { description: 'Opcional. Resumo do que o documento trata.' },
    },
    {
      name: 'substitui',
      label: 'Substitui',
      type: 'relationship',
      relationTo: REL.documentos,
      filterOptions: ({ id }) => (idDe(id) !== null ? { id: { not_equals: id } } : true),
      admin: {
        description:
          'Opcional. Se este documento é a nova versão de outro, escolha o anterior: ao publicar este, o anterior vai para "Arquivado" (continua acessível no histórico).',
      },
    },
    {
      type: 'collapsible',
      label: 'Campeonato relacionado',
      admin: { initCollapsed: false, description: 'Opcional. Usado nos filtros por temporada e categoria.' },
      fields: [
        campoCampeonato('Opcional. Preenchido sozinho quando você escolhe a temporada.'),
        campoTemporada(),
        {
          name: 'categoria',
          label: 'Categoria de kart',
          type: 'relationship',
          relationTo: REL.categorias,
          index: true,
          admin: { description: 'Opcional. Para documentos de uma categoria só.' },
        },
      ],
    },
    campoSlug('titulo'),
    ...camposPublicacao(),
    campoTextoBusca(),
  ],
  hooks: {
    beforeOperation: [colaboradorSoRascunho, validarArquivoEnviado(REGRAS_DOCUMENTOS)],
    beforeValidate: [slugUnico(REL.documentos)],
    beforeChange: [
      somenteEditoresPublicam,
      preencherPublicarEm,
      completarAssociacoes({ campeonato: true }),
      hookTextoBusca(['titulo', 'revisao', 'descricao', 'filename']),
    ],
    afterChange: [arquivarDocumentoSubstituido],
    beforeDelete: [
      bloquearExclusaoEmUso({
        alvo: REL.documentos,
        oQue: 'este documento',
        dica: 'Para tirar do site sem perder o histórico, mude "No site" para Oculto ou Arquivado.',
      }),
    ],
  },
})
