/**
 * Atualizações do site já publicado (roda a cada publicação, logo depois de dados:oficiais).
 *
 * Cada atualização é aplicada UMA vez: ao terminar, fica uma marca no armazenamento interno do Payload
 * (payload.kv). Assim, se o moderador desfizer depois (ex.: tirar a aba Avisos do menu), a próxima
 * publicação não refaz. Uma atualização que falha só é registrada no log e volta a ser tentada na
 * próxima publicação — nunca derruba a publicação do site.
 *
 * 1. Aba "Avisos" no menu do topo, logo depois de Notícias (pedido do cliente).
 * 2. Modalidade das categorias (karts profissionais ou karts indoor).
 * 3. Texto do evento aberto ao público ("Venha assistir"), se ainda for o padrão antigo.
 * 4. Kart indoor como UMA categoria com subcategorias (o cliente informou que o indoor também tem
 *    subcategorias): cria "Kart indoor" e exclui as 4 categorias indoor separadas que não estão em uso.
 */
import { getPayload, type Payload } from 'payload'
import config from '../src/payload.config'
import { CATEGORIAS_INDOOR_OFICIAIS } from '../src/collections/competicao/Categorias'
import { resolverLink, type ValorLink } from '../src/fields/link'
import {
  ITENS_EVENTO_PUBLICO_ANTIGOS,
  ITENS_EVENTO_PUBLICO_PADRAO,
  TEXTO_EVENTO_PUBLICO_ANTIGO,
  TEXTO_EVENTO_PUBLICO_PADRAO,
} from '../src/globals/Configuracoes'
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

/* ─────────────────── 2. BKS: karts profissionais e karts indoor ─────────────────── */

/**
 * As categorias que já existiam são de karts profissionais (a migração já grava esse padrão; aqui só se
 * confere). Categorias com os nomes do kart indoor que já existam passam para a modalidade indoor.
 * Este passo não cria mais as 4 categorias indoor separadas: o kart indoor agora é UMA categoria com
 * subcategorias (passo 4, unificarKartIndoor). Não cria temporada, etapa nem horário (não informados).
 */
