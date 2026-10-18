import type { Metadata } from 'next'
import { AreaClassificacao } from '@/components/site/bks/AreaClassificacao'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'BKS — Classificação dos karts indoor',
  description: 'Tabela de liderança de cada categoria de kart indoor do BKS — Brasília Kart Series: pilotos e pontos.',
}

/** Sub-aba Classificação (karts indoor): tabela de liderança de cada categoria. */
export default function ClassificacaoIndoor() {
  return <AreaClassificacao modalidade="indoor" />
}
