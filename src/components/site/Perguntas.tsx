import type { Pergunta } from '@/payload-types'
import { TextoDemo } from './TextoDemo'
import { TextoRico } from './TextoRico'
import s from './Perguntas.module.css'

/**
 * Perguntas frequentes em sanfona, sem JavaScript (<details>/<summary>): abre com toque, clique, Enter ou
 * espaço, e o leitor de tela anuncia "recolhido/expandido". A pergunta é um título (h3) dentro do resumo,
 * para quem navega pelos títulos da página.
 */
export function Perguntas({ perguntas }: { perguntas: Pergunta[] }) {
  if (!perguntas.length) return null
  return (
    <div className={s.lista}>
      {perguntas.map((p) => (
        <details key={p.id} className={s.item}>
          <summary className={s.resumo}>
            <h3 className={s.pergunta}>
              <TextoDemo texto={p.pergunta} />
            </h3>
            <span className={s.sinal} aria-hidden="true" />
          </summary>
          <div className={s.resposta}>
            <TextoRico dados={p.resposta} />
          </div>
        </details>
      ))}
    </div>
  )
}
