import { TextoDemo } from '../TextoDemo'
import { Etiquetas } from './Etiquetas'
import s from './Base.module.css'

type Props = {
  itens?: { nome?: string | null }[] | null
  /** Mostra a palavra "Subcategorias" antes das etiquetas (útil quando a categoria não está logo acima). */
  titulo?: boolean
  /** Nome acessível da lista. */
  rotulo?: string
}

/**
 * Subcategorias de uma categoria: só o nome de cada uma, em etiquetas pequenas.
 * Ex.: F400 → Novatos, Junior, Graduados, Sênior, GSS/60+. Cadete e Mirim não têm: nada é exibido.
 */
export function Subcategorias({ itens, titulo = false, rotulo = 'Subcategorias' }: Props) {
  const nomes = (itens ?? []).map((i) => i?.nome?.trim()).filter((n): n is string => Boolean(n))
  if (!nomes.length) return null
  const lista = <Etiquetas rotulo={rotulo} itens={nomes.map((n) => <TextoDemo key={n} texto={n} />)} />
  if (!titulo) return lista
  return (
    <div className={s.subcategorias}>
      <span className={s.subcategoriasTitulo} aria-hidden="true">
        {rotulo}
      </span>
      {lista}
    </div>
  )
}
