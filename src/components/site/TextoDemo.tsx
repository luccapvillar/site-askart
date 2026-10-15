import s from './TextoDemo.module.css'

export const PREFIXO_DEMO = '[DEMONSTRAÇÃO]'

/** Separa o prefixo de demonstração do texto ("[DEMONSTRAÇÃO] Piloto 01" → demo + "Piloto 01"). */
export function separarDemo(texto: string | null | undefined): { texto: string; demo: boolean } {
  const t = (texto ?? '').trim()
  if (!t.includes(PREFIXO_DEMO)) return { texto: t, demo: false }
  // Também em textos compostos ("Categoria A, [DEMONSTRAÇÃO] Categoria B")
  return { texto: t.split(PREFIXO_DEMO).map((p) => p.trim()).join(' ').replace(/\s+([,.;·])/g, '$1').replace(/\s{2,}/g, ' ').trim(), demo: true }
}

export const semDemo = (texto: string | null | undefined) => separarDemo(texto).texto

/**
 * Texto que pode ser de demonstração: mostra um selo discreto "Exemplo" no lugar do prefixo.
 * Leitores de tela ouvem "(exemplo de demonstração)". Dado real aparece sem nada.
 */
export function TextoDemo({ texto, selo = true }: { texto: string | null | undefined; selo?: boolean }) {
  const { texto: limpo, demo } = separarDemo(texto)
  if (!demo) return <>{limpo}</>
  return (
    <>
      {limpo}
      {selo ? (
        <span className={s.selo}>
          <span aria-hidden="true">Exemplo</span>
          <span className="visualmente-oculto"> (exemplo de demonstração)</span>
        </span>
      ) : (
        <span className="visualmente-oculto"> (exemplo de demonstração)</span>
      )}
    </>
  )
}
