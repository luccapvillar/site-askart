import type { Metadata } from 'next'
import { AreaResultados } from '@/components/site/bks/AreaResultados'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'BKS — Resultados dos karts profissionais',
  description: 'Resultado de cada etapa do BKS — Brasília Kart Series (karts profissionais), por categoria.',
}

/** Resultados (karts profissionais): abre na etapa realizada mais recente. */
export default function PaginaResultados() {
  return <AreaResultados modalidade="profissional" />
}
