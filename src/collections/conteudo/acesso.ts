/**
 * Regras de acesso do conteúdo editorial (docs/ARQUITETURA.md §3 e §8), montadas sobre src/access.
 *
 * - Público: só o que está publicado, visível e no período (lerPublicado / lerPublicadoNaJanela),
 *   e nunca o que está na lixeira (mesmo que alguém peça `?trash=true` na API).
 * - Colaborador: cria e edita RASCUNHOS. Não publica, não despublica, não restaura versão publicada,
 *   não exclui. O botão "Publicar" nem aparece para ele (o Payload consulta esta regra com
 *   `_status: 'published'` para decidir).
 * - Editor e administrador: tudo, inclusive publicar e excluir.
 */
import { APIError, type Access, type CollectionBeforeOperationHook, type Where } from 'payload'
import { ehEditorOuAdmin, ehMembro, papelDe } from '../../access'

/** Acrescenta "fora da lixeira" à regra de leitura do público. */
export const semLixeira =
  (regra: Access): Access =>
  async (args) => {
    const resultado = await regra(args)
    if (typeof resultado === 'boolean') return resultado
    return { and: [resultado as Where, { deletedAt: { exists: false } }] }
  }

/**
 * Criar/editar conteúdo editorial: editor e administrador sempre; colaborador só quando o que
 * está sendo gravado não é uma publicação.
 */
export const escreverRascunho: Access = ({ req, data }) => {
  if (ehEditorOuAdmin(req.user)) return true
  if (!ehMembro(req.user)) return false
  return (data as { _status?: string } | undefined)?._status !== 'published'
}

/** Mídia: editores mexem em tudo; o colaborador, só no que ele mesmo enviou. */
export const editarPropriaMidia: Access = ({ req }) => {
  if (ehEditorOuAdmin(req.user)) return true
  if (!ehMembro(req.user) || !req.user) return false
  return { enviadoPor: { equals: req.user.id } }
}

export const MENSAGEM_SO_RASCUNHO =
  'Seu perfil é de colaborador: use "Salvar rascunho". Publicar, despublicar ou restaurar uma versão publicada é com um editor.'

/**
 * Antes de criar/editar/restaurar: o colaborador só grava como rascunho (`draft: true`).
 * Sem isto ele conseguiria tirar do ar algo publicado (o "Despublicar" grava `_status: 'draft'`
 * direto no documento publicado) ou editar o publicado pela API sem passar por rascunho.
 * Operações internas (overrideAccess) não passam por aqui.
 */
export const colaboradorSoRascunho: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation !== 'create' && operation !== 'update' && operation !== 'restoreVersion') return args
  const argumentos = args as { draft?: boolean; overrideAccess?: boolean }
  if (argumentos.overrideAccess) return args
  if (papelDe(req.user) === 'colaborador' && !argumentos.draft) {
    throw new APIError(MENSAGEM_SO_RASCUNHO, 403, undefined, true)
  }
  return args
}
