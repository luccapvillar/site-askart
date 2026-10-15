/**
 * Campos padrão de visibilidade e publicação (docs/ARQUITETURA.md §3).
 * - `campoVisibilidade`: visível | oculto | arquivado (cadastros e conteúdo)
 * - `camposPublicacao`: visibilidade + "publicar em" (conteúdo editorial, que também usa versions.drafts)
 * - `camposJanela`: exibir de / exibir até (banners, avisos)
 * Os campos de controle só podem ser alterados por editor/administrador.
 */
import { APIError, type CollectionBeforeChangeHook, type Field } from 'payload'
import { campoSomenteEditores, ehEditorOuAdmin } from '../access'

const FORMATO_DATA_HORA = { pickerAppearance: 'dayAndTime', timeFormat: 'HH:mm', displayFormat: 'dd/MM/yyyy HH:mm' } as const

export const campoVisibilidade = (descricao?: string): Field => ({
  name: 'visibilidade',
  label: 'No site',
  type: 'select',
  required: true,
  defaultValue: 'visivel',
  index: true,
  options: [
    { label: 'Visível', value: 'visivel' },
    { label: 'Oculto', value: 'oculto' },
    { label: 'Arquivado', value: 'arquivado' },
  ],
  access: { create: campoSomenteEditores, update: campoSomenteEditores },
  admin: {
    position: 'sidebar',
    description:
      descricao ??
      'Visível: aparece no site. Oculto: sai do site sem ser apagado. Arquivado: sai das listas atuais, mas continua na própria página e no histórico.',
  },
})

export const campoPublicarEm: Field = {
  name: 'publicarEm',
  label: 'Publicar em',
  type: 'date',
  index: true,
  access: { create: campoSomenteEditores, update: campoSomenteEditores },
  admin: {
    position: 'sidebar',
    date: FORMATO_DATA_HORA,
    description: 'Vazio = no ar assim que for publicado. Data futura = entra no ar sozinho nesse horário (programado).',
  },
}

export const camposPublicacao = (): Field[] => [campoVisibilidade(), campoPublicarEm]

export const camposJanela = (): Field[] => [
  {
    name: 'exibirDe',
    label: 'Exibir a partir de',
    type: 'date',
    index: true,
    admin: { position: 'sidebar', date: FORMATO_DATA_HORA, description: 'Opcional.' },
  },
  {
    name: 'exibirAte',
    label: 'Exibir até',
    type: 'date',
    index: true,
    admin: { position: 'sidebar', date: FORMATO_DATA_HORA, description: 'Opcional. Depois desta data sai do site sozinho.' },
  },
]

/** Colaborador salva rascunhos; publicar é com editor/administrador. */
export const somenteEditoresPublicam: CollectionBeforeChangeHook = ({ data, req }) => {
  if (req.user && !ehEditorOuAdmin(req.user) && data?._status === 'published') {
    throw new APIError(
      'Seu perfil é de colaborador: salve como rascunho e peça a um editor para publicar.',
      403,
      undefined,
      true,
    )
  }
  return data
}

/** Preenche "publicar em" com agora ao publicar sem data (ordenação e "Notícias da semana"). */
export const preencherPublicarEm: CollectionBeforeChangeHook = ({ data }) => {
  if (data?._status === 'published' && !data.publicarEm) data.publicarEm = new Date().toISOString()
  return data
}
