'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import s from './Bks.module.css'

const ABAS = [
  { href: '/bks', rotulo: 'Calendário' },
  { href: '/bks/classificacao', rotulo: 'Classificação' },
  { href: '/bks/resultados', rotulo: 'Resultados' },
  { href: '/bks/historia', rotulo: 'História' },
  { href: '/bks/fotos', rotulo: 'Fotos' },
  { href: '/bks/regulamento', rotulo: 'Regulamento' },
]

/** Sub-abas da aba BKS (pedido do cliente: calendário, liderança, "Resultados", história). */
export function AbasBks() {
  const caminho = usePathname() ?? '/bks'
  return (
    <nav className={s.abas} aria-label="Seções do BKS">
      <ul className="conteiner">
        {ABAS.map((a) => {
          const atual = a.href === '/bks' ? caminho === '/bks' : caminho.startsWith(a.href)
          return (
            <li key={a.href}>
              <Link href={a.href} aria-current={atual ? 'page' : undefined}>
                {a.rotulo}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
