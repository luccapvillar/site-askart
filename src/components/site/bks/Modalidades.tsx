/**
 * Peças das duas áreas do BKS ("Karts profissionais" e "Karts indoor"): o cabeçalho de cada seção e as
 * categorias com as subcategorias. A modalidade é da categoria; cada área reaproveita o calendário, a
 * classificação e os resultados com o filtro dela. Componentes de servidor (sem JavaScript no navegador).
 */
import type { CSSProperties, ReactNode } from 'react'
import { ROTULO_MODALIDADE, type Modalidade } from '@/lib/site'
import type { Categoria } from '@/payload-types'
import { Subcategorias } from '../base/Subcategorias'
import { EstadoVazio } from '../EstadoVazio'
import { semDemo, TextoDemo } from '../TextoDemo'
import s from './Bks.module.css'

/** Cabeçalho de uma seção do BKS: a área (ou "BKS") acima do título, a introdução e uma ação opcional. */
export function CabecalhoArea({
  id,
  modalidade,
  rotulo,
  titulo,
  introducao,
  acao,
}: {
  id: string
  modalidade?: Modalidade
  /** Sobretítulo quando a seção não é de uma área (ex.: "Brasília Kart Series"). */
  rotulo?: string
  titulo: ReactNode
  introducao?: ReactNode
  acao?: ReactNode
}) {
  return (
    <div className={s.cabecalhoSecao}>
      <div className={s.cabecalhoTextos}>
        <p className={`rotulo ${s.rotuloArea}`}>
          <span className={s.rotuloMarca} aria-hidden="true" />
          {modalidade ? ROTULO_MODALIDADE[modalidade] : (rotulo ?? 'Brasília Kart Series')}
        </p>
        <h2 id={id} className="titulo-marca h2">
          {titulo}
        </h2>
        {introducao && <p className={`lead ${s.introducao}`}>{introducao}</p>}
      </div>
      {acao && <div className={s.cabecalhoAcao}>{acao}</div>}
    </div>
  )
}

const VAZIO_CATEGORIAS: Record<Modalidade, string> = {
  profissional: 'As categorias dos karts profissionais desta temporada ainda não foram divulgadas.',
  indoor: 'As categorias dos karts indoor ainda não foram divulgadas.',
}

/** Categorias da área em cartões, com as subcategorias (só o nome, como o cliente informou). */
export function CategoriasDaArea({
  categorias,
  modalidade,
}: {
  categorias: Pick<Categoria, 'id' | 'nome' | 'cor' | 'subcategorias'>[]
  modalidade: Modalidade
}) {
  return (
    <section className={s.blocoSecao} aria-labelledby={`categorias-${modalidade}`}>
      <div className={s.subcabecalho}>
        <h3 id={`categorias-${modalidade}`} className="titulo-marca h3">
          Categorias
        </h3>
        {categorias.some((c) => c.subcategorias?.length) && <p className="texto-2">Cada categoria com as suas subcategorias.</p>}
      </div>
      {!categorias.length ? (
        <EstadoVazio texto={VAZIO_CATEGORIAS[modalidade]} />
      ) : (
        <ul className={s.categorias}>
          {categorias.map((c) => (
            <li key={c.id} className={s.cartaoCategoria} style={{ '--cor-categoria': c.cor ?? 'var(--verde)' } as CSSProperties}>
              <h4 className={s.nomeCategoria}>
                <TextoDemo texto={c.nome} />
              </h4>
              <Subcategorias itens={c.subcategorias} rotulo={`Subcategorias de ${semDemo(c.nome)}`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
