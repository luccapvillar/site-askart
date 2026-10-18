/**
 * Hooks de corridas (e dos resultados dentro delas):
 * - categorias da corrida ⊆ categorias da etapa; tabela de pontos existente na regra;
 * - resultados conferidos linha a linha (inscrição única, chegada única, penalidade com motivo…)
 *   e posição oficial calculada pelo motor (src/lib/classificacao.ts), única e contínua;
 * - uma corrida por etapa + categoria + nome (chave única);
 * - etapa vira "realizada" sozinha quando todas as corridas que contam estão oficiais;
 * - temporada encerrada congelada; corrida com resultados não se exclui (use "Cancelada").
 */
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
  FilterOptions,
  PayloadRequest,
  Where,
} from 'payload'
import { paraCorrida, paraRegra } from '../../lib/carregar-competicao'
import { calcularResultadoCorrida, type Inscricao } from '../../lib/classificacao'
import { buscar, buscarPorId, buscarPrimeiro, COLECOES, type ContextoCompeticao } from './api'
import { carregarCategorias, carregarEtapa, carregarTemporada, regraEfetiva, rotuloCategoria } from './consultas'
import { conferirCongelamento } from './congelamento'
import { derivadosCorrida } from './derivados'
import { falhar, falharNasLinhas, falharNoCampo } from './erros'
import { corridaTemResultado, sincronizarStatusEtapa } from './etapas'
import { contarUsos } from './exclusao'
import { aplicarPosicoesOficiais, validarResultados, type ErroLinha, type LinhaResultado } from './resultados'
import type { CorridaDoc, EtapaDoc, InscricaoDoc, TemporadaDoc } from './tipos'
import type { ID } from './util'
import { contemId, idDe, idsDe, mesmoId, mudouAlgum, docAnterior } from './util'
import { chaveCorrida, encontrarTabela } from './validacoes'

type Erro = { caminho: string; mensagem: string }

/** Categorias que correm a etapa (vazio na etapa = todas as da temporada). */
export function categoriasPermitidas(etapa: Pick<EtapaDoc, 'categorias'> | null, temporada: Pick<TemporadaDoc, 'categorias'> | null): ID[] {
  const daEtapa = idsDe(etapa?.categorias)
  return daEtapa.length ? daEtapa : idsDe(temporada?.categorias)
}

/* ----------------------------------------------------------------------------------------------
 * Filtros dos seletores
 * -------------------------------------------------------------------------------------------- */

/** Categorias da corrida: só as da etapa escolhida. */
export const categoriasDaEtapaEscolhida: FilterOptions = async ({ data, req }) => {
  const etapa = await carregarEtapa(req, data?.etapa)
  if (!etapa) return true
  const ids = categoriasPermitidas(etapa, await carregarTemporada(req, etapa.temporada))
  return ids.length ? { id: { in: ids } } : true
}

/** Inscrições das linhas de resultado: só as da temporada da etapa e das categorias da corrida. */
export const inscricoesDaCorrida: FilterOptions = async ({ data, req }) => {
  const etapa = await carregarEtapa(req, data?.etapa)
  if (!etapa) return false
  const categorias = idsDe(data?.categorias)
  const filtro: Where[] = [{ temporada: { equals: idDe(etapa.temporada) } }]
  if (categorias.length) filtro.push({ categoria: { in: categorias } })
  return { and: filtro }
}

/* ----------------------------------------------------------------------------------------------
 * beforeValidate
 * -------------------------------------------------------------------------------------------- */

/** Confere as inscrições das linhas (pura): da temporada e de uma das categorias da corrida. */
export function conferirInscricoesDasLinhas(
  linhas: LinhaResultado[],
  inscricoes: Map<string, Pick<InscricaoDoc, 'temporada' | 'categoria'>>,
  temporada: ID,
  categorias: ID[],
): ErroLinha[] {
  const erros: ErroLinha[] = []
  linhas.forEach((linha, indice) => {
    const id = idDe(linha.inscricao)
    if (id === null) return
    const inscricao = inscricoes.get(String(id))
    if (!inscricao) erros.push({ indice, campo: 'inscricao', mensagem: 'Inscrição não encontrada.' })
    else if (!mesmoId(inscricao.temporada, temporada)) {
      erros.push({ indice, campo: 'inscricao', mensagem: 'Esta inscrição é de outra temporada.' })
    } else if (!contemId(categorias, inscricao.categoria)) {
      erros.push({ indice, campo: 'inscricao', mensagem: 'Este piloto está inscrito em outra categoria (não nas desta corrida).' })
    }
  })
  return erros
}

