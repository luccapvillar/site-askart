'use client'
import { FieldDescription, useConfig, useFormFields } from '@payloadcms/ui'
import type { FieldDescriptionClientProps } from 'payload'
import { useEffect, useState } from 'react'

type Categoria = { id?: unknown; nome?: string | null; subcategorias?: { nome?: string | null }[] | null }
type Carga = { chave: string; docs: Categoria[] | null }

const idDe = (v: unknown): string | null => {
  const id = v && typeof v === 'object' && 'id' in v ? (v as { id: unknown }).id : v
  return id === null || id === undefined || id === '' ? null : String(id)
}

const idsDe = (v: unknown): string[] => (Array.isArray(v) ? v : [v]).map(idDe).filter((x): x is string => x !== null)

const nomesDe = (c: Categoria) => (c.subcategorias ?? []).map((s) => s?.nome?.trim()).filter((n): n is string => Boolean(n))

type Props = FieldDescriptionClientProps & {
  /**
   * true = campo "Subcategorias" da corrida (lê as categorias do campo "categorias", aceita vários nomes e
   * vazio = todas). Sem isso: campo "Subcategoria" da inscrição (lê o campo "categoria").
   */
  corrida?: boolean
}

/**
 * Descrição dos campos de subcategoria: mostra quais são as subcategorias da(s) categoria(s) escolhida(s)
 * no formulário (e avisa quando não há nenhuma). Busca de novo quando a escolha muda.
 * - Inscrição: "Subcategoria" (um nome).
 * - Corrida: "Subcategorias" (vários nomes; vazio = todas), para horários diferentes por subcategoria.
 */
export function DescricaoSubcategoria({ path, corrida = false }: Props) {
  const valor = useFormFields(([campos]) => (corrida ? campos.categorias?.value : campos.categoria?.value))
  const ids = idsDe(valor)
  const chave = ids.join(',')
  const { config } = useConfig()
  const [carga, setCarga] = useState<Carga | null>(null)

  useEffect(() => {
    if (!chave) return
    const controle = new AbortController()
    const filtro = chave
      .split(',')
      .map((id, i) => `where[id][in][${i}]=${encodeURIComponent(id)}`)
      .join('&')
    const url = `${config.serverURL ?? ''}${config.routes.api}/categorias?${filtro}&depth=0&limit=50&select[nome]=true&select[subcategorias]=true`
    fetch(url, { credentials: 'include', signal: controle.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ docs?: Categoria[] }>) : null))
      .then((r) => {
        // Na ordem escolhida no formulário
        const docs = r?.docs ?? null
        setCarga({ chave, docs: docs && chave.split(',').map((id) => docs.find((d) => idDe(d.id) === id)).filter((d): d is Categoria => Boolean(d)) })
      })
      .catch(() => {
        if (!controle.signal.aborted) setCarga({ chave, docs: null })
      })
    return () => controle.abort()
  }, [chave, config.serverURL, config.routes.api])

  const docs = carga && carga.chave === chave ? carga.docs : undefined
  const comSubs = (docs ?? []).filter((c) => nomesDe(c).length > 0)
  const nomeCat = (c: Categoria | undefined) => (c?.nome?.trim() ? c.nome.trim() : 'esta categoria')

  let texto: string
  if (corrida) {
    const base = 'Opcional. Vazio = todas as subcategorias da categoria.'
    if (!chave) texto = `${base} Escolha a categoria para ver as subcategorias dela.`
    else if (docs === undefined) texto = `${base} Buscando as subcategorias…`
    else if (docs === null) texto = `${base} Escreva os nomes exatos, um por item.`
    else if (!comSubs.length)
      texto = docs.length > 1 ? 'Estas categorias não têm subcategorias: deixe vazio.' : `A categoria ${nomeCat(docs[0])} não tem subcategorias: deixe vazio.`
    else
      texto = `${base} Preencha só quando o horário for de algumas subcategorias. ${comSubs
        .map((c) => `Subcategorias de ${nomeCat(c)}: ${nomesDe(c).join(', ')}.`)
        .join(' ')} Escreva os nomes exatos, um por item.`
  } else {
    const doc = docs?.[0]
    const nomes = doc ? nomesDe(doc) : []
    texto = 'Opcional. Escolha a categoria para ver as subcategorias dela.'
    if (chave && docs === undefined) texto = 'Opcional. Buscando as subcategorias da categoria…'
    else if (chave && (docs === null || !doc)) texto = 'Opcional. Escreva exatamente o nome de uma subcategoria da categoria escolhida.'
    else if (chave && !nomes.length) texto = `Opcional. A categoria ${nomeCat(doc)} não tem subcategorias: deixe em branco.`
    else if (chave)
      texto = `Opcional. Subcategorias de ${nomeCat(doc)}: ${nomes.join(', ')}. Escreva exatamente um desses nomes (os resultados no site saem separados por subcategoria).`
  }

  return <FieldDescription path={path} description={texto} />
}
