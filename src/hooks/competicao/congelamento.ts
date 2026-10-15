/**
 * Temporada encerrada fica congelada (docs/ARQUITETURA.md §2.5 e §4): etapas, corridas, resultados,
 * inscrições e a regra usada não mudam mais. Para corrigir algo, um administrador reabre a temporada
 * (muda o status de "Encerrada" para "Em andamento") e encerra de novo depois.
 */
import type { PayloadRequest, RequestContext } from 'payload'
import type { ContextoCompeticao } from './api'
import { carregarTemporada } from './consultas'
import { falhar } from './erros'
import type { TemporadaDoc } from './tipos'
import { camposAlterados, idDe, mesmoId } from './util'

export const estaEncerrada = (t: Pick<TemporadaDoc, 'status'> | null | undefined) => t?.status === 'encerrada'

export function mensagemCongelada(nome: string | null | undefined, oQue: string) {
  return (
    `A temporada "${nome ?? ''}" está encerrada e ${oQue} ficam congelados para preservar o histórico. ` +
    'Para corrigir, um administrador precisa reabrir a temporada (status "Em andamento") e encerrá-la de novo.'
  )
}

/**
 * Recusa a operação se alguma das temporadas envolvidas estiver encerrada.
 * Em atualizações, mudanças só nos campos `livres` (ex.: visibilidade, descrição) continuam permitidas.
 */
export async function conferirCongelamento(args: {
  req: PayloadRequest
  context: RequestContext
  temporadas: unknown[]
  oQue: string
  operacao: 'create' | 'update' | 'delete'
  data?: Record<string, unknown>
  originalDoc?: Record<string, unknown>
  livres?: string[]
}) {
  const { req, operacao } = args
  const contexto = args.context as ContextoCompeticao
  const ids = args.temporadas.map((t) => idDe(t)).filter((t) => t !== null)
  const vistos = new Set<string>()
  for (const id of ids) {
    if (vistos.has(String(id))) continue
    vistos.add(String(id))
    // O próprio encerramento grava a fotografia final da temporada que está sendo encerrada
    if (contexto.encerrandoTemporada !== undefined && mesmoId(contexto.encerrandoTemporada, id)) continue
    const temporada = await carregarTemporada(req, id)
    if (!estaEncerrada(temporada)) continue
    if (operacao === 'update' && args.livres?.length) {
      const alterados = camposAlterados(args.data, args.originalDoc, args.livres)
      if (alterados.length === 0) continue
    }
    falhar(mensagemCongelada(temporada?.nome, args.oQue), 409)
  }
}
