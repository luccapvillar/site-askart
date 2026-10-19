'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import s from './Cabecalho.module.css'

export type ItemMenu = { rotulo: string; href: string; externo?: boolean; subitens?: ItemMenu[] }
export type AvisoBarra = { titulo: string; href: string; nivel: 'informativo' | 'atencao' | 'urgente' }

type Props = {
  sigla: string
  nome: string
  logo?: { url: string; largura?: number | null; altura?: number | null } | null
  menu: ItemMenu[]
  aviso?: AvisoBarra | null
  /** Faixa superior: local e atalhos (ex.: "Kartódromo Ayrton Senna do Guará · Brasília/DF"). */
  local?: string | null
  atalhos?: { rotulo: string; href: string; externo?: boolean }[]
  destaque?: ItemMenu | null
}

const ativo = (atual: string, href: string) => (href === '/' ? atual === '/' : atual === href || atual.startsWith(`${href}/`))

const ROTULO_AVISO: Record<AvisoBarra['nivel'], string> = { informativo: 'Comunicado', atencao: 'Atenção', urgente: 'Urgente' }

/** Partes do site escondidas do teclado/leitor de tela enquanto a gaveta do celular está aberta. */
const FUNDO_DA_GAVETA = ['conteudo', 'rodape']

function NovaAba() {
  return <span className="visualmente-oculto"> (abre em nova aba)</span>
}

/**
 * Cabeçalho institucional: faixa de serviço (local e atalhos), comunicado em destaque, logo e as abas do
 * menu (vêm do painel). No celular, as abas ficam numa gaveta que ocupa a tela abaixo do cabeçalho.
 * É o único trecho do layout com JavaScript no navegador (abrir/fechar a gaveta e marcar a aba atual).
 */
