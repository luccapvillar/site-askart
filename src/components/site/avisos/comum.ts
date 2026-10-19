/** Peças da aba de avisos (/avisos): rótulos, resumo do texto e relacionados. Funções puras. */
import { TIPOS_AVISO } from '@/collections/conteudo/Avisos'
import { semDemo } from '@/components/site/TextoDemo'
import { formatarData } from '@/lib/datas'
import { comoDoc } from '@/lib/publico'
import type { Aviso, Etapa, Treino } from '@/payload-types'

export type NivelAviso = Aviso['nivel']

export const ROTULO_NIVEL: Record<NivelAviso, string> = {
  informativo: 'Informativo',
  atencao: 'Atenção',
  urgente: 'Urgente',
}

const ROTULO_TIPO: Record<string, string> = Object.fromEntries(TIPOS_AVISO.map((t) => [t.value, t.label]))

export const rotuloTipo = (tipo: string | null | undefined) => (tipo ? ROTULO_TIPO[tipo] ?? null : null)

export const nivelSeguro = (nivel: string | null | undefined): NivelAviso =>
  nivel === 'urgente' || nivel === 'atencao' ? nivel : 'informativo'

/** Data de publicação do aviso (ou de criação, se ainda não houver). */
export const dataDoAviso = (a: Pick<Aviso, 'publicarEm' | 'createdAt'>) => a.publicarEm || a.createdAt || null

type NoLexical = { type?: string; text?: string; children?: NoLexical[] }

/** Texto corrido do rich text (parágrafos separados por espaço), para o resumo e a descrição da página. */
export function textoCorrido(texto: unknown): string {
  const raiz = (texto as { root?: NoLexical } | null | undefined)?.root
  const juntar = (no: NoLexical): string =>
    no.type === 'text' ? (no.text ?? '') : no.type === 'linebreak' ? ' ' : (no.children ?? []).map(juntar).join('')
  return semDemo((raiz?.children ?? []).map(juntar).join(' ').replace(/\s+/g, ' ').trim())
}

/** Resumo curto, cortado numa palavra inteira. */
export function resumoDoAviso(texto: unknown, limite = 180): string {
  const plano = textoCorrido(texto)
  if (plano.length <= limite) return plano
  const corte = plano.slice(0, limite)
  const espaco = corte.lastIndexOf(' ')
  return `${(espaco > limite * 0.6 ? corte.slice(0, espaco) : corte).replace(/[\s,.;:–-]+$/, '')}…`
}

export type Relacionado = { rotulo: string; href: string }

/** Etapa e treino ligados ao aviso (precisam vir carregados: depth ≥ 1). */
export function relacionadosDoAviso(a: Pick<Aviso, 'etapa' | 'treino'>): Relacionado[] {
  const lista: Relacionado[] = []
  const etapa = comoDoc<Etapa>(a.etapa)
  if (etapa?.id) lista.push({ rotulo: semDemo(etapa.nome) || `${etapa.numero}ª etapa`, href: `/etapas/${etapa.id}` })
  const treino = comoDoc<Treino>(a.treino)
  if (treino?.data) lista.push({ rotulo: `Treino de ${formatarData(treino.data)}`, href: '/kartodromo#grade' })
  return lista
}