async function criarCategoriasIndoor(payload: Payload): Promise<string> {
  const semModalidade = await payload.find({
    collection: 'categorias',
    where: { modalidade: { exists: false } },
    limit: 500,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  for (const c of semModalidade.docs) {
    await payload.update({ collection: 'categorias', id: c.id, data: { modalidade: 'profissional' } as never, overrideAccess: true, context: { ...contexto } })
  }

  const ajustadas: string[] = []
  for (const nome of CATEGORIAS_INDOOR_OFICIAIS) {
    const { docs } = await payload.find({ collection: 'categorias', where: { nome: { equals: nome } }, limit: 1, depth: 0, overrideAccess: true })
    const existente = docs[0] as { id: number; modalidade?: string | null } | undefined
    if (existente && existente.modalidade !== 'indoor') {
      await payload.update({ collection: 'categorias', id: existente.id, data: { modalidade: 'indoor' } as never, overrideAccess: true, context: { ...contexto } })
      ajustadas.push(nome)
    }
  }
  const partes = [
    semModalidade.docs.length ? `${semModalidade.docs.length} categoria(s) marcada(s) como karts profissionais` : null,
    ajustadas.length ? `marcadas como indoor: ${ajustadas.join(', ')}` : null,
  ].filter(Boolean)
  return partes.length ? partes.join('; ') : 'nada a fazer: as modalidades já estavam certas'
}

/* ─────────────────── 4. Kart indoor: uma categoria com subcategorias ─────────────────── */

/** Nome da categoria única do kart indoor. */
const KART_INDOOR = 'Kart indoor'

/**
 * Subcategorias do kart indoor (só os nomes, na ordem informada pelo cliente): são os mesmos nomes das
 * 4 categorias indoor separadas criadas antes — Novatos - 95KGs (15HP), 80KGs (15HP), 95KGs (15HP) e
 * 110KGs (15HP).
 */
const SUBCATEGORIAS_INDOOR: string[] = [...CATEGORIAS_INDOOR_OFICIAIS]

/** Onde uma categoria pode estar em uso: se estiver em qualquer um, ela NÃO é excluída. */
const USOS_DA_CATEGORIA = [
  { collection: 'etapas', campo: 'categorias', rotulo: 'etapas' },
  { collection: 'etapas', campo: 'gradeTreinosLivres.categorias', rotulo: 'grade de treinos livres de etapas' },
  { collection: 'inscricoes', campo: 'categoria', rotulo: 'inscrições' },
  { collection: 'corridas', campo: 'categorias', rotulo: 'corridas' },
  { collection: 'temporada-categorias', campo: 'categoria', rotulo: 'categorias de temporada' },
] as const

/**
 * Em que a categoria está em uso (lista vazia = em nada). Confere o documento gravado e, nas coleções com
 * rascunho, também a versão mais recente. Se uma consulta falhar, conta como "em uso": na dúvida, não exclui.
 */
async function usosDaCategoria(payload: Payload, id: number): Promise<string[]> {
  const usos: string[] = []
  for (const u of USOS_DA_CATEGORIA) {
    for (const draft of [false, true]) {
      try {
        const { totalDocs } = await payload.find({
          collection: u.collection,
          where: { [u.campo]: { equals: id } },
          limit: 1,
          depth: 0,
          draft,
          overrideAccess: true,
        })
        if (totalDocs) {
          usos.push(`${u.rotulo} (${totalDocs})`)
          break
        }
      } catch (erro) {
        usos.push(`${u.rotulo} (não foi possível conferir: ${(erro as Error).message})`)
        break
      }
    }
  }
  return usos
}

/**
 * Kart indoor como UMA categoria com subcategorias. (1) Cria "Kart indoor" (modalidade indoor, visível)
 * com as subcategorias, se ainda não existir; se existir sem subcategorias, só preenche as subcategorias.
 * (2) Exclui as 4 categorias indoor separadas criadas antes SOMENTE se nenhuma etapa, inscrição, corrida ou
 * categoria de temporada as usar (a exclusão do painel ainda recusa qualquer outro vínculo); as que estão
 * em uso ficam como estão e o motivo vai para o log.
 */
async function unificarKartIndoor(payload: Payload): Promise<string> {
  const partes: string[] = []

  const { docs } = await payload.find({ collection: 'categorias', where: { nome: { equals: KART_INDOOR } }, limit: 1, depth: 0, overrideAccess: true })
  const existente = docs[0] as { id: number; subcategorias?: unknown[] | null } | undefined
  if (!existente) {
    await payload.create({
      collection: 'categorias',
      data: { nome: KART_INDOOR, modalidade: 'indoor', visibilidade: 'visivel', subcategorias: SUBCATEGORIAS_INDOOR.map((nome) => ({ nome })) } as never,
      overrideAccess: true,
      context: { ...contexto },
    })
    partes.push(`categoria "${KART_INDOOR}" criada com ${SUBCATEGORIAS_INDOOR.length} subcategorias`)
  } else if (!existente.subcategorias?.length) {
    await payload.update({
      collection: 'categorias',
      id: existente.id,
      data: { subcategorias: SUBCATEGORIAS_INDOOR.map((nome) => ({ nome })) } as never,
      overrideAccess: true,
      context: { ...contexto },
    })
    partes.push(`subcategorias preenchidas em "${KART_INDOOR}"`)
  } else {
    partes.push(`"${KART_INDOOR}" já existia com subcategorias: mantida como está`)
  }

  const excluidas: string[] = []
  const mantidas: string[] = []
  for (const nome of CATEGORIAS_INDOOR_OFICIAIS) {
    const { docs: antigas } = await payload.find({
      collection: 'categorias',
      where: { and: [{ nome: { equals: nome } }, { modalidade: { equals: 'indoor' } }] },
      limit: 10,
      depth: 0,
      overrideAccess: true,
    })
    for (const antiga of antigas as { id: number }[]) {
      const usos = await usosDaCategoria(payload, antiga.id)
      if (usos.length) {
        mantidas.push(`"${nome}" (em uso em: ${usos.join(', ')})`)
        continue
      }
      try {
        await payload.delete({ collection: 'categorias', id: antiga.id, overrideAccess: true, context: { ...contexto } })
        excluidas.push(`"${nome}"`)
      } catch (erro) {
        // A exclusão do painel recusa categoria com qualquer outro vínculo (notícias, treinos…): fica como está
        mantidas.push(`"${nome}" (${(erro as Error).message})`)
      }
    }
  }
  if (excluidas.length) partes.push(`categorias indoor separadas excluídas: ${excluidas.join(', ')}`)
  if (mantidas.length) {
    partes.push(`categorias indoor separadas mantidas: ${mantidas.join('; ')}`)
    payload.logger.warn(`Kart indoor: categorias antigas mantidas porque estão em uso — ${mantidas.join('; ')}. Revise no painel (Competição › Categorias).`)
  }
  return partes.join('; ')
}

/* ─────────────────── 3. Evento aberto ao público ("Venha assistir") ─────────────────── */

type ItemEvento = { texto?: string | null; descricao?: string | null }

/** Lista ainda igual à padrão antiga (Food trucks, Telão, Mesas e cadeiras, Narrador, sem explicação)? */
const itensAntigos = (itens: ItemEvento[]) =>
  itens.length === ITENS_EVENTO_PUBLICO_ANTIGOS.length &&
  itens.every((item, i) => item.texto?.trim() === ITENS_EVENTO_PUBLICO_ANTIGOS[i] && !item.descricao?.trim())

/**
 * Troca o texto e os itens do evento aberto ao público pelo texto do cliente SÓ quando ainda estão no
 * padrão antigo ou vazios: o que o administrador já tiver escrito fica como está.
 */
async function atualizarEventoPublico(payload: Payload): Promise<string> {
  const atual = (await payload.findGlobal({ slug: 'configuracoes', depth: 0, overrideAccess: true })) as unknown as {
    textoEventoPublico?: string | null
    itensEventoPublico?: ItemEvento[] | null
  }
  const texto = atual.textoEventoPublico?.trim() ?? ''
  const itens = atual.itensEventoPublico ?? []
  const data: Record<string, unknown> = {}
  if (!texto || texto === TEXTO_EVENTO_PUBLICO_ANTIGO) data.textoEventoPublico = TEXTO_EVENTO_PUBLICO_PADRAO
  if (!itens.length || itensAntigos(itens)) data.itensEventoPublico = ITENS_EVENTO_PUBLICO_PADRAO.map((i) => ({ ...i }))
  if (!Object.keys(data).length) return 'nada a fazer: o texto e os itens já foram personalizados'
  await payload.updateGlobal({ slug: 'configuracoes', data: data as never, overrideAccess: true, context: { ...contexto } })
  return [data.textoEventoPublico && 'texto atualizado', data.itensEventoPublico && 'itens atualizados'].filter(Boolean).join(' e ')
}

/* ───────────────────────────── execução ───────────────────────────── */

const ATUALIZACOES: Atualizacao[] = [
  { chave: 'atualizacao:2026-10-versoes-iniciais', descricao: 'Versões publicadas do que já existia', aplicar: criarVersoesIniciais },
  { chave: 'atualizacao:2026-10-aba-avisos-no-menu', descricao: 'Aba "Avisos" no menu', aplicar: adicionarAbaAvisos },
  { chave: 'atualizacao:2026-10-sem-avisos-de-exemplo', descricao: 'Aba Avisos sem exemplos', aplicar: removerAvisosDeDemonstracao },
  { chave: 'atualizacao:2026-10-subcategorias', descricao: 'Subcategorias do F400 e da 125cc', aplicar: preencherSubcategorias },
  { chave: 'atualizacao:2026-10-categorias-indoor', descricao: 'Categorias de kart indoor', aplicar: criarCategoriasIndoor },
  { chave: 'atualizacao:2026-10-evento-publico', descricao: 'Texto do evento aberto ao público', aplicar: atualizarEventoPublico },
  { chave: 'atualizacao:2026-10-kart-indoor-subcategorias', descricao: 'Kart indoor com subcategorias', aplicar: unificarKartIndoor },
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
