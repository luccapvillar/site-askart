import type { GlobalConfig } from 'payload'
import { Configuracoes } from './Configuracoes'
import { Contato } from './Contato'
import { Institucional } from './Institucional'
import { Kartodromo } from './Kartodromo'
import { Navegacao } from './Navegacao'
import { PaginaInicial } from './PaginaInicial'
import { TextosPaginas } from './TextosPaginas'

/** Globais (configurações únicas) — ver docs/ARQUITETURA.md §4. */
export const globais: GlobalConfig[] = [PaginaInicial, Kartodromo, Contato, Institucional, TextosPaginas, Navegacao, Configuracoes]
