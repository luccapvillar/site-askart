import { Selo, STATUS_TREINO } from './Selo'
import s from './AgendaTreinos.module.css'

export type HorarioAgenda = {
  id: string
  inicio: string // HH:mm
  fim: string // HH:mm
  tipo: string
  cor?: string | null
  categorias: string[] // vazio = todas
  status: 'liberado' | 'bloqueado' | 'lotado' | 'cancelado' | 'extra'
  observacao?: string | null
}

export type DiaAgenda = {
  chave: string // AAAA-MM-DD
  nome: string // "sábado"
  data: string // "18/10"
  hoje?: boolean
  horarios: HorarioAgenda[]
}

/**
 * Agenda de treinos por dia (grade + exceções), um quadro por dia. `semana` distribui os dias em colunas em
 * telas largas. No Kartódromo, a grade semanal oficial é o componente treinos/GradeTreinos e as exceções
 * aparecem em treinos/MudancasGrade; este componente fica para listas de agenda por data.
 */
export function AgendaTreinos({ dias, semana = false, textoSemHorario = 'Sem treinos programados.' }: { dias: DiaAgenda[]; semana?: boolean; textoSemHorario?: string }) {
  return (
    <div className={`${s.dias} ${semana ? s.semana : ''}`}>
      {dias.map((d) => (
        <section key={d.chave} className={`${s.dia} ${d.hoje ? s.hoje : ''}`} aria-label={`${d.nome}, ${d.data}`}>
          <header className={s.cabecaDia}>
            <span className={s.nomeDia}>
              {d.nome}
              {d.hoje && <span className={s.seloHoje}>Hoje</span>}
            </span>
            <span className={s.dataDia}>{d.data}</span>
          </header>
          {d.horarios.length ? (
            <ul className={s.lista}>
              {d.horarios.map((h) => {
                const [rotulo, tom] = STATUS_TREINO[h.status] ?? [h.status, 'neutro']
                const inativo = h.status === 'bloqueado' || h.status === 'cancelado'
                return (
                  <li key={h.id} className={`${s.horario} ${inativo ? s.inativo : ''}`} style={h.cor ? ({ '--cor': h.cor } as React.CSSProperties) : undefined}>
                    <span className={s.hora}>
                      {h.inicio}
                      <span aria-hidden="true">–</span>
                      <span className="visualmente-oculto"> às </span>
                      {h.fim}
                    </span>
                    <span className={s.tipo}>{h.tipo}</span>
                    <span className={s.meta}>
                      {h.status !== 'liberado' && <Selo tom={tom}>{rotulo}</Selo>}
                      <span>{h.categorias.length ? h.categorias.join(', ') : 'Todas as categorias'}</span>
                      {h.observacao && <span>· {h.observacao}</span>}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className={s.semHorario}>{textoSemHorario}</p>
          )}
        </section>
      ))}
    </div>
  )
}
