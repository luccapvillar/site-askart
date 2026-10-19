import type { ReactNode } from 'react'
import s from './Base.module.css'

type Tom = 'neutro' | 'marca'

/**
 * Lista de etiquetas pequenas (subcategorias, categorias de uma etapa, filtros informativos).
 * É uma lista de verdade (<ul>) com nome acessível; não renderiza nada se estiver vazia.
 */
export function Etiquetas({ itens, rotulo, tom = 'neutro', className }: { itens: ReactNode[]; rotulo: string; tom?: Tom; className?: string }) {
  if (!itens.length) return null
  return (
    <ul className={[s.etiquetas, tom === 'marca' ? s.etiquetasMarca : '', className].filter(Boolean).join(' ')} aria-label={rotulo}>
      {itens.map((item, i) => (
        <li key={i} className={s.etiqueta}>
          {item}
        </li>
      ))}
    </ul>
  )
}
