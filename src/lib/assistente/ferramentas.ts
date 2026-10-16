/**
 * Ferramentas do assistente do moderador. Consultas rodam na hora (com as permissões do usuário);
 * alterações NUNCA rodam sozinhas: viram uma proposta que o moderador confere e confirma.
 */
import type Anthropic from '@anthropic-ai/sdk'
import type { CollectionSlug, GlobalSlug, PayloadRequest, Where } from 'payload'
import { textoParaLexical } from '@/collections/conteudo/editores'
import { rotaDoDoc, urlAdmin } from '@/lib/previa/alvos'
import { temRascunho } from '@/lib/previa/rascunho'

export const COLECOES = [
  'etapas', 'corridas', 'inscricoes', 'pilotos', 'equipes', 'categorias', 'temporadas', 'temporada-categorias',
  'campeonatos', 'horarios-treino', 'tipos-treino', 'treinos', 'noticias', 'avisos', 'perguntas', 'galerias', 'documentos',
] as const
export const GLOBAIS = ['configuracoes', 'contato', 'kartodromo', 'pagina-inicial', 'institucional', 'navegacao', 'textos-paginas'] as const

/** Campos de texto formatado: o assistente manda texto simples e o sistema converte. */
const TEXTO_RICO: Record<string, string[]> = {
  noticias: ['conteudo'],
  avisos: ['texto'],
  perguntas: ['resposta'],
  etapas: ['descricao'],
  campeonatos: ['descricao', 'historia'],
  pilotos: ['biografia'],
  kartodromo: ['historia', 'comoTreinarIntroducao', 'infoPilotos', 'infoVisitantes'],
  institucional: ['sobre', 'historia'],
}

export type Operacao = {
  tipo: 'criar' | 'atualizar' | 'excluir' | 'atualizar_global'
  alvo: string
  id?: number
  dados?: Record<string, unknown>
  descricao: string
}

export const FERRAMENTAS: Anthropic.Tool[] = [
  {
    name: 'consultar',
    description:
      'Lê registros do site (como o moderador os vê no painel). Use antes de propor alterações: para achar ids, o número de kart → inscrição, horários atuais etc.',
    input_schema: {
      type: 'object',
      properties: {
        colecao: { type: 'string', enum: [...COLECOES] },
        filtro: {
          type: 'object',
          description: 'Igualdades campo → valor (ex.: {"etapa": 12} ou {"diaSemana": "sabado"}). Vazio = todos.',
          additionalProperties: true,
        },
        busca: { type: 'string', description: 'Texto livre (nome, título). Opcional.' },
        limite: { type: 'integer', minimum: 1, maximum: 100 },
      },
      required: ['colecao'],
    },
  },
  {
    name: 'ler_global',
    description:
      'Lê uma configuração única do site (contato, kartódromo com taxas e como treinar, página inicial, sobre, menu e rodapé, textos das seções, configurações).',
    input_schema: { type: 'object', properties: { global: { type: 'string', enum: [...GLOBAIS] } }, required: ['global'] },
  },
  {
    name: 'propor_alteracoes',
    description:
      'Registra as alterações para o moderador conferir e confirmar. Nada é gravado sem a confirmação dele. Use uma chamada com todas as operações do pedido.',
    input_schema: {
      type: 'object',
      properties: {
        resumo: { type: 'string', description: 'Uma frase dizendo o que será feito.' },
        operacoes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tipo: { type: 'string', enum: ['criar', 'atualizar', 'excluir', 'atualizar_global'] },
              alvo: { type: 'string', description: 'Coleção ou global.' },
              id: { type: 'integer', description: 'Obrigatório para atualizar/excluir.' },
              dados: { type: 'object', additionalProperties: true, description: 'Campos a gravar (atualizar: só os que mudam).' },
              descricao: { type: 'string', description: 'O que muda, em linguagem simples (aparece para o moderador).' },
            },
            required: ['tipo', 'alvo', 'descricao'],
          },
        },
      },
      required: ['resumo', 'operacoes'],
    },
  },
]

const ehColecao = (s: string): s is (typeof COLECOES)[number] => (COLECOES as readonly string[]).includes(s)
const ehGlobal = (s: string): s is (typeof GLOBAIS)[number] => (GLOBAIS as readonly string[]).includes(s)

