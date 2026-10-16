import { metadadosDoAviso, PaginaDoAviso, type PropsAviso } from '@/components/site/avisos/pagina'

export const revalidate = 60
export const dynamicParams = true
export const generateStaticParams = async () => []

export const generateMetadata = (props: PropsAviso) => metadadosDoAviso(props)

export default function Aviso(props: PropsAviso) {
  return <PaginaDoAviso {...props} />
}
