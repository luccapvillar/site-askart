import type { Metadata } from 'next'
import { AreaResultados } from '@/components/site/bks/AreaResultados'

export const revalidate = 60
export const dynamicParams = true
export const generateStaticParams = async () => []

type Props = { params: Promise<{ numero: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { numero } = await params
  return { title: `BKS — Resultado da ${Number(numero)}ª etapa (karts profissionais)` }
}

export default async function ResultadoDaEtapa({ params }: Props) {
  const { numero } = await params
  return <AreaResultados modalidade="profissional" numero={numero} />
}
