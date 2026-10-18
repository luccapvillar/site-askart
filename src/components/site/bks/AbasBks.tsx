'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import s from './Bks.module.css'

/**
 * Sub-abas da aba BKS (pedido do cliente: calendário, liderança, "Resultados", história). Calendário,
 * Classificação e Resultados são de cada área (karts profissionais em /bks/…, karts indoor em
 * /bks/indoor/…): dentro da área indoor, as três levam às páginas indoor. História, Fotos e Regulamento
 * são gerais do BKS.
 */
const ABAS = [
  { caminho: '', rotulo: 'Calendário', daArea: true },
  { caminho: '/classificacao', rotulo: 'Classificação', daArea: true },
  { caminho: '/resultados', rotulo: 'Resultados', daArea: true },
  { caminho: '/historia', rotulo: 'História', daArea: false },
  { caminho: '/fotos', rotulo: 'Fotos', daArea: false },
  { caminho: '/regulamento', rotulo: 'Regulamento', daArea: false },
]

const AREA_INDOOR = '/bks/indoor'

export function AbasBks() {
  const atual = usePathname() ?? '/bks'
  const indoor = atual === AREA_INDOOR || atual.startsWith(`${AREA_INDOOR}/`)
  return (
    <nav className={s.abas} aria-label="Seções do BKS">
      <ul className="conteiner">
        {ABAS.map((a) => {
          const href = `${a.daArea && indoor ? AREA_INDOOR : '/bks'}${a.caminho}`
          const ativa =
            a.caminho === '' ? atual === href : atual === href || atual.startsWith(`${href}/`)
          return (
            <li key={a.rotulo}>
              <Link href={href} aria-current={ativa ? 'page' : undefined}>
                {a.rotulo}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
