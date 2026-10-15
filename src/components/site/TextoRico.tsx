import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { PREFIXO_DEMO } from './TextoDemo'
import d from './TextoDemo.module.css'

/** Tira o prefixo de demonstração dos trechos de texto (cópia; o original não muda). */
function semPrefixo(no: unknown, achou: { sim: boolean }): unknown {
  if (Array.isArray(no)) return no.map((n) => semPrefixo(n, achou))
  if (!no || typeof no !== 'object') return no
  const copia: Record<string, unknown> = { ...(no as Record<string, unknown>) }
  if (typeof copia.text === 'string' && copia.text.includes(PREFIXO_DEMO)) {
    achou.sim = true
    copia.text = copia.text.split(PREFIXO_DEMO).join('').replace(/^\s+/, '')
  }
  if (Array.isArray(copia.children)) copia.children = copia.children.map((n) => semPrefixo(n, achou))
  if (copia.root && typeof copia.root === 'object') copia.root = semPrefixo(copia.root, achou)
  return copia
}

/** Texto do editor do painel, com a tipografia de leitura do site. */
export function TextoRico({ dados, className }: { dados: unknown; className?: string }) {
  if (!dados || typeof dados !== 'object' || !('root' in (dados as object))) return null
  if (!(dados as SerializedEditorState).root?.children?.length) return null
  const achou = { sim: false }
  const estado = semPrefixo(dados, achou) as SerializedEditorState
  return (
    <div className={className}>
      {achou.sim && (
        <p className={d.selo} style={{ marginLeft: 0, marginBottom: 8 }}>
          Texto de exemplo
        </p>
      )}
      <RichText className="prosa" data={estado} />
    </div>
  )
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
