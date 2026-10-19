import type { Metadata } from 'next'
import { NavegacaoBks } from '@/components/site/bks/AbasBks'
import s from '@/components/site/bks/Bks.module.css'
import { CabecalhoArea } from '@/components/site/bks/Modalidades'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { Selo, type TomSelo } from '@/components/site/Selo'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico } from '@/components/site/TextoRico'
import { lerBks, lerCampeoes, type CampeaoDaTemporada } from '@/lib/publico'

export const revalidate = 60

export const metadata: Metadata = { title: 'BKS — História', description: 'História do BKS — Brasília Kart Series e os campeões de cada temporada.' }

const STATUS: Record<string, [string, TomSelo]> = {
  planejada: ['Planejada', 'info'],
  'em-andamento': ['Em andamento', 'ok'],
  encerrada: ['Encerrada', 'neutro'],
}

/** Campeões agrupados por ano (o mais recente primeiro), na ordem em que vêm. */
function porAno(campeoes: CampeaoDaTemporada[]) {
  const anos = new Map<number, CampeaoDaTemporada[]>()
  for (const c of campeoes) anos.set(c.ano, [...(anos.get(c.ano) ?? []), c])
  return [...anos.entries()].sort((a, b) => b[0] - a[0])
}

/** Sub-aba História: texto do campeonato, as temporadas e os campeões de cada temporada encerrada. */
export default async function HistoriaBks() {
  const bks = await lerBks()
  const campeonato = bks?.campeonato
  const { temporadas, campeoes } = campeonato ? await lerCampeoes(campeonato.id) : { temporadas: [], campeoes: [] }
  const temTexto = Boolean((campeonato?.historia as { root?: { children?: unknown[] } } | null)?.root?.children?.length)

  return (
    <>
      <NavegacaoBks secao="historia" />
      <section className={`secao-compacta ${s.secaoPrincipal}`} aria-labelledby="historia">
        <div className="conteiner">
          <CabecalhoArea id="historia" titulo="História do campeonato" introducao="A história do BKS, as temporadas e os campeões de cada categoria." />
          <div className={s.duasColunas}>
            <div className={s.textoHistoria}>
              {temTexto ? (
                <TextoRico dados={campeonato?.historia} className="prosa" />
              ) : (
                <EstadoVazio texto="A história do campeonato ainda não foi publicada pela organização." />
              )}
            </div>
            <aside className={s.painelLateral} aria-labelledby="temporadas">
              <h3 id="temporadas" className={`rotulo ${s.painelTitulo}`}>
                Temporadas
              </h3>
              {temporadas.length ? (
                <ul className={s.listaTemporadas}>
                  {temporadas.map((t) => {
                    const [rotulo, tom] = STATUS[t.status] ?? [t.status, 'neutro']
                    return (
                      <li key={t.id}>
                        <span className={s.temporadaAno}>{t.ano}</span>
                        <Selo tom={tom}>{rotulo}</Selo>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="texto-2">Nenhuma temporada cadastrada.</p>
              )}
            </aside>
          </div>
        </div>
      </section>

      <section className={`secao-compacta fundo-branco ${s.secaoBorda}`} aria-labelledby="campeoes">
        <div className="conteiner">
          <CabecalhoArea id="campeoes" titulo="Campeões" introducao="Campeão, vice e terceiro lugar de cada categoria, gravados quando a temporada é encerrada." />
          {campeoes.length ? (
            <div className={s.pilhaAnos}>
              {porAno(campeoes).map(([ano, lista]) => (
                <section key={ano} aria-labelledby={`campeoes-${ano}`} className={s.anoCampeoes}>
                  <h3 id={`campeoes-${ano}`} className={`titulo-marca h3 ${s.anoTitulo}`}>
                    Temporada {ano}
                  </h3>
                  <ul className={s.campeoes}>
                    {lista.map((c, i) => (
                      <li key={`${c.categoria}-${i}`} className={s.campeao}>
                        <h4 className={s.campeaoCategoria}>
                          <TextoDemo texto={c.categoria} />
                        </h4>
                        <dl className={s.podio}>
                          <div className={s.podioPrimeiro}>
                            <dt>Campeão</dt>
                            <dd>{semDemo(c.campeao)}</dd>
                          </div>
                          <div>
                            <dt>Vice</dt>
                            <dd>{semDemo(c.vice) || 'Não registrado'}</dd>
                          </div>
                          <div>
                            <dt>3º lugar</dt>
                            <dd>{semDemo(c.terceiro) || 'Não registrado'}</dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <EstadoVazio texto="Os campeões aparecem aqui quando cada temporada é encerrada pela organização." />
          )}
        </div>
      </section>
    </>
  )
}
