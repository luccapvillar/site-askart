'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import s from './Cabecalho.module.css'

export type ItemMenu = { rotulo: string; href: string; externo?: boolean; subitens?: ItemMenu[] }
export type AvisoBarra = { titulo: string; href: string; nivel: 'informativo' | 'atencao' | 'urgente' }

type Props = {
  sigla: string
  nome: string
  logo?: { url: string; largura?: number | null; altura?: number | null } | null
  menu: ItemMenu[]
  aviso?: AvisoBarra | null
}

const ativo = (atual: string, href: string) => (href === '/' ? atual === '/' : atual === href || atual.startsWith(`${href}/`))

/** Cabeçalho fixo: logo e menu vêm do painel (configurações e navegação). No celular, menu em tela cheia. */
export function Cabecalho({ sigla, nome, logo, menu, aviso }: Props) {
  const caminho = usePathname() ?? '/'
  const [aberto, setAberto] = useState(false)

  useEffect(() => setAberto(false), [caminho])
  useEffect(() => {
    document.documentElement.style.overflow = aberto ? 'hidden' : ''
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberto])

  // Divide a sigla para colorir como a logo (ex.: "AS" amarelo + "KART")
  const corte = sigla.toUpperCase().startsWith('AS') ? 2 : 0

  return (
    <>
      {aviso && (
        <div className={`${s.aviso} ${s[aviso.nivel]}`} role="region" aria-label="Aviso em destaque">
          <div className={`conteiner ${s.avisoConteudo}`}>
            <span className="rotulo">{aviso.nivel === 'urgente' ? 'Urgente' : 'Aviso'}</span>
            <Link href={aviso.href}>{aviso.titulo}</Link>
          </div>
        </div>
      )}
      <header className={s.cabecalho}>
        <div className={`conteiner ${s.barra}`}>
          <Link className={s.marca} href="/" aria-label={`${sigla} — página inicial`}>
            {logo?.url ? (
              <img className={s.logo} src={logo.url} alt="" width={logo.largura ?? undefined} height={logo.altura ?? undefined} />
            ) : null}
            <span className={s.nome}>
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
              <span className={s.extenso}>{nome}</span>
            </span>
          </Link>

          <nav className={s.nav} aria-label="Principal">
            {menu.map((i) => (
              <Link key={i.href + i.rotulo} className={s.link} href={i.href} aria-current={ativo(caminho, i.href) ? 'page' : undefined} {...(i.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                {i.rotulo}
              </Link>
            ))}
          </nav>

          <button type="button" className={s.menuBotao} aria-expanded={aberto} aria-controls="menu-celular" onClick={() => setAberto((v) => !v)}>
            <span className="visualmente-oculto">{aberto ? 'Fechar menu' : 'Abrir menu'}</span>
            <span className={s.linhas} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div id="menu-celular" className={s.gaveta} hidden={!aberto}>
        <nav aria-label="Menu">
          <ul className={s.gavetaLista}>
            {menu.map((i) => (
              <li key={i.href + i.rotulo}>
                <Link href={i.href} aria-current={ativo(caminho, i.href) ? 'page' : undefined}>
                  {i.rotulo} <span aria-hidden="true">→</span>
                </Link>
                {i.subitens?.length ? (
                  <ul className={s.sub}>
                    {i.subitens.map((sub) => (
                      <li key={sub.href + sub.rotulo}>
                        <Link href={sub.href}>{sub.rotulo}</Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  )
}
