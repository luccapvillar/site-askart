import Link from 'next/link'
import type { ResultadoCategoriaNaEtapa } from '@/lib/carregar-competicao'
import type { Id } from '@/lib/classificacao'
import { AvisoExemplo } from '../bks/Tabelas'
import { EstadoVazio } from '../EstadoVazio'
import { PlacaNumero } from '../PlacaNumero'
import { separarDemo } from '../TextoDemo'
import { AbasSubcategorias } from './AbasSubcategorias'
import {
  explicacaoDaMedia,
  formatarMedia,
  formatarPontos,
  formatarPosicao,
  formatarVolta,
  montarMatrizes,
  type CelulaMatriz,
  type ColunaMatriz,
  type TabelaMatriz,
} from './matriz'
import s from './MatrizEtapa.module.css'

export type CategoriaDaMatriz = {
  id: Id
  nome: string
  cor?: string | null
  sigla?: string | null
  subcategorias?: { nome?: string | null }[] | null
}

/** Regra do BKS: com que posição a corrida entrou na média da etapa (quando é diferente da mostrada). */
function ValeNaMedia({ posicao }: { posicao: number }) {
  return <span className={s.detalhe}>vale {formatarPosicao(posicao)} na média</span>
}

/** Losango: marca visual do melhor tempo (o texto para leitor de tela vem junto: nada só pela cor). */
function MarcaMelhor({ texto }: { texto?: string }) {
  return (
    <span className={s.marca}>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
        <path d="M5 0.6 9.4 5 5 9.4 0.6 5z" fill="currentColor" />
      </svg>
      {texto && <span className="visualmente-oculto"> ({texto})</span>}
    </span>
  )
}

function Celula({
  celula,
  coluna,
  convidado,
  textoMelhor,
}: {
  celula: CelulaMatriz
  coluna: ColunaMatriz
  convidado: boolean
  textoMelhor: string
}) {
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
        {celula.contaComo !== null && <ValeNaMedia posicao={celula.contaComo} />}
      </>
    )
  }
  // Regra do BKS: posição na subcategoria pela média das corridas, a média e os pontos numa linha só.
  if (coluna.tipo === 'etapa' && celula.media !== null) {
    return (
      <span className={s.conteudo}>
        <span className={s.linhaEtapa}>
          {celula.posicao !== null && <strong className={s.posicao}>{formatarPosicao(celula.posicao)}</strong>}
          <span className={s.media}>
            <span aria-hidden="true">· </span>
            <span className="visualmente-oculto">, </span>
            média {formatarMedia(celula.media)}
          </span>
          {celula.pontos !== null && (
            <span className={s.pontos}>
              <span aria-hidden="true">· </span>
              <span className="visualmente-oculto">, </span>
              {formatarPontos(celula.pontos)}
              <span aria-hidden="true"> pts</span>
              <span className="visualmente-oculto"> {celula.pontos === 1 ? 'ponto' : 'pontos'}</span>
            </span>
          )}
        </span>
        {celula.penalidade !== null && (
          <span className={s.detalhe}>
            <span aria-hidden="true">{formatarPontos(celula.penalidade).replace('-', '−')} pen.</span>
            <span className="visualmente-oculto">já descontada penalidade de {formatarPontos(Math.abs(celula.penalidade))} pontos</span>
          </span>
        )}
      </span>
    )
  }
  return (
    <span className={s.conteudo}>
      <span className={s.linhaPosicao}>
        {celula.posicao !== null && <strong className={s.posicao}>{formatarPosicao(celula.posicao)}</strong>}
        {celula.posicao !== null && celula.posicaoGeral !== null && (
          <>
            <span className="visualmente-oculto"> na subcategoria,</span>
            <span className={s.geral}>({formatarPosicao(celula.posicaoGeral)} geral)</span>
          </>
        )}
        {celula.situacao && <span className={s.situacao}>{celula.situacao}</span>}
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
      {celula.contaComo !== null && <ValeNaMedia posicao={celula.contaComo} />}
      {celula.melhorVolta !== null && (
        <span className={['mono', s.volta].join(' ')}>
          <span className="visualmente-oculto">Melhor volta: </span>
          {formatarVolta(celula.melhorVolta)}
          {celula.melhorTempo && <MarcaMelhor texto={textoMelhor} />}
        </span>
      )}
      {celula.pole && <span className={s.etiqueta}>Pole</span>}
    </span>
  )
}

