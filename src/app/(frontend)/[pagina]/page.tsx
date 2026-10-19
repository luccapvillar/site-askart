import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Botao } from '@/components/site/Botao'
import { DocumentoParaBaixar } from '@/components/site/conteudo/Artigo'
import c from '@/components/site/conteudo/Conteudo.module.css'
import { Foto } from '@/components/site/Foto'
import { Galeria } from '@/components/site/Galeria'
import { TopoPagina } from '@/components/site/paginas/TopoPagina'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico } from '@/components/site/TextoRico'
import { PlayerYoutube } from '@/components/site/youtube/PlayerYoutube'
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
  return p
    ? { title: semDemo(p.titulo), description: p.resumo || undefined, alternates: { canonical: `/${p.slug}` } }
    : { title: 'Página não encontrada' }
}

/** Endereço do player com autoplay (o player só entra depois do clique do visitante). */
const comAutoplay = (url: string) => {
  try {
    const u = new URL(url)
    u.searchParams.set('autoplay', '1')
    return u.toString()
  } catch {
    return url
  }
}

/** Páginas livres montadas em blocos no painel. Nada externo é carregado sem o visitante pedir. */
export default async function PaginaLivre({ params }: Props) {
  const p = await lerPagina((await params).pagina)
  if (!p) notFound()
  const titulo = semDemo(p.titulo)
  return (
    <>
      <TopoPagina trilha={[{ rotulo: titulo }]} titulo={<TextoDemo texto={p.titulo} />} intro={p.resumo} foto={comoDoc<Midia>(p.imagemTopo)} />
      <div className={`${c.artigo} ${c.artigoSemCabeca}`}>
        <div className={`conteiner ${c.corpo}`}>
          {(p.blocos ?? []).map((bloco, n) => {
            switch (bloco.blockType) {
              case 'texto':
                return <TextoRico key={n} dados={bloco.texto} />
              case 'imagem': {
                const imagem = comoDoc<Midia>(bloco.imagem)
                if (!imagem?.url) return null
                const legenda = bloco.legenda || imagem.legenda
                return (
                  <figure key={n} className={`${c.figura} ${c.figuraLarga}`}>
                    <Foto midia={imagem} sizes="(min-width: 1100px) 1040px, 100vw" />
                    {(legenda || imagem.credito) && (
                      <figcaption className={c.legenda}>
                        {legenda && <span>{semDemo(legenda)}</span>}
                        {imagem.credito && <span className={c.credito}>Foto: {imagem.credito}</span>}
                      </figcaption>
                    )}
                  </figure>
                )
              }
              case 'galeria': {
                const g = comoDoc<TipoGaleria>(bloco.galeria)
                const fotos = g ? fotosDaGaleria(g) : []
                if (!g || !fotos.length) return null
                return (
                  <div key={n} className={c.figuraLarga}>
                    <Galeria fotos={fotos} exibicao={(bloco.exibicao as 'grade' | 'mosaico' | 'carrossel' | undefined) ?? g.exibicao ?? 'grade'} />
                  </div>
                )
              }
              case 'botao': {
                const link = bloco.link as ValorLink
                const attrs = atributosDoLink(link)
                return attrs ? (
                  <p key={n}>
                    <Botao href={attrs.href} externo={attrs.target === '_blank'} seta>
                      {rotuloDoLink(link) || 'Saiba mais'}
                    </Botao>
                  </p>
                ) : null
              }
              case 'video': {
                const v = lerVideoExterno(bloco.url)
                if (!v) return null
                const tituloVideo = bloco.legenda || 'Vídeo'
                return (
                  <figure key={n} className={c.figura}>
                    {v.plataforma === 'youtube' ? (
                      <PlayerYoutube endereco={comAutoplay(v.urlPlayer)} link={String(bloco.url)} titulo={tituloVideo} chamada="Assistir ao vídeo" />
                    ) : (
                      <p>
                        <Botao href={String(bloco.url)} externo seta>
                          Assistir ao vídeo no Vimeo
                        </Botao>
                      </p>
                    )}
                    {bloco.legenda && <figcaption className={c.legenda}>{bloco.legenda}</figcaption>}
                  </figure>
                )
              }
              case 'documento': {
                const d = comoDoc<Documento>(bloco.documento)
                return d?.slug ? (
                  <DocumentoParaBaixar key={n} href={`/documentos/${d.slug}/arquivo`} titulo={bloco.texto || <TextoDemo texto={d.titulo} />} />
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
