import type { Metadata } from 'next'
import { AreaCalendario } from '@/components/site/bks/AreaCalendario'
import { textosDaSecao } from '@/lib/publico'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const textos = await textosDaSecao('bks')
  return {
    title: textos?.seoTitulo || 'BKS — Calendário dos karts profissionais',
    description:
      textos?.seoDescricao ||
      'Calendário das etapas do BKS — Brasília Kart Series (karts profissionais): datas, categorias, horários de cada categoria, ingressos, treinos livres, transmissão ao vivo e local.',
  }
}

/** Página principal da aba BKS: calendário dos karts profissionais (o endereço de sempre) e "Venha assistir". */
export default function CalendarioBks() {
  return <AreaCalendario modalidade="profissional" />
}
