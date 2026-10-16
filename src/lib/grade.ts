/** Grade semanal (horarios-treino) → formato do quadro do site, com cores legíveis. */
import type { DiaGrade, Legenda } from '@/components/site/treinos/GradeTreinos'
import type { Categoria, HorariosTreino, TiposTreino } from '@/payload-types'
import { semDemo } from '@/components/site/TextoDemo'
import { fundoLegivel } from './site'

const DIAS = [
  ['segunda', 'Segunda-feira', 'Seg'],
  ['terca', 'Terça-feira', 'Ter'],
  ['quarta', 'Quarta-feira', 'Qua'],
  ['quinta', 'Quinta-feira', 'Qui'],
  ['sexta', 'Sexta-feira', 'Sex'],
  ['sabado', 'Sábado', 'Sáb'],
  ['domingo', 'Domingo', 'Dom'],
] as const

const ehFechada = (nome: string) => /pista fechada|fechad/i.test(nome)

export function montarGrade(horarios: HorariosTreino[]): { dias: DiaGrade[]; categorias: string[]; legenda: Legenda[] } {
  const legenda = new Map<string, Legenda>()
  const categorias = new Map<string, number>()
  const dias: DiaGrade[] = DIAS.map(([chave, nome, curto]) => ({ chave, nome, curto, horarios: [] }))
  for (const h of horarios) {
    const tipo = typeof h.tipo === 'object' && h.tipo ? (h.tipo as TiposTreino) : null
    const cats = (h.categorias ?? []).filter((c): c is Categoria => typeof c === 'object')
    const turma = semDemo(tipo?.nome) || cats.map((c) => semDemo(c.nome)).join(' / ') || 'Treino'
    const { fundo, texto } = fundoLegivel(tipo?.cor || '#6B7069')
    if (!legenda.has(turma)) legenda.set(turma, { turma, cor: fundo, texto })
    for (const c of cats) if (!categorias.has(semDemo(c.nome))) categorias.set(semDemo(c.nome), categorias.size)
    dias
      .find((d) => d.chave === h.diaSemana)
      ?.horarios.push({
        id: h.id,
        inicio: h.horaInicio,
        fim: h.horaFim,
        turma,
        cor: fundo,
        texto,
        categorias: cats.map((c) => semDemo(c.nome)),
        fechada: ehFechada(turma),
        observacao: semDemo(h.observacao) || null,
      })
  }
  for (const d of dias) d.horarios.sort((a, b) => a.inicio.localeCompare(b.inicio))
  return { dias, categorias: [...categorias.keys()], legenda: [...legenda.values()] }
}
