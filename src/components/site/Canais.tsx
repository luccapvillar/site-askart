import type { Canal } from '@/lib/site'
import s from './Canais.module.css'

const ICONES: Record<string, string> = {
  whatsapp: 'M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z',
  telefone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  email: 'M3 6h18v12H3z M3 6l9 7 9-7',
  outro: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
}

const TIPO: Record<string, string> = { whatsapp: 'WhatsApp', telefone: 'Telefone', email: 'E-mail', outro: 'Contato' }

/**
 * Lista de contatos. O contato provisório (+55 61 00000-0000) aparece com aviso e sem link:
 * não é um contato oficial (pedido do cliente).
 */
export function Canais({ canais, escuro = false }: { canais: Canal[]; escuro?: boolean }) {
  if (!canais.length) return <p className="texto-2">Os contatos oficiais serão publicados em breve.</p>
  return (
    <ul className={`${s.lista} ${escuro ? s.escuro : ''}`}>
      {canais.map((c, i) => (
        <li key={`${c.tipo}-${c.valor}-${i}`} className={s.canal}>
          <svg className={s.icone} aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            <path d={ICONES[c.tipo] ?? ICONES.outro} />
          </svg>
          <span className={s.textos}>
            <span className={s.rotulo}>
              {TIPO[c.tipo]}
              {c.rotulo && c.rotulo !== TIPO[c.tipo] && !c.provisorio ? ` · ${c.rotulo}` : ''}
            </span>
            {c.href ? (
              <a className={s.valor} href={c.href} {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                {c.valor}
              </a>
            ) : (
              <span className={s.valor}>{c.valor}</span>
            )}
            {c.provisorio && <span className={s.provisorio}>Contato provisório — não é o número oficial</span>}
            {c.observacao && <span className={s.obs}>{c.observacao}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}
