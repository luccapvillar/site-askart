/** Peças comuns aos scripts de carga (dados oficiais e demonstração). */
import fs from 'node:fs'
import path from 'node:path'
import type { Payload } from 'payload'
import { chaveCorrida, FORMATO_POR_SUBCATEGORIA, planejarCorridas } from '../src/hooks/competicao/validacoes'
import { chaveDia } from '../src/lib/datas'

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

/** Subcategorias informadas pelo cliente (só os nomes, como aparecem na inscrição do BKS). */
export const SUBCATEGORIAS: Record<string, string[]> = {
  F400: ['Novatos', 'Junior', 'Graduados', 'Sênior', 'GSS/60+'],
  '125cc': ['Novatos', 'Junior', 'Graduados', 'Sênior'],
}

/**
 * Horários de EXEMPLO (só na prévia) das sessões de cada subcategoria no dia da etapa: uma rodada por sessão
 * — os warm-ups de todas as subcategorias, depois as classificações, a Corrida 1 e a Corrida 2 —, com as
 * subcategorias em sequência dentro da rodada. Nove subcategorias (F400 e 125cc) vão das 8h às 13h36.
 */
const RODADAS_DE_EXEMPLO = [
  { inicio: 8 * 60, passo: 6 }, // Warm-up: 08:00, 08:06…
  { inicio: 9 * 60, passo: 8 }, // Classificação: 09:00, 09:08…
  { inicio: 10 * 60 + 15, passo: 12 }, // Corrida 1: 10:15, 10:27…
  { inicio: 12 * 60, passo: 12 }, // Corrida 2: 12:00, 12:12…
]

/** "HH:MM" de exemplo da sessão `rodada` (0 = Warm-up … 3 = Corrida 2) da subcategoria de posição `indice`. */
export function horaDeExemplo(rodada: number, indice: number): string {
  const r = RODADAS_DE_EXEMPLO[Math.max(0, Math.min(rodada, RODADAS_DE_EXEMPLO.length - 1))]
  const minutos = r.inicio + indice * r.passo
  return `${String(Math.floor(minutos / 60) % 24).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
}

/**
 * Exemplos (só na prévia): cria na etapa, para cada subcategoria das categorias dadas, Warm-up,
 * Classificação, Corrida 1 e Corrida 2 (em rascunho, sem resultados) com horários de exemplo no dia da etapa.
 * Não repete as que já existem. Devolve quantas criou.
 */
export async function criarSessoesDeExemplo(
  payload: Payload,
  etapa: { id: Id; inicio: string },
  categorias: { id: Id; subcategorias: string[] }[],
): Promise<number> {
  const { docs } = await payload.find({
    collection: 'corridas',
    where: { etapa: { equals: etapa.id } },
    limit: 1000,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  // Chave de cada corrida existente, calculada como o hook calcula (o campo gravado não é lido fora do sistema)
  const existentes = new Set(docs.map((c) => chaveCorrida(etapa.id, c.categorias ?? [], c.nome, c.subcategorias ?? [])))
  const plano = planejarCorridas(
    etapa.id,
    [],
    categorias.map((c) => c.id),
    existentes,
    new Map(categorias.map((c) => [String(c.id), c.subcategorias])),
  )
  const posicao = new Map(categorias.flatMap((c) => c.subcategorias.map((s) => `${c.id}|${s}`)).map((chave, i) => [chave, i]))
  const dia = chaveDia(etapa.inicio)
  for (const corrida of plano.criar) {
    const { chaveUnica: _calculadaNoHook, ...dados } = corrida
    const rodada = FORMATO_POR_SUBCATEGORIA.findIndex((f) => f.nome === corrida.nome)
    const indice = posicao.get(`${corrida.categorias[0]}|${corrida.subcategorias?.[0] ?? ''}`) ?? 0
    await payload.create({
      collection: 'corridas',
      data: { ...dados, inicio: emBrasilia(dia, horaDeExemplo(rodada, indice)) } as never,
      overrideAccess: true,
      context: { ...contexto },
    })
  }
  return plano.criar.length
}

/**
 * Nos scripts, toda gravação sai PUBLICADA: globais e coleções com rascunho nasceriam como rascunho
 * (o padrão do Payload) e ficariam invisíveis no site. Quem quiser rascunho passa draft: true.
 */
export function publicarPorPadrao(payload: Payload) {
  const comRascunho = (versions: unknown) => Boolean(versions && typeof versions === 'object' && (versions as { drafts?: unknown }).drafts)
  const globais = new Set(payload.config.globals.filter((g) => comRascunho(g.versions)).map((g) => g.slug))
  const colecoes = new Set(payload.config.collections.filter((c) => comRascunho(c.versions)).map((c) => c.slug))
  const publicar = <A extends { draft?: boolean; data?: unknown }>(args: A): A =>
    args.draft ? args : { ...args, draft: false, data: { _status: 'published', ...(args.data as object) } }
  const updateGlobal = payload.updateGlobal.bind(payload)
  const create = payload.create.bind(payload)
  const update = payload.update.bind(payload)
  payload.updateGlobal = ((args: Parameters<typeof updateGlobal>[0]) =>
    updateGlobal(globais.has(args.slug) ? publicar(args) : args)) as typeof payload.updateGlobal
  payload.create = ((args: Parameters<typeof create>[0]) =>
    create(colecoes.has(args.collection) ? publicar(args) : args)) as typeof payload.create
  payload.update = ((args: Parameters<typeof update>[0]) =>
    update(colecoes.has(args.collection) ? publicar(args) : args)) as typeof payload.update
  return payload
}

export type Fotos = Awaited<ReturnType<typeof fotosOficiais>>
