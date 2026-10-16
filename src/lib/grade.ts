/** Grade semanal (horarios-treino) → formato do quadro do site, com cores legíveis. */
import type { DiaGrade, Legenda } from '@/components/site/treinos/GradeTreinos'
import type { HorariosTreino } from '@/payload-types'
import { COR_PADRAO_TURMA, montarQuadro } from '@/components/admin/grade/quadro'
import { fundoLegivel } from './site'

/**
 * A conta fica em src/components/admin/grade/quadro.ts (sem dependências de servidor) para a
 * pré-visualização do editor da grade no painel usar exatamente o mesmo resultado.
 */
export function montarGrade(horarios: HorariosTreino[]): { dias: DiaGrade[]; categorias: string[]; legenda: Legenda[] } {
  return montarQuadro(horarios, fundoLegivel)
}

/**
 * Cores legíveis já calculadas (cor do tipo → fundo e texto), para o navegador repetir a conta do site
 * sem carregar src/lib/site.ts. Inclui a cor padrão das turmas sem cor.
 */
export function coresLegiveis(cores: Array<string | null | undefined>): Record<string, { fundo: string; texto: string }> {
  const saida: Record<string, { fundo: string; texto: string }> = {}
  for (const cor of [...cores, COR_PADRAO_TURMA]) if (cor && !saida[cor]) saida[cor] = fundoLegivel(cor)
  return saida
}
