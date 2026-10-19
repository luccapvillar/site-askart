import type { Metadata } from 'next'
import { NavegacaoBks } from '@/components/site/bks/AbasBks'
import s from '@/components/site/bks/Bks.module.css'
import { GradeGalerias } from '@/components/site/bks/CartoesGaleria'
import { galeriasDoBks } from '@/components/site/bks/fotos'
import { CabecalhoArea } from '@/components/site/bks/Modalidades'

export const revalidate = 60

export const metadata: Metadata = { title: 'BKS — Fotos', description: 'Galerias de fotos do BKS — Brasília Kart Series: etapas, treinos e eventos do campeonato.' }

/** Sub-aba Fotos: as galerias do campeonato em cartões (capa, título, data/etapa e quantidade de fotos). */
export default async function FotosBks() {
  const galerias = (await galeriasDoBks()).filter((g) => (g.fotos ?? []).length > 0)

  return (
    <>
      <NavegacaoBks secao="fotos" />
      <section className={`secao-compacta ${s.secaoPrincipal}`} aria-labelledby="fotos">
        <div className="conteiner">
          <CabecalhoArea
            id="fotos"
            titulo="Fotos"
            introducao={galerias.length ? 'Escolha uma galeria para ver as fotos.' : undefined}
          />
          {galerias.length ? (
            <GradeGalerias galerias={galerias} />
          ) : (
            <div className={s.fotosVazio} role="status">
              <span className={s.fotosVazioIcone} aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" focusable="false">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="9" cy="10" r="1.6" />
                  <path d="m4 17 5-4.5 3.5 3 3-2.5L20 17" />
                </svg>
              </span>
              <p className={s.fotosVazioTitulo}>Nenhuma galeria publicada ainda</p>
              <p className="texto-2">As fotos das etapas do BKS aparecem aqui assim que a organização publicar as galerias.</p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
