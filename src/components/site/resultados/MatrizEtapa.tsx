import Link from 'next/link'
import type { ResultadoCategoriaNaEtapa } from '@/lib/carregar-competicao'
import type { Id } from '@/lib/classificacao'
import { AvisoExemplo } from '../bks/Tabelas'
import { EstadoVazio } from '../EstadoVazio'
import { PlacaNumero } from '../PlacaNumero'
import { separarDemo } from '../TextoDemo'
import { formatarPontos, formatarPosicao, formatarVolta, montarMatriz, type CelulaMatriz, type ColunaMatriz } from './matriz'
import s from './MatrizEtapa.module.css'

export type CategoriaDaMatriz = {
  id: Id
  nome: string
  cor?: string | null
  sigla?: string | null
  subcategorias?: { nome?: string | null }[] | null
}

/** Losango: marca visual do "melhor do grid" (o texto para leitor de tela vem junto). */
function MarcaMelhor({ texto = 'melhor do grid' }: { texto?: string }) {
  return (
    <span className={s.marca}>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
        <path d="M5 0.6 9.4 5 5 9.4 0.6 5z" fill="currentColor" />
      </svg>
      <span className="visualmente-oculto"> ({texto})</span>
    </span>
  )
}

/** Cronômetro: marca visual da volta mais rápida da corrida. */
function IconeVolta() {
  return (
    <svg className={s.icone} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="13.5" r="8" />
      <path d="M12 13.5V9.5M9.5 2.5h5" />
    </svg>
  )
}

function Celula({ celula, coluna, convidado }: { celula: CelulaMatriz; coluna: ColunaMatriz; convidado: boolean }) {
  if (!celula.tem) {
    const motivo =
      coluna.ausente ??
      (coluna.tipo !== 'etapa'
        ? 'Sem resultado nesta sessão'
        : convidado
          ? 'Convidado: não entra no resultado da etapa'
          : 'Sem resultado da etapa')
    return (
      <>
        <span aria-hidden="true" className={s.traco}>
          —
        </span>
        <span className="visualmente-oculto">{motivo}</span>
      </>
    )
  }
  // Warm-up e classificação: o melhor do grid é a volta mais rápida, então a marca fica junto da volta.
  const sessaoCronometrada = coluna.tipo === 'warm-up' || coluna.tipo === 'classificacao'
  const marcaNaVolta = celula.melhorDoGrid && sessaoCronometrada && celula.melhorVolta !== null
  return (
    <span className={s.conteudo}>
      <span className={s.linhaPosicao}>
        {celula.posicao !== null && <strong className={s.posicao}>{formatarPosicao(celula.posicao)}</strong>}
        {celula.situacao && <span className={s.situacao}>{celula.situacao}</span>}
        {celula.melhorDoGrid && !marcaNaVolta && <MarcaMelhor />}
      </span>
      {celula.pontos !== null && (
        <span className={s.pontos}>
          {formatarPontos(celula.pontos)}
          <span aria-hidden="true"> pts</span>
          <span className="visualmente-oculto"> {celula.pontos === 1 ? 'ponto' : 'pontos'}</span>
        </span>
      )}
      {celula.penalidade !== null && (
        <span className={s.detalhe}>
          <span aria-hidden="true">{formatarPontos(celula.penalidade).replace('-', '−')} pen.</span>
          <span className="visualmente-oculto">
            {coluna.tipo === 'etapa' ? 'já descontada penalidade de' : 'penalidade de'} {formatarPontos(Math.abs(celula.penalidade))} pontos
          </span>
        </span>
      )}
      {celula.melhorVolta !== null && (
        <span className={['mono', s.volta, celula.voltaMaisRapida ? s.voltaRapida : ''].filter(Boolean).join(' ')}>
          {celula.voltaMaisRapida && <IconeVolta />}
          <span className="visualmente-oculto">Melhor volta: </span>
          {formatarVolta(celula.melhorVolta)}
          {celula.voltaMaisRapida && <span className="visualmente-oculto"> (volta mais rápida da corrida)</span>}
          {marcaNaVolta && <MarcaMelhor texto="melhor do grid: volta mais rápida da sessão" />}
        </span>
      )}
      {celula.pole && <span className={s.etiqueta}>Pole</span>}
    </span>
  )
}

