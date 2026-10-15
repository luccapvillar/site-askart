'use client'

import { useEffect, useState } from 'react'
import s from './ContagemRegressiva.module.css'

const PARTES = [
  ['dias', 86400],
  ['horas', 3600],
  ['min', 60],
  ['seg', 1],
] as const

/**
 * Contagem regressiva para a próxima etapa. Calculada no navegador (o cache das páginas não a congela).
 * Sem JS, mostra o texto alternativo (data por extenso), que vem do servidor.
 */
export function ContagemRegressiva({ alvo, textoAlternativo, claro = false }: { alvo: string; textoAlternativo: string; claro?: boolean }) {
  const [restante, setRestante] = useState<number | null>(null)

  useEffect(() => {
    const fim = new Date(alvo).getTime()
    const tick = () => setRestante(Math.max(0, Math.floor((fim - Date.now()) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [alvo])

  if (restante === null) return <p className={`${s.agora} ${claro ? s.claro : ''}`}>{textoAlternativo}</p>
  if (restante === 0) return <p className={`${s.agora} ${claro ? s.claro : ''}`}>É hoje! Acompanhe a programação.</p>

  let resto = restante
  const valores = PARTES.map(([nome, seg]) => {
    const v = Math.floor(resto / seg)
    resto -= v * seg
    return [nome, v] as const
  })

  return (
    <div className={`${s.contagem} ${claro ? s.claro : ''}`} role="timer" aria-label={`Faltam ${valores[0][1]} dias e ${valores[1][1]} horas`}>
      {valores.map(([nome, v]) => (
        <div key={nome} className={s.bloco}>
          <span className={s.valor} aria-hidden="true">
            {String(v).padStart(2, '0')}
          </span>
          <span className={s.rotulo} aria-hidden="true">
            {nome}
          </span>
        </div>
      ))}
    </div>
  )
}
