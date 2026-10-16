import Link from 'next/link'
import type { Categoria, Corrida, Etapa } from '@/payload-types'
import { formatarDataExtenso, formatarHora } from '@/lib/datas'
import { dataDaEtapa } from '@/lib/site'
import { Selo, STATUS_ETAPA } from '../Selo'
import { semDemo, TextoDemo } from '../TextoDemo'
import s from './Bks.module.css'

/** Botão da IZY Pass. Sem link cadastrado, avisa que o link será publicado (nunca um link inventado). */
export function BotaoIzy({ href, texto = 'Comprar na IZY Pass', claro = false }: { href: string | null; texto?: string | null; claro?: boolean }) {
  if (!href) {
    return (
      <span className={`${s.izy} ${s.izyInativo} ${claro ? s.izyClaro : ''}`}>
        IZY Pass <small>link em breve</small>
      </span>
    )
  }
  return (
    <a className={`${s.izy} ${claro ? s.izyClaro : ''}`} href={href} target="_blank" rel="noopener noreferrer">
      {texto || 'Comprar na IZY Pass'} <span aria-hidden="true">↗</span>
      <span className="visualmente-oculto"> (abre o site da IZY Pass em nova aba)</span>
    </a>
  )
}

export function LinkMapa({ href, rotulo = 'Ver no mapa' }: { href: string | null; rotulo?: string }) {
  if (!href) return null
  return (
    <a className={s.mapa} href={href} target="_blank" rel="noopener noreferrer">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
      {rotulo}
      <span className="visualmente-oculto"> (abre o mapa em nova aba)</span>
    </a>
  )
}

/** Selo do status. Etapa cuja data já passou (ainda sem resultado oficial) aparece como "Já aconteceu". */
export function SeloEtapa({ status, jaOcorreu = false }: { status: string; jaOcorreu?: boolean }) {
  if (jaOcorreu && status !== 'realizada' && status !== 'cancelada') return <Selo tom="neutro">Já aconteceu</Selo>
  const [rotulo, tom] = STATUS_ETAPA[status] ?? [status, 'neutro']
  return <Selo tom={tom}>{rotulo}</Selo>
}

/** Bloco de data do calendário (dia, mês, dia da semana). */
export function DataEtapa({ etapa, grande = false }: { etapa: Pick<Etapa, 'inicio'>; grande?: boolean }) {
  const d = dataDaEtapa(etapa)
  if (!d) return <span className={`${s.data} ${grande ? s.dataGrande : ''}`}>A definir</span>
  return (
    <span className={`${s.data} ${grande ? s.dataGrande : ''}`}>
      <span className={s.dia}>{d.dia}</span>
      <span className={s.mes}>{d.mes}</span>
      <span className={s.semana}>{d.semana}</span>
    </span>
  )
}

export const nomeDaEtapa = (etapa: Pick<Etapa, 'nome' | 'numero'>) => etapa.nome || `${etapa.numero}ª etapa`

export const dataPorExtenso = (etapa: Pick<Etapa, 'inicio'>) => (etapa.inicio ? formatarDataExtenso(etapa.inicio) : 'Data a definir')

type GrupoCategoria = { categoria: string; cor: string | null; corridas: { nome: string; hora: string | null }[] }

/** Corridas de uma etapa agrupadas por categoria, na ordem do primeiro horário. */
export function agruparProgramacao(corridas: Corrida[]): GrupoCategoria[] {
  const grupos = new Map<string, GrupoCategoria & { primeiro: number }>()
  for (const c of corridas) {
    const cats = (c.categorias ?? []).filter((x): x is Categoria => typeof x === 'object')
    const nome = cats.map((x) => semDemo(x.nome)).join(' + ') || 'Todas as categorias'
    const g = grupos.get(nome) ?? { categoria: nome, cor: cats[0]?.cor ?? null, corridas: [], primeiro: Infinity }
    const t = c.inicio ? new Date(c.inicio).getTime() : Infinity
    g.primeiro = Math.min(g.primeiro, t)
    g.corridas.push({ nome: c.nome, hora: c.inicio ? formatarHora(c.inicio) : null })
    grupos.set(nome, g)
  }
  return [...grupos.values()].sort((a, b) => a.primeiro - b.primeiro)
}

/** Programação da etapa: horário de cada categoria (o que o cliente pediu ao clicar na data). */
export function Programacao({ corridas, vazio = 'A programação desta etapa ainda não foi publicada.' }: { corridas: Corrida[]; vazio?: string }) {
  const grupos = agruparProgramacao(corridas)
  if (!grupos.length) return <p className="texto-2">{vazio}</p>
  return (
    <table className={s.programacao}>
      <caption className="visualmente-oculto">Horários por categoria</caption>
      <thead>
        <tr>
          <th scope="col">Categoria</th>
          <th scope="col">Programação</th>
        </tr>
      </thead>
      <tbody>
        {grupos.map((g) => (
          <tr key={g.categoria}>
            <th scope="row">
              <span className={s.corCategoria} style={{ background: g.cor ?? 'var(--marca-primaria)' }} aria-hidden="true" />
              {g.categoria}
            </th>
            <td>
              <ul className={s.horarios}>
                {g.corridas.map((c, i) => (
                  <li key={i}>
                    <span className="mono">{c.hora ?? '—'}</span> {c.nome}
                  </li>
                ))}
              </ul>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function LinkEtapa({ etapa, children }: { etapa: Pick<Etapa, 'id'>; children?: React.ReactNode }) {
  return (
    <Link className={s.linkSeta} href={`/etapas/${etapa.id}`}>
      {children ?? 'Página da etapa'} <span aria-hidden="true">→</span>
    </Link>
  )
}

export function NomeEtapa({ etapa }: { etapa: Pick<Etapa, 'nome' | 'numero'> }) {
  return <TextoDemo texto={nomeDaEtapa(etapa)} />
}
