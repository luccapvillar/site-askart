/** Grade semanal (horarios-treino) → formato do quadro do site, com cores legíveis. */
import type { DiaGrade, Legenda } from '@/components/site/treinos/GradeTreinos'
import type { HorariosTreino } from '@/payload-types'
import { montarQuadro } from '@/components/admin/grade/quadro'
import { fundoLegivel } from './site'

/**
 * A conta fica em src/components/admin/grade/quadro.ts (sem dependências de servidor) para a
 * pré-visualização do editor da grade no painel usar exatamente o mesmo resultado.
 */
export function montarGrade(horarios: HorariosTreino[]): { dias: DiaGrade[]; categorias: string[]; legenda: Legenda[] } {
  return montarQuadro(horarios, fundoLegivel)
}
