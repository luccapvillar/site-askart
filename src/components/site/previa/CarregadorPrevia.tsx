'use client'

/**
 * Carrega a parte da prévia em um pedaço separado: o código (e a biblioteca do Payload) só é baixado
 * quando a prévia está ligada — o site público não carrega nada disto.
 */
import dynamic from 'next/dynamic'

const OuvintePrevia = dynamic(() => import('./OuvintePrevia').then((m) => m.OuvintePrevia), { ssr: false })

export function CarregadorPrevia() {
  return <OuvintePrevia />
}
