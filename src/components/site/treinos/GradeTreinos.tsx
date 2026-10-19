'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import s from './GradeTreinos.module.css'

export type HorarioGrade = {
  id: string | number
  inicio: string
  fim: string
  turma: string
  cor: string
  texto: string
  categorias: string[]
  fechada: boolean
  observacao?: string | null
}
export type DiaGrade = { chave: string; nome: string; curto: string; horarios: HorarioGrade[] }
export type Legenda = { turma: string; cor: string; texto: string }

const ORDEM_JS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

/** Dia da semana e hora atuais em Brasília (calculado no navegador: o cache da página não congela o "hoje"). */
function agoraEmBrasilia() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  )
  const dias: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { dia: ORDEM_JS[dias[p.weekday] ?? 0], hora: `${String(+p.hour % 24).padStart(2, '0')}:${p.minute}` }
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

type Props = {
  dias: DiaGrade[]
  categorias: string[]
  legenda: Legenda[]
  /**
   * Dia de hoje calculado no servidor (chave: "segunda"…"domingo"), para o celular já abrir no dia certo sem
   * piscar. Opcional: o navegador recalcula e corrige se o cache da página for de outro dia.
   */
  hoje?: string | null
}

/**
 * Grade semanal oficial de treinos (o mesmo quadro do documento da ASKART: cada horário com a cor da turma).
 * - Computador/tablet: a semana inteira, um quadro por dia, com o dia de hoje destacado.
 * - Celular: um dia por vez (abre em hoje), com seletor de dias e a opção "Semana toda".
 * - Filtro por categoria, legenda das cores com o nome de cada turma e o treino que está acontecendo agora.
 * A largura disponível (container query) decide o formato, então a prévia do painel mostra o mesmo resultado.
 */
