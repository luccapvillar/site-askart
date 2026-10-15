import type { Metadata } from 'next'
import Link from 'next/link'
import s from '@/components/site/bks/Bks.module.css'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { Foto } from '@/components/site/Foto'
import { Galeria } from '@/components/site/Galeria'
import { TextoDemo } from '@/components/site/TextoDemo'
import { fotosDaGaleria } from '@/lib/galeria'
import { lerBks, lerGalerias } from '@/lib/publico'

export const revalidate = 60

export const metadata: Metadata = { title: 'BKS — Fotos', description: 'Fotos das etapas do BKS — Brasília Kart Series.' }

/** Sub-aba Fotos: galerias ligadas ao campeonato (a mais recente aberta). */
export default async function FotosBks() {
  const bks = await lerBks()
  const galerias = bks ? await lerGalerias({ campeonato: { equals: bks.campeonato.id } }, 24) : []
  const [primeira, ...outras] = galerias

  return (
    <section className="secao-compacta" aria-labelledby="fotos">
      <div className="conteiner">
        <div className={s.cabecalhoSecao}>
          <h2 id="fotos" className="titulo-marca h2">
            Fotos
          </h2>
        </div>
        {!primeira ? (
          <EstadoVazio texto="As fotos das etapas serão publicadas aqui." />
        ) : (
          <>
            <h3 className={`h3 ${s.subtitulo}`}>
              <TextoDemo texto={primeira.titulo} />
            </h3>
            <Galeria fotos={fotosDaGaleria(primeira)} exibicao={primeira.exibicao ?? 'grade'} />
            {outras.length > 0 && (
              <>
                <h3 className={`h3 ${s.subtitulo}`}>Outras galerias</h3>
                <ul className={s.gradeGalerias}>
                  {outras.map((g) => (
                    <li key={g.id}>
                      <Link href={`/galeria/${g.slug}`} className={s.cartaoGaleria}>
                        <Foto midia={typeof g.capa === 'object' ? g.capa : null} ate="card" sizes="(min-width: 900px) 33vw, 100vw" />
                        <span>
                          <TextoDemo texto={g.titulo} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </section>
  )
}
