import { APIError, type CollectionConfig } from 'payload'
import { ehAdmin, somenteAdmin } from '../../access'

/**
 * Usuários do painel. Papéis: administrador, editor, colaborador (ver src/access).
 * Segurança: bloqueio após 5 tentativas por 10 min, senha forte, sessão de 8 h em cookie httpOnly.
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
  },
  fields: [
    { name: 'nome', label: 'Nome', type: 'text', required: true },
    {
      name: 'papel',
      label: 'Papel',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      options: [
        { label: 'Administrador — tudo, inclusive usuários e configurações', value: 'administrador' },
        { label: 'Editor — cria, edita, publica e exclui conteúdo', value: 'editor' },
        { label: 'Colaborador — cria e edita rascunhos', value: 'colaborador' },
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
  },
}
