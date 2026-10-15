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

/** Cabeçalho institucional: faixa de serviço, logo e as abas do menu (vêm do painel). No celular, gaveta. */
export function Cabecalho({ sigla, nome, logo, menu, aviso, local, atalhos = [], destaque }: Props) {
  const caminho = usePathname() ?? '/'
  const [aberto, setAberto] = useState(false)
  const [topo, setTopo] = useState<number | null>(null)
  const cabecalho = useRef<HTMLElement>(null)

  useEffect(() => setAberto(false), [caminho])
  useEffect(() => {
    // A gaveta começa logo abaixo do cabeçalho, com ou sem a faixa de serviço visível
    if (aberto) setTopo(cabecalho.current?.getBoundingClientRect().bottom ?? null)
    document.documentElement.style.overflow = aberto ? 'hidden' : ''
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberto])

  const externo = (i: { externo?: boolean }) => (i.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})

  return (
    <>
      <div className={s.servico}>
        <div className={`conteiner ${s.servicoConteudo}`}>
          {local && <span className={s.local}>{local}</span>}
          {atalhos.length > 0 && (
            <ul className={s.atalhos}>
              {atalhos.map((a) => (
                <li key={a.href + a.rotulo}>
                  <a href={a.href} {...externo(a)}>
                    {a.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {aviso && (
        <div className={`${s.aviso} ${s[aviso.nivel]}`} role="region" aria-label="Comunicado em destaque">
          <div className={`conteiner ${s.avisoConteudo}`}>
            <span className="rotulo">{aviso.nivel === 'urgente' ? 'Urgente' : 'Comunicado'}</span>
            <Link href={aviso.href}>{aviso.titulo}</Link>
          </div>
        </div>
      )}
      <header ref={cabecalho} className={s.cabecalho}>
        <div className={`conteiner ${s.barra}`}>
          <Link className={s.marca} href="/" aria-label={`${sigla} — ${nome} — página inicial`}>
            {logo?.url ? (
              <img className={s.logo} src={logo.url} alt="" width={logo.largura ?? undefined} height={logo.altura ?? undefined} />
            ) : (
              <span className={s.sigla}>{sigla}</span>
            )}
            <span className={s.nome}>{nome}</span>
          </Link>

          <nav className={s.nav} aria-label="Principal">
            <ul>
              {menu.map((i) => (
                <li key={i.href + i.rotulo}>
                  <Link className={s.link} href={i.href} aria-current={ativo(caminho, i.href) ? 'page' : undefined} {...externo(i)}>
                    {i.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
            {destaque && (
              <a className={s.destaque} href={destaque.href} {...externo(destaque)}>
                {destaque.rotulo}
              </a>
            )}
          </nav>

          <button type="button" className={s.menuBotao} aria-expanded={aberto} aria-controls="menu-celular" onClick={() => setAberto((v) => !v)}>
            <span className={s.menuTexto}>{aberto ? 'Fechar' : 'Menu'}</span>
            <span className={s.linhas} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div id="menu-celular" className={s.gaveta} hidden={!aberto} style={topo !== null ? { top: topo } : undefined}>
        <nav aria-label="Menu">
          <ul className={s.gavetaLista}>
            {menu.map((i) => (
              <li key={i.href + i.rotulo}>
                <Link href={i.href} aria-current={ativo(caminho, i.href) ? 'page' : undefined} {...externo(i)}>
                  {i.rotulo} <span aria-hidden="true">→</span>
                </Link>
                {i.subitens?.length ? (
                  <ul className={s.sub}>
                    {i.subitens.map((sub) => (
                      <li key={sub.href + sub.rotulo}>
                        <Link href={sub.href} {...externo(sub)}>
                          {sub.rotulo}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
          {destaque && (
            <a className={s.destaqueGaveta} href={destaque.href} {...externo(destaque)}>
              {destaque.rotulo}
            </a>
          )}
        </nav>
      </div>
    </>
  )
}
