'use client'
import { FieldDescription, useConfig, useFormFields } from '@payloadcms/ui'
import type { FieldDescriptionClientProps } from 'payload'
import { useEffect, useState } from 'react'

type Categoria = { nome?: string | null; subcategorias?: { nome?: string | null }[] | null }
type Carga = { id: string; doc: Categoria | null }

const idDe = (v: unknown): string | null => {
  const id = v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : v
  return id === null || id === undefined || id === '' ? null : String(id)
}

/**
 * Descrição do campo "Subcategoria" da inscrição: mostra quais são as subcategorias da categoria escolhida
 * no formulário (e avisa quando a categoria não tem nenhuma). Busca a categoria de novo quando ela muda.
 */
export function DescricaoSubcategoria({ path }: FieldDescriptionClientProps) {
  const id = idDe(useFormFields(([campos]) => campos.categoria?.value))
  const { config } = useConfig()
  const [carga, setCarga] = useState<Carga | null>(null)

  useEffect(() => {
    if (id === null) return
    const controle = new AbortController()
    const url = `${config.serverURL ?? ''}${config.routes.api}/categorias/${encodeURIComponent(id)}?depth=0&select[nome]=true&select[subcategorias]=true`
    fetch(url, { credentials: 'include', signal: controle.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Categoria>) : null))
      .then((doc) => setCarga({ id, doc }))
      .catch(() => {
        if (!controle.signal.aborted) setCarga({ id, doc: null })
      })
    return () => controle.abort()
  }, [id, config.serverURL, config.routes.api])

  const doc = carga && carga.id === id ? carga.doc : undefined
  const nomes = (doc?.subcategorias ?? []).map((s) => s?.nome?.trim()).filter((n): n is string => Boolean(n))
  const categoria = doc?.nome?.trim() ? doc.nome.trim() : 'esta categoria'

  let texto = 'Opcional. Escolha a categoria para ver as subcategorias dela.'
  if (id !== null && doc === undefined) texto = 'Opcional. Buscando as subcategorias da categoria…'
  else if (id !== null && doc === null) texto = 'Opcional. Escreva exatamente o nome de uma subcategoria da categoria escolhida.'
  else if (id !== null && !nomes.length) texto = `Opcional. A categoria ${categoria} não tem subcategorias: deixe em branco.`
  else if (id !== null)
    texto = `Opcional. Subcategorias de ${categoria}: ${nomes.join(', ')}. Escreva exatamente um desses nomes (os resultados no site saem separados por subcategoria).`

  return <FieldDescription path={path} description={texto} />
}
