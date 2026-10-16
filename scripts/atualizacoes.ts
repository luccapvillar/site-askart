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
import { contexto } from './comum'

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

/* ───────────────────────────── execução ───────────────────────────── */

const ATUALIZACOES: Atualizacao[] = [
  { chave: 'atualizacao:2026-10-aba-avisos-no-menu', descricao: 'Aba "Avisos" no menu', aplicar: adicionarAbaAvisos },
]

async function principal() {
  const payload = await getPayload({ config })
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
