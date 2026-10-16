/**
 * Pré-visualização do editor da grade: a grade ainda não salva no formato do quadro do site, com a mesma
 * conta (montarQuadro, também usada por src/lib/grade.ts → montarGrade).
 */
import type { Categoria, HorariosTreino, TiposTreino } from '@/payload-types'
import { dataDoDia, intervaloValido } from '@/lib/agenda'
import { ordenarLinhas, type EstadoGrade, type LinhaGrade, type OpcaoTipo } from './modelo'
import { montarQuadro } from './quadro'

/**
 * O que o site mostraria com esta grade: só horários visíveis e ainda válidos (como lerGradeSemanal,
 * src/lib/publico.ts), com o tipo e as categorias que o visitante vê, na mesma ordem.
 */
export function quadroDaPrevia(
  linhas: LinhaGrade[],
  estado: Pick<EstadoGrade, 'tipos' | 'categorias' | 'cores'>,
  agora = new Date(),
) {
  const instante = agora.toISOString()
  const tipos = new Map(estado.tipos.map((t) => [String(t.id), t]))
  const categorias = new Map(estado.categorias.map((c) => [String(c.id), c]))
  const docs = ordenarLinhas(linhas)
    .filter(
      (l) =>
        l.visivel &&
        intervaloValido(l.horaInicio, l.horaFim) &&
        (!l.validoAte || dataDoDia(l.validoAte) >= instante) &&
        l.tipo !== null &&
        tipos.has(String(l.tipo)),
    )
    .map((l, i) => {
      const tipo = tipos.get(String(l.tipo)) as OpcaoTipo
      return {
        // Horário novo ainda sem id: chave negativa só para a lista do quadro
        id: typeof l.id === 'number' ? l.id : -(i + 1),
        diaSemana: l.diaSemana,
        horaInicio: l.horaInicio,
        horaFim: l.horaFim,
        tipo: { id: tipo.id, nome: tipo.nome, cor: tipo.cor } as unknown as TiposTreino,
        // Categoria oculta não é carregada para o visitante (fica só o id e o quadro a ignora)
        categorias: l.categorias.map((id) => {
          const c = categorias.get(String(id))
          return c?.publica ? ({ id: c.id, nome: c.nome, sigla: c.sigla } as unknown as Categoria) : id
        }),
        observacao: l.observacao.trim() || null,
      } as unknown as HorariosTreino
    })
  return montarQuadro(docs, (cor) => estado.cores[cor] ?? { fundo: cor, texto: '#FFFFFF' })
}