/** Corta campos pesados/irrelevantes para a IA (economia de tokens). */
function enxuto(doc: unknown): unknown {
  if (Array.isArray(doc)) return doc.map(enxuto)
  if (!doc || typeof doc !== 'object') return doc
  const fora = new Set(['createdAt', 'updatedAt', 'textoBusca', 'sizes', 'thumbnailURL', 'focalX', 'focalY', '_order', 'chaveUnica'])
  return Object.fromEntries(
    Object.entries(doc as Record<string, unknown>)
      .filter(([k, v]) => !fora.has(k) && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))
      .map(([k, v]) => [k, v && typeof v === 'object' && 'root' in (v as object) ? '[texto formatado]' : enxuto(v)]),
  )
}

export async function consultar(req: PayloadRequest, entrada: { colecao: string; filtro?: Record<string, unknown>; busca?: string; limite?: number }) {
  if (!ehColecao(entrada.colecao)) return { erro: 'Coleção não permitida.' }
  const condicoes: Where[] = Object.entries(entrada.filtro ?? {}).map(([campo, valor]) => ({ [campo]: { equals: valor } }))
  if (entrada.busca?.trim()) {
    const campo = ['noticias', 'avisos', 'galerias', 'documentos', 'etapas', 'corridas', 'inscricoes'].includes(entrada.colecao) ? 'titulo' : entrada.colecao === 'perguntas' ? 'pergunta' : 'nome'
    condicoes.push({ [campo]: { like: entrada.busca.trim() } })
  }
  const r = await req.payload.find({
    collection: entrada.colecao as CollectionSlug,
    where: condicoes.length ? { and: condicoes } : undefined,
    limit: Math.min(entrada.limite ?? 30, 100),
    depth: 0,
    // Como no painel: a última versão (inclui rascunho ainda não publicado)
    draft: temRascunho(req.payload, 'colecao', entrada.colecao),
    overrideAccess: false,
    user: req.user,
    req,
  })
  return { total: r.totalDocs, docs: enxuto(r.docs) }
}

export async function lerGlobal(req: PayloadRequest, global: string) {
  if (!ehGlobal(global)) return { erro: 'Global não permitido.' }
  return enxuto(
    await req.payload.findGlobal({
      slug: global as GlobalSlug,
      depth: 0,
      draft: temRascunho(req.payload, 'global', global),
      overrideAccess: false,
      user: req.user,
      req,
    }),
  )
}

function prepararDados(alvo: string, dados: Record<string, unknown> = {}) {
  const copia = { ...dados }
  for (const campo of TEXTO_RICO[alvo] ?? []) if (typeof copia[campo] === 'string') copia[campo] = textoParaLexical(copia[campo] as string)
  return copia
}

export type ResultadoOperacao = { descricao: string; ok: boolean; mensagem: string; rascunho?: boolean }
export type RascunhoGravado = { tipo: 'colecao' | 'global'; slug: string; id?: number; rota: string | null; urlAdmin: string }

/** Mensagem fixa para o que não tem pré-visualização (o painel oferece "Confirmar e publicar"). */
export const SEM_PREVIA = 'Sem pré-visualização: confirme direto.'

/**
 * Executa as operações confirmadas, uma a uma, com as permissões do moderador.
 *
 * - Sem `rascunho`: grava e publica na hora (comportamento de sempre). Em coleções/globais com rascunho
 *   o status vai como "publicado" — senão o item novo nasceria escondido e a edição tiraria do ar.
 * - Com `rascunho: true`: o que tem rascunho é gravado como rascunho (o site não muda; dá para ver na
 *   pré-visualização e depois publicar ou descartar). O resto NÃO é aplicado e volta com SEM_PREVIA.
 */
