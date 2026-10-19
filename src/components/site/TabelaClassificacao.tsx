import Link from 'next/link'
import { Fragment } from 'react'
import { PlacaNumero } from './PlacaNumero'
import { Selo } from './Selo'
import s from './TabelaClassificacao.module.css'

export type LinhaTabela = {
  /** Posição exibida (na tabela de uma subcategoria, a posição dentro dela). */
  posicao: number
  /** Posição geral na categoria — só nas tabelas por subcategoria: aparece como "(3º geral)". */
  posicaoGeral?: number | null
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

/**
 * Tabela de classificação de uma categoria. `colunasEtapas` mostra a pontuação por etapa (com descartes riscados).
 * Celular: só posição, piloto e pontos; vitórias, pódios, corridas e etapas ficam em "Detalhes" de cada piloto.
 * Tabela de uma subcategoria: linhas com `posicaoGeral` mostram a posição dentro da subcategoria e, embaixo,
 * a geral entre parênteses ("(3º geral)").
 */
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
  const colunas = 3 + (compacta ? 0 : 3) + etapas.length
  const comGeral = linhas.some((l) => typeof l.posicaoGeral === 'number')
  return (
    <div className={`rolagem-x ${s.moldura}`}>
      <table className={s.tabela}>
        <caption className="visualmente-oculto">{legenda}</caption>
        <thead>
          <tr>
            <th scope="col" className={s.colPos}>
              {comGeral ? <abbr title="Posição na subcategoria (entre parênteses, a posição geral na categoria)">Pos.</abbr> : 'Pos.'}
            </th>
            <th scope="col">Piloto</th>
            {!compacta && (
              <>
                <th scope="col" className={`${s.num} ${s.larga}`}>
                  <abbr title="Vitórias">V</abbr>
                </th>
                <th scope="col" className={`${s.num} ${s.larga}`}>
                  <abbr title="Pódios">Pód.</abbr>
                </th>
                <th scope="col" className={`${s.num} ${s.larga}`}>
                  <abbr title="Corridas">Corr.</abbr>
                </th>
              </>
            )}
            {etapas.map((e) => (
              <th key={e} scope="col" className={`${s.num} ${s.larga} ${s.colEtapa}`}>
                <abbr title={`Etapa ${e.replace(/^E/, '')}`}>{e}</abbr>
              </th>
            ))}
            <th scope="col" className={`${s.num} ${s.colPontos}`}>
              Pontos
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => {
            const variacao = l.posicaoAnterior ? l.posicaoAnterior - l.posicao : 0
            const podio = l.posicao >= 1 && l.posicao <= 3 ? s[`p${l.posicao}`] : ''
            return (
              <Fragment key={`${l.pilotoNome}-${i}`}>
                <tr className={`${l.posicao === 1 ? s.lider : ''} ${!compacta ? s.comDetalhe : ''}`}>
                  <td className={s.colPos}>
                    <span className={`${s.pos} ${podio}`}>{l.posicao}</span>
                    {variacao !== 0 && (
                      <span className={`${s.variacao} ${variacao > 0 ? s.sobe : s.desce}`} title={variacao > 0 ? `Subiu ${variacao}` : `Caiu ${-variacao}`}>
                        <span aria-hidden="true">{variacao > 0 ? '▲' : '▼'}</span>
                        <span className="visualmente-oculto">{variacao > 0 ? `subiu ${variacao}` : `caiu ${-variacao}`}</span>
                      </span>
                    )}
                    {typeof l.posicaoGeral === 'number' && (
                      <>
                        <span className="visualmente-oculto"> na subcategoria,</span>
                        <span className={s.geral}>({l.posicaoGeral}º geral)</span>
                      </>
                    )}
                  </td>
                  <th scope="row" className={s.colPiloto}>
                    <span className={s.piloto}>
                      <PlacaNumero numero={l.numero} cor={cor} tamanho="p" />
                      <span className={s.pilotoTextos}>
                        {l.pilotoHref ? <Link href={l.pilotoHref}>{l.pilotoNome}</Link> : <span className={s.nome}>{l.pilotoNome}</span>}
                        {l.equipe && <span className={s.equipe}>{l.equipe}</span>}
                        {l.convidado && (
                          <span className={s.convidado}>
                            <Selo tom="neutro" ponto={false}>
                              Convidado
                            </Selo>
                          </span>
                        )}
                      </span>
                    </span>
                  </th>
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
                        {pe?.descartado && <span className="visualmente-oculto"> (descartado)</span>}
                      </td>
                    )
                  })}
                  <td className={`${s.num} ${s.pontos}`}>{fmtPontos(l.pontos)}</td>
                </tr>
                {!compacta && (
                  <tr className={s.detalhe}>
                    <td colSpan={colunas}>
                      <details className={s.detalhes}>
                        <summary>
                          Detalhes<span className="visualmente-oculto"> de {l.pilotoNome}</span>
                        </summary>
                        <dl>
                          <div>
                            <dt>Vitórias</dt>
                            <dd>{l.vitorias ?? 0}</dd>
                          </div>
                          <div>
                            <dt>Pódios</dt>
                            <dd>{l.podios ?? 0}</dd>
                          </div>
                          <div>
                            <dt>Corridas</dt>
                            <dd>{l.corridas ?? 0}</dd>
                          </div>
                          {(l.poles ?? 0) > 0 && (
                            <div>
                              <dt>Poles</dt>
                              <dd>{l.poles}</dd>
                            </div>
                          )}
                          {(l.voltasRapidas ?? 0) > 0 && (
                            <div>
                              <dt>V. rápidas</dt>
                              <dd>{l.voltasRapidas}</dd>
                            </div>
                          )}
                          {l.porEtapa?.map((pe) => (
                            <div key={pe.etapa}>
                              <dt>Etapa {pe.etapa.replace(/^E/, '')}</dt>
                              <dd className={pe.descartado ? s.descartado : undefined}>
                                {fmtPontos(pe.pontos)}
                                {pe.descartado && <span className="visualmente-oculto"> (descartado)</span>}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
