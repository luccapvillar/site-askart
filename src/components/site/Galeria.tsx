'use client'

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react'
import s from './Galeria.module.css'

export type FotoGaleria = {
  id: string | number
  /** Versão média (cartão) e as menores, para a grade. */
  miniatura: string
  miniaturaSrcSet?: string | null
  /** Versão grande, para a ampliação. */
  grande: string
  grandeSrcSet?: string | null
  largura?: number | null
  altura?: number | null
  alt: string
  legenda?: string | null
  credito?: string | null
  /** Ponto de foco escolhido no painel ("50% 40%"), para o recorte da miniatura. */
  foco?: string | null
}

type Exibicao = 'grade' | 'mosaico' | 'carrossel'

/** Tamanho que a miniatura ocupa na tela (o navegador escolhe a menor versão que serve). */
const TAMANHOS: Record<Exibicao, string> = {
  grade: '(min-width: 1100px) 300px, (min-width: 720px) 33vw, 50vw',
  mosaico: '(min-width: 1100px) 300px, (min-width: 720px) 33vw, 50vw',
  carrossel: '(min-width: 720px) 420px, 80vw',
}

function Seta({ lado }: { lado: 'esquerda' | 'direita' }) {
  return (
    <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {lado === 'esquerda' ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
    </svg>
  )
}

/**
 * Galeria de fotos: grade com proporção única (sem buracos), "mosaico" (a primeira foto em destaque,
 * as outras em grade) ou carrossel (faixa que rola para o lado). Tocar numa foto abre a ampliação num
 * <dialog>: Esc fecha, as setas do teclado (ou deslizar o dedo) passam as fotos, o foco volta para a foto
 * de onde saiu. Legenda e crédito aparecem embaixo de cada foto e na ampliação.
 */
export function Galeria({ fotos, exibicao = 'grade' }: { fotos: FotoGaleria[]; exibicao?: Exibicao }) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const origem = useRef<HTMLElement | null>(null)
  const toque = useRef<{ x: number; y: number } | null>(null)
  const [atual, setAtual] = useState(0)
  const [aberta, setAberta] = useState(false)
  const id = useId()
  const total = fotos.length

  const ir = useCallback((passo: number) => setAtual((a) => (a + passo + total) % total), [total])

  const abrir = (i: number, el: HTMLElement) => {
    origem.current = el
    setAtual(i)
    setAberta(true)
    dialogo.current?.showModal()
  }

  const fechar = () => dialogo.current?.close()

  // Ao fechar (botão, Esc ou toque fora da foto), o foco volta para a miniatura de onde saiu
  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    const aoFechar = () => {
      setAberta(false)
      origem.current?.focus()
    }
    d.addEventListener('close', aoFechar)
    return () => d.removeEventListener('close', aoFechar)
  }, [])

  // Com a ampliação aberta, a foto anterior e a seguinte já vêm carregadas (passar fica imediato)
  useEffect(() => {
    if (!aberta || total < 2) return
    for (const passo of [1, -1]) {
      const f = fotos[(atual + passo + total) % total]
      const img = new Image()
      if (f.grandeSrcSet) {
        img.sizes = '100vw'
        img.srcset = f.grandeSrcSet
      }
      img.src = f.grande
    }
  }, [aberta, atual, fotos, total])

  if (!total) return null
  const foto = fotos[Math.min(atual, total - 1)]

  const teclado = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      ir(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      ir(-1)
    }
  }

  const inicioToque = (e: TouchEvent) => {
    toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const fimToque = (e: TouchEvent) => {
    if (!toque.current) return
    const dx = e.changedTouches[0].clientX - toque.current.x
    const dy = e.changedTouches[0].clientY - toque.current.y
    toque.current = null
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) ir(dx < 0 ? 1 : -1)
    else if (dy > 90) fechar()
  }

  return (
    <>
      <ul className={`${s.lista} ${s[exibicao]}`}>
        {fotos.map((f, i) => (
          <li key={f.id} className={s.item}>
            <figure className={s.figura}>
              <button type="button" className={s.ampliar} onClick={(e) => abrir(i, e.currentTarget)} aria-haspopup="dialog">
                <span className="visualmente-oculto">
                  Ampliar foto {i + 1} de {total}
                  {f.alt ? ': ' : ''}
                </span>
                <img
                  src={f.miniatura}
                  srcSet={f.miniaturaSrcSet ?? undefined}
                  sizes={f.miniaturaSrcSet ? (exibicao === 'mosaico' && i === 0 ? '(min-width: 1280px) 1200px, 100vw' : TAMANHOS[exibicao]) : undefined}
                  alt={f.alt}
                  loading="lazy"
                  decoding="async"
                  width={f.largura ?? undefined}
                  height={f.altura ?? undefined}
                  style={f.foco ? { objectPosition: f.foco } : undefined}
                />
                <span className={s.lupa} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" focusable="false">
                    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                  </svg>
                </span>
              </button>
              {(f.legenda || f.credito) && (
                <figcaption className={s.legenda}>
                  {f.legenda && <span className={s.legendaTexto}>{f.legenda}</span>}
                  {f.credito && <span className={s.credito}>Foto: {f.credito}</span>}
                </figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogo}
        className={s.dialogo}
        aria-labelledby={`${id}-contador`}
        onKeyDown={teclado}
        onClick={(e) => e.target === e.currentTarget && fechar()}
        onTouchStart={inicioToque}
        onTouchEnd={fimToque}
      >
        <div className={s.barra}>
          <p id={`${id}-contador`} className={s.contador}>
            Foto {atual + 1} de {total}
          </p>
          <button type="button" className={s.controle} onClick={fechar} autoFocus>
            <svg aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
            <span className="visualmente-oculto">Fechar a foto ampliada</span>
          </button>
        </div>
        <figure className={s.palco} onClick={(e) => e.target === e.currentTarget && fechar()}>
          {aberta && (
            <img
              key={foto.id}
              className={s.fotoGrande}
              src={foto.grande}
              srcSet={foto.grandeSrcSet ?? undefined}
              sizes={foto.grandeSrcSet ? '100vw' : undefined}
              alt={foto.alt}
              width={foto.largura ?? undefined}
              height={foto.altura ?? undefined}
            />
          )}
          {(foto.legenda || foto.credito) && (
            <figcaption className={s.legendaGrande}>
              {foto.legenda && <span>{foto.legenda}</span>}
              {foto.credito && <span className={s.creditoGrande}>Foto: {foto.credito}</span>}
            </figcaption>
          )}
        </figure>
        {total > 1 && (
          <>
            <button type="button" className={`${s.controle} ${s.anterior}`} onClick={() => ir(-1)}>
              <Seta lado="esquerda" />
              <span className="visualmente-oculto">Foto anterior</span>
            </button>
            <button type="button" className={`${s.controle} ${s.proxima}`} onClick={() => ir(1)}>
              <Seta lado="direita" />
              <span className="visualmente-oculto">Próxima foto</span>
            </button>
          </>
        )}
        <p className="visualmente-oculto" aria-live="polite">
          {aberta ? `Foto ${atual + 1} de ${total}${foto.alt ? `: ${foto.alt}` : ''}` : ''}
        </p>
      </dialog>
    </>
  )
}
