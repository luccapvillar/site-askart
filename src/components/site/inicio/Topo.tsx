import Link from 'next/link'
import type { ReactNode } from 'react'
import { Botao } from '@/components/site/Botao'
import { ContagemRegressiva } from '@/components/site/ContagemRegressiva'
import { Etiquetas } from '@/components/site/base/Etiquetas'
import { Foto } from '@/components/site/Foto'
import { Selo, STATUS_ETAPA } from '@/components/site/Selo'
import { TextoDemo } from '@/components/site/TextoDemo'
import { diaDaSemana, formatarHora } from '@/lib/datas'
import {
  dataDaEtapa,
  MENSAGENS_ETAPA,
  modalidadesDaEtapa,
  periodoPorExtenso,
  ROTULO_MODALIDADE,
  type SituacaoEtapa,
} from '@/lib/site'
import type { Etapa, Midia } from '@/payload-types'
import s from './Inicio.module.css'

export type BotaoTopo = { href: string; texto: string; externo?: boolean }

/**
 * Topo da página inicial: foto real em tela cheia, manchete, botões e, ao lado (no computador) ou logo
 * abaixo (no celular), o cartão da próxima etapa. Sem JavaScript, exceto a contagem regressiva.
 */
export function TopoInicio({
  foto,
  logo,
  rotulo,
  titulo,
  subtitulo,
  botoes,
  proxima,
}: {
  foto: Midia | null
  logo: Midia | null
  rotulo: string
  titulo: string
  subtitulo: string
  botoes: BotaoTopo[]
  /** Cartão da próxima etapa (null = seção desligada no painel). */
  proxima: ReactNode
}) {
  return (
    <section className={`${s.topo} ${foto ? s.topoComFoto : ''}`} aria-labelledby="titulo-inicio">
      {foto && <Foto midia={foto} className={s.topoFoto} prioridade sizes="100vw" alt="" />}
      <div className={`conteiner ${s.topoGrade} ${proxima ? '' : s.topoSemLateral}`}>
        <div className={s.topoTextos}>
          {logo && (
            <Foto midia={logo} ate="card" sizes="(min-width: 960px) 280px, 200px" className={s.topoLogo} alt="" prioridade />
          )}
          <p className={`rotulo ${s.topoRotulo}`}>{rotulo}</p>
          <h1 id="titulo-inicio" className={`titulo-display ${s.topoTitulo}`}>
            <TextoDemo texto={titulo} />
          </h1>
          <p className={s.topoSub}>{subtitulo}</p>
          {botoes.length > 0 && (
            <div className={s.topoBotoes}>
              {botoes.map((b, i) => (
                <Botao key={`${b.href}-${i}`} href={b.href} variante={i === 0 ? 'destaque' : 'claro'} externo={b.externo} seta={i === 0} grande>
                  {b.texto}
                </Botao>
              ))}
            </div>
          )}
        </div>
        {proxima && <div className={s.topoLateral}>{proxima}</div>}
      </div>
      {foto?.credito && <p className={s.topoCredito}>Foto: {foto.credito}</p>}
      <div className={`faixa-marca ${s.topoFaixa}`} aria-hidden="true" />
    </section>
  )
}

/* ───────────────────────────── próxima etapa ───────────────────────────── */

const nomeDaEtapa = (e: Pick<Etapa, 'nome' | 'numero'>) => e.nome || `${e.numero}ª etapa`
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** "Domingo, 8 de novembro de 2026 · início às 08:00" (vários dias: "De 7 a 8 de novembro de 2026 · …"). */
function quando(etapa: Etapa): string {
  if (!etapa.inicio) return 'Data a definir'
  const periodo = periodoPorExtenso(etapa) ?? ''
  const umDia = !periodo.startsWith('de ') && !periodo.includes(' e ')
  const data = umDia ? `${maiuscula(diaDaSemana(etapa.inicio))}, ${periodo}` : maiuscula(periodo)
  return `${data} · início às ${formatarHora(etapa.inicio)}`
}

