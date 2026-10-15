import type { Metadata } from 'next'
import { lerBks, lerEtapas } from '@/lib/publico'
import { ResultadosBks } from './conteudo'

export const revalidate = 60

export const metadata: Metadata = { title: 'BKS — Resultados', description: 'Resultado de cada etapa do BKS — Brasília Kart Series, por categoria.' }

/** Resultados: abre na etapa realizada mais recente. */
export default async function PaginaResultados() {
  const bks = await lerBks()
  const etapas = bks?.temporada ? await lerEtapas(bks.temporada.id) : []
  const realizadas = etapas.filter((e) => e.status === 'realizada')
  return <ResultadosBks etapas={etapas} atual={realizadas.at(-1) ?? null} />
}
