import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Botao } from '@/components/site/Botao'
import { Foto } from '@/components/site/Foto'
import { Galeria } from '@/components/site/Galeria'
import { TopoPagina } from '@/components/site/paginas/TopoPagina'
import s from '@/components/site/paginas/Leitura.module.css'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico } from '@/components/site/TextoRico'
import { lerVideoExterno } from '@/collections/conteudo/video-externo'
import { atributosDoLink, rotuloDoLink, type ValorLink } from '@/fields/link'
import { fotosDaGaleria } from '@/lib/galeria'
import { comoDoc, lerPagina } from '@/lib/publico'
import type { Documento, Galeria as TipoGaleria, Midia } from '@/payload-types'

export const revalidate = 60
export const dynamicParams = true
export const generateStaticParams = async () => []

type Props = { params: Promise<{ pagina: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await lerPagina((await params).pagina)
  return p ? { title: semDemo(p.titulo), description: p.resumo || undefined } : { title: 'Página não encontrada' }
}

/** Páginas livres montadas em blocos no painel. */
export default async function PaginaLivre({ params }: Props) {
  const p = await lerPagina((await params).pagina)
  if (!p) notFound()
  return (
    <>
      <TopoPagina titulo={<TextoDemo texto={p.titulo} />} intro={p.resumo} foto={comoDoc<Midia>(p.imagemTopo)} />
      <div className={s.artigo}>
        <div className={`conteiner ${s.corpo}`}>
          {(p.blocos ?? []).map((bloco, i) => {
            switch (bloco.blockType) {
              case 'texto':
                return <TextoRico key={i} dados={bloco.texto} />
              case 'imagem':
                return (
                  <figure key={i}>
                    <Foto midia={comoDoc<Midia>(bloco.imagem)} sizes="(min-width: 800px) 720px, 100vw" credito />
                    {bloco.legenda && <figcaption className="texto-2">{bloco.legenda}</figcaption>}
                  </figure>
                )
              case 'galeria': {
                const g = comoDoc<TipoGaleria>(bloco.galeria)
                return g ? <Galeria key={i} fotos={fotosDaGaleria(g)} exibicao={(bloco.exibicao as 'grade' | 'mosaico' | 'carrossel' | undefined) ?? g.exibicao ?? 'grade'} /> : null
              }
              case 'botao': {
                const link = bloco.link as ValorLink
                const attrs = atributosDoLink(link)
                return attrs ? (
                  <p key={i}>
                    <Botao href={attrs.href} externo={attrs.target === '_blank'} seta>
                      {rotuloDoLink(link) || 'Saiba mais'}
                    </Botao>
                  </p>
                ) : null
              }
              case 'video': {
                const v = lerVideoExterno(bloco.url)
                return v ? (
                  <figure key={i}>
                    <iframe
                      src={v.urlPlayer}
                      title={bloco.legenda || 'Vídeo'}
                      loading="lazy"
                      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: 12 }}
                    />
                    {bloco.legenda && <figcaption className="texto-2">{bloco.legenda}</figcaption>}
                  </figure>
                ) : null
              }
              case 'documento': {
                const d = comoDoc<Documento>(bloco.documento)
                return d ? (
                  <p key={i}>
                    <a className={s.anexo} href={`/documentos/${d.slug}/arquivo`}>
                      {bloco.texto || semDemo(d.titulo)}
                    </a>
                  </p>
                ) : null
              }
              default:
                return null
            }
          })}
        </div>
      </div>
    </>
  )
}
