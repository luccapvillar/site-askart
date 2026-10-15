import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { lerBks, lerEtapas } from '@/lib/publico'
import { ResultadosBks } from '../conteudo'

export const revalidate = 60
export const dynamicParams = true
export const generateStaticParams = async () => []

type Props = { params: Promise<{ numero: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { numero } = await params
  return { title: `BKS — Resultado da ${Number(numero)}ª etapa` }
}

export default async function ResultadoDaEtapa({ params }: Props) {
  const { numero } = await params
  const bks = await lerBks()
  const etapas = bks?.temporada ? await lerEtapas(bks.temporada.id) : []
  const atual = etapas.find((e) => String(e.numero) === numero)
  if (!atual) notFound()
  return <ResultadosBks etapas={etapas} atual={atual} />
}
