'use client'

import { useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react'
import s from './MatrizEtapa.module.css'

export type AbaSubcategoria = {
  /** id do painel (a aba usa `${id}-aba`; o título dentro do painel usa `${id}-titulo`). */
  id: string
  rotulo: string
  /** Conteúdo já renderizado no servidor (título e tabela da subcategoria). */
  painel: ReactNode
}

const semAssinatura = () => () => {}
/** false no servidor e na hidratação; true depois que o JavaScript carregou. */
const useComJs = () =>
  useSyncExternalStore(
    semAssinatura,
    () => true,
    () => false,
  )

/**
 * Abas das subcategorias no resultado da etapa (padrão de abas acessível: role tablist/tab/tabpanel,
 * setas, Home e End; a primeira aba abre ativa). Os painéis chegam prontos do servidor.
 * Sem JavaScript (ou antes de ele carregar), todas as tabelas aparecem empilhadas, com links para cada uma.
 */
export function AbasSubcategorias({ rotulo, abas }: { rotulo: string; abas: AbaSubcategoria[] }) {
  const comJs = useComJs()
  const [ativa, setAtiva] = useState(0)
  const botoes = useRef<(HTMLButtonElement | null)[]>([])

  const aoTeclar = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = abas.length
    const destino =
      e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null
    if (destino === null) return
    e.preventDefault()
    setAtiva(destino)
    botoes.current[destino]?.focus()
  }

  return (
    <div className={s.abas}>
      {comJs ? (
        <div role="tablist" aria-label={rotulo} className={s.listaAbas}>
          {abas.map((a, i) => (
            <button
              key={a.id}
              ref={(el) => {
                botoes.current[i] = el
              }}
              type="button"
              role="tab"
              id={`${a.id}-aba`}
              className={s.aba}
              aria-selected={i === ativa}
              aria-controls={a.id}
              tabIndex={i === ativa ? 0 : -1}
              onClick={() => setAtiva(i)}
              onKeyDown={(e) => aoTeclar(e, i)}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      ) : (
        <nav aria-label={rotulo}>
          <ul className={s.listaAbas}>
            {abas.map((a) => (
              <li key={a.id}>
                <a className={s.aba} href={`#${a.id}`}>
                  {a.rotulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className={s.paineis}>
        {abas.map((a, i) =>
          comJs ? (
            <section key={a.id} id={a.id} className={s.painel} role="tabpanel" aria-labelledby={`${a.id}-aba`} hidden={i !== ativa}>
              {a.painel}
            </section>
          ) : (
            <section key={a.id} id={a.id} className={s.painel} aria-labelledby={`${a.id}-titulo`}>
              {a.painel}
            </section>
          ),
        )}
      </div>
    </div>
  )
}
