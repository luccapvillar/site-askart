import type { CollectionConfig } from 'payload'
import { Atividades } from './Atividades'
import { Usuarios } from './Usuarios'

/** Coleções de administração (usuários, registro de atividades). */
export const colecoesAdmin: CollectionConfig[] = [Usuarios, Atividades]
