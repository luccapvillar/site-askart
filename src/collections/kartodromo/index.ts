import type { CollectionConfig } from 'payload'
import { HorariosTreino } from './HorariosTreino'
import { TiposTreino } from './TiposTreino'
import { Treinos } from './Treinos'

/**
 * Coleções do domínio "Kartódromo" (ver docs/ARQUITETURA.md §4), na ordem do menu: primeiro o que se
 * mexe toda semana (exceções e bloqueios), depois a grade fixa e os tipos.
 */
export const colecoesKartodromo: CollectionConfig[] = [Treinos, HorariosTreino, TiposTreino]

/** Para outras frentes: recalcular os títulos da grade quando uma categoria for renomeada. */
export { atualizarTitulosDaCategoria } from './hooks'
