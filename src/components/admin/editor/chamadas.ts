/** Chamadas do painel às alterações que esperam publicação (endpoints /api/previa/*). */

export type ItemPrevia = { tipo: 'colecao' | 'global'; slug: string; id?: number }

export type Pendente = ItemPrevia & {
  titulo: string
  rotuloColecao: string
  atualizadoEm: string
  novo: boolean
  urlAdmin: string
  rota: string | null
}

export type ResultadoItem = { slug: string; id?: number; ok: boolean; mensagem: string }

const erroDe = (dados: { erro?: string; errors?: { message?: string }[] }) => dados.erro || dados.errors?.[0]?.message || 'Não deu certo. Tente de novo.'

export async function buscarPendentes(): Promise<Pendente[]> {
  const r = await fetch('/api/previa/pendentes', { credentials: 'include', cache: 'no-store' })
  const dados = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(erroDe(dados))
  return Array.isArray(dados.pendentes) ? dados.pendentes : []
}

/** Publica ou descarta. Sem itens, vale para todas as alterações pendentes. */
export async function agirEmPendentes(acao: 'publicar' | 'descartar', itens?: ItemPrevia[]): Promise<ResultadoItem[]> {
  const r = await fetch(`/api/previa/${acao}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itens ? { itens } : {}),
  })
  const dados = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(erroDe(dados))
  return Array.isArray(dados.resultados) ? dados.resultados : []
}

export const itemDe = ({ tipo, slug, id }: ItemPrevia): ItemPrevia => (id === undefined || id === null ? { tipo, slug } : { tipo, slug, id })

export const mesmoItem = (a: { slug: string; id?: number | string }, b: { slug: string; id?: number | string }) =>
  a.slug === b.slug && String(a.id ?? '') === String(b.id ?? '')
