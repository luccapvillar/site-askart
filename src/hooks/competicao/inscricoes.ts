/**
 * Hooks de inscrições (piloto × temporada × categoria): número, equipe e condição de cada piloto
 * em cada temporada. Regras (docs/ARQUITETURA.md §4):
 * - um piloto só tem uma inscrição por temporada/categoria (também garantido por índice único);
 * - a categoria precisa estar na temporada;
 * - o número não se repete entre as inscrições ATIVAS da mesma temporada/categoria
 *   (quem desistiu libera o número);
 * - inscrição com resultados não troca de piloto, temporada ou categoria (o histórico mudaria):
 *   marca-se "Transferida" e cria-se outra;
 * - a subcategoria (opcional) é um dos nomes das subcategorias da categoria; só separa as tabelas de
 *   resultado no site, sem mudar pontos;
 * - temporada encerrada: inscrições congeladas (só a observação e a subcategoria mudam).
 */
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
  FilterOptions,
  Where,
} from 'payload'
import { buscar, buscarPorId, COLECOES, contar } from './api'
import { carregarCategorias, carregarTemporada, rotuloCategoria } from './consultas'
import { conferirCongelamento } from './congelamento'
import { atualizarDerivados, derivadosInscricao } from './derivados'
import { falharNoCampo } from './erros'
import { bloquearExclusaoComVinculos } from './exclusao'
import type { InscricaoDoc, PilotoDoc } from './tipos'
import { conferirSubcategoria } from './validacoes'
import type { ID } from './util'
import { contemId, idDe, idsDe, mesmoId, docAnterior } from './util'

type Erro = { caminho: string; mensagem: string }

/** No seletor de categoria, só as categorias da temporada escolhida. */
export const categoriasDaTemporadaEscolhida: FilterOptions = async ({ data, req }) => {
  const temporada = await carregarTemporada(req, data?.temporada)
  const ids = idsDe(temporada?.categorias)
  return ids.length ? { id: { in: ids } } : true
}

/** Número de kart com quem já o usa (pura): devolve a inscrição em conflito, se houver. */
export function conflitoDeNumero<T extends { id: ID; numero?: number | null; status?: string | null }>(
  numero: number | null | undefined,
  proprio: ID | null,
  outras: T[],
): T | null {
  if (typeof numero !== 'number') return null
  return (
    outras.find(
      (o) => o.numero === numero && (o.status ?? 'ativa') === 'ativa' && (proprio === null || !mesmoId(o.id, proprio)),
    ) ?? null
  )
}

