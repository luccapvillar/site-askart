/** Desliga a pré-visualização: GET /previa/sair?caminho=/ — volta a ver o site publicado. */
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { caminhoSeguro } from '@/lib/previa/servidor'

export async function GET(request: Request) {
  const caminho = caminhoSeguro(new URL(request.url).searchParams.get('caminho'))
  ;(await draftMode()).disable()
  redirect(caminho)
}
