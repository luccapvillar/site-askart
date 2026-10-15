import Link from 'next/link'
import { Selo } from './Selo'
import s from './Rodape.module.css'

export type CanalContato = { tipo: 'telefone' | 'whatsapp' | 'email' | 'outro'; rotulo: string; valor: string; href?: string | null; provisorio?: boolean }
export type ColunaRodape = { titulo: string; links: { rotulo: string; href: string; externo?: boolean }[] }
export type RedeSocial = { rede: string; url: string }

type Props = {
  sigla: string
  nome: string
  texto?: string | null
  colunas: ColunaRodape[]
  canais: CanalContato[]
  endereco?: string | null
  redes: RedeSocial[]
  ano: number
}

const NOMES_REDES: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', tiktok: 'TikTok', x: 'X', whatsapp: 'WhatsApp' }

/**
 * Rodapé. Tudo vem do painel (configurações, navegação e contato).
 * Contato provisório aparece com o selo "Contato provisório" e SEM link de ligação, como pediu o cliente.
 */
export function Rodape({ sigla, nome, texto, colunas, canais, endereco, redes, ano }: Props) {
  const corte = sigla.toUpperCase().startsWith('AS') ? 2 : 0
  return (
    <footer className={s.rodape}>
      <div className="conteiner">
        <div className={s.grade}>
          <div className={s.marca}>
            <span className={s.sigla}>
              {corte ? (
                <>
                  <b>{sigla.slice(0, corte)}</b>
                  {sigla.slice(corte)}
                </>
              ) : (
                sigla
              )}
            </span>
            <span className="texto-2">{nome}</span>
            {texto && <p className="texto-2">{texto}</p>}
          </div>

          {colunas.map((c) => (
            <div key={c.titulo} className={s.coluna}>
              <h2 className="rotulo">{c.titulo}</h2>
              <ul>
                {c.links.map((l) => (
                  <li key={l.href + l.rotulo}>
                    {l.externo ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer">
                        {l.rotulo}
                      </a>
                    ) : (
                      <Link href={l.href}>{l.rotulo}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {(canais.length > 0 || endereco) && (
            <div className={s.coluna}>
              <h2 className="rotulo">Contato</h2>
              <ul>
                {canais.map((c) => (
                  <li key={c.tipo + c.valor} className={s.canal}>
                    <small>{c.rotulo}</small>
                    {c.provisorio ? (
                      <span>
                        {c.valor} <Selo tom="atencao">Contato provisório</Selo>
                      </span>
                    ) : c.href ? (
                      <a href={c.href}>{c.valor}</a>
                    ) : (
                      <span>{c.valor}</span>
                    )}
                  </li>
                ))}
                {endereco && (
                  <li className={s.canal}>
                    <small>Endereço</small>
                    <span style={{ whiteSpace: 'pre-line' }}>{endereco}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {redes.length > 0 && (
          <div className={s.redes} style={{ marginTop: 32 }}>
            {redes.map((r) => (
              <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer">
                {NOMES_REDES[r.rede] ?? r.rede}
              </a>
            ))}
          </div>
        )}

        <div className={s.base}>
          <span>
            © {ano} {sigla} — {nome}
          </span>
          <Link href="/admin">Área administrativa</Link>
        </div>
      </div>
    </footer>
  )
}