export function GradeTreinos({ dias, categorias, legenda, hoje: hojeDoServidor = null }: Props) {
  const id = useId()
  const [categoria, setCategoria] = useState<string | null>(null)
  const [agora, setAgora] = useState<{ dia: string; hora: string } | null>(null)
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [modo, setModo] = useState<'dia' | 'semana'>('dia')

  useEffect(() => {
    setAgora(agoraEmBrasilia())
    const relogio = window.setInterval(() => setAgora(agoraEmBrasilia()), 60_000)
    return () => window.clearInterval(relogio)
  }, [])

  const hoje = agora?.dia ?? hojeDoServidor
  // Enquanto a pessoa não escolhe um dia, o celular mostra hoje
  const diaAtivo = escolhido ?? (hoje && dias.some((d) => d.chave === hoje) ? hoje : dias[0]?.chave)

  const visiveis = useMemo(
    () =>
      dias.map((d) => ({
        ...d,
        horarios: categoria ? d.horarios.filter((h) => h.fechada || h.categorias.includes(categoria)) : d.horarios,
      })),
    [dias, categoria],
  )

  const treinosNaSemana = visiveis.reduce((n, d) => n + d.horarios.filter((h) => !h.fechada).length, 0)
  const turmasVisiveis = new Set(visiveis.flatMap((d) => d.horarios.map((h) => h.turma)))
  const legendaVisivel = legenda.filter((l) => turmasVisiveis.has(l.turma))
  const resumo = categoria
    ? `${categoria}: ${plural(treinosNaSemana, 'horário de treino', 'horários de treino')} na semana.`
    : `Todas as categorias: ${plural(treinosNaSemana, 'horário de treino', 'horários de treino')} na semana.`

  return (
    <div className={s.grade}>
      <div className={s.controles}>
        <div className={s.controle}>
          <p id={`${id}-categoria`} className={s.controleRotulo}>
            Categoria
          </p>
          <div className={s.pilulas} role="group" aria-labelledby={`${id}-categoria`}>
            <button type="button" aria-pressed={categoria === null} onClick={() => setCategoria(null)}>
              Todas
            </button>
            {categorias.map((c) => (
              <button key={c} type="button" aria-pressed={categoria === c} onClick={() => setCategoria(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Só no celular (escondido por container query em telas largas, onde a semana inteira aparece) */}
        <div className={`${s.controle} ${s.seletor}`}>
          <div className={s.linhaDia}>
            <p id={`${id}-dia`} className={s.controleRotulo}>
              {modo === 'dia' ? 'Dia' : 'Exibição'}
            </p>
            <div className={s.modos} role="group" aria-label="Exibição da grade">
              <button type="button" aria-pressed={modo === 'dia'} onClick={() => setModo('dia')}>
                Por dia
              </button>
              <button type="button" aria-pressed={modo === 'semana'} onClick={() => setModo('semana')}>
                Semana toda
              </button>
            </div>
          </div>
          {modo === 'dia' && (
            <div className={s.abas} role="group" aria-labelledby={`${id}-dia`}>
              {visiveis.map((d) => {
                const ehHoje = hoje === d.chave
                const vazio = !d.horarios.some((h) => !h.fechada)
                return (
                  <button
                    key={d.chave}
                    type="button"
                    className={vazio ? s.abaVazia : undefined}
                    aria-pressed={d.chave === diaAtivo}
                    aria-controls={`${id}-${d.chave}`}
                    aria-label={`${d.nome}${ehHoje ? ', hoje' : ''}${vazio ? ', sem treino' : ''}`}
                    onClick={() => setEscolhido(d.chave)}
                  >
                    <span className={s.abaNome}>{d.curto}</span>
                    {ehHoje && <span className={s.abaHoje}>hoje</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <p className={s.resumo} role="status">
        {resumo}
      </p>

      <div className={`${s.dias} ${modo === 'semana' ? s.semanaToda : ''}`}>
        {visiveis.map((d) => {
          const ehHoje = hoje === d.chave
          const foraDoDia = modo === 'dia' && d.chave !== diaAtivo
          return (
            <section
              key={d.chave}
              id={`${id}-${d.chave}`}
              className={[s.dia, ehHoje && s.hoje, foraDoDia && s.foraDoDia].filter(Boolean).join(' ')}
              aria-labelledby={`${id}-${d.chave}-nome`}
            >
              <h3 id={`${id}-${d.chave}-nome`} className={s.nomeDia}>
                <span>{d.nome}</span>
                {ehHoje && <span className={s.seloHoje}>Hoje</span>}
              </h3>
              {d.horarios.length ? (
                <ol className={s.horarios}>
                  {d.horarios.map((h) => {
                    const agoraAqui = ehHoje && agora !== null && h.inicio <= agora.hora && agora.hora < h.fim
                    return (
                      <li key={h.id} className={[s.horario, h.fechada && s.fechada, agoraAqui && s.agora].filter(Boolean).join(' ')}>
                        <span className={s.hora}>
                          <time>{h.inicio}</time>
                          <span aria-hidden="true">–</span>
                          <span className="visualmente-oculto"> às </span>
                          <time>{h.fim}</time>
                        </span>
                        <span className={s.turma} style={{ background: h.cor, color: h.texto }}>
                          {h.turma}
                        </span>
                        {agoraAqui && (
                          <span className={s.agoraSelo}>
                            Agora<span className="visualmente-oculto">: treino em andamento</span>
                          </span>
                        )}
                        {h.observacao && <span className={s.obs}>{h.observacao}</span>}
                      </li>
                    )
                  })}
                </ol>
              ) : (
                <p className={s.semTreino}>{categoria ? `Sem treino de ${categoria} neste dia.` : 'Sem treino neste dia.'}</p>
              )}
            </section>
          )
        })}
      </div>

      {legendaVisivel.length > 0 && (
        <div className={s.legenda}>
          <p id={`${id}-legenda`} className={s.controleRotulo}>
            Cores das turmas
          </p>
          <ul aria-labelledby={`${id}-legenda`}>
            {legendaVisivel.map((l) => (
              <li key={l.turma}>
                <span className={s.amostra} style={{ background: l.cor }} aria-hidden="true" />
                {l.turma}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
