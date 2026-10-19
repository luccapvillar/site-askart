import type { ReactNode } from 'react'
import { BotaoIzy } from '@/components/site/bks/pecas'
import s from '@/components/site/bks/Bks.module.css'
import { Foto } from '@/components/site/Foto'
import { semDemo } from '@/components/site/TextoDemo'
import { lerBks, lerConfiguracoes } from '@/lib/publico'
import type { Midia } from '@/payload-types'

export const revalidate = 60

const STATUS_TEMPORADA: Record<string, string> = { planejada: 'Planejada', 'em-andamento': 'Em andamento', encerrada: 'Encerrada' }

/**
 * Aba BKS: topo escuro com a foto do campeonato, a logo do BKS (o título da página), a temporada e a
 * compra pela IZY Pass. Logo abaixo, cada página põe a navegação (Karts profissionais | Karts indoor e as
 * seções), para dizer onde o visitante está sem JavaScript.
 */
export default async function LayoutBks({ children }: { children: ReactNode }) {
  const [bks, config] = await Promise.all([lerBks(), lerConfiguracoes()])
  const campeonato = bks?.campeonato
  const logo = bks?.logo?.url ? bks.logo : null
  const banner = campeonato?.banner && typeof campeonato.banner === 'object' ? (campeonato.banner as Midia) : null
  const temporada = bks?.temporada
  const nome = semDemo(campeonato?.nome) || 'Brasília Kart Series'
  const sigla = semDemo(campeonato?.sigla) || 'BKS'
  return (
    <div className={s.tema}>
      <section className={`${s.topo} ${banner?.url ? s.topoComFoto : ''}`} aria-labelledby="titulo-bks">
        {banner?.url && <Foto midia={banner} className={s.topoFoto} prioridade sizes="100vw" alt="" />}
        <div className={`conteiner ${s.topoConteudo}`}>
          <div className={s.topoMarca}>
            <p className={`rotulo ${s.topoRotulo}`}>Campeonato organizado pela ASKART</p>
            {logo ? (
              <h1 id="titulo-bks" className={s.logoTitulo}>
                <Foto midia={logo} ate="card" prioridade sizes="(min-width: 960px) 520px, 86vw" alt={`${sigla} — ${nome}`} />
              </h1>
            ) : (
              <h1 id="titulo-bks" className={`titulo-display ${s.tituloSemLogo}`}>
                {nome}
              </h1>
            )}
            <p className={s.topoTemporada}>
              {temporada ? (
                <>
                  <span>Temporada {temporada.ano}</span>
                  {temporada.status && STATUS_TEMPORADA[temporada.status] && <span className={s.topoStatus}>{STATUS_TEMPORADA[temporada.status]}</span>}
                </>
              ) : (
                <span>Temporada ainda não divulgada</span>
              )}
            </p>
          </div>
          <aside className={s.topoIzy} aria-labelledby="izy-titulo">
            <h2 id="izy-titulo" className={s.topoIzyTitulo}>
              Ingressos e treinos livres
            </h2>
            <p className={s.topoIzyTexto}>As corridas e os treinos livres de cada etapa são comprados pela IZY Pass.</p>
            <BotaoIzy href={config.izyPass || null} texto={semDemo(config.izyPassTexto)} claro />
          </aside>
        </div>
        {banner?.credito && <p className={s.topoCredito}>Foto: {banner.credito}</p>}
      </section>
      {children}
    </div>
  )
}
