/**
 * Editores de texto (Lexical) da frente Conteúdo. Recursos limitados de propósito: parágrafo, títulos
 * H2/H3, negrito, itálico, listas, link, citação e (onde faz sentido) imagens e galerias. Sem H1, código,
 * alinhamentos ou cores, que quebrariam o visual do site.
 *
 * `textoParaLexical` monta um texto simples no formato do editor — útil para criar avisos e notícias
 * por código (ex.: "Publicar aviso" a partir de uma etapa, assistente com IA).
 */
import {
  BlockquoteFeature,
  BlocksFeature,
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  ItalicFeature,
  lexicalEditor,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnderlineFeature,
  UnorderedListFeature,
  UploadFeature,
} from '@payloadcms/richtext-lexical'
import type { CollectionSlug } from 'payload'
import { blocoGaleria } from './bloco-galeria'
import { MIDIA_UPLOAD, REL } from './comum'

/** Conteúdos do site que podem ser alvo de um link interno no meio do texto. */
const ALVOS_LINK: CollectionSlug[] = [REL.paginas, REL.noticias, REL.eventos, REL.galerias, REL.documentos]

const recursosBasicos = () => [
  ParagraphFeature(),
  BoldFeature(),
  ItalicFeature(),
  UnderlineFeature(),
  UnorderedListFeature(),
  OrderedListFeature(),
  LinkFeature({ enabledCollections: ALVOS_LINK, maxDepth: 1 }),
  FixedToolbarFeature(),
  InlineToolbarFeature(),
]

/** Texto curto com formatação básica (avisos, descrições). */
export const editorSimples = lexicalEditor({ features: recursosBasicos })

/** Texto de página/evento: básico + títulos, citação e imagens. */
export const editorPadrao = lexicalEditor({
  features: () => [
    ...recursosBasicos(),
    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
    BlockquoteFeature(),
    UploadFeature({ enabledCollections: [MIDIA_UPLOAD], maxDepth: 1 }),
  ],
})

/** Texto da notícia: o padrão + bloco de galeria. */
export const editorNoticia = lexicalEditor({
  features: () => [
    ...recursosBasicos(),
    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
    BlockquoteFeature(),
    UploadFeature({ enabledCollections: [MIDIA_UPLOAD], maxDepth: 1 }),
    BlocksFeature({ blocks: [blocoGaleria] }),
  ],
})

/** Estado do editor Lexical (formato salvo no banco). */
export interface EstadoLexical {
  root: {
    type: 'root'
    children: Array<Record<string, unknown>>
    direction: 'ltr' | null
    format: ''
    indent: number
    version: number
  }
}

/**
 * Texto simples → formato do editor. Linhas em branco separam parágrafos; quebras simples viram
 * quebras de linha dentro do parágrafo.
 */
export function textoParaLexical(texto: string): EstadoLexical {
  const paragrafos = texto
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragrafos.map((paragrafo) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        textFormat: 0,
        textStyle: '',
        children: paragrafo.split('\n').flatMap((linha, i) => {
          const textoNo = { type: 'text', text: linha, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }
          return i === 0 ? [textoNo] : [{ type: 'linebreak', version: 1 }, textoNo]
        }),
      })),
    },
  }
}
