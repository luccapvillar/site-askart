/** Rotas do assistente: /api/assistente, /api/assistente/aplicar, /api/assistente/arquivo. Só moderador e administrador. */
import Anthropic, { toFile } from '@anthropic-ai/sdk'
import type { Endpoint, PayloadRequest } from 'payload'
import { ehEditorOuAdmin } from '@/access'
import { conversar } from './agente'
import { aplicar, type Operacao } from './ferramentas'

const json = (dados: unknown, status = 200) => Response.json(dados, { status })

function barrar(req: PayloadRequest, precisaIA = true) {
  if (!req.user || !ehEditorOuAdmin(req.user)) return json({ erro: 'Só o moderador e o administrador usam o assistente.' }, 403)
  if (precisaIA && !process.env.ANTHROPIC_API_KEY) return json({ erro: 'Assistente desligado: falta a variável ANTHROPIC_API_KEY na Vercel.' }, 503)
  return null
}

export const endpointsAssistente: Endpoint[] = [
  {
    path: '/assistente',
    method: 'post',
    handler: async (req) => {
      const bloqueio = barrar(req)
      if (bloqueio) return bloqueio
      const corpo = (await req.json?.()) as { mensagens?: Anthropic.Beta.BetaMessageParam[] }
      if (!Array.isArray(corpo?.mensagens) || !corpo.mensagens.length) return json({ erro: 'Mensagem vazia.' }, 400)
      try {
        return json(await conversar(req, corpo.mensagens))
      } catch (erro) {
        req.payload.logger.error({ msg: 'Assistente falhou', erro })
        const status = erro instanceof Anthropic.RateLimitError ? 429 : 502
        return json({ erro: status === 429 ? 'Muitos pedidos seguidos. Tente de novo em um minuto.' : 'O assistente não respondeu. Tente de novo.' }, status)
      }
    },
  },
  {
    path: '/assistente/aplicar',
    method: 'post',
    handler: async (req) => {
      const bloqueio = barrar(req, false)
      if (bloqueio) return bloqueio
      const corpo = (await req.json?.()) as { operacoes?: Operacao[] }
      if (!Array.isArray(corpo?.operacoes) || !corpo.operacoes.length) return json({ erro: 'Nada para aplicar.' }, 400)
      return json({ resultados: await aplicar(req, corpo.operacoes.slice(0, 200)) })
    },
  },
  {
    // Foto ou PDF do resultado: vai para a Files API uma vez e é citado pelo id nas mensagens seguintes
    path: '/assistente/arquivo',
    method: 'post',
    handler: async (req) => {
      const bloqueio = barrar(req)
      if (bloqueio) return bloqueio
      const form = await req.formData?.()
      const arquivo = form?.get('arquivo')
      if (!(arquivo instanceof Blob)) return json({ erro: 'Envie uma foto ou um PDF.' }, 400)
      const tipo = arquivo.type
      if (!/^image\/(jpeg|png|webp|gif)$|^application\/pdf$/.test(tipo)) return json({ erro: 'Use JPG, PNG, WEBP ou PDF.' }, 400)
      if (arquivo.size > 15 * 1024 * 1024) return json({ erro: 'Arquivo grande demais (máx. 15 MB).' }, 400)
      const enviado = await new Anthropic().files.upload({ file: await toFile(arquivo, (arquivo as File).name || 'arquivo', { type: tipo }) })
      return json({ id: enviado.id, tipo: tipo === 'application/pdf' ? 'document' : 'image', nome: (arquivo as File).name })
    },
  },
]
