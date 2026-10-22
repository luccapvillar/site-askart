import Link from 'next/link'
import { nomeDaRedeComPerfil } from '@/lib/site'
import s from './Rodape.module.css'

export type CanalContato = {
  tipo: 'telefone' | 'whatsapp' | 'email' | 'outro'
  rotulo: string
  valor: string
  href?: string | null
  provisorio?: boolean
}
export type ColunaRodape = {
  titulo: string
  links: { rotulo: string; href: string; externo?: boolean }[]
}
export type RedeSocial = { rede: string; url: string; referente?: string | null }

type Props = {
  sigla: string
  nome: string
  texto?: string | null
  colunas: ColunaRodape[]
  canais: CanalContato[]
  /** Endereço (pode ter mais de uma linha). */
  endereco?: string | null
  redes: RedeSocial[]
  ano: number
  /** Link do mapa ("Como chegar"), do painel (Contato → endereço). */
  mapa?: string | null
  /** Nome do kartódromo e cidade, exibidos junto do endereço. */
  local?: string | null
}

const EMAIL_CREDITO = 'luccapvillar@gmail.com'

const NOMES_REDES: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X',
  whatsapp: 'WhatsApp',
}

const TIPO_CANAL: Record<CanalContato['tipo'], string> = {
  telefone: 'Telefone',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  outro: 'Contato',
}

function NovaAba() {
  return <span className="visualmente-oculto"> (abre em nova aba)</span>
}

/**
 * Rodapé institucional. Tudo vem do painel (configurações, navegação e contato).
 * Contato provisório aparece com o selo "Contato provisório" e SEM link de ligação, como pediu o cliente.
 * Na base: crédito de quem fez o site, ao lado do acesso discreto ao painel.
 */
export function Rodape({
  sigla,
  nome,
  texto,
  colunas,
  canais,
  endereco,
  redes,
  ano,
  mapa,
  local,
}: Props) {
  const corte = sigla.toUpperCase().startsWith('AS') ? 2 : 0
  const temContato = canais.length > 0 || Boolean(endereco)
  return (
    <footer id="rodape" className={s.rodape}>
      <div className="faixa-marca" aria-hidden="true" />
      <div className="conteiner">
        <div className={s.grade}>
          <div className={s.marca}>
            <p className={s.sigla}>
              {corte ? (
                <>
                  <span className={s.siglaAs}>{sigla.slice(0, corte)}</span>
                  <span className={s.siglaKart}>{sigla.slice(corte)}</span>
                </>
              ) : (
                sigla
              )}
            </p>
            <p className={s.nome}>{nome}</p>
            {texto && <p className={s.texto}>{texto}</p>}
            {redes.length > 0 && (
              <ul className={s.redes} aria-label="Redes sociais">
                {redes.map((r) => (
                  <li key={r.url}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      {nomeDaRedeComPerfil(NOMES_REDES[r.rede] ?? r.rede, r.referente)}
                      <span aria-hidden="true" className={s.externo}>
                        ↗
                      </span>
                      <NovaAba />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {colunas.length > 0 && (
            <nav className={s.colunas} aria-label="Mapa do site">
              {colunas.map((c) => (
                <div key={c.titulo} className={s.coluna}>
                  <h2 className={s.tituloColuna}>{c.titulo}</h2>
                  <ul>
                    {c.links.map((l) => (
                      <li key={l.href + l.rotulo}>
                        {l.externo ? (
                          <a href={l.href} target="_blank" rel="noopener noreferrer">
                            {l.rotulo}
                            <NovaAba />
                          </a>
                        ) : (
                          <Link href={l.href}>{l.rotulo}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          )}

          {temContato && (
            <div className={s.contato}>
              <h2 className={s.tituloColuna}>Contato</h2>
              <ul className={s.canais}>
                {canais.map((c) => (
                  <li key={c.tipo + c.valor + c.rotulo} className={s.canal}>
                    <span className={s.canalTipo}>{TIPO_CANAL[c.tipo] ?? c.rotulo}</span>
                    {c.provisorio ? (
                      <span className={s.canalValor}>
                        {c.valor} <span className={s.provisorio}>Contato provisório</span>
                      </span>
                    ) : c.href ? (
                      <a className={s.canalValor} href={c.href}>
                        {c.valor}
                      </a>
                    ) : (
                      <span className={s.canalValor}>{c.valor}</span>
                    )}
                  </li>
                ))}
                {endereco && (
                  <li className={s.canal}>
                    <span className={s.canalTipo}>Endereço</span>
                    <address className={s.endereco}>
                      {local && <strong>{local}</strong>}
                      {endereco}
                    </address>
                    {mapa && (
                      <a className={s.mapa} href={mapa} target="_blank" rel="noopener noreferrer">
                        Como chegar
                        <span aria-hidden="true"> ↗</span>
                        <NovaAba />
                      </a>
                    )}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className={s.base}>
          <p>
            © {ano} {sigla} — {nome}
          </p>
          {/* Crédito de quem fez o site, junto do acesso discreto ao painel */}
          <p className={s.credito}>
            <span>
              Site por Lucca Villar – <a href={`mailto:${EMAIL_CREDITO}`}>{EMAIL_CREDITO}</a>
            </span>
            <span className={s.separador} aria-hidden="true">
              ·
            </span>
            {/* Link comum (sem pré-carregar): o painel é outra aplicação, pesada, e só serve a quem administra */}
            <a href="/admin" rel="nofollow">
              Acesso do administrador
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
