/**
 * Galerias de fotos em cartões (sub-aba Fotos do BKS): capa, título, data/etapa e quantidade de fotos.
 * A primeira (a mais recente) vem em destaque, com miniaturas das fotos seguintes; as outras, em grade.
 * Componente de servidor: o cartão inteiro é clicável pelo link do título.
 */
import Link from 'next/link'
import { formatarData } from '@/lib/datas'
import { fotosDaGaleria } from '@/lib/galeria'
import { comoDoc } from '@/lib/publico'
import type { Etapa, Galeria, Midia, Temporada } from '@/payload-types'
import { Foto } from '../Foto'
import { semDemo, TextoDemo } from '../TextoDemo'
import { capaDaGaleria } from './fotos'
import s from './Bks.module.css'

const TIPO: Record<string, string> = { etapa: 'Etapa', treino: 'Treino', evento: 'Evento', kartodromo: 'Kartódromo', institucional: 'Institucional' }

/** Rótulo, data e quantidade de uma galeria (o que o cartão mostra além do título). */
export function infoDaGaleria(g: Galeria) {
  const etapa = comoDoc<Etapa>(g.etapa)
  const temporada = comoDoc<Temporada>(g.temporada)
  const total = fotosDaGaleria(g).length
  const rotulo = etapa ? semDemo(etapa.nome) || `${etapa.numero}ª etapa` : (g.tipo && TIPO[g.tipo]) || null
  const data = g.data ? formatarData(g.data) : null
  return {
    rotulo: rotulo && temporada?.ano && etapa ? `${rotulo} · ${temporada.ano}` : rotulo,
    data,
    total,
    quantidade: `${total} ${total === 1 ? 'foto' : 'fotos'}`,
  }
}

function IconeFotos() {
  return (
    <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4 17 5-4.5 3.5 3 3-2.5L20 17" />
    </svg>
  )
}

function CartaoGaleria({ galeria, destaque = false }: { galeria: Galeria; destaque?: boolean }) {
  const capa = capaDaGaleria(galeria)
  const info = infoDaGaleria(galeria)
  const miniaturas = destaque
    ? (galeria.fotos ?? [])
        .map((f) => comoDoc<Midia>(f))
        .filter((f): f is Midia => Boolean(f?.url) && f?.id !== capa?.id && !String(f?.mimeType ?? '').startsWith('video/'))
        .slice(0, 3)
    : []
  return (
    <article className={`${s.galeria} ${destaque ? s.galeriaDestaque : ''}`}>
      <div className={s.galeriaMidia}>
        {capa ? (
          <Foto
            midia={capa}
            ate={destaque ? 'destaque' : 'card'}
            sizes={destaque ? '(min-width: 1040px) 760px, 100vw' : '(min-width: 1040px) 400px, (min-width: 720px) 50vw, 100vw'}
            alt=""
          />
        ) : (
          <span className={s.galeriaSemCapa} aria-hidden="true">
            <IconeFotos />
          </span>
        )}
        <span className={s.galeriaQuantidade}>
          <IconeFotos />
          {info.quantidade}
        </span>
      </div>
      <div className={s.galeriaCorpo}>
        {info.rotulo && <p className={`rotulo ${s.galeriaRotulo}`}>{info.rotulo}</p>}
        <h3 className={`h3 ${s.galeriaTitulo}`}>
          <Link href={`/galeria/${galeria.slug}`}>
            <TextoDemo texto={galeria.titulo} />
            <span className="visualmente-oculto">, {info.quantidade}</span>
          </Link>
        </h3>
        {info.data && <p className={s.galeriaData}>{info.data}</p>}
        {destaque && galeria.descricao && <p className={s.galeriaDescricao}>{semDemo(galeria.descricao)}</p>}
        {miniaturas.length > 0 && (
          <ul className={s.galeriaMiniaturas} aria-hidden="true">
            {miniaturas.map((m) => (
              <li key={m.id}>
                <Foto midia={m} ate="miniatura" sizes="120px" alt="" />
              </li>
            ))}
          </ul>
        )}
        <span className={s.galeriaAcao} aria-hidden="true">
          Ver as fotos <span className={s.galeriaSeta}>→</span>
        </span>
      </div>
    </article>
  )
}

export function GradeGalerias({ galerias }: { galerias: Galeria[] }) {
  const [primeira, ...outras] = galerias
  if (!primeira) return null
  return (
    <div className={s.galerias}>
      <CartaoGaleria galeria={primeira} destaque />
      {outras.length > 0 && (
        <ul className={s.gradeGalerias}>
          {outras.map((g) => (
            <li key={g.id}>
              <CartaoGaleria galeria={g} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
