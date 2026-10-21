import {
  nomeTaxasDeAmbulancia,
  planosDaMensalidade,
  reaisOuAConfirmar,
  type OpcaoMensalidade,
  type PlanoGravado,
} from '@/lib/taxas'
import { semDemo, TextoDemo } from './TextoDemo'
import s from './Mensalidade.module.css'

type Coluna = { chave: 'semDesconto' | 'comDesconto'; titulo: string; destaque: boolean }

/** Valor total em destaque e, embaixo, o que ele soma (pista + ambulâncias). */
function Celula({ opcao, coluna }: { opcao: OpcaoMensalidade | null; coluna: Coluna }) {
  return (
    <td role="cell" className={`${s.celula} ${coluna.destaque ? s.destaque : ''}`}>
      {/* No celular cada plano vira um cartão: o nome da coluna aparece junto do valor (o leitor de tela já o anuncia) */}
      <span className={s.rotuloCelula} aria-hidden="true">
        {coluna.titulo}
      </span>
      {opcao ? (
        <>
          <span className={s.total}>
            <span className="visualmente-oculto">Total: </span>
            {reaisOuAConfirmar(opcao.total)}
          </span>
          <span className={s.detalhe}>
            <span className={s.parte}>Pista {reaisOuAConfirmar(opcao.pista)}</span>{' '}
            <span className={s.mais}>+</span>{' '}
            <span className={s.parte}>Ambulâncias {reaisOuAConfirmar(opcao.ambulancias)}</span>
          </span>
        </>
      ) : (
        <span className={s.semValor}>
          <span aria-hidden="true">—</span>
          <span className="visualmente-oculto">Sem valor cadastrado</span>
        </span>
      )}
    </td>
  )
}

/**
 * Mensalidade da taxa de pista: tabela "Sem desconto" × "Com desconto bônus" por quantidade de taxas de ambulância
 * incluídas, com o total (calculado aqui: pista + ambulâncias) em destaque, e as regras em lista.
 * Tabela de verdade (cabeçalhos de coluna e de linha); no celular cada plano vira um cartão, com os papéis de
 * tabela declarados para o leitor de tela não perder a estrutura. Sem plano cadastrado, não aparece.
 */
export function Mensalidade({
  planos,
  introducao,
  regras,
}: {
  planos: PlanoGravado[] | null | undefined
  introducao?: string | null
  regras?: { texto?: string | null; id?: string | null }[] | null
}) {
  const tabela = planosDaMensalidade(planos)
  if (!tabela.planos.length) return null
  const colunas: Coluna[] = [
    ...(tabela.semDesconto
      ? [{ chave: 'semDesconto' as const, titulo: 'Sem desconto', destaque: false }]
      : []),
    ...(tabela.comDesconto
      ? [{ chave: 'comDesconto' as const, titulo: 'Com desconto bônus', destaque: true }]
      : []),
  ]
  const listaRegras = (regras ?? []).filter((r) => r.texto?.trim())

  return (
    <div className={s.mensalidade}>
      <div className={s.cabeca}>
        <h3 id="mensalidade-titulo" className="titulo-marca h3">
          Mensalidade da taxa de pista
        </h3>
        {introducao && <p className={s.intro}>{semDemo(introducao)}</p>}
      </div>

      <div className={s.quadro}>
        <table className={s.tabela} role="table">
          <caption className="visualmente-oculto">
            Mensalidade da taxa de pista: valor total de cada plano (pista + taxas de ambulância
            incluídas)
            {colunas.length > 1 ? ', sem desconto e com desconto bônus' : ''}
          </caption>
          <thead role="rowgroup">
            <tr role="row">
              <th role="columnheader" scope="col" className={s.colInclui}>
                Inclui
              </th>
              {colunas.map((c) => (
                <th
                  key={c.chave}
                  role="columnheader"
                  scope="col"
                  className={c.destaque ? s.destaque : undefined}
                >
                  <span className={s.colTitulo}>{c.titulo}</span>
                  <span className={s.colSub}>Valor total</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup">
            {tabela.planos.map((p) => (
              <tr key={p.chave} role="row" className={s.plano}>
                <th role="rowheader" scope="row" className={s.inclui}>
                  <span className={s.incluiCaixa}>
                    <span className={s.placa} aria-hidden="true">
                      {p.ambulanciasIncluidas}
                    </span>
                    <span>
                      <span className="visualmente-oculto">{p.ambulanciasIncluidas} </span>
                      {nomeTaxasDeAmbulancia(p.ambulanciasIncluidas)}
                    </span>
                  </span>
                </th>
                {colunas.map((c) => (
                  <Celula key={c.chave} opcao={p[c.chave]} coluna={c} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {listaRegras.length > 0 && (
        <div className={s.regras}>
          <h4 className="h4">Regras da mensalidade</h4>
          <ul className={s.listaRegras}>
            {listaRegras.map((r, i) => (
              <li key={r.id ?? i}>
                <TextoDemo texto={r.texto} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
