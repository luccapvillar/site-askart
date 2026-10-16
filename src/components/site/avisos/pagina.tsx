/** Página de um aviso, compartilhada por /avisos/[id] e pelo endereço antigo /comunicados/[id]. */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { semDemo } from '@/components/site/TextoDemo'
import { lerAviso } from '@/lib/publico'
import { resumoDoAviso } from './comum'
import { DetalheAviso } from './DetalheAviso'

export type PropsAviso = { params: Promise<{ id: string }> }

const idValido = (v: string) => (/^\d{1,9}$/.test(v) ? Number(v) : null)

export async function metadadosDoAviso({ params }: PropsAviso): Promise<Metadata> {
  const id = idValido((await params).id)
  const a = id === null ? null : await lerAviso(id)
  if (!a) return { title: 'Aviso não encontrado' }
  return {
    title: semDemo(a.titulo),
    description: resumoDoAviso(a.texto, 160) || undefined,
    // Endereço oficial: /avisos/[id] (também para quem chega por /comunicados/[id])
    alternates: { canonical: `/avisos/${a.id}` },
  }
}

export async function PaginaDoAviso({ params }: PropsAviso) {
  const id = idValido((await params).id)
  if (id === null) notFound()
  const a = await lerAviso(id)
  if (!a) notFound()
  return <DetalheAviso aviso={a} />
}
