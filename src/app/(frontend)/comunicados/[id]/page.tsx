import { metadadosDoAviso, PaginaDoAviso, type PropsAviso } from '@/components/site/avisos/pagina'

/**
 * Endereço antigo de um comunicado (links já compartilhados, barra do topo, página inicial).
 * Mostra o mesmo aviso de /avisos/[id]; o endereço oficial (canonical) é o de /avisos.
 */
export const revalidate = 60
export const dynamicParams = true
export const generateStaticParams = async () => []

export const generateMetadata = (props: PropsAviso) => metadadosDoAviso(props)

export default function Comunicado(props: PropsAviso) {
  return <PaginaDoAviso {...props} />
}
