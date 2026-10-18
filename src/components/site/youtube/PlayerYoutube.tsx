'use client'

import { useEffect, useRef, useState } from 'react'
import s from './Youtube.module.css'

/**
 * Player do YouTube "clique para carregar". Até o clique, nada do YouTube é carregado (nem a miniatura):
 * só um quadro com o botão. No clique entra o player do domínio sem cookies (youtube-nocookie.com) e o
 * foco vai para ele. O link "Abrir no YouTube" funciona sempre, mesmo antes de a página terminar de carregar.
 */
export function PlayerYoutube({
  endereco,
  link,
  titulo,
  chamada,
}: {
  /** Endereço do player (src/lib/site.ts → enderecoDoPlayer). */
  endereco: string
  /** Link original, para abrir no YouTube. */
  link: string
  /** Título do vídeo para o leitor de tela (ex.: "Transmissão da 3ª etapa — Karts indoor"). */
  titulo: string
  /** Texto do botão (ex.: "Assistir ao vivo"). */
  chamada: string
}) {
  const [carregado, setCarregado] = useState(false)
  const quadro = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (carregado) quadro.current?.focus()
  }, [carregado])

  return (
    <div className={s.bloco}>
      <div className={s.player}>
        {carregado ? (
          <iframe
            ref={quadro}
            className={s.quadro}
            src={endereco}
            title={`${titulo} (vídeo do YouTube)`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button type="button" className={s.fachada} onClick={() => setCarregado(true)}>
            <span className={s.play} aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" focusable="false">
                <path d="M8 5.5v13l10.5-6.5z" />
              </svg>
            </span>
            <span className={s.chamada}>{chamada}</span>
            <span className={s.nota}>
              <span className="visualmente-oculto">{titulo}. </span>O vídeo do YouTube só é
              carregado quando você tocar aqui.
            </span>
          </button>
        )}
      </div>
      <a className={s.link} href={link} target="_blank" rel="noopener noreferrer">
        Abrir no YouTube <span aria-hidden="true">↗</span>
        <span className="visualmente-oculto"> ({titulo}; abre em nova aba)</span>
      </a>
    </div>
  )
}
