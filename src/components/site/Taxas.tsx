import { valorDaTaxa, VALOR_A_CONFIRMAR } from '@/lib/taxas'
import type { Kartodromo } from '@/payload-types'
import s from './Taxas.module.css'

type Taxa = NonNullable<Kartodromo['taxas']>[number]

/** Tabela de taxas do kartódromo. Valor não definido aparece como "R$ X" (pedido do cliente). */
export function Taxas({ taxas, introducao }: { taxas: Taxa[]; introducao?: string | null }) {
  if (!taxas.length) return null
  const aConfirmar = taxas.some((t) => valorDaTaxa(t) === VALOR_A_CONFIRMAR)
  return (
    <div className={s.taxas}>
      {introducao && <p className={s.intro}>{introducao}</p>}
      <table className={s.tabela}>
        <caption className="visualmente-oculto">Taxas do kartódromo</caption>
        <thead>
          <tr>
            <th scope="col">Taxa</th>
            <th scope="col" className={s.valor}>
              Valor
            </th>
          </tr>
        </thead>
        <tbody>
          {taxas.map((t, i) => (
            <tr key={t.id ?? i}>
              <th scope="row">
                {t.item}
                {t.obrigatoria && <span className={s.obrigatoria}>Obrigatória</span>}
                {t.observacao && <span className={s.obs}>{t.observacao}</span>}
              </th>
              <td className={`${s.valor} mono`}>{valorDaTaxa(t)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {aConfirmar && <p className={s.nota}>R$ X = valor a confirmar pela ASKART.</p>}
    </div>
  )
}