export function Cabecalho({ sigla, nome, logo, menu, aviso, local, atalhos = [], destaque }: Props) {
  const caminho = usePathname() ?? '/'
  const [aberto, setAberto] = useState(false)
  const [topo, setTopo] = useState<number | null>(null)
  const cabecalho = useRef<HTMLElement>(null)
  const botao = useRef<HTMLButtonElement>(null)

  useEffect(() => setAberto(false), [caminho])

  useEffect(() => {
    // A gaveta começa logo abaixo do cabeçalho, com ou sem a faixa de serviço/comunicado visível
    if (aberto) setTopo(cabecalho.current?.getBoundingClientRect().bottom ?? null)
    document.documentElement.style.overflow = aberto ? 'hidden' : ''
    for (const id of FUNDO_DA_GAVETA) document.getElementById(id)?.toggleAttribute('inert', aberto)
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !aberto) return
      setAberto(false)
      botao.current?.focus()
    }
    // Ao passar para a largura de computador, a gaveta deixa de existir
    const largura = window.matchMedia('(min-width: 960px)')
    const mudouLargura = () => largura.matches && setAberto(false)
    window.addEventListener('keydown', tecla)
    largura.addEventListener('change', mudouLargura)
    return () => {
      window.removeEventListener('keydown', tecla)
      largura.removeEventListener('change', mudouLargura)
    }
  }, [aberto])

  const externo = (i: { externo?: boolean }) => (i.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})
  const fechar = () => setAberto(false)

  return (
    <>
      {(local || atalhos.length > 0) && (
        <div className={s.servico}>
          <div className={`conteiner ${s.servicoConteudo}`}>
            {local && (
              <p className={s.local}>
                <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                  <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </svg>
                {local}
              </p>
            )}
            {atalhos.length > 0 && (
              <ul className={s.atalhos}>
                {atalhos.map((a) => (
                  <li key={a.href + a.rotulo}>
                    <a href={a.href} {...externo(a)}>
                      {a.rotulo}
                      {a.externo && <NovaAba />}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {aviso && (
        <div className={`${s.aviso} ${s[aviso.nivel]}`} role="region" aria-label="Comunicado em destaque">
          <div className={`conteiner ${s.avisoConteudo}`}>
            <span className={s.avisoRotulo}>
              <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 3 2.5 20h19L12 3z" />
                <path d="M12 10v4.5M12 17.2v.3" />
              </svg>
              {ROTULO_AVISO[aviso.nivel] ?? 'Comunicado'}
            </span>
            <Link className={s.avisoLink} href={aviso.href}>
              {aviso.titulo}
              <span aria-hidden="true"> →</span>
            </Link>
          </div>
        </div>
      )}

      <header ref={cabecalho} className={s.cabecalho}>
        <div className={`conteiner ${s.barra}`}>
          <Link className={s.marca} href="/" aria-label={`${sigla} — ${nome} — página inicial`} onClick={fechar}>
            {logo?.url ? (
              <img className={s.logo} src={logo.url} alt="" width={logo.largura ?? undefined} height={logo.altura ?? undefined} fetchPriority="high" />
            ) : (
              <span className={s.sigla}>{sigla}</span>
            )}
            <span className={s.nome}>{nome}</span>
          </Link>

          <nav className={s.nav} aria-label="Principal">
            <ul className={s.navLista}>
              {menu.map((i) => (
                <li key={i.href + i.rotulo}>
                  <Link className={s.link} href={i.href} aria-current={ativo(caminho, i.href) ? 'page' : undefined} {...externo(i)}>
                    {i.rotulo}
                    {i.externo && <NovaAba />}
                  </Link>
                </li>
              ))}
            </ul>
            {destaque && (
              <a className={s.destaque} href={destaque.href} {...externo(destaque)}>
                {destaque.rotulo}
                {destaque.externo && <NovaAba />}
              </a>
            )}
          </nav>

          <button
            ref={botao}
            type="button"
            className={s.menuBotao}
            aria-expanded={aberto}
            aria-controls="menu-celular"
            onClick={() => setAberto((v) => !v)}
          >
            <span className={s.linhas} aria-hidden="true" />
            <span>{aberto ? 'Fechar' : 'Menu'}</span>
          </button>
        </div>
      </header>

      <div id="menu-celular" className={s.gaveta} hidden={!aberto} style={topo !== null ? { top: topo } : undefined}>
        <nav aria-label="Menu" className={`conteiner ${s.gavetaConteudo}`}>
          <ul className={s.gavetaLista}>
            {menu.map((i) => (
              <li key={i.href + i.rotulo}>
                <Link href={i.href} aria-current={ativo(caminho, i.href) ? 'page' : undefined} onClick={fechar} {...externo(i)}>
                  <span>
                    {i.rotulo}
                    {i.externo && <NovaAba />}
                  </span>
                  <span className={s.chevron} aria-hidden="true" />
                </Link>
                {i.subitens?.length ? (
                  <ul className={s.sub}>
                    {i.subitens.map((sub) => (
                      <li key={sub.href + sub.rotulo}>
                        <Link href={sub.href} aria-current={caminho === sub.href ? 'page' : undefined} onClick={fechar} {...externo(sub)}>
                          {sub.rotulo}
                          {sub.externo && <NovaAba />}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>

          {destaque && (
            <a className={s.destaqueGaveta} href={destaque.href} onClick={fechar} {...externo(destaque)}>
              {destaque.rotulo}
              {destaque.externo && <NovaAba />}
            </a>
          )}

          {(local || atalhos.length > 0) && (
            <div className={s.gavetaRodape}>
              {local && (
                <p className={s.gavetaLocal}>
                  {local.split(' · ').map((parte) => (
                    <span key={parte}>{parte}</span>
                  ))}
                </p>
              )}
              {atalhos.length > 0 && (
                <ul>
                  {atalhos.map((a) => (
                    <li key={a.href + a.rotulo}>
                      <a href={a.href} onClick={fechar} {...externo(a)}>
                        {a.rotulo}
                        {a.externo && <NovaAba />}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </nav>
      </div>
    </>
  )
}
