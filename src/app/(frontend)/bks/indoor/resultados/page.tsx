import type { Metadata } from 'next'
import { AreaResultados } from '@/components/site/bks/AreaResultados'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'BKS — Resultados dos karts indoor',
  description: 'Resultado de cada etapa de kart indoor do BKS — Brasília Kart Series, por categoria.',
}

/** Resultados (karts indoor): abre na etapa realizada mais recente. */
export default function ResultadosIndoor() {
  return <AreaResultados modalidade="indoor" />
}
