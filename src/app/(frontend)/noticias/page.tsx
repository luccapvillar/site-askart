import type { Metadata } from 'next'
import Link from 'next/link'
import { CartaoNoticia, GradeCartoes } from '@/components/site/Cartoes'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { imagemDoCartao } from '@/components/site/Foto'
import { TopoPagina } from '@/components/site/paginas/TopoPagina'
import s from '@/components/site/paginas/Paginas.module.css'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { formatarData } from '@/lib/datas'
import { comoDoc, lerAvisos, lerNoticias, textosDaSecao } from '@/lib/publico'
import type { CategoriasNoticia, Midia } from '@/payload-types'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const textos = await textosDaSecao('noticias')
  return { title: textos?.seoTitulo || 'Notícias', description: textos?.seoDescricao || 'Notícias, anúncios e comunicados da ASKART, do kartódromo e do BKS.' }
}

const POR_PAGINA = 12

export default async function Noticias({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { pagina: p } = await searchParams
  const pagina = Math.max(1, Number(p) || 1)
  const [noticias, avisos, textos] = await Promise.all([lerNoticias(POR_PAGINA, pagina), lerAvisos(5), textosDaSecao('noticias')])

  return (
    <>
      <TopoPagina rotulo="ASKART · Kartódromo · BKS" titulo={textos?.titulo || 'Notícias'} intro={textos?.introducao || 'O que aconteceu e o que vai acontecer no kartódromo e no campeonato.'} foto={comoDoc<Midia>(textos?.imagem)} />

      {avisos.length > 0 && pagina === 1 && (
        <section className="secao-compacta fundo-branco" aria-labelledby="comunicados">
          <div className="conteiner">
            <h2 id="comunicados" className="h3" style={{ marginBottom: 12 }}>
              Comunicados oficiais
            </h2>
            <ul className={s.lista}>
              {avisos.map((a) => (
                <li key={a.id}>
                  <Link href={`/comunicados/${a.id}`}>
                    <strong>
                      <TextoDemo texto={a.titulo} />
                    </strong>
                  </Link>
                  <span className="mono texto-2">{a.publicarEm ? formatarData(a.publicarEm) : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="secao-compacta" aria-label="Notícias">
        <div className="conteiner">
          {!noticias.docs.length ? (
            <EstadoVazio texto={textos?.textoVazio || 'Nenhuma notícia publicada ainda.'} />
          ) : (
            <GradeCartoes>
              {noticias.docs.map((n) => (
                <CartaoNoticia
                  key={n.id}
                  href={`/noticias/${n.slug}`}
                  titulo={semDemo(n.titulo)}
                  resumo={n.subtitulo}
                  data={n.publicarEm ? formatarData(n.publicarEm) : ''}
                  categoria={semDemo(comoDoc<CategoriasNoticia>(n.categoria)?.nome) || null}
                  imagem={imagemDoCartao(n.capa)}
                />
              ))}
            </GradeCartoes>
          )}
          {noticias.totalPages > 1 && (
            <nav aria-label="Páginas" style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 40 }}>
              {pagina > 1 && <Link href={`/noticias?pagina=${pagina - 1}`}>← Mais recentes</Link>}
              <span className="texto-2">
                Página {pagina} de {noticias.totalPages}
              </span>
              {pagina < noticias.totalPages && <Link href={`/noticias?pagina=${pagina + 1}`}>Mais antigas →</Link>}
            </nav>
          )}
        </div>
      </section>
    </>
  )
}
