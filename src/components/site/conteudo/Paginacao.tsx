import Link from 'next/link'
import s from './Conteudo.module.css'

/** Números de página que aparecem: todos até 7; depois, a primeira, a última e as vizinhas da atual. */
function paginasVisiveis(atual: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const meio = [atual - 1, atual, atual + 1].filter((n) => n > 1 && n < total)
  const lista: (number | null)[] = [1]
  if (meio[0] > 2) lista.push(null)
  lista.push(...meio)
  if (meio[meio.length - 1] < total - 1) lista.push(null)
  lista.push(total)
  return lista
}

/**
 * Paginação acessível: "Anterior", números e "Próxima", com a página atual marcada (aria-current)
 * e alvos de toque de 44 px. `base` é o endereço da lista (a página 1 não leva ?pagina=).
 */
export function Paginacao({ pagina, total, base, rotulo }: { pagina: number; total: number; base: string; rotulo: string }) {
  if (total <= 1) return null
  const href = (n: number) => (n <= 1 ? base : `${base}?pagina=${n}`)
  return (
    <nav className={s.paginacao} aria-label={rotulo}>
      {pagina > 1 ? (
        <Link className={s.paginaSeta} href={href(pagina - 1)} rel="prev">
          <span aria-hidden="true">←</span> Anterior
        </Link>
      ) : (
        <span className={`${s.paginaSeta} ${s.paginaInativa}`} aria-hidden="true">
          ← Anterior
        </span>
      )}
      <ol className={s.paginaNumeros}>
        {paginasVisiveis(pagina, total).map((n, i) =>
          n === null ? (
            <li key={`r${i}`} aria-hidden="true" className={s.reticencias}>
              …
            </li>
          ) : (
            <li key={n}>
              {n === pagina ? (
                <span className={s.paginaAtual} aria-current="page">
                  <span className="visualmente-oculto">Página </span>
                  {n}
                </span>
              ) : (
                <Link className={s.paginaNumero} href={href(n)}>
                  <span className="visualmente-oculto">Página </span>
                  {n}
                </Link>
              )}
            </li>
          ),
        )}
      </ol>
      {pagina < total ? (
        <Link className={s.paginaSeta} href={href(pagina + 1)} rel="next">
          Próxima <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span className={`${s.paginaSeta} ${s.paginaInativa}`} aria-hidden="true">
          Próxima →
        </span>
      )}
    </nav>
  )
}
