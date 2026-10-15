import type { Block, CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, lerPublicado, membros } from '../../access'
import { campoLink } from '../../fields/link'
import { campoSlug } from '../../fields/slug'
import { camposPublicacao, preencherPublicarEm, somenteEditoresPublicam } from '../../fields/visibilidade'
import { campoTextoBusca, hookTextoBusca } from '../../lib/busca'
import { colaboradorSoRascunho, escreverRascunho, semLixeira } from './acesso'
import { blocoGaleria } from './bloco-galeria'
import { GRUPO_CONTEUDO, REL, SO_IMAGENS, versoesEditoriais } from './comum'
import { editorPadrao } from './editores'
import { enderecoDePagina, slugUnico } from './hooks'
import { campoVideoExterno } from './video-externo'

/** Blocos de uma página livre: texto, imagem, galeria, botão, vídeo e documento. */
const blocos: Block[] = [
  {
    slug: 'texto',
    labels: { singular: 'Texto', plural: 'Textos' },
    fields: [{ name: 'texto', label: 'Texto', type: 'richText', editor: editorPadrao, required: true }],
  },
  {
    slug: 'imagem',
    labels: { singular: 'Imagem', plural: 'Imagens' },
    fields: [
      { name: 'imagem', label: 'Imagem', type: 'upload', relationTo: REL.midia, filterOptions: SO_IMAGENS, required: true },
      { name: 'legenda', label: 'Legenda', type: 'text', maxLength: 200 },
      {
        name: 'largura',
        label: 'Largura',
        type: 'select',
        defaultValue: 'texto',
        options: [
          { label: 'Mesma largura do texto', value: 'texto' },
          { label: 'Larga', value: 'larga' },
          { label: 'Tela inteira', value: 'tela' },
        ],
      },
    ],
  },
  blocoGaleria,
  {
    slug: 'botao',
    labels: { singular: 'Botão', plural: 'Botões' },
    fields: [campoLink({ name: 'link', label: 'Botão', required: true, rotuloTexto: 'Texto do botão' })],
  },
  {
    slug: 'video',
    labels: { singular: 'Vídeo', plural: 'Vídeos' },
    fields: [campoVideoExterno('Link do YouTube ou Vimeo.', 'url'), { name: 'legenda', label: 'Legenda', type: 'text', maxLength: 200 }],
  },
  {
    slug: 'documento',
    labels: { singular: 'Documento', plural: 'Documentos' },
    fields: [
      { name: 'documento', label: 'Documento', type: 'relationship', relationTo: REL.documentos, required: true },
      { name: 'texto', label: 'Texto do link', type: 'text', maxLength: 120, admin: { description: 'Opcional. Padrão: o título do documento.' } },
    ],
  },
]

/**
 * Páginas livres (ex.: "Como se tornar piloto", "Regras de convivência"). Ficam em /<endereço>
 * e podem entrar no menu pela Navegação.
 */
export const Paginas: CollectionConfig = comAcessoRestrito({
  slug: 'paginas',
  labels: { singular: 'Página', plural: 'Páginas' },
  trash: true,
  orderable: true,
  versions: versoesEditoriais(),
  admin: {
    group: GRUPO_CONTEUDO,
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'slug', '_status', 'updatedAt'],
    listSearchableFields: ['titulo', 'textoBusca'],
    description: 'Páginas com conteúdo livre, montadas em blocos (texto, imagem, galeria, botão, vídeo, documento).',
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
    { name: 'resumo', label: 'Resumo', type: 'textarea', maxLength: 300, admin: { description: 'Opcional. Aparece abaixo do título e no Google.' } },
    { name: 'imagemTopo', label: 'Imagem de topo', type: 'upload', relationTo: REL.midia, filterOptions: SO_IMAGENS },
    {
      name: 'blocos',
      label: 'Conteúdo',
      type: 'blocks',
      blocks: blocos,
      admin: { description: 'Adicione os blocos na ordem em que devem aparecer. Arraste para reordenar.' },
    },
    campoSlug('titulo'),
    ...camposPublicacao(),
    campoTextoBusca(),
  ],
  hooks: {
    beforeOperation: [colaboradorSoRascunho],
    beforeValidate: [slugUnico(REL.paginas, { ajustar: enderecoDePagina })],
    beforeChange: [somenteEditoresPublicam, preencherPublicarEm, hookTextoBusca(['titulo', 'resumo', 'blocos'])],
  },
})
