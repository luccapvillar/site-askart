import { valorDaTaxa, VALOR_A_CONFIRMAR } from '@/lib/taxas'
import type { Kartodromo } from '@/payload-types'
import { semDemo, TextoDemo } from './TextoDemo'
import s from './Taxas.module.css'

type Taxa = NonNullable<Kartodromo['taxas']>[number]

/**
 * Taxas do kartódromo em cartões de valor (nome, valor grande, quando se aplica e se é obrigatória).
 * Valor ainda não definido aparece como "R$ X" (pedido do cliente), com o aviso "Valor ainda não informado".
 * Funciona em fundo claro e dentro de `.escuro`.
 */
export function Taxas({ taxas, introducao }: { taxas: Taxa[]; introducao?: string | null }) {
  if (!taxas.length) return null
  return (
    <div className={s.taxas}>
      {introducao && <p className={s.intro}>{semDemo(introducao)}</p>}
      <dl className={s.lista}>
        {taxas.map((t, i) => {
          const valor = valorDaTaxa(t)
          const aConfirmar = valor === VALOR_A_CONFIRMAR
          return (
            <div key={t.id ?? i} className={`${s.taxa} ${aConfirmar ? s.aConfirmar : ''}`}>
              <dt className={s.nome}>
                <TextoDemo texto={t.item} />
                {t.obrigatoria && <span className={s.obrigatoria}>Obrigatória</span>}
              </dt>
              <dd className={s.valor}>{valor}</dd>
              {aConfirmar && <dd className={s.pendente}>Valor ainda não informado</dd>}
              {t.observacao && <dd className={s.obs}>{semDemo(t.observacao)}</dd>}
            </div>
          )
        })}
      </dl>
    </div>
  )
}
