import type { ClassificacaoCarregada, LinhaClassificacaoExibida } from '@/lib/carregar-competicao'
import { ROTULOS_CRITERIO } from '@/lib/classificacao'
import { separarClassificacao, type LinhaNaSubcategoria } from '@/lib/subcategorias'
import { EstadoVazio } from '../EstadoVazio'
import { AbasSubcategorias } from '../resultados/AbasSubcategorias'
import { TabelaClassificacao, type LinhaTabela } from '../TabelaClassificacao'
import { separarDemo } from '../TextoDemo'
import s from './Bks.module.css'

/** Uma linha do motor de classificação → linha da tabela do site (prefixo de demonstração retirado). */
function linhaDaTabela(l: LinhaClassificacaoExibida): LinhaTabela & { demo: boolean } {
  const nome = separarDemo(l.nome)
  const equipe = separarDemo(l.equipeNome)
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
    demo: nome.demo,
  }
}

/** Linha de uma tabela por subcategoria: posição dentro dela, a geral ao lado e a seta comparando dentro dela. */
const linhaDaSubcategoria = ({ linha, posicao, posicaoGeral, posicaoAnterior }: LinhaNaSubcategoria<LinhaClassificacaoExibida>) => ({
  ...linhaDaTabela(linha),
  posicao,
  posicaoGeral,
  posicaoAnterior,
})

const semMarca = ({ demo: _demo, ...l }: LinhaTabela & { demo: boolean }): LinhaTabela => l

/** Linhas do motor de classificação → linhas da tabela do site (prefixo de demonstração retirado). */
export function linhasDaTabela(c: ClassificacaoCarregada): { linhas: LinhaTabela[]; demo: boolean } {
  const linhas = c.linhas.map(linhaDaTabela)
  return { linhas: linhas.map(semMarca), demo: linhas.some((l) => l.demo) }
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

const pilotos = (n: number) => `${n} ${n === 1 ? 'piloto' : 'pilotos'}`

/**
 * Classificação de uma categoria (tabela de liderança: piloto e pontos).
 *
 * Com `subcategorias` (as da categoria) e pilotos com subcategoria na inscrição: uma tabela por subcategoria,
 * com abas no topo para ver uma de cada vez (o único JavaScript; sem ele, as tabelas aparecem uma embaixo da
 * outra). Em cada tabela, só os pilotos da subcategoria, na ordem da classificação geral, com a posição dentro
 * dela e a geral entre parênteses; os pontos são os do campeonato. Sem subcategorias: uma tabela só.
 */
export function ClassificacaoCategoria({
  classificacao,
  nome,
  cor,
  compacta = false,
  limite,
  subcategorias,
  idBase,
  nivelTitulo = 4,
}: {
  classificacao: ClassificacaoCarregada
  nome: string
  cor?: string | null
  compacta?: boolean
  limite?: number
  /** Subcategorias da categoria (ordem das tabelas). Vazio/ausente = tabela única. */
  subcategorias?: { nome?: string | null }[] | null
  /** Prefixo dos ids das tabelas por subcategoria (único na página). */
  idBase?: string
  /** Nível do título de cada subcategoria (um abaixo do título da categoria). */
  nivelTitulo?: 3 | 4 | 5 | 6
}) {
  const separada = separarClassificacao(classificacao.linhas, compacta ? [] : subcategorias)
  const total = separada.grupos.reduce((n, g) => n + g.linhas.length, 0)
  if (!total) return <EstadoVazio texto="A classificação aparece depois da primeira etapa com resultado oficial." />
  const demo = classificacao.linhas.some((l) => separarDemo(l.nome).demo)
  const desempate = classificacao.criterios?.desempate ?? []
  const colunasEtapas = !compacta && classificacao.etapas.length > 0
  const corta = <T,>(linhas: T[]) => (limite ? linhas.slice(0, limite) : linhas)

  const nota = !compacta && (
    <p className={s.notaTabela}>
      {classificacao.etapasRealizadas} {classificacao.etapasRealizadas === 1 ? 'etapa realizada' : 'etapas realizadas'}.
      {desempate.length ? ` Critérios de desempate: ${desempate.map((c) => ROTULOS_CRITERIO[c].toLowerCase()).join(', ')}.` : ''}
      {classificacao.fonte === 'manual' ? ' Classificação lançada pela organização.' : ''}
    </p>
  )

  if (!separada.porSubcategoria) {
    return (
      <div className={s.blocoTabela}>
        {demo && <AvisoExemplo />}
        <TabelaClassificacao
          linhas={corta(separada.grupos[0].linhas.map((l) => semMarca(linhaDaTabela(l.linha))))}
          cor={cor}
          colunasEtapas={colunasEtapas}
          compacta={compacta}
          legenda={`Classificação — ${nome}`}
        />
        {nota}
      </div>
    )
  }

  const Titulo = `h${nivelTitulo}` as const
  const prefixo = idBase ?? `classificacao-${String(classificacao.categoria)}`
  const abas = separada.grupos.map((g) => {
    const id = `${prefixo}-${g.chave}`
    const sub = separarDemo(g.nome).texto || 'Subcategoria'
    return {
      id,
      rotulo: sub,
      painel: (
        <>
          <Titulo id={`${id}-titulo`} className={s.tituloSubcategoria}>
            {sub}
            <span className={s.contagemSubcategoria}>
              <span aria-hidden="true">· </span>
              {pilotos(g.linhas.length)}
            </span>
          </Titulo>
          <TabelaClassificacao
            linhas={corta(g.linhas.map((l) => semMarca(linhaDaSubcategoria(l))))}
            cor={cor}
            colunasEtapas={colunasEtapas}
            compacta={compacta}
            legenda={`Classificação — ${nome}, subcategoria ${sub}. Posição na subcategoria e, entre parênteses, a posição geral.`}
          />
        </>
      ),
    }
  })

  return (
    <div className={s.blocoTabela}>
      {demo && <AvisoExemplo />}
      <p className={s.notaTabela}>Posição dentro da subcategoria; entre parênteses, a posição geral na categoria. Os pontos são os do campeonato.</p>
      {abas.length > 1 ? (
        <AbasSubcategorias rotulo={`Subcategorias de ${nome}`} abas={abas} />
      ) : (
        <section id={abas[0].id} className={s.painelSubcategoria} aria-labelledby={`${abas[0].id}-titulo`}>
          {abas[0].painel}
        </section>
      )}
      {nota}
    </div>
  )
}
