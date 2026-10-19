import type { DiaAgenda, HorarioAgenda } from '../AgendaTreinos'
import { Selo, STATUS_TREINO, type TomSelo } from '../Selo'
import { semDemo, TextoDemo } from '../TextoDemo'
import type { DiaGrade } from './GradeTreinos'
import s from './MudancasGrade.module.css'

const DIA_DA_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

/** "2026-10-18" → "domingo"… (chave da grade semanal). Meio-dia UTC: sem risco de virar o dia pelo fuso. */
const diaDaChave = (chave: string) => DIA_DA_SEMANA[new Date(`${chave}T12:00:00Z`).getUTCDay()] ?? ''

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

type Mudanca = HorarioAgenda & { rotulo: string; tom: TomSelo }

/**
 * O que foge da grade semanal nos próximos dias (exceções da agenda): treino cancelado, pista bloqueada,
 * turma lotada, horário extra ou horário diferente do da grade. Não repete os treinos normais: a grade
 * semanal logo abaixo já mostra tudo. Sem mudanças, mostra só uma linha curta confirmando a grade.
 */
export function MudancasGrade({ dias, grade }: { dias: DiaAgenda[]; grade: DiaGrade[] }) {
  const porDia = dias
    .map((d) => {
      const daGrade = grade.find((g) => g.chave === diaDaChave(d.chave))?.horarios ?? []
      const mudancas: Mudanca[] = d.horarios.flatMap((h) => {
        if (h.status !== 'liberado') {
          const [rotulo, tom] = STATUS_TREINO[h.status] ?? [h.status, 'neutro' as TomSelo]
          return [{ ...h, rotulo, tom }]
        }
        // Liberado, mas fora do horário da grade daquele dia da semana (exceção que mudou o horário ou treino avulso)
        const igualAGrade = daGrade.some((g) => g.inicio === h.inicio && g.fim === h.fim)
        return igualAGrade ? [] : [{ ...h, rotulo: 'Horário especial', tom: 'info' as TomSelo }]
      })
      return { ...d, mudancas }
    })
    .filter((d) => d.mudancas.length > 0)

  if (!porDia.length) {
    return (
      <p className={s.semMudancas}>
        <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12.5 2.8 2.8L16.5 9.5" />
        </svg>
        <span>
          <strong>Sem mudanças na grade nos próximos {dias.length || 7} dias.</strong> Os treinos seguem a grade semanal abaixo.
        </span>
      </p>
    )
  }

  return (
    <section className={s.mudancas} aria-labelledby="mudancas-titulo">
      <div className={s.cabeca}>
        <svg className={s.icone} aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 2.5 20h19L12 3z" />
          <path d="M12 10v4.5M12 17.2v.3" />
        </svg>
        <div>
          <h3 id="mudancas-titulo" className={s.titulo}>
            Mudanças nos próximos dias
          </h3>
          <p className={s.subtitulo}>Atenção a estes horários: eles não seguem a grade semanal.</p>
        </div>
      </div>
      <ul className={s.dias}>
        {porDia.map((d) => (
          <li key={d.chave} className={s.dia}>
            <p className={s.data}>
              <strong>{maiuscula(d.nome)}</strong>, {d.data}
              {d.hoje && <span className={s.hoje}>hoje</span>}
            </p>
            <ul className={s.itens}>
              {d.mudancas.map((m) => {
                const inativo = m.status === 'cancelado' || m.status === 'bloqueado'
                const categorias = m.categorias.map(semDemo).join(', ') || 'Todas as categorias'
                return (
                  <li key={m.id} className={`${s.item} ${inativo ? s.inativo : ''}`}>
                    <span className={s.hora}>
                      {m.inicio}
                      <span aria-hidden="true">–</span>
                      <span className="visualmente-oculto"> às </span>
                      {m.fim}
                    </span>
                    <span className={s.textos}>
                      <span className={s.tipo}>
                        <TextoDemo texto={m.tipo} />
                      </span>
                      <span className={s.meta}>
                        {categorias}
                        {m.observacao ? ` · ${semDemo(m.observacao)}` : ''}
                      </span>
                    </span>
                    <span className={s.status}>
                      <Selo tom={m.tom}>{m.rotulo}</Selo>
                    </span>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}