/** Ícone de relógio (mensagens "ainda não disponível"). */
function IconeRelogio() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function IconeMapa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
      <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

/**
 * Cartão da próxima etapa: data, nome, local, áreas (karts profissionais/indoor), contagem regressiva e a
 * compra. A compra usa só o link da própria etapa; sem link, a mensagem exata pedida pelo cliente.
 * A regra (o que aparece e quando) é a de situacaoDaEtapa (src/lib/site.ts).
 */
export function CartaoProximaEtapa({
  etapa,
  situacao,
  mapa,
  contagem,
  rotulo = 'Próxima etapa',
}: {
  etapa: Etapa | null
  situacao: SituacaoEtapa | null
  mapa: string | null
  contagem: boolean
  rotulo?: string
}) {
  if (!etapa || !situacao) {
    return (
      <aside className={s.proxima} aria-labelledby="proxima-etapa">
        <p className={`rotulo ${s.proximaRotulo}`}>{rotulo}</p>
        <h2 id="proxima-etapa" className={`h3 ${s.proximaVazio}`}>
          O calendário da próxima temporada ainda não foi divulgado.
        </h2>
        <Link className="link-seta" href="/bks">
          Ver o BKS
        </Link>
      </aside>
    )
  }
  const d = dataDaEtapa(etapa)
  const [rotuloStatus, tom] = STATUS_ETAPA[etapa.status] ?? [etapa.status, 'neutro' as const]
  const modalidades = modalidadesDaEtapa(etapa)
  const restante = etapa.inicio ? Math.max(0, Math.floor((new Date(etapa.inicio).getTime() - Date.now()) / 1000)) : null

  return (
    <aside className={s.proxima} aria-labelledby="proxima-etapa">
      <div className={s.proximaTopo}>
        <p className={`rotulo ${s.proximaRotulo}`}>{rotulo}</p>
        <Selo tom={tom}>{rotuloStatus}</Selo>
      </div>

      <div className={s.proximaCabeca}>
        {d ? (
          <p className={s.proximaData} aria-hidden="true">
            <span className={s.proximaDia}>{d.dia}</span>
            <span className={s.proximaMes}>{d.mes}</span>
          </p>
        ) : null}
        <div className={s.proximaTextos}>
          <h2 id="proxima-etapa" className={s.proximaNome}>
            <Link href={`/etapas/${etapa.id}`}>
              <TextoDemo texto={nomeDaEtapa(etapa)} />
            </Link>
          </h2>
          <p className={s.proximaQuando}>{quando(etapa)}</p>
          {etapa.local && (
            <p className={s.proximaLocal}>
              <TextoDemo texto={etapa.local} />
            </p>
          )}
        </div>
      </div>

      <Etiquetas rotulo="Áreas desta etapa" tom="marca" itens={modalidades.map((m) => ROTULO_MODALIDADE[m])} />

      {contagem && etapa.inicio && (
        <ContagemRegressiva alvo={etapa.inicio} textoAlternativo={periodoPorExtenso(etapa) ?? ''} inicial={restante} claro />
      )}

      <div className={s.proximaCompra}>
        {situacao.linkCompra ? (
          <Botao href={situacao.linkCompra} externo seta largo>
            Comprar esta etapa
          </Botao>
        ) : (
          <p className={s.indisponivel}>
            <IconeRelogio />
            <span>{MENSAGENS_ETAPA.semCompra}</span>
          </p>
        )}
      </div>

      <ul className={s.proximaLinks}>
        <li>
          <Link className="link-seta" href={`/etapas/${etapa.id}`}>
            Horários, treinos livres e transmissão
          </Link>
        </li>
        {mapa && (
          <li>
            <a className={s.linkMapa} href={mapa} target="_blank" rel="noopener noreferrer">
              <IconeMapa />
              Ver no mapa
              <span className="visualmente-oculto"> (abre em nova aba)</span>
            </a>
          </li>
        )}
      </ul>
    </aside>
  )
}
