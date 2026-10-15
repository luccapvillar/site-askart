import type { CollectionConfig } from 'payload'
import { Campeonatos } from './Campeonatos'
import { Categorias } from './Categorias'
import { Corridas } from './Corridas'
import { Equipes } from './Equipes'
import { Etapas } from './Etapas'
import { Inscricoes } from './Inscricoes'
import { Pilotos } from './Pilotos'
import { RegrasPontuacao } from './RegrasPontuacao'
import { TemporadaCategorias } from './TemporadaCategorias'
import { Temporadas } from './Temporadas'

/**
 * Coleções do domínio "Competição" (ver docs/ARQUITETURA.md §4), na ordem em que aparecem no menu:
 * primeiro o que se usa toda semana (etapas, resultados, classificações, pilotos), depois os cadastros
 * que mudam pouco (temporadas, campeonatos, regras).
 */
export const colecoesCompeticao: CollectionConfig[] = [
  Etapas,
  Corridas,
  TemporadaCategorias,
  Pilotos,
  Inscricoes,
  Equipes,
  Categorias,
  Temporadas,
  Campeonatos,
  RegrasPontuacao,
]
