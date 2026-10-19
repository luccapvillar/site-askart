import type { ClassificacaoCarregada } from '@/lib/carregar-competicao'
import { ROTULOS_CRITERIO } from '@/lib/classificacao'
import { EstadoVazio } from '../EstadoVazio'
import { TabelaClassificacao, type LinhaTabela } from '../TabelaClassificacao'
import { separarDemo } from '../TextoDemo'
import s from './Bks.module.css'

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

/** Aviso de que a tabela tem dados de demonstração (com o selo "Exemplo", como no resto do site). */
export function AvisoExemplo() {
  return (
    <p className={s.avisoExemplo}>
      <span className={s.avisoExemploSelo} aria-hidden="true">
        Exemplo
      </span>
      Nomes, equipes e pontos desta tabela são exemplos de demonstração.
    </p>
  )
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
