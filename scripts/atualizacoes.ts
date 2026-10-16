/**
 * Atualizações do site já publicado (roda a cada publicação, logo depois de dados:oficiais).
 *
 * Cada atualização é aplicada UMA vez: ao terminar, fica uma marca no armazenamento interno do Payload
 * (payload.kv). Assim, se o moderador desfizer depois (ex.: tirar a aba Avisos do menu), a próxima
 * publicação não refaz. Uma atualização que falha só é registrada no log e volta a ser tentada na
 * próxima publicação — nunca derruba a publicação do site.
 *
 * 1. Aba "Avisos" no menu do topo, logo depois de Notícias (pedido do cliente).
 */
import { getPayload, type Payload } from 'payload'
import config from '../src/payload.config'
import { resolverLink, type ValorLink } from '../src/fields/link'
import { contexto, SUBCATEGORIAS, publicarPorPadrao } from './comum'

type Atualizacao = { chave: string; descricao: string; aplicar: (payload: Payload) => Promise<string> }

/* ───────────────────────────── 1. Aba "Avisos" no menu ───────────────────────────── */

type Aba = { id?: string | null; link?: ValorLink | null; subitens?: unknown[] | null }

/** Máximo de abas do menu (src/globals/Navegacao.ts, campo "menu", maxRows). */
const MAXIMO_ABAS = 6

/**
 * A aba nova aponta para a seção fixa "comunicados" (src/fields/link.ts): o endereço /comunicados leva
 * a /avisos, e a seção pode passar a apontar direto para /avisos sem mudar o que está gravado.
 */
const abaAvisos = (): Aba => ({ link: { tipo: 'rota', rota: 'comunicados', rotulo: 'Avisos', novaAba: false }, subitens: [] })

/** Menu padrão (o mesmo do painel e do site), para o caso de o menu gravado estar vazio. */
const rota = (r: string): Aba => ({ link: { tipo: 'rota', rota: r }, subitens: [] })
const menuPadrao = (): Aba[] => [rota('bks'), rota('kartodromo'), rota('noticias'), abaAvisos(), rota('contato')]

/** Caminho de um endereço do menu, sem barra no fim ("https://site/avisos/" → "/avisos"). */
function caminho(link: ValorLink | null | undefined): string | null {
  const href = resolverLink(link)
  if (!href) return null
  try {
    return new URL(href, 'http://site.local').pathname.replace(/\/+$/, '') || '/'
  } catch {
    return null
  }
}

const levaA = (aba: Aba, ...caminhos: string[]) => {
  const c = caminho(aba.link)
  return c !== null && caminhos.includes(c)
}

const ehAbaAvisos = (aba: Aba) => levaA(aba, '/avisos', '/comunicados')

/** Menu com a aba Avisos (ou o motivo de não mexer). Não altera o menu recebido. */
function comAbaAvisos(menu: Aba[]): { menu: Aba[] } | { motivo: string } {
  if (!menu.length) return { menu: menuPadrao() }
  if (menu.some(ehAbaAvisos)) return { motivo: 'o menu já tem a aba de avisos' }
  if (menu.length >= MAXIMO_ABAS) return { motivo: `o menu já tem ${MAXIMO_ABAS} abas (o máximo)` }
  // Logo depois de Notícias; sem Notícias, antes de Contato; sem as duas, no fim
  const noticias = menu.map((aba) => levaA(aba, '/noticias')).lastIndexOf(true)
  const contato = menu.findIndex((aba) => levaA(aba, '/contato'))
  const posicao = noticias >= 0 ? noticias + 1 : contato >= 0 ? contato : menu.length
  return { menu: [...menu.slice(0, posicao), abaAvisos(), ...menu.slice(posicao)] }
}

/** Dados do global sem os campos de controle (id, datas, situação). */
function semControle(doc: Record<string, unknown>) {
  const dados = { ...doc }
  for (const campo of ['id', 'globalType', 'createdAt', 'updatedAt', '_status']) delete dados[campo]
  return dados
}

async function adicionarAbaAvisos(payload: Payload): Promise<string> {
  const slug = 'navegacao' as const
  const global = payload.config.globals.find((g) => g.slug === slug)
  if (!global) return 'global do menu não encontrado: nada feito'
  const comRascunho = Boolean(global.versions && global.versions.drafts)

  // Versão publicada (é a que o site mostra) e, se houver, o rascunho em edição no painel
  const publicado = (await payload.findGlobal({ slug, depth: 0, draft: false, overrideAccess: true })) as unknown as Record<string, unknown>
  const ultima = comRascunho
    ? ((await payload.findGlobal({ slug, depth: 0, draft: true, overrideAccess: true })) as unknown as Record<string, unknown>)
    : null
  const rascunho = ultima?._status === 'draft' ? ultima : null

  const resultado = comAbaAvisos((publicado.menu ?? []) as Aba[])
  if ('motivo' in resultado) return `nada a fazer: ${resultado.motivo}`

  // Grava a versão PUBLICADA com todos os campos da publicada: nada do rascunho vai junto para o site
  await payload.updateGlobal({
    slug,
    draft: false,
    overrideAccess: true,
    context: { ...contexto },
    data: { ...semControle(publicado), menu: resultado.menu, ...(comRascunho ? { _status: 'published' } : {}) } as never,
  })

  // Havia um rascunho em edição: grava-o de novo (com a aba, se faltar) para ele continuar sendo o mais recente
  if (rascunho) {
    const menuRascunho = (rascunho.menu ?? []) as Aba[]
    const noRascunho = menuRascunho.length ? comAbaAvisos(menuRascunho) : { motivo: 'menu vazio no rascunho' }
    await payload.updateGlobal({
      slug,
      draft: true,
      overrideAccess: true,
      context: { ...contexto },
      data: {
        ...semControle(rascunho),
        ...('menu' in noRascunho ? { menu: noRascunho.menu } : {}),
        _status: 'draft',
      } as never,
    })
  }

  const posicao = resultado.menu.findIndex(ehAbaAvisos) + 1
  return `aba "Avisos" adicionada ao menu (${posicao}ª aba)${rascunho ? '; o rascunho em edição foi mantido' : ''}`
}

