/**
 * Textos calculados da frente Competição (funções puras): texto de busca normalizado e os
 * títulos usados no painel (useAsTitle) de etapas, corridas, inscrições e classificações.
 */
import { diaDaSemanaCurto, formatarDataCurta, ordinal } from '../../lib/datas'

/**
 * Texto de busca: sem acento, minúsculo e com espaços simples, para "Joao" achar "João".
 * Mesmo critério de src/lib/busca.ts (frente Conteúdo); se ela mudar, mude aqui também.
 */
export function normalizarBusca(...partes: Array<string | number | null | undefined | false>): string {
  return partes
    .filter((p): p is string | number => p !== null && p !== undefined && p !== false && p !== '')
    .map(String)
    .join(' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Nome padrão de uma etapa: 3 → "3ª Etapa". */
export const nomeEtapaPadrao = (numero: number) => `${ordinal(numero, 'f')} Etapa`

/** Nome padrão de uma temporada: "Campeonato X — 2026". */
export const nomeTemporadaPadrao = (nomeCampeonato: string | null | undefined, ano: number) =>
  nomeCampeonato ? `${nomeCampeonato} — ${ano}` : `Temporada ${ano}`

/**
 * Nome da temporada seguinte: troca o ano no nome atual ("Copa X — 2026" → "Copa X — 2027");
 * se o nome não tiver o ano, usa o padrão do campeonato.
 */
export function nomeProximaTemporada(
  nomeAtual: string | null | undefined,
  anoAtual: number,
  novoAno: number,
  nomeCampeonato: string | null | undefined,
) {
  if (nomeAtual && nomeAtual.includes(String(anoAtual))) {
    return nomeAtual.split(String(anoAtual)).join(String(novoAno))
  }
  return nomeTemporadaPadrao(nomeCampeonato, novoAno)
}

const juntar = (partes: Array<string | null | undefined | false>) =>
  partes.filter((p): p is string => Boolean(p && String(p).trim())).join(' · ')

/** "2026 · 3ª Etapa · sáb 10/05" (data no fuso de Brasília). */
export function tituloEtapa(dados: {
  ano?: number | null
  nome?: string | null
  numero?: number | null
  inicio?: string | Date | null
}) {
  const nome = dados.nome?.trim() || (dados.numero ? nomeEtapaPadrao(dados.numero) : 'Etapa')
  const quando = dados.inicio ? `${diaDaSemanaCurto(dados.inicio)} ${formatarDataCurta(dados.inicio)}` : null
  return juntar([dados.ano ? String(dados.ano) : null, nome, quando])
}

/** "2026 · 3ª Etapa · Cadete · Final" (várias categorias: "Cadete + Mirim"; com subcategorias: "F400 (Novatos)"). */
export function tituloCorrida(dados: {
  ano?: number | null
  etapa?: string | null
  categorias?: string[]
  nome?: string | null
  /** Subcategorias da sessão (horário próprio): "F400 (Novatos)". Vazio = todas, nada muda no título. */
  subcategorias?: Array<string | null | undefined> | null
}) {
  const subcategorias = (dados.subcategorias ?? []).map((s) => s?.trim()).filter(Boolean)
  const categorias = (dados.categorias ?? []).filter(Boolean).join(' + ')
  const comSubs = subcategorias.length ? `${categorias} (${subcategorias.join(', ')})`.trim() : categorias
  return juntar([dados.ano ? String(dados.ano) : null, dados.etapa, comSubs, dados.nome || 'Corrida'])
}

/** "#33 João Silva · Cadete · CBK 2026" */
export function tituloInscricao(dados: {
  numero?: number | null
  piloto?: string | null
  categoria?: string | null
  temporada?: string | null
}) {
  const numero = dados.numero !== null && dados.numero !== undefined ? `#${dados.numero}` : null
  const piloto = [numero, dados.piloto].filter(Boolean).join(' ')
  return juntar([piloto || 'Inscrição', dados.categoria, dados.temporada])
}

/** "Cadete · Campeonato X — 2026" */
export function tituloClassificacao(dados: { categoria?: string | null; temporada?: string | null }) {
  return juntar([dados.categoria || 'Categoria', dados.temporada]) || 'Classificação'
}

/** Rótulo curto da temporada para títulos: "CBK 2026" (sigla do campeonato + ano) ou o nome. */
export function rotuloCurtoTemporada(dados: { sigla?: string | null; ano?: number | null; nome?: string | null }) {
  if (dados.sigla && dados.ano) return `${dados.sigla} ${dados.ano}`
  return dados.nome || (dados.ano ? String(dados.ano) : '')
}
