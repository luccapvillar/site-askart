/**
 * Cria o primeiro administrador (npm run criar-admin), lendo ADMIN_EMAIL, ADMIN_SENHA e ADMIN_NOME.
 * Só age quando ainda não há nenhum usuário: rodar de novo não muda nada. Usado também na implantação
 * (vercel-build), para o painel nunca ficar aberto com a tela de "primeiro usuário".
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function principal() {
  const email = process.env.ADMIN_EMAIL?.trim()
  const senha = process.env.ADMIN_SENHA
  if (!email || !senha) {
    console.log('ADMIN_EMAIL e ADMIN_SENHA não definidos: nenhum administrador criado.')
    return
  }
  const payload = await getPayload({ config })
  const { totalDocs } = await payload.count({ collection: 'usuarios' })
  if (totalDocs > 0) {
    payload.logger.info('Já existem usuários: nada a fazer.')
    return
  }
  await payload.create({
    collection: 'usuarios',
    data: { email, password: senha, nome: process.env.ADMIN_NOME?.trim() || 'Administrador', papel: 'administrador', ativo: true },
    context: { semRevalidar: true, semRegistro: true },
  })
  payload.logger.info(`Administrador criado: ${email}`)
}

try {
  await principal()
  process.exit(0)
} catch (erro) {
  console.error(erro)
  process.exit(1)
}
