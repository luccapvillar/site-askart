/**
 * Campos derivados guardados no banco: títulos (useAsTitle) e texto de busca.
 * Calculados no beforeChange de cada coleção e propagados quando um nome muda em outro lugar
 * (ex.: categoria renomeada → títulos das corridas e inscrições), gravando direto no banco,
 * sem rodar hooks (ver gravarDerivados em ./api).
 */
import type { PayloadRequest, Where } from 'payload'
import { buscar, buscarPorId, COLECOES, gravarDerivados, type SlugCompeticao } from './api'
import { carregarCategorias, carregarEtapa, carregarTemporada, rotuloCategoria } from './consultas'
import {
  nomeEtapaPadrao,
  normalizarBusca,
  rotuloCurtoTemporada,
  tituloClassificacao,
  tituloCorrida,
  tituloEtapa,
  tituloInscricao,
} from './texto'
import type {
  CampeonatoDoc,
  CategoriaDoc,
  CorridaDoc,
  EquipeDoc,
  EtapaDoc,
  InscricaoDoc,
  PilotoDoc,
  TemporadaCategoriaDoc,
  TemporadaDoc,
} from './tipos'
import { idDe, idsDe } from './util'

type Dados<T> = Partial<T> & Record<string, unknown>

async function rotuloTemporada(req: PayloadRequest, temporadaId: unknown) {
  const temporada = await carregarTemporada(req, temporadaId)
  if (!temporada) return { temporada: null, curto: '' }
  const campeonato = await buscarPorId<CampeonatoDoc>(req, COLECOES.campeonatos, idDe(temporada.campeonato))
  return { temporada, curto: rotuloCurtoTemporada({ sigla: campeonato?.sigla, ano: temporada.ano, nome: temporada.nome }) }
}

export async function derivadosEtapa(req: PayloadRequest, etapa: Dados<EtapaDoc>) {
  const temporada = await carregarTemporada(req, etapa.temporada)
  const titulo = tituloEtapa({ ano: temporada?.ano, nome: etapa.nome, numero: etapa.numero, inicio: etapa.inicio })
  return { titulo, textoBusca: normalizarBusca(titulo, etapa.local, temporada?.nome) }
}

export async function derivadosCorrida(req: PayloadRequest, corrida: Dados<CorridaDoc>) {
  const etapa = await carregarEtapa(req, corrida.etapa)
  const temporada = etapa ? await carregarTemporada(req, etapa.temporada) : null
  const categorias = await carregarCategorias(req, idsDe(corrida.categorias))
  const titulo = tituloCorrida({
    ano: temporada?.ano,
    etapa: etapa?.nome || (etapa?.numero ? nomeEtapaPadrao(etapa.numero) : null),
    categorias: categorias.map(rotuloCategoria),
    nome: corrida.nome,
    subcategorias: Array.isArray(corrida.subcategorias) ? corrida.subcategorias : [],
  })
  return { titulo }
}

export async function derivadosInscricao(req: PayloadRequest, inscricao: Dados<InscricaoDoc>) {
  const [piloto, categoria, { curto }] = await Promise.all([
    buscarPorId<PilotoDoc>(req, COLECOES.pilotos, idDe(inscricao.piloto)),
    buscarPorId<CategoriaDoc>(req, COLECOES.categorias, idDe(inscricao.categoria)),
    rotuloTemporada(req, inscricao.temporada),
  ])
  const titulo = tituloInscricao({
    numero: inscricao.numero,
    piloto: piloto?.nomeExibicao || piloto?.nome,
    categoria: rotuloCategoria(categoria),
    temporada: curto,
  })
  return { titulo }
}

export async function derivadosClassificacao(req: PayloadRequest, doc: Dados<TemporadaCategoriaDoc>) {
  const [temporada, categoria] = await Promise.all([
    carregarTemporada(req, doc.temporada),
    buscarPorId<CategoriaDoc>(req, COLECOES.categorias, idDe(doc.categoria)),
  ])
  return { titulo: tituloClassificacao({ categoria: rotuloCategoria(categoria), temporada: temporada?.nome }) }
}

export async function derivadosTemporada(req: PayloadRequest, doc: Dados<TemporadaDoc>) {
  const campeonato = await buscarPorId<CampeonatoDoc>(req, COLECOES.campeonatos, idDe(doc.campeonato))
  return { textoBusca: normalizarBusca(doc.nome, doc.ano, campeonato?.nome, campeonato?.sigla) }
}

/** Piloto: nome, nome de exibição, cidade e os números usados nas inscrições (busca por "33"). */
export async function derivadosPiloto(req: PayloadRequest, doc: Dados<PilotoDoc>) {
  const numeros =
    doc.id !== undefined
      ? (await buscar<InscricaoDoc>(req, COLECOES.inscricoes, { where: { piloto: { equals: doc.id } } }))
          .map((i) => i.numero)
          .filter((n): n is number => typeof n === 'number')
      : []
  return { textoBusca: normalizarBusca(doc.nome, doc.nomeExibicao, doc.cidade, doc.uf, ...new Set(numeros)) }
}

export const derivadosEquipe = (doc: Dados<EquipeDoc>) => ({
  textoBusca: normalizarBusca(doc.nome, doc.sigla, doc.cidade, doc.uf),
})

export const derivadosNomeSigla = (doc: { nome?: string | null; sigla?: string | null }) => ({
  textoBusca: normalizarBusca(doc.nome, doc.sigla),
})

/** Recalculadores por coleção (para propagar renomeações). */
const RECALCULAR: Partial<Record<SlugCompeticao, (req: PayloadRequest, doc: Record<string, unknown>) => Promise<Record<string, string>>>> = {
  [COLECOES.etapas]: derivadosEtapa,
  [COLECOES.corridas]: derivadosCorrida,
  [COLECOES.inscricoes]: derivadosInscricao,
  [COLECOES.temporadaCategorias]: derivadosClassificacao,
  [COLECOES.temporadas]: derivadosTemporada,
  [COLECOES.pilotos]: derivadosPiloto,
}

/**
 * Recalcula e grava título/texto de busca dos documentos que casam com `where`
 * (só grava quando o valor mudou). Não roda hooks, então não há risco de laço.
 */
export async function atualizarDerivados(req: PayloadRequest, slug: SlugCompeticao, where: Where) {
  const recalcular = RECALCULAR[slug]
  if (!recalcular) return
  const docs = await buscar<Record<string, unknown> & { id: string | number }>(req, slug, { where })
  for (const doc of docs) {
    const novos = await recalcular(req, doc)
    const mudou = Object.entries(novos).some(([campo, valor]) => doc[campo] !== valor)
    if (mudou) await gravarDerivados(req, slug, doc.id, novos)
  }
}
