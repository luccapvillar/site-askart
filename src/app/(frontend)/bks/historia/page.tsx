import type { Metadata } from 'next'
import s from '@/components/site/bks/Bks.module.css'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { semDemo } from '@/components/site/TextoDemo'
import { TextoRico } from '@/components/site/TextoRico'
import { lerBks, lerCampeoes } from '@/lib/publico'

export const revalidate = 60

export const metadata: Metadata = { title: 'BKS — História', description: 'História do BKS — Brasília Kart Series e os campeões de cada temporada.' }

const STATUS: Record<string, string> = { planejada: 'Planejada', 'em-andamento': 'Em andamento', encerrada: 'Encerrada' }

/** Sub-aba História: texto do campeonato e campeões de cada temporada encerrada. */
export default async function HistoriaBks() {
  const bks = await lerBks()
  const campeonato = bks?.campeonato
  const { temporadas, campeoes } = campeonato ? await lerCampeoes(campeonato.id) : { temporadas: [], campeoes: [] }
  const temTexto = Boolean((campeonato?.historia as { root?: { children?: unknown[] } } | null)?.root?.children?.length)

  return (
    <section className="secao-compacta" aria-labelledby="historia">
      <div className="conteiner">
        <div className={s.cabecalhoSecao}>
          <h2 id="historia" className="titulo-marca h2">
            História
          </h2>
        </div>
        <div className={s.duasColunas}>
          <div>
            {temTexto ? <TextoRico dados={campeonato?.historia} /> : <EstadoVazio texto="A história do campeonato será publicada em breve." />}
          </div>
          <aside className={s.painelLateral} aria-labelledby="temporadas">
            <h3 id="temporadas" className="rotulo">
              Temporadas
            </h3>
            {temporadas.length ? (
              <ul className={s.listaSimples}>
                {temporadas.map((t) => (
                  <li key={t.id}>
                    <strong>{t.ano}</strong> <span className="texto-2">{STATUS[t.status] ?? t.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="texto-2">Nenhuma temporada cadastrada.</p>
            )}
          </aside>
        </div>

        <h3 className={`h3 ${s.subtitulo}`}>Campeões</h3>
        {campeoes.length ? (
          <div className="rolagem-x">
            <table className={s.resultado}>
              <caption className="visualmente-oculto">Campeões por temporada e categoria</caption>
              <thead>
                <tr>
                  <th scope="col">Ano</th>
                  <th scope="col">Categoria</th>
                  <th scope="col">Campeão</th>
                  <th scope="col">Vice</th>
                  <th scope="col">3º lugar</th>
                </tr>
              </thead>
              <tbody>
                {campeoes.map((c, i) => (
                  <tr key={i}>
                    <td className="mono">{c.ano}</td>
                    <td>{semDemo(c.categoria)}</td>
                    <td>
                      <strong>{semDemo(c.campeao)}</strong>
                    </td>
                    <td>{semDemo(c.vice) || '—'}</td>
                    <td>{semDemo(c.terceiro) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EstadoVazio texto="Os campeões aparecem aqui quando cada temporada é encerrada no painel." />
        )}
      </div>
    </section>
  )
}
