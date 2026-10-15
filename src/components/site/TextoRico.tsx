import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

/** Texto do editor do painel, com a tipografia de leitura do site. */
export function TextoRico({ dados, className }: { dados: unknown; className?: string }) {
  if (!dados || typeof dados !== 'object' || !('root' in (dados as object))) return null
  const estado = dados as SerializedEditorState
  if (!estado.root?.children?.length) return null
  return <RichText className={`prosa ${className ?? ''}`} data={estado} />
}

/** Texto puro de um conteúdo do editor (resumos e descrições do Google). */
export function textoPuro(dados: unknown, limite = 220): string {
  const partes: string[] = []
  const visitar = (n: unknown) => {
    if (!n || typeof n !== 'object') return
    const no = n as { text?: unknown; children?: unknown[] }
    if (typeof no.text === 'string') partes.push(no.text)
    no.children?.forEach(visitar)
    if (no.children) partes.push(' ')
  }
  visitar((dados as { root?: unknown } | null)?.root)
  const texto = partes.join('').replace(/\s+/g, ' ').trim()
  return texto.length > limite ? `${texto.slice(0, limite - 1).trimEnd()}…` : texto
}
