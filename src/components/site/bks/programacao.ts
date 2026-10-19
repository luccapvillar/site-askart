/**
 * Programação de uma etapa (horários de cada categoria) — função PURA, testada em tests/int.
 *
 * Agrupa as corridas por categoria (corrida de duas categorias que largam juntas forma o grupo "A + B"), na
 * ordem do primeiro horário. Dentro da categoria, quando alguma sessão está marcada para subcategorias
 * (corridas.subcategorias — cada subcategoria com o seu horário), os horários saem separados: primeiro
 * "Todas as subcategorias" (sessões sem marcação), depois cada subcategoria na ordem cadastrada na categoria.
 * Sem nenhuma sessão marcada, a lista é única, como sempre foi.
 */
import type { Categoria, Corrida } from '@/payload-types'
import { formatarHora } from '@/lib/datas'
import { agruparHorariosPorSubcategoria, type GrupoHorarios } from '@/lib/subcategorias'
import { semDemo } from '../TextoDemo'

/** Subcategorias de cada categoria (pelo id), para mostrar junto da categoria na programação. */
export type MapaSubcategorias = Map<string, { nome?: string | null }[] | null | undefined>

export type SessaoProgramada = { nome: string; hora: string | null }

export type GrupoCategoria = {
  categoria: string
  ids: string[]
  cor: string | null
  /** Todas as sessões da categoria, na ordem do horário. */
  corridas: SessaoProgramada[]
  /** Horários separados por subcategoria; null = categoria sem sessões marcadas (lista única). */
  subcategorias: GrupoHorarios<SessaoProgramada>[] | null
}

const ehCategoria = (x: unknown): x is Categoria => typeof x === 'object' && x !== null && 'id' in x

/**
 * Corridas de uma etapa agrupadas por categoria, na ordem do primeiro horário; dentro de cada categoria,
 * por subcategoria quando há sessões marcadas. A ordem das subcategorias é a cadastrada na categoria (vinda
 * junto da corrida ou, na falta dela, do `mapa`).
 */
export function agruparProgramacao(corridas: Corrida[], mapa?: MapaSubcategorias): GrupoCategoria[] {
  type Interno = Omit<GrupoCategoria, 'subcategorias'> & {
    primeiro: number
    cadastradas: { nome?: string | null }[]
    marcadas: { sessao: SessaoProgramada; subcategorias: unknown }[]
  }
  const grupos = new Map<string, Interno>()
  for (const c of corridas) {
    const cats = (c.categorias ?? []).filter(ehCategoria)
    const nome = cats.map((x) => semDemo(x.nome)).join(' + ') || 'Todas as categorias'
    const g: Interno = grupos.get(nome) ?? {
      categoria: nome,
      ids: cats.map((x) => String(x.id)),
      cor: cats[0]?.cor ?? null,
      corridas: [],
      primeiro: Infinity,
      // Corrida de várias categorias: as subcategorias de todas, na ordem de cada uma
      cadastradas: cats.flatMap((x) => x.subcategorias ?? mapa?.get(String(x.id)) ?? []),
      marcadas: [],
    }
    const t = c.inicio ? new Date(c.inicio).getTime() : Infinity
    g.primeiro = Math.min(g.primeiro, t)
    const sessao = { nome: semDemo(c.nome), hora: c.inicio ? formatarHora(c.inicio) : null }
    g.corridas.push(sessao)
    g.marcadas.push({ sessao, subcategorias: c.subcategorias })
    grupos.set(nome, g)
  }
  return [...grupos.values()]
    .sort((a, b) => a.primeiro - b.primeiro)
    .map(({ primeiro: _p, cadastradas, marcadas, ...g }) => {
      const porSub = agruparHorariosPorSubcategoria(marcadas, (m) => m.subcategorias, cadastradas)
      return { ...g, subcategorias: porSub && porSub.map((sg) => ({ ...sg, sessoes: sg.sessoes.map((m) => m.sessao) })) }
    })
}
