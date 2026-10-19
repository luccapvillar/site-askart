import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Categoria, Corrida, Etapa } from '@/payload-types'
import { formatarDataExtenso } from '@/lib/datas'
import { dataDaEtapa } from '@/lib/site'
import { chaveDeSubcategoria } from '@/lib/subcategorias'
import { Subcategorias } from '../base/Subcategorias'
import { Botao } from '../Botao'
import { Selo, STATUS_ETAPA } from '../Selo'
import { semDemo, TextoDemo } from '../TextoDemo'
import { agruparProgramacao, horariosPorEscolha, type MapaSubcategorias, type SessaoProgramada } from './programacao'
import s from './Bks.module.css'

/**
 * Botão da IZY Pass (treinos livres e corridas de cada etapa). Sem link cadastrado no painel, mostra que o
 * link ainda não foi divulgado (nunca um link inventado).
 */
export function BotaoIzy({ href, texto = 'Comprar na IZY Pass', claro = false }: { href: string | null; texto?: string | null; claro?: boolean }) {
  if (!href) {
    return (
      <p className={`${s.izyInativo} ${claro ? s.izyInativoClaro : ''}`}>
        <span className={s.izyMarca}>IZY Pass</span>
        <span>O link de compra ainda não foi divulgado.</span>
      </p>
    )
  }
  return (
    <Botao href={href} externo variante={claro ? 'destaque' : 'primario'} seta grande>
      {texto || 'Comprar na IZY Pass'}
      <span className="visualmente-oculto"> (site da IZY Pass)</span>
    </Botao>
  )
}

