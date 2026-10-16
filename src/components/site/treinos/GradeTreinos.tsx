'use client'

import { useEffect, useMemo, useState } from 'react'
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

/**
 * Grade semanal de treinos no formato do documento oficial da ASKART: um quadro por dia, cada horário com a
 * cor da turma. Filtro por categoria e destaque para hoje e para o treino que está acontecendo agora.
 */
export function GradeTreinos({ dias, categorias, legenda }: { dias: DiaGrade[]; categorias: string[]; legenda: Legenda[] }) {
  const [categoria, setCategoria] = useState<string | null>(null)
  const [agora, setAgora] = useState<{ dia: string; hora: string } | null>(null)

  useEffect(() => {
    setAgora(agoraEmBrasilia())
    const id = window.setInterval(() => setAgora(agoraEmBrasilia()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const visiveis = useMemo(
    () =>
      dias.map((d) => ({
        ...d,
        horarios: categoria ? d.horarios.filter((h) => h.fechada || h.categorias.includes(categoria)) : d.horarios,
      })),
    [dias, categoria],
  )

  return (
    <div className={s.grade}>
      <div className={s.filtros} role="group" aria-label="Filtrar por categoria">
        <span className={s.filtrosRotulo}>Sua categoria:</span>
        <button type="button" aria-pressed={categoria === null} onClick={() => setCategoria(null)}>
          Todas
        </button>
        {categorias.map((c) => (
          <button key={c} type="button" aria-pressed={categoria === c} onClick={() => setCategoria(c)}>
            {c}
          </button>
        ))}
      </div>

      <ul className={s.legenda} aria-label="Legenda das turmas">
        {legenda.map((l) => (
          <li key={l.turma}>
            <span className={s.amostra} style={{ background: l.cor }} aria-hidden="true" />
            {l.turma}
          </li>
        ))}
      </ul>

      <div className={s.dias}>
        {visiveis.map((d) => {
          const hoje = agora?.dia === d.chave
          return (
            <section key={d.chave} className={`${s.dia} ${hoje ? s.hoje : ''}`} aria-labelledby={`dia-${d.chave}`}>
              <h3 id={`dia-${d.chave}`} className={s.nomeDia}>
                {d.nome}
                {hoje && <span className={s.selo}>Hoje</span>}
              </h3>
              {d.horarios.length ? (
                <table className={s.tabela}>
                  <caption className="visualmente-oculto">Treinos de {d.nome}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Início</th>
                      <th scope="col">Término</th>
                      <th scope="col">Turma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.horarios.map((h) => {
                      const agoraAqui = hoje && agora && h.inicio <= agora.hora && agora.hora < h.fim
                      return (
                        <tr key={h.id} className={`${agoraAqui ? s.agora : ''} ${h.fechada ? s.fechada : ''}`}>
                          <td className="mono">{h.inicio}</td>
                          <td className="mono">{h.fim}</td>
                          <td>
                            <span className={s.turma} style={{ background: h.cor, color: h.texto }}>
                              {h.turma}
                            </span>
                            {agoraAqui && <span className={s.aoVivo}>agora</span>}
                            {h.observacao && <span className={s.obs}>{h.observacao}</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <p className={s.semTreino}>Sem treino para esta categoria.</p>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
