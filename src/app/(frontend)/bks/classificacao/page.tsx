import type { Metadata } from 'next'
import { AreaClassificacao } from '@/components/site/bks/AreaClassificacao'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'BKS — Classificação dos karts profissionais',
  description: 'Tabela de liderança de cada categoria de karts profissionais do BKS — Brasília Kart Series: pilotos e pontos.',
}

/** Sub-aba Classificação (karts profissionais): tabela de liderança de cada categoria. */
export default function ClassificacaoBks() {
  return <AreaClassificacao modalidade="profissional" />
}
