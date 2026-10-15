'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import s from './Galeria.module.css'

export type FotoGaleria = {
  id: string | number
  miniatura: string
  grande: string
  largura?: number | null
  altura?: number | null
  alt: string
  legenda?: string | null
  credito?: string | null
}

/** Galeria em grade, mosaico ou carrossel, com tela cheia (teclado, setas e gesto de deslizar). */
export function Galeria({ fotos, exibicao = 'grade' }: { fotos: FotoGaleria[]; exibicao?: 'grade' | 'mosaico' | 'carrossel' }) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [atual, setAtual] = useState(0)
  const origem = useRef<HTMLElement | null>(null)
  const toque = useRef<{ x: number; y: number } | null>(null)

  const mostrar = useCallback((i: number) => setAtual((i + fotos.length) % fotos.length), [fotos.length])

  const abrir = (i: number, el: HTMLElement) => {
    origem.current = el
    mostrar(i)
    dialogo.current?.showModal()
  }

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') mostrar(atual + 1)
      if (e.key === 'ArrowLeft') mostrar(atual - 1)
    }
    const fechar = () => origem.current?.focus()
    d.addEventListener('keydown', tecla)
    d.addEventListener('close', fechar)
    return () => {
      d.removeEventListener('keydown', tecla)
      d.removeEventListener('close', fechar)
    }
  }, [atual, mostrar])

  if (!fotos.length) return null
  const foto = fotos[atual]

  return (
    <>
      <div className={s[exibicao]}>
        {fotos.map((f, i) => (
          <button key={f.id} type="button" className={s.item} onClick={(e) => abrir(i, e.currentTarget)} aria-label={`Ampliar foto ${i + 1} de ${fotos.length}: ${f.alt}`}>
            <img src={f.miniatura} alt="" loading="lazy" decoding="async" width={f.largura ?? undefined} height={f.altura ?? undefined} />
            {f.legenda && <span className={s.legendaItem}>{f.legenda}</span>}
          </button>
        ))}
      </div>

      <dialog
        ref={dialogo}
        className={s.dialogo}
        aria-label="Foto ampliada"
        onClick={(e) => e.target === dialogo.current && dialogo.current?.close()}
        onTouchStart={(e) => (toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          if (!toque.current) return
          const dx = e.changedTouches[0].clientX - toque.current.x
          const dy = e.changedTouches[0].clientY - toque.current.y
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) mostrar(atual + (dx < 0 ? 1 : -1))
          else if (dy > 90) dialogo.current?.close()
        }}
      >
        <figure className={s.figura}>
          <img src={foto.grande} alt={foto.alt} />
          <figcaption className={s.legenda}>
            <span className="mono">
              {atual + 1} / {fotos.length}
            </span>
            {foto.legenda && <span>{foto.legenda}</span>}
            {foto.credito && <span>Foto: {foto.credito}</span>}
          </figcaption>
        </figure>
        <button type="button" className={`${s.controle} ${s.fechar}`} onClick={() => dialogo.current?.close()} aria-label="Fechar">
          ✕
        </button>
        {fotos.length > 1 && (
          <>
            <button type="button" className={`${s.controle} ${s.anterior}`} onClick={() => mostrar(atual - 1)} aria-label="Foto anterior">
              ←
            </button>
            <button type="button" className={`${s.controle} ${s.proxima}`} onClick={() => mostrar(atual + 1)} aria-label="Próxima foto">
              →
            </button>
          </>
        )}
      </dialog>
    </>
  )
}
