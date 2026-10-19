import type { Metadata } from 'next'
import Link from 'next/link'
import { Nota } from '@/components/site/base/Nota'
import { CartaoNoticiaSite, NoticiaDestaque } from '@/components/site/conteudo/Noticias'
import { Paginacao } from '@/components/site/conteudo/Paginacao'
import c from '@/components/site/conteudo/Conteudo.module.css'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { TopoPagina } from '@/components/site/paginas/TopoPagina'
import { comoDoc, lerAvisos, lerNoticias, textosDaSecao } from '@/lib/publico'
import type { Midia } from '@/payload-types'

export const revalidate = 60

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ pagina?: string }> }): Promise<Metadata> {
  const [textos, { pagina }] = await Promise.all([textosDaSecao('noticias'), searchParams])
  const n = Math.floor(Number(pagina)) || 1
  const titulo = textos?.seoTitulo || 'Notícias'
  return {
    title: n > 1 ? `${titulo} — página ${n}` : titulo,
    description: textos?.seoDescricao || 'Notícias e anúncios da ASKART sobre o Kartódromo do Guará e o BKS.',
    alternates: { canonical: n > 1 ? `/noticias?pagina=${n}` : '/noticias' },
  }
}

const POR_PAGINA = 13 // 1 em destaque + 12 em grade (3 linhas de 4, 4 de 3 ou 6 de 2)

export default async function Noticias({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { pagina: p } = await searchParams
  const pedida = Math.max(1, Math.floor(Number(p)) || 1)
  const [noticias, avisos, textos] = await Promise.all([lerNoticias(POR_PAGINA, pedida), lerAvisos(20), textosDaSecao('noticias')])
  const pagina = noticias.page || pedida
  const [primeira, ...demais] = noticias.docs
  const destaque = pagina === 1 ? primeira : null
  const grade = pagina === 1 ? demais : noticias.docs

  return (
    <>
      <TopoPagina
        trilha={[{ rotulo: 'Notícias' }]}
        rotulo="ASKART · Kartódromo · BKS"
        titulo={textos?.titulo || 'Notícias'}
        intro={textos?.introducao || 'O que aconteceu e o que vai acontecer no Kartódromo do Guará e no BKS, com as notícias mais recentes primeiro.'}
        foto={comoDoc<Midia>(textos?.imagem)}
      />

      <section className="secao-compacta fundo-papel" aria-labelledby="lista-noticias">
        <div className={`conteiner ${c.listaPagina}`}>
          <h2 id="lista-noticias" className="visualmente-oculto">
            {pagina > 1 ? `Notícias — página ${pagina} de ${noticias.totalPages}` : 'Notícias publicadas'}
          </h2>

          {pagina === 1 && avisos.length > 0 && (
            <Nota tom="info" titulo={avisos.length === 1 ? 'Há 1 aviso oficial no ar' : `Há ${avisos.length} avisos oficiais no ar`}>
              Comunicados sobre treinos, etapas e o kartódromo ficam na aba <Link href="/avisos">Avisos</Link>.
            </Nota>
          )}

          {!noticias.docs.length ? (
            <EstadoVazio
              texto={textos?.textoVazio || (pagina > 1 ? 'Esta página de notícias não existe.' : 'Nenhuma notícia publicada ainda.')}
              acao={
                pagina > 1 ? (
                  <Link className="link-seta" href="/noticias">
                    Ver as notícias mais recentes
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <>
              {destaque && <NoticiaDestaque noticia={destaque} nivel={3} />}
              {grade.length > 0 && (
                <ul className={c.gradeNoticias} aria-label={destaque ? 'Mais notícias' : undefined}>
                  {grade.map((n) => (
                    <li key={n.id} className={c.gradeItem}>
                      <CartaoNoticiaSite noticia={n} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <Paginacao pagina={pagina} total={noticias.totalPages} base="/noticias" rotulo="Páginas de notícias" />
        </div>
      </section>
    </>
  )
}
