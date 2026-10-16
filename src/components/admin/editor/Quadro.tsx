'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { limparCaminho, urlPrevia } from './paginas'
import e from './Editor.module.css'

export type Tela = 'celular' | 'computador'

type PropsQuadro = {
  /** Página que o quadro abre. */
  rota: string
  /** Trocar a versão recarrega o quadro do zero. */
  versao?: number
  tela: Tela
  titulo: string
  /** Altura do quadro (CSS). */
  altura?: string
  quadroRef?: RefObject<HTMLIFrameElement | null>
  /** O site mostrado no quadro avisa a cada página aberta. */
  aoMudarRota?: (rota: string) => void
}

/** Manda o site do quadro buscar de novo o que está salvo, sem recarregar a página inteira. */
export function recarregarQuadro(quadro: HTMLIFrameElement | null | undefined) {
  quadro?.contentWindow?.postMessage({ tipo: 'askart:recarregar' }, window.location.origin)
}

/** O próprio site, aberto em modo de pré-visualização dentro do painel. */
export function QuadroPrevia({ rota, versao = 0, tela, titulo, altura, quadroRef, aoMudarRota }: PropsQuadro) {
  const interno = useRef<HTMLIFrameElement>(null)
  const ref = quadroRef ?? interno
  const chave = `${rota}#${versao}`
  const [pronto, setPronto] = useState<string | null>(null)
  const carregando = pronto !== chave
  const atual = useRef({ chave, aoMudarRota })
  useEffect(() => {
    atual.current = { chave, aoMudarRota }
  })

  useEffect(() => {
    const ouvir = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin || ev.source !== ref.current?.contentWindow) return
      const dados = ev.data as { tipo?: string; caminho?: unknown } | null
      if (dados?.tipo !== 'askart:rota') return
      const caminho = limparCaminho(dados.caminho)
      if (caminho) atual.current.aoMudarRota?.(caminho)
      setPronto(atual.current.chave)
    }
    // Voltou de outra aba (onde editou à mão): mostra o que foi salvo lá
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') recarregarQuadro(ref.current)
    }
    window.addEventListener('message', ouvir)
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      window.removeEventListener('message', ouvir)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [ref])

  return (
    <div className={`${e.moldura} ${tela === 'celular' ? e.celular : ''}`} style={altura ? { height: altura } : undefined} aria-busy={carregando}>
      <iframe key={chave} ref={ref} src={urlPrevia(rota)} title={titulo} className={e.quadro} onLoad={() => setPronto(chave)} />
      {carregando && (
        <p className={e.carregando} aria-hidden="true">
          Carregando a página…
        </p>
      )}
    </div>
  )
}

/** Alternância Celular / Computador da pré-visualização. */
export function AlternarTela({ valor, aoMudar }: { valor: Tela; aoMudar: (t: Tela) => void }) {
  return (
    <div className={e.alternar} role="group" aria-label="Tamanho da tela">
      {(
        [
          ['celular', 'Celular'],
          ['computador', 'Computador'],
        ] as const
      ).map(([t, rotulo]) => (
        <button key={t} type="button" aria-pressed={valor === t} onClick={() => aoMudar(t)}>
          {rotulo}
        </button>
      ))}
    </div>
  )
}
