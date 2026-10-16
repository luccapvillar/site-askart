/**
 * Ações do Kartódromo: "Bloquear período" (treinos) e "Salvar a grade" (editor da grade semanal).
 *
 * Ação "Bloquear período" da agenda de treinos (docs/ARQUITETURA.md §4 Kartódromo).
 *
 *   POST /api/treinos/bloquear-periodo
 *   { "data": "2026-10-18", "das": "08:00", "ate": "12:00", "motivo": "Etapa do campeonato", "categorias": [1, 2] }
 *
 * - `data`: "AAAA-MM-DD" (ou "DD/MM/AAAA"). `das`/`ate`: "HH:mm" de 5 em 5 min; vazios = o dia inteiro.
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
import { chaveDia } from '../../lib/datas'
import {
  dadosParaGravar,
  descreverLinha,
  lerLinhaRecebida,
  linhaDoDoc,
  mesmaLinha,
  validarGrade,
  type DadosGrade,
  type ErroDeLinha,
  type HorarioDeFora,
  type LinhaGrade,
} from '../../components/admin/grade/modelo'
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
  if (!HORARIOS_INICIO.includes(das)) falhar(`Horário inicial inválido ("${das}"): use HH:mm de 5 em 5 minutos, ex.: 08:00.`)
  if (!HORARIOS_FIM.includes(ate)) falhar(`Horário final inválido ("${ate}"): use HH:mm de 5 em 5 minutos, ex.: 12:00 (24:00 = fim do dia).`)
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

/* ----------------------------------------------------------------------------------------------
 * Editor da grade semanal (/admin/grade-treinos)
 *
 *   POST /api/horarios-treino/salvar-grade
 *   { "linhas": [{ "id": 12 | null, "chave": "h12", "diaSemana": "sabado", "horaInicio": "08:00", "horaFim": "12:00",
 *                  "tipo": 3, "categorias": [1], "observacao": "", "visivel": true, "validoDe": null, "validoAte": null,
 *                  "permitirSobreposicao": false, "atualizadoEm": "…" }],
 *     "base": [12, 13, …] }
 *
 * - `linhas`: a grade completa desejada (os horários que o editor mostra). Com id = alterar; sem id = criar.
 * - `base`: ids que o editor carregou. Só estes podem ser apagados (os que sumiram de `linhas`): um horário
 *   criado por outra pessoa enquanto o editor estava aberto nunca é apagado por engano.
 * - Tudo numa transação, pelas mesmas regras e hooks da tela (acesso do usuário, validações, título, aviso
 *   de sobreposição). Qualquer falha desfaz tudo e a resposta diz qual linha e por quê.
 * - Resposta 200: { mensagem, criados, alterados, excluidos, dados } (dados = a grade como ficou).
 *   Resposta 422: { erro, erros: [{ chave, mensagem }] } — nada foi gravado.
 * -------------------------------------------------------------------------------------------- */

type DocHorario = Record<string, unknown> & { id: ID }

const visivelNoSite = (v: unknown) => v === null || v === undefined || v === 'visivel'

/**
 * Horários que o editor mostra: todos menos os arquivados e os vencidos ("Válido até" antes de hoje).
 * Os vencidos que continuam visíveis vão em `foraDoEditor`, porque ainda contam no aviso de sobreposição.
 */
export async function carregarDadosGrade(req: PayloadRequest): Promise<DadosGrade> {
  const hoje = chaveDia(new Date())
  const comum = { depth: 0, limit: 0, pagination: false, overrideAccess: false, req } as const
  const [horarios, tipos, categorias] = await Promise.all([
    req.payload.find({ collection: REL.horarios, sort: 'ordemNaSemana', ...comum }),
    req.payload.find({ collection: REL.tipos, sort: '_order', ...comum }),
    req.payload.find({ collection: REL.categorias, sort: '_order', ...comum }),
  ])

  const noEditor: DocHorario[] = []
  const visiveisDeFora: HorarioDeFora[] = []
  let fora = 0
  for (const doc of horarios.docs as unknown as DocHorario[]) {
    const ate = chaveDaData(doc.validoAte)
    if (doc.visibilidade === 'arquivado' || (ate && ate < hoje)) {
      fora++
      if (visivelNoSite(doc.visibilidade)) visiveisDeFora.push(horarioDeFora(doc, 'horário vencido que ainda está visível; preencha "Válido a partir de" neste horário ou arquive o antigo'))
    } else noEditor.push(doc)
  }

  const vinculos = await contarVinculos(req, noEditor.map((d) => d.id))
  return {
    linhas: noEditor.map((d) => linhaDoDoc(d, vinculos.get(String(d.id)) ?? 0)),
    tipos: (tipos.docs as unknown as Array<{ id: ID; nome?: string | null; cor?: string | null }>).map((t) => ({
      id: t.id,
      nome: t.nome ?? '',
      cor: t.cor ?? null,
    })),
    categorias: (
      categorias.docs as unknown as Array<{ id: ID; nome?: string | null; sigla?: string | null; visibilidade?: string | null }>
    ).map((c) => ({
      id: c.id,
      nome: c.nome ?? '',
      sigla: c.sigla ?? null,
      // Mesma regra de leitura pública das categorias (src/access: visível ou arquivada)
      publica: c.visibilidade === 'visivel' || c.visibilidade === 'arquivado',
    })),
    foraDoEditor: { visiveis: visiveisDeFora, total: fora },
  }
}

