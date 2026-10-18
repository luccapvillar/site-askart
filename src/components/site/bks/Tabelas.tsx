import type { ClassificacaoCarregada, ResultadoCategoriaNaEtapa } from '@/lib/carregar-competicao'
import { ROTULOS_CRITERIO } from '@/lib/classificacao'
import { EstadoVazio } from '../EstadoVazio'
import { PlacaNumero } from '../PlacaNumero'
import { TabelaClassificacao, type LinhaTabela } from '../TabelaClassificacao'
import { separarDemo } from '../TextoDemo'
import s from './Bks.module.css'

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','))

/** Linhas do motor de classificação → linhas da tabela do site (prefixo de demonstração retirado). */
export function linhasDaTabela(c: ClassificacaoCarregada): { linhas: LinhaTabela[]; demo: boolean } {
  let demo = false
  const linhas = c.linhas.map((l) => {
    const nome = separarDemo(l.nome)
    const equipe = separarDemo(l.equipeNome)
    demo ||= nome.demo
    return {
      posicao: l.posicao,
      posicaoAnterior: l.posicaoAnterior,
      pilotoNome: nome.texto,
      pilotoHref: l.pilotoSlug ? `/pilotos/${l.pilotoSlug}` : null,
      numero: l.numero,
      equipe: equipe.texto || null,
      pontos: l.pontos,
      vitorias: l.vitorias,
      podios: l.podios,
      corridas: l.corridas,
      poles: l.poles,
      voltasRapidas: l.voltasRapidas,
      porEtapa: l.porEtapa.map((e) => ({ etapa: `E${e.numero}`, pontos: e.participou ? e.pontos : null, descartado: e.descartado })),
    }
  })
  return { linhas, demo }
}

export function AvisoExemplo() {
  return <p className={s.avisoExemplo}>Nomes, equipes e pontos desta tabela são exemplos de demonstração.</p>
}

/** Classificação de uma categoria (tabela de liderança: piloto e pontos). */
export function ClassificacaoCategoria({
  classificacao,
  nome,
  cor,
  compacta = false,
  limite,
}: {
  classificacao: ClassificacaoCarregada
  nome: string
  cor?: string | null
  compacta?: boolean
  limite?: number
}) {
  const { linhas, demo } = linhasDaTabela(classificacao)
  if (!linhas.length) return <EstadoVazio texto="A classificação aparece depois da primeira etapa com resultado oficial." />
  const mostradas = limite ? linhas.slice(0, limite) : linhas
  const desempate = classificacao.criterios?.desempate ?? []
  return (
    <div className={s.blocoTabela}>
      {demo && <AvisoExemplo />}
      <TabelaClassificacao
        linhas={mostradas}
        cor={cor}
        colunasEtapas={!compacta && classificacao.etapas.length > 0}
        compacta={compacta}
        legenda={`Classificação — ${nome}`}
      />
      {!compacta && (
        <p className={s.notaTabela}>
          {classificacao.etapasRealizadas} {classificacao.etapasRealizadas === 1 ? 'etapa realizada' : 'etapas realizadas'}.
          {desempate.length ? ` Critérios de desempate: ${desempate.map((c) => ROTULOS_CRITERIO[c].toLowerCase()).join(', ')}.` : ''}
          {classificacao.fonte === 'manual' ? ' Classificação lançada pela organização.' : ''}
        </p>
      )}
    </div>
  )
}

/** Resultado de uma categoria numa etapa: cada sessão oficial (as que não valem pontos, como o warm-up, sem a coluna de pontos). */
export function ResultadoCategoria({ resultado, cor }: { resultado: ResultadoCategoriaNaEtapa; cor?: string | null }) {
  const nomeCat = separarDemo(resultado.categoriaNome).texto || 'Categoria'
  if (!resultado.corridas.length) return null
  const demo = resultado.corridas.some((c) => c.linhas.some((l) => separarDemo(l.nome).demo))
  return (
    <div className={s.blocoTabela}>
      {demo && <AvisoExemplo />}
      {resultado.corridas.map((corrida) => (
        <div key={String(corrida.id)} className="rolagem-x">
          <table className={s.resultado}>
            <caption>
              {separarDemo(corrida.nome).texto}
              <span className="visualmente-oculto"> — {nomeCat}</span>
              {!corrida.conta && <span className={s.equipe}>Não vale pontos</span>}
            </caption>
            <thead>
              <tr>
                <th scope="col">Pos.</th>
                <th scope="col">Piloto</th>
                {corrida.conta && <th scope="col" className={s.num}>Pontos</th>}
              </tr>
            </thead>
            <tbody>
              {corrida.linhas.map((l) => {
                const nome = separarDemo(l.nome).texto
                const situacao =
                  l.status === 'abandono' ? 'Abandono' : l.status === 'desclassificado' ? 'Desclassificado' : l.status === 'nao-largou' ? 'Não largou' : l.status === 'nao-classificado' ? 'Não classificado' : null
                return (
                  <tr key={`${l.indice}`}>
                    <td className={s.pos}>{l.posicaoCategoria ?? '—'}</td>
                    <td>
                      <span className={s.pilotoLinha}>
                        <PlacaNumero numero={l.numero} cor={cor} tamanho="p" />
                        <span>
                          <strong>{nome}</strong>
                          {l.equipeNome && <span className={s.equipe}>{separarDemo(l.equipeNome).texto}</span>}
                          {situacao && <span className={s.situacao}>{situacao}</span>}
                          {l.voltaMaisRapida && <span className={s.situacao}>Volta mais rápida</span>}
                        </span>
                      </span>
                    </td>
                    {corrida.conta && <td className={`${s.num} ${s.pontosCel}`}>{fmt(l.pontos)}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
