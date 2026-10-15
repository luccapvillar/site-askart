import { NextResponse } from 'next/server'
import { lerDocumento } from '@/lib/publico'

/**
 * Endereço estável de um documento (/documentos/<endereço>/arquivo): leva ao arquivo atual.
 * Ao substituir o PDF no painel, os links já divulgados continuam valendo.
 */
export async function GET(requisicao: Request, { params }: { params: Promise<{ slug: string }> }) {
  const doc = await lerDocumento((await params).slug)
  if (!doc?.url) return new NextResponse('Documento não encontrado.', { status: 404 })
  return NextResponse.redirect(new URL(doc.url, requisicao.url), 302)
}
