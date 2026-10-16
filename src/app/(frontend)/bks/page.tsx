import type { Metadata } from 'next'
import Link from 'next/link'
import { DataEtapa, dataPorExtenso, LinkEtapa, LinkMapa, NomeEtapa, Programacao, SeloEtapa } from '@/components/site/bks/pecas'
import s from '@/components/site/bks/Bks.module.css'
import { ResumoEtapa } from '@/components/site/etapa/BlocosEtapa'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { semDemo } from '@/components/site/TextoDemo'
import { lerBks, lerConfiguracoes, lerContato, lerEtapas, lerProgramacao, textosDaSecao } from '@/lib/publico'
import { idDe } from '@/lib/publico'
import { eventoPublico, mapaDaEtapa, proximaEtapa, situacaoDaEtapa } from '@/lib/site'
import type { Categoria } from '@/payload-types'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const textos = await textosDaSecao('bks')
  return {
    title: textos?.seoTitulo || 'BKS — Calendário',
    description:
      textos?.seoDescricao ||
      'Calendário das etapas do BKS — Brasília Kart Series: datas, horários de cada categoria, ingressos, treinos livres, transmissão ao vivo e local.',
  }
}

/** Sub-aba Calendário: cada etapa abre a programação com os horários de cada categoria. */
export default async function CalendarioBks() {
  const [bks, config, contato, textos] = await Promise.all([lerBks(), lerConfiguracoes(), lerContato(), textosDaSecao('bks')])
  const temporada = bks?.temporada
  const etapas = temporada ? await lerEtapas(temporada.id) : []
  const corridas = await lerProgramacao(etapas.map((e) => e.id))
  const proxima = proximaEtapa(etapas)
  const publico = eventoPublico(config)

  return (
    <section className="secao-compacta" aria-labelledby="calendario">
      <div className="conteiner">
        <div className={s.cabecalhoSecao}>
          <h2 id="calendario" className="titulo-marca h2">
            {textos?.titulo || `Calendário ${temporada?.ano ?? ''}`.trim()}
          </h2>
          <p className="texto-2">
            {textos?.introducao ||
              'Toque numa etapa para ver os horários de cada categoria, o link para comprar a etapa, os treinos livres, a transmissão ao vivo e o local.'}
          </p>
        </div>

        {!etapas.length ? (
          <EstadoVazio texto={textos?.textoVazio || 'O calendário da temporada será publicado em breve.'} />
        ) : (
          <ol className={s.calendario}>
            {etapas.map((etapa) => {
              const programacao = corridas.filter((c) => idDe(c.etapa) === etapa.id)
              // Compra, treinos livres e grade somem sozinhos depois da etapa (página revalidada a cada minuto)
              const situacao = situacaoDaEtapa(etapa)
              const categorias = (etapa.categorias ?? []).filter((c): c is Categoria => typeof c === 'object').map((c) => semDemo(c.nome))
              return (
                <li key={etapa.id}>
                  <details className={s.etapa} open={proxima?.id === etapa.id}>
                    <summary>
                      <DataEtapa etapa={etapa} />
                      <span className={s.etapaTextos}>
                        <span className={s.etapaNome}>
                          <NomeEtapa etapa={etapa} />
                          {proxima?.id === etapa.id && <span className={s.proxima}>Próxima</span>}
                        </span>
                        <span className={s.etapaMeta}>
                          <SeloEtapa status={etapa.status} jaOcorreu={situacao.jaOcorreu} />
                          <span>{dataPorExtenso(etapa)}</span>
                          {etapa.local && <span>{etapa.local}</span>}
                        </span>
                      </span>
                      <span className={s.abrir} aria-hidden="true" />
                    </summary>
                    <div className={s.etapaCorpo}>
                      <div>
                        <h3 className="rotulo">Horários por categoria</h3>
                        <Programacao corridas={programacao} />
                        {categorias.length > 0 && !programacao.length && <p className="texto-2">Categorias: {categorias.join(', ')}.</p>}
                      </div>
                      <div className={s.etapaAcoes}>
                        <ResumoEtapa etapa={etapa} situacao={situacao} publico={situacao.antes ? publico : null} />
                        <LinkMapa href={mapaDaEtapa(etapa, contato)} rotulo={`Como chegar: ${etapa.local || 'ver no mapa'}`} />
                        {etapa.status === 'realizada' && (
                          <Link className={s.linkSeta} href={`/bks/resultados/${etapa.numero}`}>
                            Resultado da etapa <span aria-hidden="true">→</span>
                          </Link>
                        )}
                        <LinkEtapa etapa={etapa} />
                      </div>
                    </div>
                  </details>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
