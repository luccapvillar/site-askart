import type { GlobalConfig } from 'payload'
import { comAcessoRestrito, editores, lerGlobalPublicado, membros } from '../access'
import { editorPadrao } from '../collections/conteudo/editores'
import { campoImagem, GRUPO_SITE, RASCUNHO_GLOBAL, HOOKS_GLOBAL } from './comum'

/** Página "Sobre a ASKART": quem é, história, diretoria e documentos institucionais. */
export const Institucional: GlobalConfig = comAcessoRestrito(
  {
    slug: 'institucional',
    label: 'Sobre a ASKART',
    versions: RASCUNHO_GLOBAL,
    admin: { group: GRUPO_SITE, description: 'Textos institucionais da página "Sobre".' },
    access: { read: lerGlobalPublicado, update: editores, readVersions: membros },
    fields: [
      {
        type: 'tabs',
        tabs: [
          {
            label: 'Quem somos',
            fields: [
              { name: 'resumo', label: 'Resumo', type: 'textarea', maxLength: 300 },
              campoImagem('imagemTopo', 'Foto do topo'),
              { name: 'sobre', label: 'Texto de apresentação', type: 'richText', editor: editorPadrao },
              {
                name: 'pilares',
                label: 'Missão, visão e valores',
                labels: { singular: 'Item', plural: 'Itens' },
                type: 'array',
                maxRows: 6,
                fields: [
                  { name: 'titulo', label: 'Título', type: 'text', required: true, admin: { placeholder: 'Ex.: Missão' } },
                  { name: 'texto', label: 'Texto', type: 'textarea', required: true, maxLength: 400 },
                ],
              },
            ],
          },
          {
            label: 'História',
            fields: [
              { name: 'historia', label: 'História', type: 'richText', editor: editorPadrao },
              {
                name: 'marcos',
                label: 'Linha do tempo',
                labels: { singular: 'Marco', plural: 'Marcos' },
                type: 'array',
                admin: { description: 'Só fatos confirmados, do mais antigo para o mais recente.' },
                fields: [
                  {
                    type: 'row',
                    fields: [
                      { name: 'ano', label: 'Ano', type: 'number', required: true, min: 1900, max: 2100, admin: { width: '20%' } },
                      { name: 'titulo', label: 'Título', type: 'text', required: true, admin: { width: '80%' } },
                    ],
                  },
                  { name: 'texto', label: 'Texto', type: 'textarea', maxLength: 400 },
                ],
              },
            ],
          },
          {
            label: 'Diretoria',
            fields: [
              {
                name: 'diretoria',
                label: 'Diretoria',
                labels: { singular: 'Integrante', plural: 'Integrantes' },
                type: 'array',
                fields: [
                  {
                    type: 'row',
                    fields: [
                      { name: 'nome', label: 'Nome', type: 'text', required: true, admin: { width: '50%' } },
                      { name: 'cargo', label: 'Cargo', type: 'text', required: true, admin: { width: '50%' } },
                    ],
                  },
                  campoImagem('foto', 'Foto'),
                ],
              },
            ],
          },
          {
            label: 'Documentos e fotos',
            fields: [
              {
                name: 'documentos',
                label: 'Documentos institucionais',
                type: 'relationship',
                relationTo: 'documentos',
                hasMany: true,
                admin: { description: 'Ex.: estatuto, atas, prestação de contas.' },
              },
              { name: 'galeria', label: 'Galeria', type: 'relationship', relationTo: 'galerias' },
            ],
          },
        ],
      },
    ],
    hooks: HOOKS_GLOBAL,
  },
  'global',
)
