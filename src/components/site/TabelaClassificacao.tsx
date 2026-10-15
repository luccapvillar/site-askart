import Link from 'next/link'
import { PlacaNumero } from './PlacaNumero'
import { Selo } from './Selo'
import s from './TabelaClassificacao.module.css'

export type LinhaTabela = {
  posicao: number
  posicaoAnterior?: number | null
  pilotoNome: string
  pilotoHref?: string | null
  numero?: string | number | null
  equipe?: string | null
  pontos: number
  vitorias?: number
  podios?: number
  corridas?: number
  poles?: number
  voltasRapidas?: number
  convidado?: boolean
  porEtapa?: { etapa: string; pontos: number | null; descartado?: boolean }[]
}

const fmtPontos = (n: number | null | undefined) => (n === null || n === undefined ? '–' : Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','))

/** Tabela de classificação de uma categoria. `colunasEtapas` mostra a pontuação por etapa (com descartes riscados). */
export function TabelaClassificacao({
  linhas,
  cor,
  colunasEtapas = false,
  legenda,
  compacta = false,
}: {
  linhas: LinhaTabela[]
  cor?: string | null
  colunasEtapas?: boolean
  legenda: string
  compacta?: boolean
}) {
  const etapas = colunasEtapas ? (linhas[0]?.porEtapa ?? []).map((e) => e.etapa) : []
  return (
    <div className="rolagem-x">
      <table className={s.tabela}>
        <caption className="visualmente-oculto">{legenda}</caption>
        <thead>
          <tr>
            <th scope="col">Pos.</th>
            <th scope="col">Piloto</th>
            {!compacta && (
              <>
                <th scope="col" className={`${s.num} ${s.larga}`}>V</th>
                <th scope="col" className={`${s.num} ${s.larga}`}>Pód.</th>
                <th scope="col" className={`${s.num} ${s.larga}`}>Corr.</th>
              </>
            )}
            {etapas.map((e) => (
              <th key={e} scope="col" className={`${s.num} ${s.larga}`}>
                {e}
              </th>
            ))}
            <th scope="col" className={s.num}>Pontos</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => {
            const variacao = l.posicaoAnterior ? l.posicaoAnterior - l.posicao : 0
            return (
              <FragmentoLinha key={`${l.pilotoNome}-${i}`}>
                <tr className={`${i === 0 ? s.lider : ''} ${!compacta ? s.comDetalhe : ''}`}>
                  <td className={s.pos}>
                    {l.posicao}
                    {variacao !== 0 && (
                      <span className={`${s.variacao} ${variacao > 0 ? s.sobe : s.desce}`} title={variacao > 0 ? `Subiu ${variacao}` : `Caiu ${-variacao}`}>
                        {' '}
                        {variacao > 0 ? '▲' : '▼'}
                        <span className="visualmente-oculto">{variacao > 0 ? `subiu ${variacao}` : `caiu ${-variacao}`}</span>
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={s.piloto}>
                      <PlacaNumero numero={l.numero} cor={cor} tamanho="p" />
                      <span>
                        {l.pilotoHref ? <Link href={l.pilotoHref}>{l.pilotoNome}</Link> : <strong>{l.pilotoNome}</strong>}
                        {l.convidado && (
                          <span className={s.convidado}>
                            <Selo tom="neutro" ponto={false}>
                              Convidado
                            </Selo>
                          </span>
                        )}
                        {l.equipe && <span className={s.equipe}>{l.equipe}</span>}
                      </span>
                    </span>
                  </td>
                  {!compacta && (
                    <>
                      <td className={`${s.num} ${s.larga}`}>{l.vitorias ?? 0}</td>
                      <td className={`${s.num} ${s.larga}`}>{l.podios ?? 0}</td>
                      <td className={`${s.num} ${s.larga}`}>{l.corridas ?? 0}</td>
                    </>
                  )}
                  {etapas.map((e, j) => {
                    const pe = l.porEtapa?.[j]
                    return (
                      <td key={e} className={`${s.num} ${s.larga} ${pe?.descartado ? s.descartado : ''}`} title={pe?.descartado ? 'Resultado descartado' : undefined}>
                        {fmtPontos(pe?.pontos)}
                      </td>
                    )
                  })}
                  <td className={`${s.num} ${s.pontos}`}>{fmtPontos(l.pontos)}</td>
                </tr>
                {!compacta && (
                  <tr className={s.detalhe}>
                    <td colSpan={2 + etapas.length + 4}>
                      <details className={s.detalhes}>
                        <summary>Detalhes</summary>
                        <dl>
                          <div><dt>Vitórias</dt><dd>{l.vitorias ?? 0}</dd></div>
                          <div><dt>Pódios</dt><dd>{l.podios ?? 0}</dd></div>
                          <div><dt>Corridas</dt><dd>{l.corridas ?? 0}</dd></div>
                          {(l.poles ?? 0) > 0 && <div><dt>Poles</dt><dd>{l.poles}</dd></div>}
                          {(l.voltasRapidas ?? 0) > 0 && <div><dt>V. rápidas</dt><dd>{l.voltasRapidas}</dd></div>}
                          {l.porEtapa?.map((pe) => (
                            <div key={pe.etapa}>
                              <dt>{pe.etapa}</dt>
                              <dd className={pe.descartado ? s.descartado : undefined}>{fmtPontos(pe.pontos)}</dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    </td>
                  </tr>
                )}
              </FragmentoLinha>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FragmentoLinha({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
