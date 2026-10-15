import { APIError, type CollectionBeforeChangeHook, type CollectionBeforeDeleteHook, type CollectionConfig } from 'payload'
import { ehAdmin, somenteAdmin } from '../../access'

type DadosUsuario = { papel?: string; ativo?: boolean; password?: string; sessions?: unknown[] }

/** Conta os administradores ativos, sem contar o usuário informado. */
async function outrosAdminsAtivos(req: Parameters<CollectionBeforeDeleteHook>[0]['req'], semId: number | string) {
  const { totalDocs } = await req.payload.count({
    collection: 'usuarios',
    where: { and: [{ papel: { equals: 'administrador' } }, { ativo: { not_equals: false } }, { id: { not_equals: semId } }] },
    overrideAccess: true,
    req,
  })
  return totalDocs
}

const MENSAGEM_ULTIMO_ADMIN =
  'Este é o único administrador ativo. Cadastre (ou ative) outro administrador antes de mudar o papel, desativar ou excluir este usuário.'

const regrasDePapel: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  const dados = data as DadosUsuario
  if (operation === 'create') {
    // O primeiro usuário do sistema é sempre administrador (tela "Criar primeiro usuário")
    const { totalDocs } = await req.payload.count({ collection: 'usuarios', overrideAccess: true, req })
    if (totalDocs === 0) {
      dados.papel = 'administrador'
      dados.ativo = true
    }
    return data
  }
  const antes = originalDoc as DadosUsuario & { id: number | string }
  const deixaDeSerAdmin = antes.papel === 'administrador' && antes.ativo !== false &&
    ((dados.papel !== undefined && dados.papel !== 'administrador') || dados.ativo === false)
  if (deixaDeSerAdmin && (await outrosAdminsAtivos(req, antes.id)) === 0) {
    throw new APIError(MENSAGEM_ULTIMO_ADMIN, 400, undefined, true)
  }
  // Mudou o papel, desativou ou trocou a senha: encerra as sessões abertas em outros aparelhos
  const mudouPapel = dados.papel !== undefined && dados.papel !== antes.papel
  const desativou = dados.ativo === false && antes.ativo !== false
  if (mudouPapel || desativou || dados.password) dados.sessions = []
  return data
}

const protegerUltimoAdmin: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const alvo = await req.payload.findByID({ collection: 'usuarios', id, overrideAccess: true, req, depth: 0 })
  if ((alvo as DadosUsuario).papel === 'administrador' && (await outrosAdminsAtivos(req, id)) === 0) {
    throw new APIError(MENSAGEM_ULTIMO_ADMIN, 400, undefined, true)
  }
}

/**
 * Usuários do painel. Papéis: administrador, moderador (valor interno "editor") e colaborador.
 * Segurança: bloqueio após 5 tentativas por 10 min, senha forte, sessão de 8 h em cookie httpOnly,
 * usuário desativado não entra, o último administrador não pode ser removido.
 */
export const Usuarios: CollectionConfig = {
  slug: 'usuarios',
  labels: { singular: 'Usuário', plural: 'Usuários' },
  admin: {
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'email', 'papel', 'ativo'],
    group: 'Administração',
    description: 'Pessoas com acesso ao painel. Só administradores criam usuários e mudam papéis.',
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    tokenExpiration: 8 * 60 * 60,
    useSessions: true,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
  },
  access: {
    // Todo membro ativo entra no painel; usuários inativos são barrados
    admin: ({ req }) => Boolean(req.user && (req.user as { ativo?: boolean }).ativo !== false),
    create: somenteAdmin,
    delete: somenteAdmin,
    read: ({ req }) => (ehAdmin(req.user) ? true : req.user ? { id: { equals: req.user.id } } : false),
    update: ({ req }) => (ehAdmin(req.user) ? true : req.user ? { id: { equals: req.user.id } } : false),
    unlock: somenteAdmin,
  },
  fields: [
    { name: 'nome', label: 'Nome', type: 'text', required: true },
    {
      name: 'papel',
      label: 'Papel',
      type: 'select',
      required: true,
      defaultValue: 'colaborador',
      saveToJWT: true,
      options: [
        { label: 'Administrador — tudo, inclusive usuários e configurações', value: 'administrador' },
        { label: 'Moderador — atualiza o site: resultados, classificação, treinos, notícias e avisos', value: 'editor' },
        { label: 'Colaborador — escreve rascunhos para o moderador revisar', value: 'colaborador' },
      ],
      access: { update: ({ req }) => ehAdmin(req.user), create: ({ req }) => ehAdmin(req.user) },
    },
    {
      name: 'ativo',
      label: 'Acesso ativo',
      type: 'checkbox',
      defaultValue: true,
      saveToJWT: true,
      access: { update: ({ req }) => ehAdmin(req.user), create: ({ req }) => ehAdmin(req.user) },
      admin: { description: 'Desmarque para bloquear o acesso sem apagar o usuário.' },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Senha forte: mínimo de 10 caracteres com letras e números
        const senha = (data as { password?: string } | undefined)?.password
        if (senha && (senha.length < 10 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha))) {
          throw new APIError('A senha precisa ter pelo menos 10 caracteres, com letras e números.', 400, undefined, true)
        }
        return data
      },
    ],
    beforeChange: [regrasDePapel],
    beforeDelete: [protegerUltimoAdmin],
    beforeLogin: [
      ({ user }) => {
        if ((user as DadosUsuario).ativo === false) {
          throw new APIError('Seu acesso ao painel está desativado. Fale com o administrador da ASKART.', 403, undefined, true)
        }
        return user
      },
    ],
  },
}