/** Inscrições do motor a partir das inscrições do banco (só o necessário para posições e convidados). */
const paraMotor = (i: InscricaoDoc): Inscricao => ({
  id: i.id,
  categoria: idDe(i.categoria) ?? '',
  piloto: idDe(i.piloto) ?? `inscricao:${i.id}`,
  nome: '',
  numero: i.numero ?? null,
  condicao: i.condicao ?? 'titular',
  status: i.status ?? 'ativa',
})

export const prepararCorrida: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data
  const anterior = docAnterior<CorridaDoc>(originalDoc)
  // Warm-up nunca conta para a classificação (não dá pontos nem pole): a caixa fica sempre desligada.
  if ((data.tipo ?? anterior?.tipo) === 'warm-up') data.contaParaClassificacao = false
  const { etapa, temporada } = await etapaETemporada(req, data.etapa)
  if (!etapa || !temporada) return data
  const erros: Erro[] = []

  if (typeof data.nome === 'string') data.nome = data.nome.trim().replace(/\s+/g, ' ')

  // Categorias da corrida: dentro das da etapa
  const categorias = idsDe(data.categorias)
  data.categorias = categorias
  const permitidas = categoriasPermitidas(etapa, temporada)
  const fora = categorias.filter((c) => !contemId(permitidas, c))
  if (fora.length) {
    const nomes = (await carregarCategorias(req, fora)).map(rotuloCategoria).join(', ')
    erros.push({ caminho: 'categorias', mensagem: `Categoria(s) que não correm esta etapa: ${nomes}.` })
  }

  // Tabela de pontos: precisa existir na regra (gravada com o nome exato da regra)
  const regraDoc = categorias.length ? await regraEfetiva(req, temporada, categorias[0]) : null
  if (typeof data.tabela === 'string' && data.tabela.trim()) {
    const achada = regraDoc ? encontrarTabela(data.tabela, regraDoc.tabelas ?? []) : null
    if (achada) data.tabela = achada
    else if (regraDoc) {
      const disponiveis = (regraDoc.tabelas ?? []).map((t) => t.nome).filter(Boolean).join(', ')
      erros.push({
        caminho: 'tabela',
        mensagem: `A regra "${regraDoc.nome}" não tem a tabela "${data.tabela}". Tabelas disponíveis: ${disponiveis || 'nenhuma'}.`,
      })
    }
  } else data.tabela = null

  // Uma corrida por etapa + categorias + nome ("Final" duplicada)
  data.chaveUnica = chaveCorrida(etapa.id, categorias, data.nome)
  const repetida = await buscarPrimeiro<CorridaDoc>(req, COLECOES.corridas, {
    where: {
      and: [{ chaveUnica: { equals: data.chaveUnica } }, ...(anterior ? [{ id: { not_equals: anterior.id } }] : [])],
    },
  })
  if (repetida) erros.push({ caminho: 'nome', mensagem: `Já existe "${data.nome}" para esta(s) categoria(s) nesta etapa.` })

  // Mudar de etapa para outra temporada, com resultados, mudaria o histórico
  if (anterior && !mesmoId(anterior.etapa, etapa.id) && corridaTemResultado(anterior)) {
    const etapaAntiga = await carregarEtapa(req, anterior.etapa)
    if (etapaAntiga && !mesmoId(etapaAntiga.temporada, temporada.id)) {
      erros.push({ caminho: 'etapa', mensagem: 'Esta corrida já tem resultados: só pode mudar para outra etapa da mesma temporada.' })
    }
  }

  if (erros.length) falharNoCampo(req, COLECOES.corridas, erros)

  // Resultados: conferência das linhas e posição oficial calculada pelo motor
  const { linhas, erros: errosLinhas } = validarResultados(data.resultados as LinhaResultado[] | undefined)
  data.resultados = linhas
  const ids = linhas.map((l) => idDe(l.inscricao)).filter((x): x is ID => x !== null)
  const inscricoes = ids.length
    ? await buscar<InscricaoDoc>(req, COLECOES.inscricoes, { where: { id: { in: ids } } })
    : []
  const porId = new Map(inscricoes.map((i) => [String(i.id), i] as const))
  errosLinhas.push(...conferirInscricoesDasLinhas(linhas, porId, temporada.id, categorias))
  if (errosLinhas.length) falharNasLinhas(req, COLECOES.corridas, 'resultados', errosLinhas)

  if (linhas.length) {
    const calculo = calcularResultadoCorrida(
      paraCorrida({ ...data, id: anterior?.id ?? 'nova', etapa: etapa.id } as Parameters<typeof paraCorrida>[0]),
      paraRegra(regraDoc as Record<string, unknown> | null),
      { inscricoes: inscricoes.map(paraMotor), fatorEtapa: etapa.fatorPontuacao ?? 1 },
    )
    const errosPosicao = aplicarPosicoesOficiais(
      linhas,
      calculo.linhas.map((l) => ({ indice: l.indice, posicaoOficial: l.posicaoOficial })),
    )
    if (errosPosicao.length) falharNasLinhas(req, COLECOES.corridas, 'resultados', errosPosicao)
  }

  // Volta mais rápida definida à mão: piloto da corrida e motivo
  const vmr = (data.voltaMaisRapidaManual ?? null) as CorridaDoc['voltaMaisRapidaManual']
  const inscricaoVmr = idDe(vmr?.inscricao)
  if (inscricaoVmr !== null) {
    const errosVmr: Erro[] = []
    if (!ids.some((id) => mesmoId(id, inscricaoVmr))) {
      errosVmr.push({ caminho: 'voltaMaisRapidaManual.inscricao', mensagem: 'Escolha um piloto que está nos resultados desta corrida.' })
    }
    if (!vmr?.motivo?.trim()) errosVmr.push({ caminho: 'voltaMaisRapidaManual.motivo', mensagem: 'Informe o motivo.' })
    if (errosVmr.length) falharNoCampo(req, COLECOES.corridas, errosVmr)
  }

  if (data.status === 'oficial' && !linhas.length) {
    falharNoCampo(req, COLECOES.corridas, [
      { caminho: 'status', mensagem: 'Lance os resultados antes de marcar como oficial (ou use "Cancelada").' },
    ])
  }
  return data
}

