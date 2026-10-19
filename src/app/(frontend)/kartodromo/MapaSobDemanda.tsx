'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import s from './Kartodromo.module.css'

/**
 * Mapa "toque para carregar": até o toque, nada do Google é carregado (só a foto do local, que vem do
 * próprio site). No toque entra o mapa interativo e o foco vai para ele. O link "Como chegar", fora deste
 * bloco, funciona sempre, mesmo sem JavaScript.
 */
export function MapaSobDemanda({ endereco, titulo, children }: { endereco: string; titulo: string; children?: ReactNode }) {
  const [aberto, setAberto] = useState(false)
  const quadro = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (aberto) quadro.current?.focus()
  }, [aberto])

  return (
    <div className={`${s.mapa} ${aberto ? s.mapaAberto : ''}`}>
      {aberto ? (
        <iframe ref={quadro} className={s.mapaQuadro} src={endereco} title={titulo} referrerPolicy="strict-origin-when-cross-origin" />
      ) : (
        <>
          {children}
          <button type="button" className={s.mapaBotao} onClick={() => setAberto(true)}>
            <span className={s.mapaChamada}>
              <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              Mostrar o mapa aqui
            </span>
            <span className={s.mapaNota}>O mapa do Google só é carregado quando você tocar aqui.</span>
          </button>
        </>
      )}
    </div>
  )
}
