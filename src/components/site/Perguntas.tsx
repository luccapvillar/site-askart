import type { Pergunta } from '@/payload-types'
import { TextoDemo } from './TextoDemo'
import { TextoRico } from './TextoRico'
import s from './Perguntas.module.css'

/** Perguntas frequentes em sanfona (sem JavaScript: <details>). */
export function Perguntas({ perguntas }: { perguntas: Pergunta[] }) {
  if (!perguntas.length) return null
  return (
    <div className={s.lista}>
      {perguntas.map((p) => (
        <details key={p.id} className={s.item}>
          <summary>
            <span>
              <TextoDemo texto={p.pergunta} />
            </span>
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