export async function aplicarOperacoes(req: PayloadRequest, operacoes: Operacao[], opcoes: { rascunho?: boolean } = {}) {
  const resultados: ResultadoOperacao[] = []
  const rascunhos: RascunhoGravado[] = []
  const anotarRascunho = (r: RascunhoGravado) => {
    if (!rascunhos.some((x) => x.tipo === r.tipo && x.slug === r.slug && x.id === r.id)) rascunhos.push(r)
  }
  for (const op of operacoes) {
    try {
      const comum = { overrideAccess: false, user: req.user, req } as const
      if (op.tipo === 'atualizar_global') {
        if (!ehGlobal(op.alvo)) throw new Error('Global não permitido.')
        const slug = op.alvo as GlobalSlug
        const dados = prepararDados(op.alvo, op.dados)
        const comRascunho = temRascunho(req.payload, 'global', op.alvo)
        if (opcoes.rascunho) {
          if (!comRascunho) {
            resultados.push({ descricao: op.descricao, ok: false, mensagem: SEM_PREVIA })
            continue
          }
          delete dados._status
          await req.payload.updateGlobal({ slug, data: dados as never, draft: true, ...comum })
          anotarRascunho({ tipo: 'global', slug: op.alvo, rota: rotaDoDoc(op.alvo, {}), urlAdmin: urlAdmin('global', op.alvo) })
          resultados.push({ descricao: op.descricao, ok: true, mensagem: 'Rascunho salvo.', rascunho: true })
          continue
        }
        if (comRascunho && !('_status' in dados)) dados._status = 'published'
        await req.payload.updateGlobal({ slug, data: dados as never, draft: false, ...comum })
      } else {
        if (!ehColecao(op.alvo)) throw new Error('Coleção não permitida.')
        const collection = op.alvo as CollectionSlug
        const dados = prepararDados(op.alvo, op.dados)
        const comRascunho = temRascunho(req.payload, 'colecao', op.alvo)
        if (op.tipo !== 'criar' && !op.id) throw new Error('Falta o id do registro.')
        if (opcoes.rascunho) {
          // Exclusão não tem como ser pré-visualizada
          if (!comRascunho || op.tipo === 'excluir') {
            resultados.push({ descricao: op.descricao, ok: false, mensagem: SEM_PREVIA })
            continue
          }
          delete dados._status
          const doc = (
            op.tipo === 'criar'
              ? await req.payload.create({ collection, data: dados as never, draft: true, ...comum })
              : await req.payload.update({ collection, id: op.id as number, data: dados as never, draft: true, ...comum })
          ) as { id?: number | string; slug?: string | null; secao?: string | null }
          const id = doc?.id !== undefined ? Number(doc.id) : op.id
          anotarRascunho({ tipo: 'colecao', slug: op.alvo, id, rota: rotaDoDoc(op.alvo, { ...doc, id }), urlAdmin: urlAdmin('colecao', op.alvo, id) })
          resultados.push({ descricao: op.descricao, ok: true, mensagem: 'Rascunho salvo.', rascunho: true })
          continue
        }
        if (comRascunho && !('_status' in dados)) {
          // Criar: já no ar. Atualizar: mantém no ar o que está no ar (o Payload completaria com o status
          // da última versão — um rascunho pendente tiraria o item do ar); o que está fora do ar segue fora.
          if (op.tipo === 'criar') dados._status = 'published'
          else if (op.tipo === 'atualizar') {
            const principal = (await req.payload.db.findOne({ collection, where: { id: { equals: op.id } }, req })) as { _status?: string } | null
            if (principal?._status === 'published') dados._status = 'published'
          }
        }
        if (op.tipo === 'criar') await req.payload.create({ collection, data: dados as never, draft: false, ...comum })
        else if (op.tipo === 'atualizar') await req.payload.update({ collection, id: op.id as number, data: dados as never, draft: false, ...comum })
        else await req.payload.delete({ collection, id: op.id as number, ...comum })
      }
      resultados.push({ descricao: op.descricao, ok: true, mensagem: 'Feito.' })
    } catch (erro) {
      const e = erro as { message?: string; data?: { errors?: { message?: string; path?: string }[] } }
      const detalhes = e.data?.errors?.map((x) => `${x.path ? `${x.path}: ` : ''}${x.message}`).join('; ')
      resultados.push({ descricao: op.descricao, ok: false, mensagem: detalhes || e.message || 'Erro ao gravar.' })
    }
  }
  return { resultados, rascunhos }
}

/** Atalho do comportamento de sempre (publica direto) — devolve só os resultados. */
export async function aplicar(req: PayloadRequest, operacoes: Operacao[]) {
  return (await aplicarOperacoes(req, operacoes)).resultados
}
