import type { Metadata } from 'next'
import { AreaCalendario } from '@/components/site/bks/AreaCalendario'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'BKS — Calendário dos karts indoor',
  description:
    'Calendário das etapas de kart indoor do BKS — Brasília Kart Series: datas, categorias, horários de cada categoria, ingressos, treinos livres, transmissão ao vivo e local.',
}

/** Área dos karts indoor: calendário, categorias e "Venha assistir". */
export default function CalendarioIndoor() {
  return <AreaCalendario modalidade="indoor" />
}