const foraDaLinha = (l: LinhaGrade, titulo: string, nota: string): HorarioDeFora => ({
  id: l.id as ID,
  titulo,
  nota,
  diaSemana: l.diaSemana,
  horaInicio: l.horaInicio,
  horaFim: l.horaFim,
  categorias: l.categorias,
  validoDe: l.validoDe,
  validoAte: l.validoAte,
})

function horarioDeFora(doc: DocHorario, nota: string): HorarioDeFora {
  const l = linhaDoDoc(doc)
  return foraDaLinha(l, (typeof doc.titulo === 'string' && doc.titulo) || descreverLinha(l), nota)
}

/** Quantos registros de "Treinos e exceções" substituem cada horário (horário com vínculo não se apaga). */
async function contarVinculos(req: PayloadRequest, ids: ID[]): Promise<Map<string, number>> {
  const contagem = new Map<string, number>()
  if (!ids.length || !req.payload.collections[REL.treinos]) return contagem
  const { docs } = await req.payload.find({
    collection: REL.treinos,
    where: { substitui: { in: ids } },
    select: { substitui: true } as never,
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  for (const d of docs as unknown as Array<{ substitui?: unknown }>) {
    const id = idDe(d.substitui)
    if (id !== null) contagem.set(String(id), (contagem.get(String(id)) ?? 0) + 1)
  }
  return contagem
}

/** Mensagem legível de um erro do Payload (a das validações e hooks já vem em português). */
function mensagemDoErro(erro: unknown): string {
  const e = erro as { message?: string; data?: { errors?: { message?: string }[] } }
  const detalhes = e.data?.errors?.map((x) => x.message).filter(Boolean).join(' ')
  return detalhes || e.message || 'Erro ao gravar este horário.'
}

class FalhaNaLinha extends Error {
  constructor(
    readonly chave: string,
    mensagem: string,
  ) {
    super(mensagem)
  }
}

const respostaComErros = (erros: ErroDeLinha[], erro = 'Nada foi gravado. Corrija os pontos indicados e salve de novo.') =>
  Response.json({ erro, erros }, { status: 422 })

const salvarGrade: PayloadHandler = async (req) => {
  if (!req.user) falhar('Entre no painel para usar esta ação.', 401)
  if (!ehEditorOuAdmin(req.user)) falhar('Esta ação é só para moderadores e administradores.', 403)

  const corpo = await lerCorpo(req)
  if (!Array.isArray(corpo.linhas)) falhar('Envie a grade completa em "linhas" (pode ser uma lista vazia).')
  if (corpo.linhas.length > 500) falhar('A grade pode ter no máximo 500 horários.')
  const linhas = (corpo.linhas as unknown[]).map(lerLinhaRecebida)
  const base = ((Array.isArray(corpo.base) ? corpo.base : []) as unknown[]).map(idDe).filter((id): id is ID => id !== null)

  // Situação atual do banco (o que está no ar)
  const dados = await carregarDadosGrade(req)
  const noBanco = new Map<string, LinhaGrade>(dados.linhas.map((l) => [String(l.id), l]))
  const pedidos = [...new Set([...linhas.map((l) => l.id), ...base].filter((id): id is ID => id !== null).map(String))]
  const faltando = pedidos.filter((id) => !noBanco.has(id))
  if (faltando.length) {
    // Arquivado ou vencido depois que o editor abriu: ainda pode ser alterado ou apagado pelo id
    const { docs } = await req.payload.find({
      collection: REL.horarios,
      where: { id: { in: faltando } },
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: false,
      req,
    })
    const vinculos = await contarVinculos(req, (docs as unknown as DocHorario[]).map((d) => d.id))
    for (const d of docs as unknown as DocHorario[]) noBanco.set(String(d.id), linhaDoDoc(d, vinculos.get(String(d.id)) ?? 0))
  }

  const erros: ErroDeLinha[] = []
  const idsNaGrade = new Set<string>()
  for (const l of linhas) {
    if (l.id === null) continue
    const id = String(l.id)
    const atual = noBanco.get(id)
    if (idsNaGrade.has(id)) erros.push({ chave: l.chave, mensagem: 'Este horário aparece duas vezes na grade. Apague uma das cópias.' })
    idsNaGrade.add(id)
    if (!atual) {
      erros.push({ chave: l.chave, mensagem: 'Este horário não existe mais (alguém o apagou). Recarregue a página para ver a grade atual.' })
    } else if (l.atualizadoEm && atual.atualizadoEm && l.atualizadoEm !== atual.atualizadoEm && !mesmaLinha(atual, l)) {
      erros.push({
        chave: l.chave,
        mensagem: 'Outra pessoa alterou este horário depois que você abriu o editor. Recarregue a página para ver a versão atual e refaça a mudança.',
      })
    }
  }

  const excluir = base
    .map(String)
    .filter((id) => !idsNaGrade.has(id))
    .map((id) => noBanco.get(id))
    .filter((l): l is LinhaGrade => !!l)
  for (const l of excluir) {
    if (l.vinculos > 0) {
      erros.push({
        chave: l.chave,
        mensagem:
          `Não dá para apagar ${descreverLinha(l)}: ele tem ${l.vinculos} alteração(ões) em "Treinos e exceções". ` +
          'Para tirá-lo do site sem perder o histórico, desfaça a exclusão e desmarque "Aparece no site".',
      })
    }
  }

  // Mesmas regras da coleção, sobre a grade como vai ficar
  const ids = new Set([...idsNaGrade, ...excluir.map((l) => String(l.id))])
  const baseDoBanco = [...noBanco.values()].filter((l) => ids.has(String(l.id)))
  const nomesTipos = new Map(dados.tipos.map((t) => [String(t.id), t.nome]))
  const deOutros = dados.linhas
    .filter((l) => !ids.has(String(l.id)) && l.visivel)
    .map((l) =>
      foraDaLinha(l, descreverLinha(l, nomesTipos), 'criado por outra pessoa depois que você abriu o editor; recarregue a página'),
    )
  const foraDoEditor = [...dados.foraDoEditor.visiveis.filter((h) => !ids.has(String(h.id))), ...deOutros]
  for (const [chave, mensagens] of validarGrade(linhas, baseDoBanco, { tipos: dados.tipos, categorias: dados.categorias, foraDoEditor })) {
    for (const mensagem of mensagens) erros.push({ chave, mensagem })
  }
  if (erros.length) return respostaComErros(erros)

  const alterar = linhas.filter((l) => l.id !== null && !mesmaLinha(noBanco.get(String(l.id)) as LinhaGrade, l))
  const criar = linhas.filter((l) => l.id === null)
  if (!alterar.length && !criar.length && !excluir.length) {
    return Response.json({ mensagem: 'Nada mudou: a grade do site já está assim.', criados: 0, alterados: 0, excluidos: 0, dados })
  }

  try {
    await emTransacao(req, async () => {
      const comum = { collection: REL.horarios, overrideAccess: false, depth: 0, req } as const
      const naLinha = async (l: LinhaGrade, fn: () => Promise<unknown>) => {
        try {
          await fn()
        } catch (erro) {
          throw new FalhaNaLinha(l.chave, mensagemDoErro(erro))
        }
      }
      for (const l of excluir) await naLinha(l, () => req.payload.delete({ ...comum, id: l.id as ID }))
      // Os horários alterados saem da conta de sobreposição até receberem os valores novos (troca de
      // horário entre dois treinos, por exemplo, não esbarra no estado intermediário). A gravação de verdade
      // vem logo abaixo, pelas regras da coleção, na mesma transação.
      for (const l of alterar) {
        if (noBanco.get(String(l.id))?.visivel) {
          await req.payload.db.updateOne({ collection: REL.horarios, id: l.id as ID, data: { visibilidade: 'oculto' }, req, returning: false })
        }
      }
      for (const l of alterar) await naLinha(l, () => req.payload.update({ ...comum, id: l.id as ID, data: dadosParaGravar(l) as never }))
      for (const l of criar) await naLinha(l, () => req.payload.create({ ...comum, data: dadosParaGravar(l) as never }))
    })
  } catch (erro) {
    if (erro instanceof FalhaNaLinha) return respostaComErros([{ chave: erro.chave, mensagem: erro.message }])
    throw erro
  }

  const partes = [
    criar.length && `${criar.length} ${criar.length === 1 ? 'novo' : 'novos'}`,
    alterar.length && `${alterar.length} ${alterar.length === 1 ? 'alterado' : 'alterados'}`,
    excluir.length && `${excluir.length} ${excluir.length === 1 ? 'apagado' : 'apagados'}`,
  ].filter(Boolean)
  return Response.json({
    mensagem: `Grade salva e publicada no site (${partes.join(', ')}).`,
    criados: criar.length,
    alterados: alterar.length,
    excluidos: excluir.length,
    dados: await carregarDadosGrade(req),
  })
}

export const endpointSalvarGrade: Endpoint = { path: '/salvar-grade', method: 'post', handler: salvarGrade }
