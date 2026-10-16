/**
 * Controle de acesso por papel (ver docs/ARQUITETURA.md §8).
 *   administrador: tudo, inclusive usuários e configurações
 *   editor:        conteúdo, competição e publicação
 *   colaborador:   rascunhos de conteúdo editorial
 * O público (sem login) só lê o que está visível/publicado — o filtro está na própria regra de acesso,
 * então vale também para a API REST/GraphQL. O site lê sempre por src/lib/publico.ts (overrideAccess: false).
 */
import type { Access, FieldAccess, Where } from 'payload'

export type Papel = 'administrador' | 'editor' | 'colaborador'

type UsuarioComPapel = { papel?: Papel | null; ativo?: boolean | null } | null | undefined

export const papelDe = (user: unknown): Papel | null => {
  const u = user as UsuarioComPapel
  if (!u || u.ativo === false) return null
  return u.papel ?? null
}

export const ehAdmin = (user: unknown) => papelDe(user) === 'administrador'
export const ehEditorOuAdmin = (user: unknown) => papelDe(user) === 'administrador' || papelDe(user) === 'editor'
export const ehMembro = (user: unknown) => papelDe(user) !== null

export const somenteAdmin: Access = ({ req }) => ehAdmin(req.user)
export const editores: Access = ({ req }) => ehEditorOuAdmin(req.user)
export const membros: Access = ({ req }) => ehMembro(req.user)
export const todos: Access = () => true
export const ninguem: Access = () => false

export const campoSomenteEditores: FieldAccess = ({ req }) => ehEditorOuAdmin(req.user)
export const campoSomenteAdmin: FieldAccess = ({ req }) => ehAdmin(req.user)
export const campoSomenteMembros: FieldAccess = ({ req }) => ehMembro(req.user)

const agoraISO = () => new Date().toISOString()

/** Cadastros esportivos e afins: público vê só `visibilidade = visivel` ou `arquivado` (página própria e histórico). */
export const filtroVisivel = (incluirArquivado = true): Where =>
  incluirArquivado
    ? { visibilidade: { in: ['visivel', 'arquivado'] } }
    : { visibilidade: { equals: 'visivel' } }

/** Conteúdo editorial: publicado (rascunho nativo), visível/arquivado e com data de publicação alcançada. */
export const filtroPublicado = (): Where => ({
  and: [
    { _status: { equals: 'published' } },
    { visibilidade: { in: ['visivel', 'arquivado'] } },
    { or: [{ publicarEm: { exists: false } }, { publicarEm: { less_than_equal: agoraISO() } }] },
  ],
})

/** Janela de exibição (banners, avisos). */
export const filtroJanela = (): Where => ({
  and: [
    { or: [{ exibirDe: { exists: false } }, { exibirDe: { less_than_equal: agoraISO() } }] },
    { or: [{ exibirAte: { exists: false } }, { exibirAte: { greater_than_equal: agoraISO() } }] },
  ],
})

export const lerVisivel: Access = ({ req }) => (ehMembro(req.user) ? true : filtroVisivel())

/** Coleções com rascunho e visibilidade (perguntas): público vê só o publicado e visível. */
export const lerVisivelPublicado: Access = ({ req }) =>
  ehMembro(req.user) ? true : { and: [filtroVisivel(), { _status: { equals: 'published' } }] }

/**
 * Globais com rascunho: o público (e a API sem login, mesmo com `?draft=true`) vê só a versão publicada.
 * A prévia do site lê os rascunhos por src/lib/publico.ts, só para quem está logado no painel.
 */
export const lerGlobalPublicado: Access = ({ req }) => (ehMembro(req.user) ? true : { _status: { equals: 'published' } })

export const lerPublicado: Access = ({ req }) => (ehMembro(req.user) ? true : filtroPublicado())
export const lerPublicadoNaJanela: Access = ({ req }) =>
  ehMembro(req.user) ? true : { and: [filtroPublicado(), filtroJanela()] }

/**
 * Garante que toda operação tenha regra explícita: o padrão do Payload é "qualquer usuário logado",
 * o que daria ao colaborador e a usuários desativados mais acesso do que deveriam.
 */
type ComAcesso = { access?: Record<string, unknown> }
const OPERACOES_COLECAO = ['create', 'read', 'update', 'delete', 'readVersions', 'unlock'] as const
const OPERACOES_GLOBAL = ['read', 'update', 'readVersions'] as const

export function comAcessoRestrito<T extends ComAcesso>(config: T, tipo: 'colecao' | 'global' = 'colecao'): T {
  const ops = tipo === 'colecao' ? OPERACOES_COLECAO : OPERACOES_GLOBAL
  const access = { ...(config.access ?? {}) } as Record<string, unknown>
  for (const op of ops) if (!access[op]) access[op] = somenteAdmin
  return { ...config, access }
}
