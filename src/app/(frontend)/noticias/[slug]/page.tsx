import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Artigo, Relacionados, tituloCurto } from '@/components/site/conteudo/Artigo'
import { ItemNoticia } from '@/components/site/conteudo/Noticias'
import c from '@/components/site/conteudo/Conteudo.module.css'
import { Foto } from '@/components/site/Foto'
import { Galeria } from '@/components/site/Galeria'
import { Selo } from '@/components/site/Selo'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico, textoPuro } from '@/components/site/TextoRico'
import { TituloSecao } from '@/components/site/TituloSecao'
import { formatarDataExtenso, formatarHora } from '@/lib/datas'
import { fotosDaGaleria } from '@/lib/galeria'
import { comoDoc, lerNoticia, lerNoticias } from '@/lib/publico'
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
    description: semDemo(n.subtitulo) || textoPuro(n.conteudo, 160) || undefined,
    alternates: { canonical: `/noticias/${n.slug}` },
    openGraph: {
      type: 'article',
      publishedTime: n.publicarEm ?? undefined,
      images: capa?.sizes?.compartilhamento?.url ? [capa.sizes.compartilhamento.url] : undefined,
    },
  }
}

export default async function Noticia({ params }: Props) {
  const n = await lerNoticia((await params).slug)
  if (!n) notFound()
  const categoria = comoDoc<CategoriasNoticia>(n.categoria)
  const etapa = comoDoc<Etapa>(n.etapa)
  const galeria = comoDoc<TipoGaleria>(n.galeria)
  const fotos = galeria ? fotosDaGaleria(galeria) : []
  const capa = comoDoc<Midia>(n.capa)
  const titulo = semDemo(n.titulo)
  // Mais notícias (as mais recentes, sem esta)
  const outras = (await lerNoticias(4)).docs.filter((o) => o.id !== n.id).slice(0, 3)

  return (
    <>
      <Artigo
        trilha={[{ rotulo: 'Notícias', href: '/noticias' }, { rotulo: tituloCurto(titulo) }]}
        meta={
          categoria ? (
            <Selo tom="marca" ponto={false}>
              {semDemo(categoria.nome)}
            </Selo>
          ) : null
        }
        titulo={<TextoDemo texto={n.titulo} />}
        linhaFina={n.subtitulo ? semDemo(n.subtitulo) : null}
        assinatura={
          <>
            {n.publicarEm && (
              <span>
                Publicada em{' '}
                <time dateTime={n.publicarEm}>
                  <strong>{formatarDataExtenso(n.publicarEm)}</strong>, às {formatarHora(n.publicarEm)}
                </time>
              </span>
            )}
            {n.autor && (
              <span>
                Por <strong>{semDemo(n.autor)}</strong>
              </span>
            )}
          </>
        }
        capa={
          capa?.url ? (
            <figure className={c.figuraCapa}>
              <Foto midia={capa} prioridade sizes="(min-width: 1200px) 1120px, 100vw" />
              {(capa.legenda || capa.credito) && (
                <figcaption className={c.legenda}>
                  {capa.legenda && <span>{semDemo(capa.legenda)}</span>}
                  {capa.credito && <span className={c.credito}>Foto: {capa.credito}</span>}
                </figcaption>
              )}
            </figure>
          ) : null
        }
        depois={
          <>
            {fotos.length > 0 && galeria && (
              <section className={c.galeria} aria-labelledby="fotos-noticia">
                <h2 id="fotos-noticia" className={c.subtituloCorpo}>
                  Fotos {galeria.titulo ? <span className="texto-2">· {semDemo(galeria.titulo)}</span> : null}
                </h2>
                <Galeria fotos={fotos} exibicao={galeria.exibicao ?? 'grade'} />
              </section>
            )}
            {etapa && (
              <Relacionados
                titulo="Sobre a etapa"
                itens={[{ href: `/etapas/${etapa.id}`, rotulo: <TextoDemo texto={etapa.nome || `${etapa.numero}ª etapa`} /> }]}
              />
            )}
          </>
        }
        voltar={{ href: '/noticias', rotulo: 'Todas as notícias' }}
      >
        <TextoRico dados={n.conteudo} />
      </Artigo>

      {outras.length > 0 && (
        <section className="secao-compacta fundo-papel" aria-labelledby="mais-noticias">
          <div className="conteiner">
            <TituloSecao id="mais-noticias" rotulo="Continue lendo" titulo="Mais notícias" />
            <ul className={c.gradeItens}>
              {outras.map((o) => (
                <li key={o.id} className={c.gradeItem}>
                  <ItemNoticia noticia={o} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  )
}