/** "Como chegar": link do mapa da etapa (ou do kartódromo). Sem link, nada. */
export function LinkMapa({ href, rotulo = 'Ver no mapa', claro = false }: { href: string | null; rotulo?: string; claro?: boolean }) {
  if (!href) return null
  return (
    <a className={`${s.mapa} ${claro ? s.mapaClaro : ''}`} href={href} target="_blank" rel="noopener noreferrer">
      <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
      <span>{rotulo}</span>
      <span aria-hidden="true">↗</span>
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

/** Bloco de data do calendário (dia, mês, dia da semana). Decorativo: a data por extenso vem ao lado. */
export function DataEtapa({ etapa, grande = false, apagada = false }: { etapa: Pick<Etapa, 'inicio'>; grande?: boolean; apagada?: boolean }) {
  const d = dataDaEtapa(etapa)
  const classe = [s.data, grande && s.dataGrande, apagada && s.dataApagada].filter(Boolean).join(' ')
  if (!d)
    return (
      <span className={classe} aria-hidden="true">
        <span className={s.dataIndefinida}>A definir</span>
      </span>
    )
  return (
    <span className={classe} aria-hidden="true">
      <span className={s.dia}>{d.dia}</span>
      <span className={s.mes}>{d.mes}</span>
      <span className={s.semana}>{d.semana}</span>
    </span>
  )
}

export const nomeDaEtapa = (etapa: Pick<Etapa, 'nome' | 'numero'>) => etapa.nome || `${etapa.numero}ª etapa`

export const dataPorExtenso = (etapa: Pick<Etapa, 'inicio'>) => (etapa.inicio ? formatarDataExtenso(etapa.inicio) : 'Data a definir')

export {
  agruparProgramacao,
  chaveDaCategoria,
  horariosPorEscolha,
  opcoesDeSubcategoria,
  type GrupoCategoria,
  type GrupoOpcoes,
  type MapaSubcategorias,
} from './programacao'

export const mapaDeSubcategorias = (categorias: unknown[] | null | undefined): MapaSubcategorias =>
  new Map(
    (categorias ?? [])
      .filter((c): c is Pick<Categoria, 'id' | 'subcategorias'> => typeof c === 'object' && c !== null && 'id' in c)
      .map((c) => [String(c.id), c.subcategorias]),
  )

/** Hora da sessão; sem horário cadastrado, um traço (o leitor de tela ouve "horário a definir"). */
function Hora({ hora }: { hora: string | null }) {
  return (
    <span className={s.progHora}>
      {hora ?? (
        <>
          <span aria-hidden="true">—</span>
          <span className="visualmente-oculto">Horário a definir</span>
        </>
      )}
    </span>
  )
}

/** Lista de horários (hora e rótulo claro da sessão: Warm-up, Classificação, Corrida 1…). */
function Horarios({ sessoes, rotulo }: { sessoes: (SessaoProgramada & { juntoCom?: string | null })[]; rotulo: string }) {
  return (
    <ul className={s.progHorarios} aria-label={rotulo}>
      {sessoes.map((c, i) => {
        const notas = [c.nota, c.juntoCom ? `junto com ${c.juntoCom}` : null].filter(Boolean)
        return (
          <li key={i} data-sessao={c.tipo}>
            <Hora hora={c.hora} />
            <span>
              {c.rotulo}
              {notas.length > 0 && <span className={s.progNota}> · {notas.join(' · ')}</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Programação da etapa: o horário de cada categoria (o que o cliente pediu ao tocar na data), com as
 * subcategorias junto do nome da categoria. Quando cada subcategoria tem o seu horário (sessões marcadas no
 * painel), os horários saem separados: "Todas as subcategorias" e depois cada uma, na ordem da categoria.
 * Listas (não tabela) para ler bem no celular.
 *
 * Para o seletor "Escolha a subcategoria" (SeletorSubcategoria), o HTML já traz, escondidos, os horários de
 * cada subcategoria em ordem (Warm-up, Classificação, Corrida 1, Corrida 2…), com data-escolha, e um aviso
 * vazio (data-aviso) para quando a etapa não tem horários da escolha. `categoriasDaEtapa` (chaves) diz quais
 * categorias correm a etapa, para o aviso "não corre nesta etapa"; sem a lista, o aviso é o de horários
 * ainda não divulgados. Sem JavaScript, só a programação agrupada aparece.
 */
export function Programacao({
  corridas,
  vazio = 'A programação desta etapa ainda não foi publicada.',
  subcategorias,
  categoriasDaEtapa,
}: {
  corridas: Corrida[]
  vazio?: string
  subcategorias?: MapaSubcategorias
  categoriasDaEtapa?: string[] | null
}) {
  const grupos = agruparProgramacao(corridas, subcategorias)
  const escolhas = horariosPorEscolha(corridas, subcategorias)
  return (
    <div className={s.progArea} data-programacao="" data-categorias={categoriasDaEtapa ? categoriasDaEtapa.join(' ') : undefined}>
      {!grupos.length ? (
        <p className={s.semProgramacao} data-visao="geral">
          {vazio}
        </p>
      ) : (
        <ul className={s.programacao} aria-label="Horários por categoria" data-visao="geral">
          {grupos.map((g) => {
            const subs = g.ids.length === 1 ? subcategorias?.get(g.ids[0]) : null
            return (
              <li key={g.categoria} className={s.progItem} data-categoria={g.chaves.join(' ') || undefined}>
                <div className={s.progCategoria}>
                  <span className={s.progNome}>
                    <span className={s.corCategoria} style={{ background: g.cor ?? 'var(--verde)' }} aria-hidden="true" />
                    {g.categoria}
                  </span>
                  {/* Separada por subcategoria, os nomes já aparecem em cada grupo de horários */}
                  {!g.subcategorias && <Subcategorias itens={subs} rotulo={`Subcategorias de ${g.categoria}`} />}
                </div>
                {g.subcategorias ? (
                  <ul className={s.progSubgrupos} aria-label={`Horários de ${g.categoria} por subcategoria`}>
                    {g.subcategorias.map((sg) => (
                      <li key={sg.chave} className={`${s.progSubgrupo} ${sg.nome === null ? s.progSubgrupoTodas : ''}`} data-subcategoria={sg.chave}>
                        <span className={s.progSubNome}>
                          <TextoDemo texto={sg.rotulo} />
                        </span>
                        <Horarios sessoes={sg.sessoes} rotulo={`Horários de ${g.categoria} — ${semDemo(sg.rotulo)}`} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Horarios sessoes={g.corridas} rotulo={`Horários de ${g.categoria}`} />
                )}
              </li>
            )
          })}
        </ul>
      )}
      {escolhas.map((e) => (
        <div
          key={e.valor}
          className={s.progEscolha}
          data-escolha={e.valor}
          data-categoria={e.chaveCategoria}
          data-subcategoria={e.subcategoria ? chaveDeSubcategoria(e.subcategoria) : undefined}
          hidden
        >
          <p className={s.progNome}>
            <span className={s.corCategoria} style={{ background: e.cor ?? 'var(--verde)' }} aria-hidden="true" />
            <TextoDemo texto={e.rotulo} />
          </p>
          <Horarios sessoes={e.sessoes} rotulo={`Horários de ${semDemo(e.rotulo)}`} />
        </div>
      ))}
      <p className={s.semProgramacao} data-aviso="" hidden />
    </div>
  )
}

export function LinkEtapa({ etapa, children }: { etapa: Pick<Etapa, 'id'>; children?: ReactNode }) {
  return (
    <Link className="link-seta" href={`/etapas/${etapa.id}`}>
      {children ?? 'Página da etapa'}
    </Link>
  )
}

export function NomeEtapa({ etapa }: { etapa: Pick<Etapa, 'nome' | 'numero'> }) {
  return <TextoDemo texto={nomeDaEtapa(etapa)} />
}

/** Marca de cor da categoria (decorativa; o nome vem sempre ao lado). */
export function CorCategoria({ cor }: { cor?: string | null }) {
  return <span className={s.corCategoria} style={{ background: cor ?? 'var(--verde)' }} aria-hidden="true" />
}