export const prepararInscricao: CollectionBeforeValidateHook = async ({ data, originalDoc, operation, req }) => {
  if (!data) return data
  const anterior = docAnterior<InscricaoDoc>(originalDoc)
  const temporadaId = idDe(data.temporada)
  const categoriaId = idDe(data.categoria)
  const pilotoId = idDe(data.piloto)
  const proprio = idDe(anterior?.id)
  const erros: Erro[] = []

  // Subcategoria: vazia ou um dos nomes das subcategorias da categoria ("junior" vira "Junior").
  // Conferida quando é enviada ou quando a categoria muda (a de antes pode não existir na nova).
  const categoriaDaSub = categoriaId ?? idDe(anterior?.categoria)
  const trocouCategoria = Boolean(anterior) && categoriaId !== null && !mesmoId(anterior?.categoria, categoriaId)
  const subcategoria = data.subcategoria !== undefined ? data.subcategoria : trocouCategoria ? anterior?.subcategoria : undefined
  if (subcategoria !== undefined && subcategoria !== null && subcategoria !== '' && categoriaDaSub !== null) {
    const [categoria] = await carregarCategorias(req, [categoriaDaSub])
    const conferida = conferirSubcategoria(subcategoria, categoria?.subcategorias, rotuloCategoria(categoria))
    if (conferida.ok) data.subcategoria = conferida.valor
    else erros.push({ caminho: 'subcategoria', mensagem: conferida.mensagem })
  } else if (data.subcategoria === '') {
    data.subcategoria = null
  }

  if (temporadaId === null || categoriaId === null || pilotoId === null) {
    if (erros.length) falharNoCampo(req, COLECOES.inscricoes, erros)
    return data
  }

  const temporada = await carregarTemporada(req, temporadaId)
  if (temporada && !contemId(idsDe(temporada.categorias), categoriaId)) {
    const [categoria] = await carregarCategorias(req, [categoriaId])
    erros.push({
      caminho: 'categoria',
      mensagem: `A categoria "${rotuloCategoria(categoria)}" não está na temporada "${temporada.nome}". Inclua-a na temporada antes.`,
    })
  }

  // Mesmo piloto duas vezes na mesma categoria/temporada
  const condicoes: Where[] = [
    { temporada: { equals: temporadaId } },
    { categoria: { equals: categoriaId } },
  ]
  const daCategoria = await buscar<InscricaoDoc>(req, COLECOES.inscricoes, { where: { and: condicoes } })
  const repetida = daCategoria.find((i) => mesmoId(i.piloto, pilotoId) && (proprio === null || !mesmoId(i.id, proprio)))
  if (repetida) {
    erros.push({ caminho: 'piloto', mensagem: 'Este piloto já está inscrito nesta categoria nesta temporada.' })
  }

  // Número único entre as inscrições ativas
  if (typeof data.numero === 'number' && (data.status ?? 'ativa') === 'ativa') {
    const conflito = conflitoDeNumero(data.numero, proprio, daCategoria)
    if (conflito) {
      const piloto = await buscarPorId<PilotoDoc>(req, COLECOES.pilotos, idDe(conflito.piloto))
      erros.push({
        caminho: 'numero',
        mensagem: `O número ${data.numero} já é de ${piloto?.nomeExibicao || piloto?.nome || 'outro piloto'} nesta categoria. Escolha outro número ou mude a outra inscrição para "Desistente".`,
      })
    }
  }

  // Inscrição com resultados não troca de piloto/temporada/categoria
  if (operation === 'update' && anterior) {
    const trocou =
      !mesmoId(anterior.piloto, pilotoId) || !mesmoId(anterior.temporada, temporadaId) || !mesmoId(anterior.categoria, categoriaId)
    if (trocou) {
      const usos = await contar(req, COLECOES.corridas, { 'resultados.inscricao': { equals: anterior.id } })
      if (usos) {
        erros.push({
          caminho: 'piloto',
          mensagem: `Esta inscrição já tem resultados em ${usos} corrida(s): não dá para trocar piloto, temporada ou categoria. Marque como "Transferida" e crie uma nova inscrição.`,
        })
      }
    }
  }

  if (erros.length) falharNoCampo(req, COLECOES.inscricoes, erros)
  return data
}

export const regrasDaInscricao: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req, context }) => {
  await conferirCongelamento({
    req,
    context,
    temporadas: [data.temporada, originalDoc?.temporada],
    oQue: 'as inscrições',
    operacao: operation === 'create' ? 'create' : 'update',
    data,
    originalDoc,
    // A subcategoria só separa as tabelas do site (não muda pontos): dá para preencher também no histórico
    livres: ['observacao', 'subcategoria'],
  })
  Object.assign(data, await derivadosInscricao(req, data))
  return data
}

/** O texto de busca do piloto inclui os números das inscrições (busca "33" acha o piloto). */
export const aposSalvarInscricao: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const pilotos = [idDe(doc.piloto), idDe(previousDoc?.piloto)].filter((p): p is ID => p !== null)
  const mudou = !previousDoc || doc.numero !== previousDoc.numero || !mesmoId(doc.piloto, previousDoc.piloto)
  if (mudou && pilotos.length) await atualizarDerivados(req, COLECOES.pilotos, { id: { in: pilotos } })
  return doc
}

export const aposExcluirInscricao: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const piloto = idDe(doc?.piloto)
  if (piloto !== null) await atualizarDerivados(req, COLECOES.pilotos, { id: { equals: piloto } })
  return doc
}

const bloquearComResultados = bloquearExclusaoComVinculos({ alvo: COLECOES.inscricoes, oQue: 'esta inscrição' })

export const antesDeExcluirInscricao: CollectionBeforeDeleteHook = async (args) => {
  const inscricao = await buscarPorId<InscricaoDoc>(args.req, COLECOES.inscricoes, args.id)
  await conferirCongelamento({
    req: args.req,
    context: args.context,
    temporadas: [inscricao?.temporada],
    oQue: 'as inscrições',
    operacao: 'delete',
  })
  await bloquearComResultados(args)
}
