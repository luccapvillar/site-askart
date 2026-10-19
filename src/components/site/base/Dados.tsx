import type { ReactNode } from 'react'
import s from './Base.module.css'

export type ItemDado = { termo: ReactNode; valor: ReactNode; nota?: ReactNode }

/**
 * Painel de dados "rótulo → valor" (endereço, taxas, horário, categorias…), em lista de definição (<dl>).
 * Ex.: { termo: 'Taxa de ambulância', valor: 'R$ 50,00', nota: 'por piloto, por dia de treino' }.
 */
export function Dados({ itens, colunas }: { itens: ItemDado[]; colunas?: 1 | 2 | 3 }) {
  if (!itens.length) return null
  return (
    <dl className={`${s.dados} ${colunas ? s[`dados${colunas}`] : ''}`}>
      {itens.map((i, n) => (
        <div key={n} className={s.dado}>
          <dt>{i.termo}</dt>
          <dd>{i.valor}</dd>
          {i.nota && <dd className={s.dadoNota}>{i.nota}</dd>}
        </div>
      ))}
    </dl>
  )
}
