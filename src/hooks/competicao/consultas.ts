/**
 * Consultas reaproveitadas pelos hooks da Competição: temporada atual, regra efetiva,
 * próximo número de etapa, nome do kartódromo etc.
 */
import type { PayloadRequest } from 'payload'
import { buscar, buscarPorId, buscarPrimeiro, COLECOES, lerGlobal, memo } from './api'
import type {
  CampeonatoDoc,
  CategoriaDoc,
  EtapaDoc,
  RegraPontuacaoDoc,
  TemporadaCategoriaDoc,
  TemporadaDoc,
} from './tipos'
import type { ID } from './util'
import { idDe, idsDe, mesmoId } from './util'

export const carregarTemporada = (req: PayloadRequest, id: unknown) =>
  buscarPorId<TemporadaDoc>(req, COLECOES.temporadas, idDe(id))

export const carregarEtapa = (req: PayloadRequest, id: unknown) => buscarPorId<EtapaDoc>(req, COLECOES.etapas, idDe(id))

/** Temporada de uma etapa (ou null). */
export async function temporadaDaEtapa(req: PayloadRequest, etapaId: unknown) {
  const etapa = await carregarEtapa(req, etapaId)
  if (!etapa) return { etapa: null, temporada: null }
  return { etapa, temporada: await carregarTemporada(req, etapa.temporada) }
}

/** Categorias pelo id, na ordem pedida. */
export async function carregarCategorias(req: PayloadRequest, ids: ID[]): Promise<CategoriaDoc[]> {
  if (!ids.length) return []
  const docs = await buscar<CategoriaDoc>(req, COLECOES.categorias, { where: { id: { in: ids } } })
  return ids.map((id) => docs.find((d) => mesmoId(d.id, id))).filter((d): d is CategoriaDoc => Boolean(d))
}

/** Nome curto de uma categoria para títulos (nome; a sigla fica para quando não houver nome). */
export const rotuloCategoria = (c: CategoriaDoc | null | undefined) => c?.nome || c?.sigla || ''

/**
 * Regra de pontuação que vale para uma categoria na temporada: a regra própria da classificação
 * (temporada-categorias) ou, se não houver, a regra da temporada.
 */
export async function regraEfetiva(
  req: PayloadRequest,
  temporada: TemporadaDoc,
  categoria: unknown,
): Promise<RegraPontuacaoDoc | null> {
  const classificacao = await classificacaoDe(req, temporada.id, categoria)
  const regraId = idDe(classificacao?.regra) ?? idDe(temporada.regra)
  return buscarPorId<RegraPontuacaoDoc>(req, COLECOES.regras, regraId)
}

export const classificacaoDe = (req: PayloadRequest, temporada: unknown, categoria: unknown) =>
  buscarPrimeiro<TemporadaCategoriaDoc>(req, COLECOES.temporadaCategorias, {
    where: { and: [{ temporada: { equals: idDe(temporada) } }, { categoria: { equals: idDe(categoria) } }] },
  })

/** Próximo número de etapa da temporada (último + 1). */
export async function proximoNumeroEtapa(req: PayloadRequest, temporada: unknown): Promise<number> {
  const id = idDe(temporada)
  if (id === null) return 1
  const ultima = await buscarPrimeiro<EtapaDoc>(req, COLECOES.etapas, {
    where: { temporada: { equals: id } },
    sort: '-numero',
  })
  return (ultima?.numero ?? 0) + 1
}

/**
 * Temporada atual (fonte única: campeonatos.temporadaAtual). Usa o campeonato principal das
 * configurações quando existir; senão, o primeiro campeonato (na ordem do painel) que tenha
 * temporada atual definida.
 */
export function temporadaAtualPadrao(req: PayloadRequest): Promise<ID | null> {
  return memo(req, 'competicao:temporadaAtual', async () => {
    const configuracoes = await lerGlobal<{ campeonatoPrincipal?: unknown }>(req, 'configuracoes')
    const principal = idDe(configuracoes?.campeonatoPrincipal)
    if (principal !== null) {
      const campeonato = await buscarPorId<CampeonatoDoc>(req, COLECOES.campeonatos, principal)
      const atual = idDe(campeonato?.temporadaAtual)
      if (atual !== null) return atual
    }
    // `_order` é o campo de ordem criado pelo `orderable` da coleção campeonatos
    const campeonato = await buscarPrimeiro<CampeonatoDoc>(req, COLECOES.campeonatos, {
      where: { temporadaAtual: { exists: true } },
      sort: '_order',
    })
    return idDe(campeonato?.temporadaAtual)
  })
}

/** Valor padrão de campos "temporada" (formulário novo): a temporada atual. */
export const temporadaPadrao = async ({ req }: { req: PayloadRequest }) => (await temporadaAtualPadrao(req)) ?? undefined

/** Nome do kartódromo cadastrado no global "kartodromo" (frente Informações), se houver. */
export function nomeKartodromo(req: PayloadRequest): Promise<string | null> {
  return memo(req, 'competicao:nomeKartodromo', async () => {
    const kartodromo = await lerGlobal<{ nome?: string | null }>(req, 'kartodromo')
    return kartodromo?.nome?.trim() || null
  })
}

/** Ids das categorias de uma temporada. */
export async function categoriasDaTemporada(req: PayloadRequest, temporada: unknown): Promise<ID[]> {
  const doc = await carregarTemporada(req, temporada)
  return idsDe(doc?.categorias)
}