/**
 * Resultado de UMA categoria numa etapa, sessão por sessão (componente de servidor, sem JS no cliente):
 * Warm-up, Classificação, Corrida 1, Corrida 2 (Corrida 3… se houver) e Resultado da etapa, com o melhor
 * do grid de cada coluna em roxo. Rolagem horizontal no celular, com a coluna do piloto fixa.
 */
export function MatrizEtapa({
  categoria,
  resultado,
  parcial = false,
}: {
  categoria: CategoriaDaMatriz
  resultado: ResultadoCategoriaNaEtapa
  /** Etapa ainda não realizada: o resultado da etapa é parcial. */
  parcial?: boolean
}) {
  const nomeCategoria = separarDemo(categoria.nome).texto || separarDemo(resultado.categoriaNome).texto || 'Categoria'
  const matriz = montarMatriz(resultado)
  if (!matriz.linhas.length) return <EstadoVazio texto="O resultado desta categoria ainda não foi publicado." />

  const demo = matriz.linhas.some((l) => separarDemo(l.nome).demo || separarDemo(l.equipeNome).demo)
  const idLegenda = `matriz-etapa-${String(categoria.id)}`
  const temVoltaRapida = matriz.linhas.some((l) => l.celulas.some((c) => c.voltaMaisRapida))

  return (
    <div className={s.bloco}>
      {demo && <AvisoExemplo />}
      <ul className={s.legenda}>
        <li>
          <span className={s.amostra} aria-hidden="true">
            <MarcaMelhor />
          </span>
          <span>
            Em roxo: o melhor do grid em cada sessão.{' '}
            <span className={s.legendaNota}>Warm-up e classificação: a volta mais rápida. Corridas e etapa: o vencedor.</span>
          </span>
        </li>
        {temVoltaRapida && (
          <li>
            <span className={`${s.amostra} ${s.amostraVolta}`} aria-hidden="true">
              <IconeVolta />
            </span>
            Volta mais rápida da corrida.
          </li>
        )}
      </ul>
      <div className={s.rolagem} role="region" aria-labelledby={idLegenda} tabIndex={0}>
        <table className={s.matriz}>
          <caption id={idLegenda} className="visualmente-oculto">
            Resultado da etapa por sessão — {nomeCategoria}
            {parcial ? ' (parcial)' : ''}. Role para os lados para ver todas as sessões.
          </caption>
          <thead>
            <tr>
              <th scope="col" className={s.colPiloto}>
                Nº e piloto
              </th>
              {matriz.colunas.map((c) => (
                <th key={c.chave} scope="col" className={c.tipo === 'etapa' ? s.colEtapa : undefined}>
                  {c.titulo}
                  {c.tipo === 'etapa' && parcial && <span className={s.subtitulo}>parcial</span>}
                  {c.subtitulo && <span className={s.subtitulo}>{separarDemo(c.subtitulo).texto}</span>}
                  {c.ausente && (
                    <span className={s.subtitulo} aria-hidden="true">
                      sem resultado
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matriz.linhas.map((l) => {
              const nome = separarDemo(l.nome).texto || 'Piloto sem nome'
              const equipe = separarDemo(l.equipeNome).texto
              return (
                <tr key={l.chave}>
                  <th scope="row" className={s.colPiloto}>
                    <span className={s.piloto}>
                      <PlacaNumero numero={l.numero} cor={categoria.cor} tamanho="p" />
                      <span className={s.nome}>
                        {l.pilotoSlug ? <Link href={`/pilotos/${l.pilotoSlug}`}>{nome}</Link> : nome}
                        {equipe && <span className={s.equipe}>{equipe}</span>}
                        {l.convidado && <span className={s.etiqueta}>Convidado</span>}
                      </span>
                    </span>
                  </th>
                  {l.celulas.map((celula, i) => {
                    const coluna = matriz.colunas[i]
                    const classes = [s.celula, coluna.tipo === 'etapa' ? s.colEtapa : '', celula.melhorDoGrid ? s.melhor : '']
                    return (
                      <td key={coluna.chave} className={classes.filter(Boolean).join(' ')}>
                        <Celula celula={celula} coluna={coluna} convidado={l.convidado} />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
