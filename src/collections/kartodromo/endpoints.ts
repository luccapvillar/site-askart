/**
 * Ação "Bloquear período" da agenda de treinos (docs/ARQUITETURA.md §4 Kartódromo).
 *
 *   POST /api/treinos/bloquear-periodo
 *   { "data": "2026-10-18", "das": "08:00", "ate": "12:00", "motivo": "Etapa do campeonato", "categorias": [1, 2] }
 *
 * - `data`: "AAAA-MM-DD" (ou "DD/MM/AAAA"). `das`/`ate`: "HH:mm" de 15 em 15 min; vazios = o dia inteiro.
 * - `categorias`: opcional; vazio = todas.
 * - Só editor (moderador) ou administrador. Cria o registro de bloqueio em "Treinos e exceções" passando
 *   pelas mesmas regras e hooks da tela, numa transação, e devolve os horários da agenda que ficaram bloqueados.
 */
import {
  addDataAndFileToRequest,
  APIError,
  commitTransaction,
  initTransaction,
  killTransaction,
  type Endpoint,
  type PayloadHandler,
  type PayloadRequest,
} from 'payload'
import { ehEditorOuAdmin } from '../../access'
import {
  carregarAgenda,
  chaveDaData,
  dataDoDia,
  formatarChave,
  HORARIOS_FIM,
  HORARIOS_INICIO,
  idDe,
  intervaloValido,
  mesmoId,
  nomeDoDiaSemana,
  diaSemanaDaChave,
  textoCategorias,
  type ID,
} from '../../lib/agenda'
import { REL } from './campos'

function falhar(mensagem: string, status = 400): never {
  throw new APIError(mensagem, status, undefined, true)
}

/** Corpo JSON (ou formulário) do pedido; inválido = {}. */
async function lerCorpo(req: PayloadRequest): Promise<Record<string, unknown>> {
  try {
    await addDataAndFileToRequest(req)
  } catch {
    return {}
  }
  const corpo = req.data
  return corpo && typeof corpo === 'object' && !Array.isArray(corpo) ? (corpo as Record<string, unknown>) : {}
}

/** Executa numa transação: confirma no fim ou desfaz tudo se algo falhar. */
async function emTransacao<T>(req: PayloadRequest, fn: () => Promise<T>): Promise<T> {
  const iniciou = await initTransaction(req)
  try {
    const resultado = await fn()
    if (iniciou) await commitTransaction(req)
    return resultado
  } catch (erro) {
    if (iniciou) await killTransaction(req)
    throw erro
  }
}

const textoOuVazio = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

const bloquearPeriodo: PayloadHandler = async (req) => {
  if (!req.user) falhar('Entre no painel para usar esta ação.', 401)
  if (!ehEditorOuAdmin(req.user)) falhar('Esta ação é só para moderadores e administradores.', 403)

  const corpo = await lerCorpo(req)
  const dia = chaveDaData(corpo.data)
  if (!dia) falhar('Informe a data do bloqueio (ex.: 2026-10-18).')

  const das = textoOuVazio(corpo.das) || '00:00'
  const ate = textoOuVazio(corpo.ate) || '24:00'
  if (!HORARIOS_INICIO.includes(das)) falhar(`Horário inicial inválido ("${das}"): use HH:mm de 15 em 15 minutos, ex.: 08:00.`)
  if (!HORARIOS_FIM.includes(ate)) falhar(`Horário final inválido ("${ate}"): use HH:mm de 15 em 15 minutos, ex.: 12:00 (24:00 = fim do dia).`)
  if (!intervaloValido(das, ate)) falhar('O fim do bloqueio precisa ser depois do início.')

  const motivo = textoOuVazio(corpo.motivo)
  if (!motivo) falhar('Informe o motivo do bloqueio (ele aparece no site junto com os horários bloqueados).')
  if (motivo.length > 300) falhar('O motivo pode ter no máximo 300 caracteres.')

  if (corpo.categorias !== undefined && corpo.categorias !== null && !Array.isArray(corpo.categorias)) {
    falhar('"categorias" deve ser uma lista de categorias (ou vazia para todas).')
  }
  const categorias = ((corpo.categorias as unknown[] | undefined) ?? [])
    .map(idDe)
    .filter((id): id is ID => id !== null)

  const resposta = await emTransacao(req, async () => {
    // Mesmas regras da tela: acesso do usuário (overrideAccess: false), validações e hooks
    const criado = (await req.payload.create({
      collection: REL.treinos,
      data: {
        data: dataDoDia(dia),
        horaInicio: das,
        horaFim: ate,
        status: 'bloqueado',
        categorias,
        observacao: motivo,
        visibilidade: 'visivel',
      } as never,
      overrideAccess: false,
      depth: 0,
      req,
    })) as unknown as { id: ID; titulo?: string | null }

    const { ocorrencias } = await carregarAgenda({ payload: req.payload, inicio: dia, fim: dia, publico: false, req })
    const atingidos = ocorrencias.filter((o) => o.bloqueio && mesmoId(o.bloqueio.treinoId, criado.id))

    const quando = `${nomeDoDiaSemana(diaSemanaDaChave(dia))}, ${formatarChave(dia)}, das ${das} às ${ate}`
    const mensagem = atingidos.length
      ? `Período bloqueado (${quando}). ${atingidos.length} horário(s) da agenda ficaram bloqueados.`
      : `Período bloqueado (${quando}). Não havia treino nesse período: o bloqueio aparece sozinho na agenda.`
    return {
      mensagem: `${mensagem} Para avisar os pilotos, publique também um aviso do tipo "Alteração de treino".`,
      id: criado.id,
      titulo: criado.titulo ?? null,
      atingidos: atingidos.map((o) => ({
        horaInicio: o.horaInicio,
        horaFim: o.horaFim,
        tipo: o.tipo?.nome ?? null,
        categorias: textoCategorias(o),
        parcial: o.bloqueio?.parcial ?? false,
      })),
    }
  })
  return Response.json(resposta, { status: 201 })
}

export const endpointBloquearPeriodo: Endpoint = { path: '/bloquear-periodo', method: 'post', handler: bloquearPeriodo }
