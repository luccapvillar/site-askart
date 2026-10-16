import type { Metadata } from 'next'
import Link from 'next/link'
import { ListaAvisos } from '@/components/site/avisos/ListaAvisos'
import s from '@/components/site/avisos/Avisos.module.css'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { TopoPagina } from '@/components/site/paginas/TopoPagina'
import { comoDoc, lerAvisos, textosDaSecao } from '@/lib/publico'
import type { Midia } from '@/payload-types'

export const revalidate = 60

/** Os textos do topo vêm de "Textos das seções" → Comunicados (a mesma seção, agora chamada Avisos). */
const SECAO = 'comunicados'
const POR_PAGINA = 20
/** Só avisos no ar (publicados e dentro do período de exibição) chegam aqui. */
const LIMITE = 200

export async function generateMetadata(): Promise<Metadata> {
  const textos = await textosDaSecao(SECAO)
  return {
    title: textos?.seoTitulo || 'Avisos',
    description:
      textos?.seoDescricao || 'Avisos e comunicados oficiais da ASKART sobre treinos, etapas e o Kartódromo do Guará.',
    alternates: { canonical: '/avisos' },
  }
}

export default async function Avisos({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { pagina: p } = await searchParams
  const [avisos, textos] = await Promise.all([lerAvisos(LIMITE), textosDaSecao(SECAO)])
  const total = Math.max(1, Math.ceil(avisos.length / POR_PAGINA))
  const pagina = Math.min(total, Math.max(1, Math.floor(Number(p)) || 1))
  const daPagina = avisos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  return (
    <>
      <TopoPagina
        rotulo="ASKART · Kartódromo · BKS"
        titulo={textos?.titulo || 'Avisos'}
        intro={
          textos?.introducao ||
          'Comunicados oficiais e avisos sobre treinos, etapas e o kartódromo. Os mais recentes aparecem primeiro.'
        }
        foto={comoDoc<Midia>(textos?.imagem)}
      />

      <section className="secao-compacta" aria-label="Avisos no ar">
        <div className="conteiner">
          {!avisos.length ? (
            <EstadoVazio texto={textos?.textoVazio || 'Nenhum aviso no momento.'} />
          ) : (
            <>
              <p className={s.contagem}>
                {avisos.length === 1 ? '1 aviso no momento.' : `${avisos.length} avisos no momento.`}
              </p>
              <ListaAvisos avisos={daPagina} />
            </>
          )}
          {total > 1 && (
            <nav className={s.paginas} aria-label="Páginas de avisos">
              {pagina > 1 && <Link href={`/avisos?pagina=${pagina - 1}`}>← Mais recentes</Link>}
              <span className="texto-2" aria-current="page">
                Página {pagina} de {total}
              </span>
              {pagina < total && <Link href={`/avisos?pagina=${pagina + 1}`}>Mais antigos →</Link>}
            </nav>
          )}
        </div>
      </section>
    </>
  )
}
