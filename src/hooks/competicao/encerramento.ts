/**
 * Encerramento da temporada: grava em cada classificação (temporada-categorias) a fotografia final
 * (linhas, critérios e etapas realizadas) e o pódio — campeão, vice e 3º — a partir do cálculo do
 * motor (src/lib/classificacao.ts + src/lib/carregar-competicao.ts). Depois disso o site mostra a
 * fotografia, que não muda mesmo que algo seja corrigido depois (só reabrindo a temporada).
 *
 * Classificação por subcategoria (regra do BKS, cálculo pela média): cada subcategoria tem o seu campeonato.
 * A fotografia guarda a subcategoria de cada linha (a posição é dentro dela) e a página "História" mostra o
 * pódio de cada subcategoria a partir dela. Os campos únicos campeão/vice/3º da categoria só são preenchidos
 * quando há uma subcategoria só (senão ficariam misturados pilotos de subcategorias diferentes).
 */
import type { PayloadRequest } from 'payload'
import { classificacaoDe, classificacoesDaTemporada } from '../../lib/carregar-competicao'
import { chaveDoGrid, criarFotografiaFinal, type LinhaClassificacao } from '../../lib/classificacao'
import { atualizar, COLECOES } from './api'
import type { LinhaManualDoc } from './tipos'
import type { ID } from './util'

/**
 * Linhas na ordem final. Por subcategoria: as subcategorias na ordem do cálculo e, em cada uma, pela posição
 * dentro dela; senão, pela posição.
 */
function emOrdem<L extends LinhaClassificacao>(linhas: L[], porSubcategoria = false): L[] {
  if (!porSubcategoria) return [...linhas].sort((a, b) => a.posicao - b.posicao)
  const grids = [...new Set(linhas.map((l) => chaveDoGrid(l.subcategoria)))]
  return grids.flatMap((g) => linhas.filter((l) => chaveDoGrid(l.subcategoria) === g).sort((a, b) => a.posicao - b.posicao))
}

/** Mais de uma subcategoria com pontos próprios? (aí não há um campeão único da categoria) */
const variasSubcategorias = (linhas: LinhaClassificacao[], porSubcategoria: boolean) =>
  porSubcategoria && new Set(linhas.map((l) => chaveDoGrid(l.subcategoria))).size > 1

/** Grava a fotografia final e o pódio de todas as categorias da temporada. Devolve quantas foram gravadas. */
export async function gravarFotografiasFinais(req: PayloadRequest, temporadaId: ID): Promise<number> {
  const classificacoes = await classificacoesDaTemporada({
    payload: req.payload,
    temporada: temporadaId,
    req,
    // A temporada já está como "encerrada": calcula de novo em vez de ler uma fotografia antiga
    ignorarFotografia: true,
  })
  let gravadas = 0
  for (const c of classificacoes) {
    if (c.classificacao === null) continue
    // Cálculo por corrida: a subcategoria não entra na fotografia (o site a lê sempre da inscrição atual,
    // que pode ser corrigida depois). Por subcategoria: entra, porque a posição e os pontos são dentro dela.
    const linhas = c.porSubcategoria ? emOrdem(c.linhas, true) : emOrdem(c.linhas.map(({ subcategoria: _lidaDaInscricao, ...l }) => l))
    const podio = variasSubcategorias(linhas, c.porSubcategoria) ? [] : linhas
    await atualizar(
      req,
      COLECOES.temporadaCategorias,
      c.classificacao,
      {
        fotografiaFinal: criarFotografiaFinal({ ...c, linhas }),
        campeao: podio[0]?.inscricao ?? null,
        vice: podio[1]?.inscricao ?? null,
        terceiro: podio[2]?.inscricao ?? null,
      },
      { encerrandoTemporada: temporadaId },
    )
    gravadas++
  }
  return gravadas
}

/**
 * Ponto de partida do modo manual: copia a classificação calculada (automática) para as linhas
 * manuais, para o administrador só corrigir o que precisa. O modo manual tem uma classificação única por
 * categoria (posições sem repetir): com pontos por subcategoria, as subcategorias ficam em sequência
 * (1ª subcategoria, depois a 2ª…), numeradas 1..N — na tabela de cada subcategoria a posição volta a 1º.
 */
export async function linhasCalculadasParaManual(
  req: PayloadRequest,
  temporadaId: ID,
  categoriaId: ID,
): Promise<LinhaManualDoc[]> {
  const calculada = await classificacaoDe({ payload: req.payload, temporada: temporadaId, categoria: categoriaId, req })
  if (!calculada || calculada.fonte !== 'automatica') return []
  return emOrdem(calculada.linhas, calculada.porSubcategoria).map((l, i) => ({
    posicao: calculada.porSubcategoria ? i + 1 : l.posicao,
    piloto: l.piloto,
    numero: typeof l.numero === 'number' ? l.numero : Number(l.numero) || null,
    equipe: l.equipe,
    pontos: l.pontos,
    vitorias: l.vitorias,
    podios: l.podios,
    corridas: l.corridas,
  }))
}
