import type { CSSProperties, ReactNode } from 'react'
import { AbasBks } from '@/components/site/bks/AbasBks'
import { BotaoIzy } from '@/components/site/bks/pecas'
import s from '@/components/site/bks/Bks.module.css'
import { fontesDaFoto } from '@/components/site/Foto'
import { semDemo } from '@/components/site/TextoDemo'
import { lerBks, lerConfiguracoes } from '@/lib/publico'
import { variaveisDoCampeonato } from '@/lib/site'
import type { Midia } from '@/payload-types'

export const revalidate = 60

/** Aba BKS: faixa com a logo e as cores do campeonato, botão da IZY Pass e as sub-abas. */
export default async function LayoutBks({ children }: { children: ReactNode }) {
  const [bks, config] = await Promise.all([lerBks(), lerConfiguracoes()])
  const campeonato = bks?.campeonato
  const logo = bks?.logo
  const fundo = campeonato?.banner as Midia | null | undefined
  const fotoFundo = fundo?.url ? fontesDaFoto(fundo, 'destaque') : null
  const temporada = bks?.temporada
  const nome = campeonato?.nome || 'Brasília Kart Series'
  return (
    <div className={s.tema} style={variaveisDoCampeonato(campeonato?.cores) as CSSProperties}>
      <section className={s.topo} aria-labelledby="titulo-bks">
        {fotoFundo && (
          <img className={s.topoFoto} src={fotoFundo.src} srcSet={fotoFundo.srcSet} sizes="100vw" alt="" fetchPriority="high" width={fotoFundo.largura ?? undefined} height={fotoFundo.altura ?? undefined} />
        )}
        <div className={`conteiner ${s.topoConteudo}`}>
          <div>
            {logo?.url ? (
              <h1 id="titulo-bks" className={s.logoTitulo}>
                <img src={logo.url} alt={`${campeonato?.sigla ?? 'BKS'} — ${nome}`} width={logo.width ?? undefined} height={logo.height ?? undefined} />
              </h1>
            ) : (
              <h1 id="titulo-bks" className="titulo-marca h1">
                {nome}
              </h1>
            )}
            <p className={s.topoTemporada}>
              {temporada ? `Temporada ${temporada.ano}` : 'Campeonato organizado pela ASKART'}
              {temporada?.status === 'em-andamento' ? ' · em andamento' : ''}
            </p>
          </div>
          <div className={s.topoAcoes}>
            <p>Treinos livres e corridas de cada etapa:</p>
            <BotaoIzy href={config.izyPass || null} texto={semDemo(config.izyPassTexto)} claro />
          </div>
        </div>
      </section>
      <AbasBks />
      {children}
    </div>
  )
}
