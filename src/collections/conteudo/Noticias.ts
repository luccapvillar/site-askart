import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, lerPublicado, membros } from '../../access'
import { campoSlug } from '../../fields/slug'
import { camposPublicacao, preencherPublicarEm, somenteEditoresPublicam } from '../../fields/visibilidade'
import { campoTextoBusca, hookTextoBusca } from '../../lib/busca'
import { colaboradorSoRascunho, escreverRascunho, semLixeira } from './acesso'
import {
  campoCategoriasKart,
  campoEtapa,
  campoPilotos,
  campoTemporada,
  GRUPO_CONTEUDO,
  REL,
  SO_IMAGENS,
  versoesEditoriais,
} from './comum'
import { editorNoticia } from './editores'
import { autorPadrao, completarAssociacoes, preencherAutor, slugUnico } from './hooks'

/**
 * Notícias (/noticias e "Notícias da semana" na página inicial).
 * O formulário tem duas abas: "Notícia" com o essencial (título, capa, texto) e "Mais opções".
 * Data de publicação, "No site" e endereço ficam na barra lateral.
 */
export const Noticias: CollectionConfig = comAcessoRestrito({
  slug: 'noticias',
  labels: { singular: 'Notícia', plural: 'Notícias' },
  trash: true,
  versions: versoesEditoriais(),
  defaultSort: '-publicarEm',
  admin: {
    group: GRUPO_CONTEUDO,
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'categoria', 'publicarEm', 'destaque', '_status'],
    listSearchableFields: ['titulo', 'subtitulo', 'textoBusca'],
    description:
      'Escreva, salve como rascunho e publique quando estiver pronta. Para programar, escolha uma data futura em "Publicar em" e publique: a notícia entra no ar sozinha.',
  },
  access: {
    read: semLixeira(lerPublicado),
    create: escreverRascunho,
    update: escreverRascunho,
    delete: editores,
    readVersions: membros,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Notícia',
          description: 'O essencial: título, foto de capa e texto.',
          fields: [
            { name: 'titulo', label: 'Título', type: 'text', required: true, maxLength: 160 },
            {
              name: 'capa',
              label: 'Foto de capa',
              type: 'upload',
              relationTo: REL.midia,
              filterOptions: SO_IMAGENS,
              admin: {
                description:
                  'Recomendada. Aparece no topo da notícia, nos cartões e ao compartilhar no WhatsApp. Foto deitada (horizontal) fica melhor.',
              },
            },
            {
              name: 'conteudo',
              label: 'Texto',
              type: 'richText',
              editor: editorNoticia,
              required: true,
              admin: {
                description:
                  'Use os botões da barra para títulos, listas e links. Para pôr fotos no meio do texto, use "Upload"; para uma galeria inteira, use o bloco "Galeria de fotos".',
              },
            },
          ],
        },
        {
          label: 'Mais opções',
          description: 'Tudo aqui é opcional.',
          fields: [
            {
              name: 'subtitulo',
              label: 'Subtítulo',
              type: 'textarea',
              maxLength: 300,
              admin: { description: 'Uma ou duas frases que resumem a notícia (até 300 caracteres). Aparece abaixo do título e no Google.' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'categoria',
                  label: 'Categoria da notícia',
                  type: 'relationship',
                  relationTo: REL.categoriasNoticia,
                  index: true,
                  admin: { width: '50%', allowCreate: true, description: 'Assunto da notícia (filtro do site).' },
                },
                {
                  name: 'autor',
                  label: 'Autor',
                  type: 'text',
                  maxLength: 120,
                  defaultValue: autorPadrao,
                  admin: { width: '50%', description: 'Vem preenchido com o seu nome. Pode trocar.' },
                },
              ],
            },
            {
              name: 'tags',
              label: 'Tags',
              type: 'relationship',
              relationTo: REL.tags,
              hasMany: true,
              admin: {
                allowCreate: true,
                description: 'Palavras-chave. Escolha da lista ou crie uma nova pelo botão +.',
              },
            },
            {
              name: 'destaque',
              label: 'Destaque na página inicial',
              type: 'checkbox',
              defaultValue: false,
              index: true,
              admin: { description: 'Marcada, a notícia aparece em destaque no topo das notícias da página inicial.' },
            },
            {
              name: 'galeria',
              label: 'Galeria de fotos',
              type: 'relationship',
              relationTo: REL.galerias,
              admin: { allowCreate: true, description: 'Opcional. Galeria mostrada no fim da notícia.' },
            },
            {
              type: 'collapsible',
              label: 'Relacionados',
              admin: {
                initCollapsed: false,
                description:
                  'A notícia aparece também nas páginas da etapa, das categorias e dos pilotos escolhidos. Escolha a etapa e a temporada é preenchida sozinha.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    campoEtapa('Opcional. A notícia aparece na página da etapa.', '50%'),
                    campoTemporada('Preenchida pela etapa (ou escolha, se não houver etapa).', '50%'),
                  ],
                },
                campoCategoriasKart(),
                campoPilotos(),
              ],
            },
          ],
        },
      ],
    },
    campoSlug('titulo'),
    ...camposPublicacao(),
    campoTextoBusca(),
  ],
  hooks: {
    beforeOperation: [colaboradorSoRascunho],
    beforeValidate: [slugUnico(REL.noticias)],
    beforeChange: [
      somenteEditoresPublicam,
      preencherPublicarEm,
      preencherAutor,
      completarAssociacoes(),
      hookTextoBusca(['titulo', 'subtitulo', 'autor', 'conteudo']),
    ],
  },
})
