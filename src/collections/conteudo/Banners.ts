import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, lerPublicadoNaJanela, membros } from '../../access'
import { campoLink } from '../../fields/link'
import { camposJanela, camposPublicacao, preencherPublicarEm, somenteEditoresPublicam } from '../../fields/visibilidade'
import { colaboradorSoRascunho, escreverRascunho, semLixeira } from './acesso'
import { GRUPO_CONTEUDO, REL, SO_IMAGENS, versoesEditoriais } from './comum'
import { exigirIntervalo } from './hooks'
import { campoVideoExterno } from './video-externo'

/**
 * Banners do topo da página inicial (sempre alimentado por aqui). Vários banners no ar viram um
 * carrossel, na ordem da lista (arraste para mudar). Cada um pode ter período de exibição.
 */
export const Banners: CollectionConfig = comAcessoRestrito({
  slug: 'banners',
  labels: { singular: 'Banner', plural: 'Banners da página inicial' },
  orderable: true,
  trash: true,
  versions: versoesEditoriais(),
  admin: {
    group: GRUPO_CONTEUDO,
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'midia', 'exibirDe', 'exibirAte', 'visibilidade', '_status'],
    listSearchableFields: ['titulo', 'texto'],
    description:
      'O topo da página inicial. Arraste para mudar a ordem. Use "Exibir a partir de" e "Exibir até" para o banner entrar e sair do ar sozinho.',
  },
  access: {
    read: semLixeira(lerPublicadoNaJanela),
    create: escreverRascunho,
    update: escreverRascunho,
    delete: editores,
    readVersions: membros,
  },
  fields: [
    {
      name: 'titulo',
      label: 'Título',
      type: 'text',
      required: true,
      maxLength: 90,
      admin: { description: 'Frase principal do banner. Curta: até umas 8 palavras ficam melhor.' },
    },
    {
      name: 'texto',
      label: 'Texto',
      type: 'textarea',
      maxLength: 240,
      admin: { description: 'Opcional. Uma frase de apoio abaixo do título.' },
    },
    {
      name: 'midia',
      label: 'Imagem ou vídeo',
      type: 'upload',
      relationTo: REL.midia,
      required: true,
      admin: {
        description:
          'Foto deitada (horizontal), de boa qualidade, ou vídeo curto em MP4. Defina o ponto focal da foto para o recorte no celular ficar bom.',
      },
    },
    {
      name: 'imagemCelular',
      label: 'Imagem para celular',
      type: 'upload',
      relationTo: REL.midia,
      filterOptions: SO_IMAGENS,
      admin: {
        description:
          'Opcional. Foto em pé (vertical) para telas pequenas. Vazio = a imagem principal, recortada pelo ponto focal.',
      },
    },
    campoVideoExterno(
      'Opcional. Endereço de um vídeo do YouTube ou Vimeo para tocar no lugar da mídia acima; nesse caso use uma foto em "Imagem ou vídeo" como capa (mostrada no celular e para quem prefere menos movimento).',
    ),
    campoLink({
      name: 'botao',
      label: 'Botão',
      rotuloTexto: 'Texto do botão',
      descricao: 'Opcional. Botão do banner. Prefira "Página ou conteúdo do site": o link acompanha se o endereço mudar.',
    }),
    ...camposPublicacao(),
    ...camposJanela(),
  ],
  hooks: {
    beforeOperation: [colaboradorSoRascunho],
    beforeValidate: [
      exigirIntervalo({ inicio: 'exibirDe', fim: 'exibirAte', mensagem: '"Exibir até" precisa ser depois de "Exibir a partir de".' }),
    ],
    beforeChange: [somenteEditoresPublicam, preencherPublicarEm],
  },
})