/** Subcategorias do F400 e da 125cc (só os nomes). Não mexe em categoria que já tenha subcategorias. */
async function preencherSubcategorias(payload: Payload): Promise<string> {
  const feitas: string[] = []
  for (const [nome, subs] of Object.entries(SUBCATEGORIAS)) {
    const { docs } = await payload.find({ collection: 'categorias', where: { nome: { equals: nome } }, limit: 1, depth: 0 })
    const cat = docs[0] as { id: number; subcategorias?: unknown[] | null } | undefined
    if (!cat || cat.subcategorias?.length) continue
    await payload.update({
      collection: 'categorias',
      id: cat.id,
      data: { subcategorias: subs.map((s) => ({ nome: s })) } as never,
      overrideAccess: true,
      context: { ...contexto },
    })
    feitas.push(nome)
  }
  return feitas.length ? `subcategorias preenchidas em ${feitas.join(' e ')}` : 'nada a preencher'
}

/** A aba Avisos começa vazia: tira os avisos de demonstração (o moderador publica os reais). */
async function removerAvisosDeDemonstracao(payload: Payload): Promise<string> {
  const { docs } = await payload.find({
    collection: 'avisos',
    where: { titulo: { like: '[DEMONSTRAÇÃO]' } },
    limit: 100,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })
  const demo = docs.filter((d) => String((d as { titulo?: string }).titulo ?? '').startsWith('[DEMONSTRAÇÃO]'))
  for (const d of demo) await payload.delete({ collection: 'avisos', id: d.id, overrideAccess: true, context: { ...contexto } })
  return demo.length ? `${demo.length} aviso(s) de demonstração removido(s)` : 'nenhum aviso de demonstração'
}

/**
 * Rascunho ligado em etapas, perguntas e textos do site: grava uma versão publicada de cada um, para a
 * pré-visualização e a lista de pendentes enxergarem o que já existia antes.
 */
async function criarVersoesIniciais(payload: Payload): Promise<string> {
  let total = 0
  const falhas: string[] = []
  for (const collection of ['etapas', 'perguntas'] as const) {
    const { docs } = await payload.find({ collection, limit: 1000, depth: 0, overrideAccess: true, pagination: false })
    for (const d of docs) {
      const versoes = await payload.countVersions({ collection, where: { parent: { equals: d.id } }, overrideAccess: true })
      if (versoes.totalDocs) continue
      try {
        await payload.update({ collection, id: d.id, data: {}, overrideAccess: true, context: { ...contexto } })
        total++
      } catch (erro) {
        falhas.push(`${collection} ${d.id}: ${(erro as Error).message}`)
      }
    }
  }
  for (const slug of ['pagina-inicial', 'kartodromo', 'contato', 'institucional', 'textos-paginas', 'navegacao'] as const) {
    try {
      await payload.updateGlobal({ slug, data: {}, overrideAccess: true, context: { ...contexto } })
      total++
    } catch (erro) {
      falhas.push(`${slug}: ${(erro as Error).message}`)
    }
  }
  if (falhas.length) throw new Error(`versões iniciais com falha: ${falhas.join('; ')}`)
  return `${total} versão(ões) publicada(s) gravada(s)`
}

/* ───────────────────────────── execução ───────────────────────────── */

const ATUALIZACOES: Atualizacao[] = [
  { chave: 'atualizacao:2026-10-versoes-iniciais', descricao: 'Versões publicadas do que já existia', aplicar: criarVersoesIniciais },
  { chave: 'atualizacao:2026-10-aba-avisos-no-menu', descricao: 'Aba "Avisos" no menu', aplicar: adicionarAbaAvisos },
  { chave: 'atualizacao:2026-10-sem-avisos-de-exemplo', descricao: 'Aba Avisos sem exemplos', aplicar: removerAvisosDeDemonstracao },
  { chave: 'atualizacao:2026-10-subcategorias', descricao: 'Subcategorias do F400 e da 125cc', aplicar: preencherSubcategorias },
]

async function principal() {
  const payload = publicarPorPadrao(await getPayload({ config }))
  for (const a of ATUALIZACOES) {
    if (await payload.kv.has(a.chave)) {
      payload.logger.info(`Atualização "${a.descricao}": já aplicada antes.`)
      continue
    }
    try {
      const mensagem = await a.aplicar(payload)
      await payload.kv.set(a.chave, { aplicadaEm: new Date().toISOString(), resultado: mensagem })
      payload.logger.info(`Atualização "${a.descricao}": ${mensagem}.`)
    } catch (erro) {
      // Não interrompe a publicação: tenta de novo na próxima
      payload.logger.error({ err: erro }, `Atualização "${a.descricao}" falhou (será tentada na próxima publicação).`)
    }
  }
}

try {
  await principal()
  process.exit(0)
} catch (erro) {
  console.error(erro)
  process.exit(1)
}