/** Uma tabela (a da categoria, ou a de uma subcategoria), com rolagem lateral e a coluna do piloto fixa. */
function Tabela({
  tabela,
  idTabela,
  legenda,
  cor,
  parcial,
  textoMelhor,
}: {
  tabela: TabelaMatriz
  idTabela: string
  legenda: string
  cor?: string | null
  parcial: boolean
  textoMelhor: string
}) {
  const idLegenda = `${idTabela}-legenda`
  return (
    <div className={s.rolagem} role="region" aria-labelledby={idLegenda} tabIndex={0}>
      <table className={s.matriz}>
        <caption id={idLegenda} className="visualmente-oculto">
          {legenda}
          {parcial ? ' (parcial)' : ''}. Role para os lados para ver todas as sessões.
        </caption>
        <thead>
          <tr>
            <th scope="col" className={s.colPiloto}>
              Nº e piloto
            </th>
            {tabela.colunas.map((c) => (
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
          {tabela.linhas.map((l) => {
            const nome = separarDemo(l.nome).texto || 'Piloto sem nome'
            const equipe = separarDemo(l.equipeNome).texto
            return (
              <tr key={l.chave}>
                <th scope="row" className={s.colPiloto}>
                  <span className={s.piloto}>
                    <PlacaNumero numero={l.numero} cor={cor} tamanho="p" />
                    <span className={s.nome}>
                      {l.pilotoSlug ? <Link href={`/pilotos/${l.pilotoSlug}`}>{nome}</Link> : nome}
                      {equipe && <span className={s.equipe}>{equipe}</span>}
                      {l.convidado && <span className={s.etiqueta}>Convidado</span>}
                    </span>
                  </span>
                </th>
                {l.celulas.map((celula, i) => {
                  const coluna = tabela.colunas[i]
                  const classes = [s.celula, coluna.tipo === 'etapa' ? s.colEtapa : '', celula.melhorTempo ? s.melhor : '']
                  return (
                    <td key={coluna.chave} className={classes.filter(Boolean).join(' ')}>
                      <Celula celula={celula} coluna={coluna} convidado={l.convidado} textoMelhor={textoMelhor} />
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const pilotos = (n: number) => `${n} ${n === 1 ? 'piloto' : 'pilotos'}`

/**
 * Resultado de UMA categoria numa etapa, sessão por sessão: Warm-up, Classificação, Corrida 1, Corrida 2
 * (Corrida 3… se houver) e Resultado da etapa, com a melhor volta de cada piloto em cada sessão.
 *
 * Categoria com subcategorias (e pilotos com subcategoria na inscrição): uma tabela separada por
 * subcategoria, com posição dentro dela ("1º (3º geral)") e abas no topo para ver uma de cada vez — as abas
 * são o único JavaScript (AbasSubcategorias); sem ele, as tabelas aparecem uma embaixo da outra.
 * Em roxo: o melhor tempo de cada sessão dentro da subcategoria (ou da categoria, quando não há subcategorias).
 * Regra do BKS (média das corridas): a coluna "Resultado da etapa" mostra "2º · média 2,0 · 22 pts" — posição
 * e pontos da própria subcategoria —, as corridas não têm pontos próprios e a corrida que valeu outra
 * posição na média (abandono, não correu…) diz qual ("vale 6º na média").
 */
export function MatrizEtapa({
  categoria,
  resultado,
  parcial = false,
  nivelTitulo = 5,
}: {
  categoria: CategoriaDaMatriz
  resultado: ResultadoCategoriaNaEtapa
  /** Etapa ainda não realizada: o resultado da etapa é parcial. */
  parcial?: boolean
  /** Nível do título de cada subcategoria (um abaixo do título da categoria). */
  nivelTitulo?: 3 | 4 | 5 | 6
}) {
  const nomeCategoria = separarDemo(categoria.nome).texto || separarDemo(resultado.categoriaNome).texto || 'Categoria'
  const matrizes = montarMatrizes(resultado, categoria.subcategorias)
  const linhas = matrizes.tabelas.flatMap((t) => t.linhas)
  if (!linhas.length) return <EstadoVazio texto="O resultado desta categoria ainda não foi publicado." />

  const porSub = matrizes.porSubcategoria
  // Regra do BKS: resultado da etapa pela média das posições nas corridas, dentro de cada subcategoria.
  const pelaMedia = resultado.calculoDaEtapa === 'media-das-corridas' && !resultado.semRegra
  const demo = linhas.some((l) => separarDemo(l.nome).demo || separarDemo(l.equipeNome).demo)
  const idBase = `matriz-etapa-${String(categoria.id)}`
  const temRoxo = linhas.some((l) => l.celulas.some((c) => c.melhorTempo))
  const temGeral = linhas.some((l) => l.celulas.some((c) => c.posicaoGeral !== null))
  const textoMelhor = porSub ? 'melhor tempo da subcategoria nesta sessão' : 'melhor tempo da categoria nesta sessão'
  const Titulo = `h${nivelTitulo}` as const

  const legenda =
    temRoxo || porSub || pelaMedia ? (
      <ul className={s.legenda}>
        {temRoxo && (
          <li>
            <span className={s.amostra} aria-hidden="true">
              <MarcaMelhor />
            </span>
            <span>Em roxo: o melhor tempo da {porSub ? 'subcategoria' : 'categoria'} em cada sessão.</span>
          </li>
        )}
        {porSub && (!pelaMedia || temGeral) && (
          <li>
            <span className={s.amostraPosicao} aria-hidden="true">
              1º
            </span>
            <span>
              {pelaMedia ? 'Nas sessões, posição' : 'Posição'} dentro da subcategoria; entre parênteses, a posição geral na categoria.
            </span>
          </li>
        )}
        {pelaMedia && (
          <li>
            <span className={s.amostraPosicao} aria-hidden="true">
              2,0
            </span>
            <span>{explicacaoDaMedia()}</span>
          </li>
        )}
      </ul>
    ) : null

  if (!porSub) {
    return (
      <div className={s.bloco}>
        {demo && <AvisoExemplo />}
        {legenda}
        <Tabela
          tabela={matrizes.tabelas[0]}
          idTabela={idBase}
          legenda={`Resultado da etapa por sessão — ${nomeCategoria}`}
          cor={categoria.cor}
          parcial={parcial}
          textoMelhor={textoMelhor}
        />
      </div>
    )
  }

  const abas = matrizes.tabelas.map((t) => {
    const id = `${idBase}-${t.chave}`
    const nome = separarDemo(t.nome).texto || t.nome || 'Subcategoria'
    return {
      id,
      rotulo: nome,
      painel: (
        <>
          <Titulo id={`${id}-titulo`} className={s.tituloSub}>
            {nome}
            <span className={s.contagem}>
              <span aria-hidden="true">· </span>
              {pilotos(t.linhas.length)}
            </span>
          </Titulo>
          <Tabela
            tabela={t}
            idTabela={id}
            legenda={`Resultado da etapa por sessão — ${nomeCategoria}, subcategoria ${nome}`}
            cor={categoria.cor}
            parcial={parcial}
            textoMelhor={textoMelhor}
          />
        </>
      ),
    }
  })

  return (
    <div className={s.bloco}>
      {demo && <AvisoExemplo />}
      {legenda}
      {abas.length > 1 ? (
        <AbasSubcategorias rotulo={`Subcategorias de ${nomeCategoria}`} abas={abas} />
      ) : (
        <section id={abas[0].id} className={s.painel} aria-labelledby={`${abas[0].id}-titulo`}>
          {abas[0].painel}
        </section>
      )}
    </div>
  )
}
