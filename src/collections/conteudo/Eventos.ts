import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, lerPublicado, membros } from '../../access'
import { validarUrlExterna } from '../../fields/link'
import { campoSlug } from '../../fields/slug'
import { camposPublicacao, preencherPublicarEm, somenteEditoresPublicam } from '../../fields/visibilidade'
import { campoTextoBusca, hookTextoBusca } from '../../lib/busca'
import { colaboradorSoRascunho, escreverRascunho, semLixeira } from './acesso'
import { campoCategoriasKart, FORMATO_DATA_HORA, GRUPO_CONTEUDO, REL, SO_IMAGENS, versoesEditoriais } from './comum'
import { editorPadrao } from './editores'
import { exigirIntervalo, slugUnico } from './hooks'

/** Link de inscrição: só endereço de site (https://). */
const validarLinkInscricao = (valor: unknown) => {
  if (typeof valor === 'string' && valor.trim() && !/^https?:\/\//i.test(valor.trim())) {
    return 'Use o endereço completo da página de inscrição, começando com https://'
  }
  return validarUrlExterna(valor)
}

/**
 * Eventos que não são etapas de campeonato (festivais, cursos, provas especiais…): /eventos e
 * filtro "Eventos" do calendário.
 */
export const Eventos: CollectionConfig = comAcessoRestrito({
  slug: 'eventos',
  labels: { singular: 'Evento', plural: 'Eventos' },
  trash: true,
  versions: versoesEditoriais(),
  defaultSort: '-inicio',
  admin: {
    group: GRUPO_CONTEUDO,
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'inicio', 'local', '_status'],
    listSearchableFields: ['titulo', 'local', 'textoBusca'],
    description: 'Eventos fora do calendário dos campeonatos. Aparecem em Eventos e no calendário do site.',
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
      type: 'row',
      fields: [
        {
          name: 'inicio',
          label: 'Início',
          type: 'date',
          required: true,
          index: true,
          timezone: true,
          admin: { width: '50%', date: FORMATO_DATA_HORA, description: 'Data e hora de Brasília.' },
        },
        {
          name: 'fim',
          label: 'Fim',
          type: 'date',
          index: true,
          timezone: true,
          admin: { width: '50%', date: FORMATO_DATA_HORA, description: 'Opcional.' },
        },
      ],
    },
    {
      name: 'local',
      label: 'Local',
      type: 'text',
      maxLength: 160,
      admin: { description: 'Opcional. Se for no kartódromo, pode deixar vazio: o site mostra o endereço do kartódromo.' },
    },
    {
      name: 'imagem',
      label: 'Imagem',
      type: 'upload',
      relationTo: REL.midia,
      filterOptions: SO_IMAGENS,
      admin: { description: 'Opcional. Foto ou cartaz do evento.' },
    },
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'richText',
      editor: editorPadrao,
      admin: { description: 'Programação, regras de participação e o que mais for útil.' },
    },
    campoCategoriasKart('Opcional. Categorias de kart que participam.'),
    {
      name: 'linkInscricao',
      label: 'Link de inscrição',
      type: 'text',
      validate: validarLinkInscricao,
      hooks: { beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim() || null : value)] },
      admin: { placeholder: 'https://', description: 'Opcional. Página onde o piloto se inscreve ou compra o ingresso.' },
    },
    campoSlug('titulo'),
    ...camposPublicacao(),
    campoTextoBusca(),
  ],
  hooks: {
    beforeOperation: [colaboradorSoRascunho],
    beforeValidate: [
      slugUnico(REL.eventos),
      exigirIntervalo({ inicio: 'inicio', fim: 'fim', mensagem: 'O fim precisa ser depois do início.' }),
    ],
    beforeChange: [somenteEditoresPublicam, preencherPublicarEm, hookTextoBusca(['titulo', 'local', 'descricao'])],
  },
})
