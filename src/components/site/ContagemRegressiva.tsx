'use client'

import { useEffect, useState } from 'react'
import s from './ContagemRegressiva.module.css'

const PARTES = [
  ['dias', 'dia', 86400],
  ['horas', 'hora', 3600],
  ['minutos', 'minuto', 60],
] as const

/** Dias, horas e minutos que faltam (sem segundos: nada piscando na tela). */
function dividir(segundos: number) {
  let resto = Math.max(0, segundos)
  return PARTES.map(([plural, singular, seg]) => {
    const v = Math.floor(resto / seg)
    resto -= v * seg
    return { plural, singular, valor: v }
  })
}

/** "Faltam 20 dias, 11 horas e 40 minutos" (o que o leitor de tela ouve). */
function frase(segundos: number) {
  const partes = dividir(segundos).map((p) => `${p.valor} ${p.valor === 1 ? p.singular : p.plural}`)
  return `Faltam ${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`
}

type Props = {
  /** Início da etapa (ISO). */
  alvo: string
  /** Data por extenso, lida pelo leitor de tela e mostrada quando a etapa começa. */
  textoAlternativo: string
  /**
   * Segundos que faltavam quando a página foi gerada no servidor. O HTML já sai com os números (sem salto
   * de layout e sem depender de JavaScript); no navegador eles são corrigidos e atualizados a cada 30 s.
   */
  inicial?: number | null
  /** Sobre fundo claro (cartão branco). */
  claro?: boolean
}

/**
 * Contagem regressiva para a próxima etapa, em dias, horas e minutos. É o único JavaScript da página inicial.
 * Os números não são anunciados a cada mudança (aria-live desligado): a frase completa fica no rótulo.
 */
export function ContagemRegressiva({ alvo, textoAlternativo, inicial = null, claro = false }: Props) {
  const [restante, setRestante] = useState<number | null>(inicial)

  useEffect(() => {
    const fim = new Date(alvo).getTime()
    if (!Number.isFinite(fim)) return
    const tick = () => setRestante(Math.max(0, Math.floor((fim - Date.now()) / 1000)))
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [alvo])

  const classe = `${s.contagem} ${claro ? s.claro : ''}`

  if (restante === null) return <p className={`${s.agora} ${claro ? s.claro : ''}`}>{textoAlternativo}</p>
  if (restante === 0)
    return (
      <p className={`${s.agora} ${claro ? s.claro : ''}`}>
        <span className={s.pulso} aria-hidden="true" />A etapa começou. Confira a programação.
      </p>
    )

  return (
    <div className={classe} role="group" aria-label={`${frase(restante)} para a etapa (${textoAlternativo})`}>
      {dividir(restante).map((p) => (
        <div key={p.plural} className={s.bloco} aria-hidden="true">
          <span className={s.valor}>{String(p.valor).padStart(2, '0')}</span>
          <span className={s.rotulo}>{p.valor === 1 ? p.singular : p.plural}</span>
        </div>
      ))}
    </div>
  )
}
