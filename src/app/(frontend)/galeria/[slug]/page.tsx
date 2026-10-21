import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import s from '@/components/site/bks/Bks.module.css'
import { infoDaGaleria } from '@/components/site/bks/CartoesGaleria'
import { capaDaGaleria } from '@/components/site/bks/fotos'
import { Galeria } from '@/components/site/Galeria'
import { TopoPagina, type ItemTrilha } from '@/components/site/paginas/TopoPagina'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { creditosDasFotos, fotosDaGaleria } from '@/lib/galeria'
import { comoDoc, lerGaleria } from '@/lib/publico'
import { variaveisDoTemaBks } from '@/lib/site'
import type { Campeonato, Etapa } from '@/payload-types'

export const revalidate = 60
export const dynamicParams = true
export const generateStaticParams = async () => []

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await lerGaleria((await params).slug)
  return { title: g ? `Fotos — ${semDemo(g.titulo)}` : 'Galeria não encontrada', description: semDemo(g?.descricao) || undefined }
}

/**
 * Página de uma galeria: topo com a capa, a grade de fotos (mesma proporção, sem buracos) com legenda e
 * crédito, e a ampliação acessível ao tocar na foto. Galeria do BKS volta para a sub-aba Fotos e usa o tema
 * da aba BKS (cores da logo, Bks.module.css).
 */
export default async function PaginaGaleria({ params }: Props) {
  const g = await lerGaleria((await params).slug)
  if (!g) notFound()
  const fotos = fotosDaGaleria(g)
  const info = infoDaGaleria(g)
  const etapa = comoDoc<Etapa>(g.etapa)
  const doBks = Boolean(g.campeonato)
  const creditos = creditosDasFotos(fotos)
  const trilha: ItemTrilha[] = doBks
    ? [{ rotulo: 'BKS', href: '/bks' }, { rotulo: 'Fotos', href: '/bks/fotos' }, { rotulo: semDemo(g.titulo) }]
    : [{ rotulo: semDemo(g.titulo) }]

  const pagina = (
    <>
      <TopoPagina
        trilha={trilha}
        rotulo={info.rotulo ? `Galeria de fotos · ${info.rotulo}` : 'Galeria de fotos'}
        titulo={<TextoDemo texto={g.titulo} />}
        intro={semDemo(g.descricao) || undefined}
        foto={capaDaGaleria(g)}
      />
      <section className={`secao-compacta fundo-branco ${s.paginaGaleria}`} aria-labelledby="fotos-da-galeria">
        <div className="conteiner">
          <div className={s.galeriaBarra}>
            <h2 id="fotos-da-galeria" className="titulo-marca h3">
              {info.quantidade}
            </h2>
            <p className={s.galeriaBarraMeta}>
              {[info.data, etapa ? semDemo(etapa.nome) || `${etapa.numero}ª etapa` : null].filter(Boolean).join(' · ')}
              {fotos.length > 0 && <span className={s.galeriaDica}>Toque numa foto para ampliar.</span>}
            </p>
          </div>
          {fotos.length ? (
            <Galeria fotos={fotos} exibicao={g.exibicao === 'carrossel' ? 'grade' : (g.exibicao ?? 'grade')} />
          ) : (
            <div className={s.fotosVazio} role="status">
              <p className={s.fotosVazioTitulo}>Esta galeria ainda não tem fotos</p>
              <p className="texto-2">As fotos aparecem aqui assim que a organização publicar.</p>
            </div>
          )}
          {creditos.length > 0 && <p className={s.creditos}>Créditos das fotos: {creditos.join('; ')}.</p>}
          <p className={s.voltar}>
            {etapa && (
              <Link className="link-seta" href={`/etapas/${etapa.id}`}>
                Página da etapa
              </Link>
            )}
            <Link className="link-seta" href={doBks ? '/bks/fotos' : '/'}>
              {doBks ? 'Todas as galerias do BKS' : 'Voltar ao início'}
            </Link>
          </p>
        </div>
      </section>
    </>
  )
  if (!doBks) return pagina
  return (
    <div className={s.tema} style={variaveisDoTemaBks(comoDoc<Campeonato>(g.campeonato)?.cores) as CSSProperties}>
      {pagina}
    </div>
  )
}
