import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Galeria } from '@/components/site/Galeria'
import { Secao, TopoPagina } from '@/components/site/paginas/TopoPagina'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { fotosDaGaleria } from '@/lib/galeria'
import { lerGaleria } from '@/lib/publico'

export const revalidate = 60
export const dynamicParams = true
export const generateStaticParams = async () => []

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await lerGaleria((await params).slug)
  return { title: g ? semDemo(g.titulo) : 'Galeria não encontrada', description: g?.descricao || undefined }
}

export default async function PaginaGaleria({ params }: Props) {
  const g = await lerGaleria((await params).slug)
  if (!g) notFound()
  return (
    <>
      <TopoPagina rotulo="Fotos" titulo={<TextoDemo texto={g.titulo} />} intro={g.descricao} />
      <Secao id="fotos" titulo={`${g.fotos?.length ?? 0} fotos`} branca>
        <Galeria fotos={fotosDaGaleria(g)} exibicao={g.exibicao ?? 'grade'} />
      </Secao>
    </>
  )
}
