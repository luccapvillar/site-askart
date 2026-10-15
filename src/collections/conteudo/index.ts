import type { CollectionConfig } from 'payload'
import { Avisos } from './Avisos'
import { Banners } from './Banners'
import { CategoriasNoticia } from './CategoriasNoticia'
import { Documentos } from './Documentos'
import { Eventos } from './Eventos'
import { Galerias } from './Galerias'
import { Midia } from './Midia'
import { Noticias } from './Noticias'
import { Paginas } from './Paginas'
import { Perguntas } from './Perguntas'
import { Tags } from './Tags'
import { TiposDocumento } from './TiposDocumento'

/** Coleções do domínio "conteúdo" (docs/ARQUITETURA.md §4), na ordem do menu. */
export const colecoesConteudo: CollectionConfig[] = [
  Noticias,
  Avisos,
  Banners,
  Galerias,
  Midia,
  Documentos,
  Eventos,
  Paginas,
  Perguntas,
  CategoriasNoticia,
  Tags,
  TiposDocumento,
]