async function etapaETemporada(req: PayloadRequest, etapaId: unknown) {
  const etapa = await carregarEtapa(req, etapaId)
  const temporada = etapa ? await carregarTemporada(req, etapa.temporada) : null
  return { etapa, temporada }
}

/* ----------------------------------------------------------------------------------------------
 * beforeChange / afterChange
 * -------------------------------------------------------------------------------------------- */

export const regrasDaCorrida: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req, context }) => {
  const atual = await carregarEtapa(req, data.etapa)
  const original = docAnterior<CorridaDoc>(originalDoc)
  const antiga = original && !mesmoId(original.etapa, data.etapa) ? await carregarEtapa(req, original.etapa) : null
  await conferirCongelamento({
    req,
    context,
    temporadas: [atual?.temporada, antiga?.temporada],
    oQue: 'etapas, corridas e resultados',
    operacao: operation === 'create' ? 'create' : 'update',
    data,
    originalDoc,
  })
  Object.assign(data, await derivadosCorrida(req, data))
  return data
}

/** Corrida salva: a etapa pode ter virado "realizada" (ou deixado de ser). */
export const aposSalvarCorrida: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req, context }) => {
  if ((context as ContextoCompeticao).exclusaoEmCascata !== undefined) return doc
  if (operation === 'create' || mudouAlgum(doc, previousDoc, ['status', 'contaParaClassificacao', 'tipo', 'etapa'])) {
    await sincronizarStatusEtapa(req, doc.etapa)
    if (previousDoc && !mesmoId(previousDoc.etapa, doc.etapa)) await sincronizarStatusEtapa(req, previousDoc.etapa)
  }
  return doc
}

/* ----------------------------------------------------------------------------------------------
 * Exclusão
 * -------------------------------------------------------------------------------------------- */

export const antesDeExcluirCorrida: CollectionBeforeDeleteHook = async ({ id, req, context }) => {
  // Exclusão junto com a etapa: a etapa já conferiu que estas corridas estão vazias
  if ((context as ContextoCompeticao).exclusaoEmCascata !== undefined) return
  const corrida = await buscarPorId<CorridaDoc>(req, COLECOES.corridas, id)
  if (!corrida) return
  const etapa = await carregarEtapa(req, corrida.etapa)
  await conferirCongelamento({ req, context, temporadas: [etapa?.temporada], oQue: 'corridas e resultados', operacao: 'delete' })
  const usos = await contarUsos(req, COLECOES.corridas, id)
  const motivos = [
    corridaTemResultado(corrida) ? 'ela tem resultados lançados' : '',
    ...usos.map((u) => `está em uso em ${u.rotulo} (${u.total})`),
  ].filter(Boolean)
  if (motivos.length) {
    falhar(
      `Não é possível excluir esta corrida, porque ${motivos.join(' e ')}. ` +
        'Para tirá-la da classificação sem perder o histórico, mude o status para "Cancelada".',
      409,
    )
  }
}

export const aposExcluirCorrida: CollectionAfterDeleteHook = async ({ doc, req, context }) => {
  if ((context as ContextoCompeticao).exclusaoEmCascata !== undefined) return doc
  await sincronizarStatusEtapa(req, doc?.etapa)
  return doc
}
