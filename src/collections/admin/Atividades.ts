import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
  GlobalAfterChangeHook,
  PayloadRequest,
} from 'payload'
import { editores, ninguem } from '../../access'

/** Registro de quem fez o quê no painel (pedido da especificação: histórico de alterações). */
export const Atividades: CollectionConfig = {
  slug: 'atividades',
  labels: { singular: 'Atividade', plural: 'Registro de atividades' },
  admin: {
    group: 'Administração',
    useAsTitle: 'resumo',
    defaultColumns: ['createdAt', 'usuario', 'acao', 'onde', 'resumo'],
    description: 'Cada criação, alteração, publicação e exclusão feita no painel. Somente leitura.',
    pagination: { defaultLimit: 50 },
  },
  defaultSort: '-createdAt',
  access: { read: editores, create: ninguem, update: ninguem, delete: ninguem },
  fields: [
    { name: 'usuario', label: 'Quem', type: 'relationship', relationTo: 'usuarios', index: true },
    {
      name: 'acao',
      label: 'O quê',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Criou', value: 'criou' },
        { label: 'Alterou', value: 'alterou' },
        { label: 'Publicou', value: 'publicou' },
        { label: 'Excluiu', value: 'excluiu' },
      ],
    },
    { name: 'onde', label: 'Onde', type: 'text', required: true, index: true },
    { name: 'colecao', label: 'Coleção ou global', type: 'text', admin: { hidden: true } },
    { name: 'documento', label: 'Item', type: 'text', admin: { hidden: true } },
    { name: 'resumo', label: 'Item', type: 'text' },
  ],
}

type Registro = { acao: 'criou' | 'alterou' | 'publicou' | 'excluiu'; onde: string; colecao: string; documento?: string; resumo: string }

const tituloDe = (doc: Record<string, unknown> | undefined) => {
  if (!doc) return ''
  for (const campo of ['titulo', 'nome', 'nomeExibicao', 'pergunta', 'filename', 'email']) {
    const valor = doc[campo]
    if (typeof valor === 'string' && valor.trim()) return valor.trim().slice(0, 160)
  }
  return doc.id !== undefined ? `#${String(doc.id)}` : ''
}

async function registrar(req: PayloadRequest, registro: Registro) {
  if (!req.user || req.context?.semRegistro) return
  try {
    await req.payload.create({
      collection: 'atividades',
      data: { ...registro, usuario: req.user.id },
      overrideAccess: true,
      req,
      context: { semRegistro: true, semRevalidar: true },
    })
  } catch (erro) {
    req.payload.logger.warn({ msg: 'Não foi possível registrar a atividade', erro })
  }
}

const autosalvamento = (req: PayloadRequest) => {
  const valor = (req.query as Record<string, unknown> | undefined)?.autosave
  return valor === true || valor === 'true'
}

/** Hook de coleção: registra criação, alteração e publicação (ignora o autosalvamento de rascunho). */
export const registrarMudanca =
  (onde: string): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, operation, req, collection }) => {
    if (autosalvamento(req)) return doc
    const publicou = doc?._status === 'published' && previousDoc?._status !== 'published'
    await registrar(req, {
      acao: publicou ? 'publicou' : operation === 'create' ? 'criou' : 'alterou',
      onde,
      colecao: collection.slug,
      documento: String(doc?.id ?? ''),
      resumo: tituloDe(doc),
    })
    return doc
  }

export const registrarExclusao =
  (onde: string): CollectionAfterDeleteHook =>
  async ({ doc, req, collection }) => {
    await registrar(req, { acao: 'excluiu', onde, colecao: collection.slug, documento: String(doc?.id ?? ''), resumo: tituloDe(doc) })
    return doc
  }

export const registrarGlobal =
  (onde: string): GlobalAfterChangeHook =>
  async ({ doc, req, global }) => {
    await registrar(req, { acao: 'alterou', onde, colecao: global.slug, resumo: onde })
    return doc
  }
