/** Peças comuns aos scripts de carga (dados oficiais e demonstração). */
import fs from 'node:fs'
import path from 'node:path'
import type { Payload } from 'payload'

export const DEMO = '[DEMONSTRAÇÃO]'
export const contexto = { semRevalidar: true, semRegistro: true }
export const raiz = process.cwd()
export type Id = number

/** Instante em Brasília (UTC−3) como ISO. */
export const emBrasilia = (dia: string, hora: string) => new Date(`${dia}T${hora}:00-03:00`).toISOString()

/** Envia uma foto para a Mídia (ou reaproveita a que tem a mesma descrição). */
export async function enviarFoto(payload: Payload, arquivos: string | string[], dados: { alt: string; credito?: string; legenda?: string }) {
  const existente = await payload.find({ collection: 'midia', where: { alt: { equals: dados.alt } }, limit: 1, depth: 0 })
  if (existente.docs[0]) return existente.docs[0].id as Id
  // A primeira opção que existir (ex.: logo em alta resolução, senão a recebida)
  const arquivo = (Array.isArray(arquivos) ? arquivos : [arquivos]).find((a) => fs.existsSync(path.join(raiz, a)))
  if (!arquivo) throw new Error(`Foto não encontrada: ${String(arquivos)}`)
  // Contexto novo a cada envio: o armazenamento guarda o arquivo nele, e um contexto reaproveitado faria a
  // próxima foto ser tomada pela anterior (só a primeira chegava ao Blob)
  const doc = await payload.create({ collection: 'midia', data: dados, filePath: path.join(raiz, arquivo), context: { ...contexto } })
  return doc.id as Id
}

const CREDITO_VM = 'Vinícius de Melo — Flickr (marcação de domínio público)'
const CREDITO_JH = 'Jaqueline Husni — Flickr (marcação de domínio público)'

/** Fotos e logos confirmados (recebidos do cliente ou de uso livre, com crédito). */
export async function fotosOficiais(payload: Payload) {
  return {
    logoAskart: await enviarFoto(payload, ['marca/melhoradas/logo-askart.png', 'marca/recebidos/logo-askart-recortada.png'], {
      alt: 'Logo da ASKART — Associação de Pilotos de Kart de Brasília',
    }),
    logoBks: await enviarFoto(payload, ['marca/melhoradas/bks-logo.png', 'marca/recebidos/bks-logo-transparente.png'], {
      alt: 'Logo do BKS — Brasília Kart Series',
    }),
    aereo: await enviarFoto(payload, 'marca/recebidos/kartodromo-aereo-story.jpg', { alt: 'Vista aérea do Kartódromo Ayrton Senna do Guará' }),
    chuva: await enviarFoto(payload, 'marca/recebidos/largada-chuva.jpg', { alt: 'Largada de uma corrida de kart com pista molhada' }),
    pelotao: await enviarFoto(payload, 'marca/fotos-livres/guara-2022-pelotao-reta.jpg', {
      alt: 'Três karts em fila na reta do Kartódromo do Guará durante uma corrida',
      credito: CREDITO_JH,
    }),
    grid: await enviarFoto(payload, 'marca/fotos-livres/guara-2022-grid.jpg', {
      alt: 'Karts alinhados na reta antes da largada, com o comissário segurando a bandeira verde',
      credito: CREDITO_JH,
    }),
    panning: await enviarFoto(payload, 'marca/fotos-livres/guara-2021-panning-30.jpg', {
      alt: 'Kart número 30 em alta velocidade passando pela zebra vermelha e branca',
      credito: CREDITO_VM,
    }),
    curva42: await enviarFoto(payload, 'marca/fotos-livres/guara-2021-curva-42.jpg', { alt: 'Kart número 42 inclinado numa curva do kartódromo', credito: CREDITO_VM }),
    curvaAberta: await enviarFoto(payload, 'marca/fotos-livres/guara-2021-curva-aberta.jpg', {
      alt: 'Kart laranja contornando uma curva aberta do kartódromo',
      credito: CREDITO_VM,
    }),
  }
}

export type Fotos = Awaited<ReturnType<typeof fotosOficiais>>
