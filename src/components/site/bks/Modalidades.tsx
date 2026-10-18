/**
 * Divisão da aba BKS em "Karts profissionais" e "Karts indoor" (pedido do cliente). A modalidade é da
 * categoria; cada área reaproveita o calendário, a classificação e os resultados com o filtro dela.
 * Componentes de servidor: nenhum JavaScript vai para o visitante.
 */
import Link from 'next/link'
import {
  caminhoDaArea,
  MODALIDADES,
  ROTULO_MODALIDADE,
  type Modalidade,
  type SecaoArea,
} from '@/lib/site'
import type { Categoria } from '@/payload-types'
import { EstadoVazio } from '../EstadoVazio'
import { semDemo, TextoDemo } from '../TextoDemo'
import s from './Bks.module.css'

/**
 * Controle segmentado "Karts profissionais | Karts indoor": links de verdade para a mesma seção na outra
 * área. A área atual tem aria-current e um ícone de confirmação (não depende só da cor).
 */
export function SeletorModalidade({ atual, secao }: { atual: Modalidade; secao: SecaoArea }) {
  return (
    <nav className={s.modalidades} aria-label="Karts profissionais ou karts indoor">
      <ul>
        {MODALIDADES.map((m) => (
          <li key={m}>
            <Link href={caminhoDaArea(m, secao)} aria-current={m === atual ? 'page' : undefined}>
              {m === atual && (
                <svg
                  aria-hidden="true"
                  focusable="false"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
              {ROTULO_MODALIDADE[m]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Cabeçalho de uma seção da área: o nome da modalidade acima do título. */
export function CabecalhoArea({
  id,
  modalidade,
  titulo,
  introducao,
}: {
  id: string
  modalidade: Modalidade
  titulo: string
  introducao?: string | null
}) {
  return (
    <div className={s.cabecalhoSecao}>
      <p className={`rotulo ${s.rotuloArea}`}>{ROTULO_MODALIDADE[modalidade]}</p>
      <h2 id={id} className="titulo-marca h2">
        {titulo}
      </h2>
      {introducao && <p className="texto-2">{introducao}</p>}
    </div>
  )
}

const VAZIO_CATEGORIAS: Record<Modalidade, string> = {
  profissional: 'As categorias dos karts profissionais desta temporada ainda não foram divulgadas.',
  indoor: 'As categorias dos karts indoor ainda não foram divulgadas.',
}

/** Categorias da área, com as subcategorias como etiquetas (só o nome, como o cliente informou). */
export function CategoriasDaArea({
  categorias,
  modalidade,
}: {
  categorias: Pick<Categoria, 'id' | 'nome' | 'cor' | 'subcategorias'>[]
  modalidade: Modalidade
}) {
  return (
    <section className={s.categoriasArea} aria-labelledby={`categorias-${modalidade}`}>
      <h3 id={`categorias-${modalidade}`} className={`h3 ${s.subtitulo}`}>
        Categorias
      </h3>
      {!categorias.length ? (
        <EstadoVazio texto={VAZIO_CATEGORIAS[modalidade]} />
      ) : (
        <ul className={s.listaCategorias}>
          {categorias.map((c) => {
            const subs = (c.subcategorias ?? [])
              .map((sub) => sub?.nome?.trim())
              .filter((n): n is string => Boolean(n))
            return (
              <li key={c.id}>
                <span className={s.nomeCategoria}>
                  <span
                    className={s.corCategoria}
                    style={{ background: c.cor ?? 'var(--camp-p)' }}
                    aria-hidden="true"
                  />
                  <TextoDemo texto={c.nome} />
                </span>
                {subs.length > 0 && (
                  <ul
                    className={s.subcategorias}
                    aria-label={`Subcategorias de ${semDemo(c.nome)}`}
                  >
                    {subs.map((sub) => (
                      <li key={sub}>{sub}</li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
