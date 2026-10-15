import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Foto } from '@/components/site/Foto'
import { Galeria } from '@/components/site/Galeria'
import s from '@/components/site/paginas/Leitura.module.css'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico, textoPuro } from '@/components/site/TextoRico'
import { formatarDataExtenso } from '@/lib/datas'
import { fotosDaGaleria } from '@/lib/galeria'
import { comoDoc, lerNoticia } from '@/lib/publico'
import type { CategoriasNoticia, Etapa, Galeria as TipoGaleria, Midia } from '@/payload-types'

export const revalidate = 60
export const dynamicParams = true
export const generateStaticParams = async () => []

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = await lerNoticia((await params).slug)
  if (!n) return { title: 'Notícia não encontrada' }
  const capa = comoDoc<Midia>(n.capa)
  return {
    title: semDemo(n.titulo),
    description: n.subtitulo || textoPuro(n.conteudo, 160),
    openGraph: { type: 'article', publishedTime: n.publicarEm ?? undefined, images: capa?.sizes?.compartilhamento?.url ? [capa.sizes.compartilhamento.url] : undefined },
  }
}

export default async function Noticia({ params }: Props) {
  const n = await lerNoticia((await params).slug)
  if (!n) notFound()
  const categoria = comoDoc<CategoriasNoticia>(n.categoria)
  const etapa = comoDoc<Etapa>(n.etapa)
  const galeria = comoDoc<TipoGaleria>(n.galeria)
  return (
    <article className={s.artigo}>
      <header className={`conteiner ${s.cabeca}`}>
        <nav aria-label="Você está em" className={s.trilha}>
          <Link href="/noticias">Notícias</Link>
          {categoria && <span aria-hidden="true"> / </span>}
          {categoria && <span>{semDemo(categoria.nome)}</span>}
        </nav>
        <h1 className={`h2 ${s.titulo}`}>
          <TextoDemo texto={n.titulo} />
        </h1>
        {n.subtitulo && <p className={s.subtitulo}>{n.subtitulo}</p>}
        <p className={s.meta}>
          {n.publicarEm && <time dateTime={n.publicarEm}>{formatarDataExtenso(n.publicarEm)}</time>}
          {n.autor && <span>Por {n.autor}</span>}
        </p>
      </header>
      {comoDoc<Midia>(n.capa) && (
        <div className={`conteiner ${s.capa}`}>
          <Foto midia={comoDoc<Midia>(n.capa)} prioridade sizes="(min-width: 1100px) 1000px, 100vw" credito />
        </div>
      )}
      <div className={`conteiner ${s.corpo}`}>
        <TextoRico dados={n.conteudo} />
        {galeria && (
          <section aria-label="Fotos" className={s.galeria}>
            <Galeria fotos={fotosDaGaleria(galeria)} exibicao={galeria.exibicao ?? 'grade'} />
          </section>
        )}
        {etapa && (
          <p className={s.relacionado}>
            Sobre a <Link href={`/etapas/${etapa.id}`}>{semDemo(etapa.nome) || `${etapa.numero}ª etapa`}</Link>
          </p>
        )}
        <p>
          <Link href="/noticias">← Todas as notícias</Link>
        </p>
      </div>
    </article>
  )
}
