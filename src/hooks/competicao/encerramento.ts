/**
 * Encerramento da temporada: grava em cada classificação (temporada-categorias) a fotografia final
 * (linhas, critérios e etapas realizadas) e o pódio — campeão, vice e 3º — a partir do cálculo do
 * motor (src/lib/classificacao.ts + src/lib/carregar-competicao.ts). Depois disso o site mostra a
 * fotografia, que não muda mesmo que algo seja corrigido depois (só reabrindo a temporada).
 */
import type { PayloadRequest } from 'payload'
import { classificacaoDe, classificacoesDaTemporada } from '../../lib/carregar-competicao'
import { criarFotografiaFinal, type LinhaClassificacao } from '../../lib/classificacao'
import { atualizar, COLECOES } from './api'
import type { LinhaManualDoc } from './tipos'
import type { ID } from './util'

/** Linhas ordenadas pela posição final. */
const porPosicao = (linhas: LinhaClassificacao[]) => [...linhas].sort((a, b) => a.posicao - b.posicao)

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
    // A subcategoria não entra na fotografia: o site a lê sempre da inscrição atual (pode ser corrigida depois).
    const linhas = porPosicao(c.linhas.map(({ subcategoria: _lidaDaInscricao, ...l }) => l))
    await atualizar(
      req,
      COLECOES.temporadaCategorias,
      c.classificacao,
      {
        fotografiaFinal: criarFotografiaFinal({ ...c, linhas }),
        campeao: linhas[0]?.inscricao ?? null,
        vice: linhas[1]?.inscricao ?? null,
        terceiro: linhas[2]?.inscricao ?? null,
      },
      { encerrandoTemporada: temporadaId },
    )
    gravadas++
  }
  return gravadas
}

/**
 * Ponto de partida do modo manual: copia a classificação calculada (automática) para as linhas
 * manuais, para o administrador só corrigir o que precisa.
 */
export async function linhasCalculadasParaManual(
  req: PayloadRequest,
  temporadaId: ID,
  categoriaId: ID,
): Promise<LinhaManualDoc[]> {
  const calculada = await classificacaoDe({ payload: req.payload, temporada: temporadaId, categoria: categoriaId, req })
  if (!calculada || calculada.fonte !== 'automatica') return []
  return porPosicao(calculada.linhas).map((l) => ({
    posicao: l.posicao,
    piloto: l.piloto,
    numero: typeof l.numero === 'number' ? l.numero : Number(l.numero) || null,
    equipe: l.equipe,
    pontos: l.pontos,
    vitorias: l.vitorias,
    podios: l.podios,
    corridas: l.corridas,
  }))
}
