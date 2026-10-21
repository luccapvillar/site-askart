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
 * 5. Só na prévia com exemplos: horários de exemplo por subcategoria (Warm-up, Classificação, Corrida 1 e
 *    Corrida 2) nas etapas futuras de demonstração, para o seletor de subcategoria do calendário.
 * 6. Regra do BKS (informada pelo cliente): etapa pontuada pela média das posições nas corridas, por
 *    subcategoria — preenche "Como a etapa é pontuada" nas regras que estão sem ele e recalcula a
 *    classificação das temporadas não encerradas.
 * 7. Topo da página inicial da ASKART (pedido do cliente: "o começo do site é mais da ASKART, e não do
 *    kartódromo nem do BKS"): o título, o subtítulo e os botões do topo que ainda forem o padrão antigo do
 *    BKS voltam a vazio — e vazio agora é a apresentação da ASKART. O que o moderador escreveu fica.
 * 8. Identidade da aba BKS pelas cores da logo (pedido do cliente): as cores do campeonato BKS passam a ser
 *    as da logo — azul royal como principal, vermelho de apoio e branco de destaque — SÓ se ainda estiverem
 *    vazias ou no padrão antigo (vermelho como principal, gravado pelo dados:oficiais). Cor escolhida no
 *    painel fica como está.
 * 9. Taxa de pista e mensalidade (enviadas pelo cliente em 21/10/2026): a "Taxa de pista" passa a R$ 80,00
 *    (avulsa) SÓ se ainda estiver "a confirmar"/sem valor; a introdução, os planos e as regras da mensalidade
 *    são preenchidos SÓ se estiverem vazios; o passo "Pague as taxas na Administração" do "Como treinar" ganha
 *    o valor da taxa de pista SÓ se o texto ainda for exatamente o original. O que o moderador mudou fica.
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
import { CONTEXTO_CALCULO_ANTIGO } from '../src/hooks/competicao/regras'
import { classificacoesDaTemporada } from '../src/lib/carregar-competicao'
import type { CalculoDaEtapa } from '../src/lib/classificacao'
import { CORES_BKS, coresDoBksSemEscolha } from '../src/lib/site'
import { textoParaLexical } from '../src/collections/conteudo/editores'
import {
  iniciantesSemTaxaDePista,
  PERGUNTA_TAXAS,
  RESPOSTA_TAXAS,
  RESPOSTA_TAXAS_ANTIGA,
  taxasDe2026,
} from '../src/lib/taxas'
import { ehBotoesAntigosDoTopo, ehSubtituloAntigoDoTopo, ehTituloAntigoDoTopo } from '../src/lib/topo-inicio'
import { contexto, criarSessoesDeExemplo, DEMO, SUBCATEGORIAS, publicarPorPadrao } from './comum'

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

/**
 * Só na prévia com exemplos: os pilotos de demonstração ganham subcategorias e as corridas de exemplo ganham
 * melhor volta, para os resultados por subcategoria aparecerem. Não toca em dado real.
 */
async function exemplosComSubcategorias(payload: Payload): Promise<string> {
  const { docs: categorias } = await payload.find({ collection: 'categorias', limit: 100, depth: 0, overrideAccess: true })
  const subsDe = new Map(
    (categorias as { id: number; subcategorias?: { nome?: string | null }[] | null }[]).map((c) => [
      c.id,
      (c.subcategorias ?? []).map((x) => x.nome?.trim() ?? '').filter(Boolean),
    ]),
  )
  const { docs } = await payload.find({ collection: 'inscricoes', limit: 2000, depth: 1, sort: 'id', overrideAccess: true, pagination: false })
  type Insc = { id: number; categoria?: number | { id: number }; subcategoria?: string | null; piloto?: { nome?: string } | number }
  const demo = (docs as Insc[]).filter((d) => typeof d.piloto === 'object' && String(d.piloto?.nome ?? '').startsWith(DEMO))
  const idsDemo = new Set(demo.map((d) => d.id))
  let inscricoes = 0
  const porCategoria = new Map<number, Insc[]>()
  for (const d of demo) {
    const cat = typeof d.categoria === 'object' ? d.categoria?.id : d.categoria
    if (cat) porCategoria.set(cat, [...(porCategoria.get(cat) ?? []), d])
  }
  for (const [cat, lista] of porCategoria) {
    const subs = subsDe.get(cat) ?? []
    if (!subs.length) continue
    for (const [i, d] of lista.entries()) {
      if (d.subcategoria) continue
      await payload.update({
        collection: 'inscricoes',
        id: d.id,
        data: { subcategoria: subs[Math.floor((i * subs.length) / lista.length)] } as never,
        overrideAccess: true,
        context: { ...contexto },
      })
      inscricoes++
    }
  }
  let corridas = 0
  const { docs: lista } = await payload.find({ collection: 'corridas', limit: 1000, depth: 0, overrideAccess: true, pagination: false })
  type Res = { inscricao?: number | { id: number }; melhorVoltaMs?: number | null }
  for (const [ci, c] of (lista as { id: number; resultados?: Res[] }[]).entries()) {
    const res = c.resultados ?? []
    const soDemo = res.length > 0 && res.every((r) => idsDemo.has(Number(typeof r.inscricao === 'object' ? r.inscricao?.id : r.inscricao)))
    if (!soDemo || res.some((r) => r.melhorVoltaMs)) continue
    await payload.update({
      collection: 'corridas',
      id: c.id,
      data: { resultados: res.map((r, pos) => ({ ...r, melhorVoltaMs: 50_000 + (ci % 4) * 1_500 + pos * 110 + ((pos * 7_919 + ci * 104_729) % 640) })) } as never,
      overrideAccess: true,
      context: { ...contexto },
    })
    corridas++
  }
  return `${inscricoes} inscrição(ões) de exemplo com subcategoria; ${corridas} corrida(s) de exemplo com melhor volta`
}

/* ─────────────────── 5. Exemplos: horários por subcategoria ─────────────────── */

type IdRel = number | { id: number } | null | undefined
const idDaRel = (r: IdRel) => (typeof r === 'object' && r !== null ? r.id : (r ?? null))

/**
 * Só na prévia com exemplos: nas etapas FUTURAS de demonstração (etapa ou temporada com "[DEMONSTRAÇÃO]"
 * no nome), F400 e 125cc ganham as sessões de cada subcategoria — Warm-up, Classificação, Corrida 1 e
 * Corrida 2, em rascunho, sem resultados — com horários de exemplo no dia da etapa, para o seletor
 * "Escolha a subcategoria" do calendário ter o que mostrar. A "Final" de exemplo dessas duas categorias
 * (para a categoria inteira, em rascunho e sem resultados) sai dessas etapas: cada subcategoria passa a ter
 * as suas corridas. Etapas reais, etapas que já aconteceram e qualquer outra sessão ficam como estão.
 */
async function exemplosDeHorariosPorSubcategoria(payload: Payload): Promise<string> {
  const { docs: cats } = await payload.find({
    collection: 'categorias',
    where: { nome: { in: Object.keys(SUBCATEGORIAS) } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })
  const categorias = cats
    .map((c) => ({ id: c.id, subcategorias: (c.subcategorias ?? []).map((x) => x.nome?.trim() ?? '').filter(Boolean) }))
    .filter((c) => c.subcategorias.length > 0)
  if (!categorias.length) return 'nada a fazer: F400 e 125cc ainda sem subcategorias'

  const { docs: etapas } = await payload.find({ collection: 'etapas', limit: 500, depth: 1, pagination: false, overrideAccess: true })
  const agora = Date.now()
  let etapasDeExemplo = 0
  let criadas = 0
  let removidas = 0
  const mantidas: string[] = []
  for (const etapa of etapas) {
    const temporada = typeof etapa.temporada === 'object' ? etapa.temporada : null
    const demo = String(etapa.nome ?? '').includes(DEMO) || String(temporada?.nome ?? '').includes(DEMO)
    const futura =
      Boolean(etapa.inicio) && new Date(etapa.inicio as string).getTime() > agora && etapa.status !== 'realizada' && etapa.status !== 'cancelada'
    if (!demo || !futura || temporada?.status === 'encerrada') continue
    const daEtapa = categorias.filter((c) => (etapa.categorias ?? []).some((x) => idDaRel(x as IdRel) === c.id))
    if (!daEtapa.length) continue
    etapasDeExemplo++
    criadas += await criarSessoesDeExemplo(payload, { id: etapa.id, inicio: etapa.inicio as string }, daEtapa)

    const { docs: corridas } = await payload.find({
      collection: 'corridas',
      where: { etapa: { equals: etapa.id } },
      limit: 1000,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    for (const c of corridas) {
      const categoriasDaCorrida = (c.categorias ?? []).map((x) => idDaRel(x as IdRel))
      const finalDeExemplo =
        c.nome === 'Final' &&
        c.tipo === 'final' &&
        c.status === 'rascunho' &&
        !c.subcategorias?.length &&
        !c.resultados?.length &&
        categoriasDaCorrida.length === 1 &&
        daEtapa.some((x) => x.id === categoriasDaCorrida[0])
      if (!finalDeExemplo) continue
      try {
        await payload.delete({ collection: 'corridas', id: c.id, overrideAccess: true, context: { ...contexto } })
        removidas++
      } catch (erro) {
        mantidas.push(`${c.titulo ?? c.id} (${(erro as Error).message})`)
      }
    }
  }
  if (!etapasDeExemplo) return 'nenhuma etapa futura de demonstração: nada a fazer'
  return [
    `${criadas} sessão(ões) de exemplo por subcategoria em ${etapasDeExemplo} etapa(s) futura(s) de demonstração`,
    removidas ? `${removidas} "Final" de exemplo da categoria inteira removida(s)` : null,
    mantidas.length ? `mantidas: ${mantidas.join('; ')}` : null,
  ]
    .filter(Boolean)
    .join('; ')
}

/* ─────────────────── 6. Regra do BKS: etapa pela média das corridas ─────────────────── */

/**
 * Regra do BKS (informada pelo cliente): a categoria é só o tipo de kart; cada subcategoria é um grid com
 * warm-up, classificação, corrida 1 e corrida 2, e a posição do piloto na etapa é a média das posições dele
 * nas corridas (2º e 2º → 2º na etapa). Pontos e classificação são separados por subcategoria.
 *
 * 1. Regras com "Como a etapa é pontuada" VAZIO (gravadas antes do campo existir) recebem a média das
 *    corridas. A regra usada por temporada ENCERRADA fica com "por corrida" — o cálculo com que a classificação
 *    final dela foi gravada, para o resultado oficial (e o de cada etapa dela) não mudar. Como a migração do
 *    campo grava o padrão (média) em todas as regras que já existiam, a da temporada encerrada volta para
 *    "por corrida" aqui (a proteção da regra só permite isso pelo servidor, com CONTEXTO_CALCULO_ANTIGO).
 *    Este passo roda uma vez, logo depois da migração: as demais regras preenchidas ficam como estão.
 * 2. Recalcula a classificação de cada temporada não encerrada. Ela é calculada na leitura (nada fica
 *    gravado), então o site já mostra o cálculo novo; o recálculo aqui confere que está tudo certo e registra
 *    no log os avisos para o administrador. Temporada encerrada continua com a fotografia final gravada.
 */
async function etapaPelaMediaDasCorridas(payload: Payload): Promise<string> {
  const lerTodos = async <T,>(collection: 'regras-pontuacao' | 'temporadas' | 'temporada-categorias', select: Record<string, true>) =>
    (await payload.find({ collection, limit: 0, depth: 0, pagination: false, overrideAccess: true, select })).docs as unknown as T[]
  type Regra = { id: number; nome?: string | null; calculoDaEtapa?: string | null }
  type Temporada = { id: number; nome?: string | null; status?: string | null; regra?: IdRel }
  type Classificacao = { id: number; temporada?: IdRel; regra?: IdRel }
  const regras = await lerTodos<Regra>('regras-pontuacao', { nome: true, calculoDaEtapa: true })
  const temporadas = await lerTodos<Temporada>('temporadas', { nome: true, status: true, regra: true })
  const classificacoes = await lerTodos<Classificacao>('temporada-categorias', { temporada: true, regra: true })

  // Regras usadas por temporada encerrada (na temporada ou como regra própria de uma categoria dela)
  const encerradas = new Set(temporadas.filter((t) => t.status === 'encerrada').map((t) => t.id))
  const daEncerrada = new Set(
    [
      ...temporadas.filter((t) => encerradas.has(t.id)).map((t) => idDaRel(t.regra)),
      ...classificacoes.filter((c) => encerradas.has(Number(idDaRel(c.temporada)))).map((c) => idDaRel(c.regra)),
    ].filter((id): id is number => id !== null),
  )

  const preenchidas: Record<CalculoDaEtapa, string[]> = { 'media-das-corridas': [], 'por-corrida': [] }
  const falhas: string[] = []
  for (const r of regras) {
    const valor: CalculoDaEtapa | null = daEncerrada.has(r.id)
      ? r.calculoDaEtapa === 'por-corrida'
        ? null
        : 'por-corrida'
      : r.calculoDaEtapa
        ? null
        : 'media-das-corridas'
    if (!valor) continue
    try {
      await payload.update({
        collection: 'regras-pontuacao',
        id: r.id,
        data: { calculoDaEtapa: valor } as never,
        overrideAccess: true,
        context: { ...contexto, [CONTEXTO_CALCULO_ANTIGO]: true },
      })
      preenchidas[valor].push(`"${r.nome ?? r.id}"`)
    } catch (erro) {
      falhas.push(`"${r.nome ?? r.id}" (${(erro as Error).message})`)
    }
  }

  // Recálculo das temporadas não encerradas (com a regra já atualizada)
  const recalculadas: string[] = []
  for (const t of temporadas.filter((x) => x.status !== 'encerrada')) {
    const lista = await classificacoesDaTemporada({ payload, temporada: t.id })
    const porSubcategoria = lista.filter((c) => c.porSubcategoria).length
    const avisos = [...new Set(lista.flatMap((c) => c.avisos))]
    if (avisos.length) payload.logger.warn(`Temporada "${t.nome ?? t.id}" recalculada com ${avisos.length} aviso(s): ${avisos.join(' | ')}`)
    recalculadas.push(`"${t.nome ?? t.id}" (${lista.length} categoria(s), ${porSubcategoria} pela média por subcategoria)`)
  }

  const partes = [
    preenchidas['media-das-corridas'].length ? `média das corridas por subcategoria em: ${preenchidas['media-das-corridas'].join(', ')}` : null,
    preenchidas['por-corrida'].length ? `mantidas por corrida (usadas por temporada encerrada): ${preenchidas['por-corrida'].join(', ')}` : null,
    !preenchidas['media-das-corridas'].length && !preenchidas['por-corrida'].length ? 'nenhuma regra sem o cálculo da etapa' : null,
    recalculadas.length ? `classificação recalculada: ${recalculadas.join('; ')}` : 'nenhuma temporada aberta para recalcular',
  ].filter(Boolean)
  // Falha: fica registrada e o passo é tentado de novo na próxima publicação (as já preenchidas são puladas)
  if (falhas.length) throw new Error(`${partes.join('; ')}; não foi possível preencher: ${falhas.join('; ')}`)
  return partes.join('; ')
}

/* ─────────────────── 7. Topo da página inicial: apresentação da ASKART ─────────────────── */

type TopoGravado = { titulo?: string | null; subtitulo?: string | null; botoes?: { link?: ValorLink | null }[] | null } & Record<string, unknown>

/**
 * O topo sem o padrão antigo do BKS: título ("Brasília Kart Series 2026"), subtítulo ("Calendário,
 * classificação e resultados do campeonato…") e botões ("Calendário" e "Classificação") que ainda forem o
 * padrão antigo ficam vazios — vazio = a apresentação da ASKART (src/lib/topo-inicio.ts). A foto e o que foi
 * escrito à mão ficam como estão. null = nada a trocar.
 */
function topoSemPadraoAntigo(topo: TopoGravado | null | undefined): { topo: TopoGravado; trocados: string[] } | null {
  if (!topo) return null
  const novo: TopoGravado = { ...topo }
  const trocados: string[] = []
  if (topo.titulo?.trim() && ehTituloAntigoDoTopo(topo.titulo)) {
    novo.titulo = null
    trocados.push('título')
  }
  if (topo.subtitulo?.trim() && ehSubtituloAntigoDoTopo(topo.subtitulo)) {
    novo.subtitulo = null
    trocados.push('subtítulo')
  }
  const botoes = topo.botoes ?? []
  if (botoes.length && ehBotoesAntigosDoTopo(botoes.map((b) => ({ caminho: caminho(b.link), rotulo: b.link?.rotulo })))) {
    novo.botoes = []
    trocados.push('botões')
  }
  return trocados.length ? { topo: novo, trocados } : null
}

/**
 * Página inicial com rascunho: grava a versão PUBLICADA (só com o topo trocado; nada do rascunho vai para o
 * site) e, se havia um rascunho em edição, grava-o de novo (com o topo trocado, se tinha o antigo) para ele
 * continuar sendo o mais recente no painel — o mesmo cuidado da aba Avisos no menu.
 */
async function topoDaAskart(payload: Payload): Promise<string> {
  const slug = 'pagina-inicial' as const
  const global = payload.config.globals.find((g) => g.slug === slug)
  if (!global) return 'global da página inicial não encontrado: nada feito'
  const comRascunho = Boolean(global.versions && global.versions.drafts)

  const publicado = (await payload.findGlobal({ slug, depth: 0, draft: false, overrideAccess: true })) as unknown as Record<string, unknown>
  const ultima = comRascunho
    ? ((await payload.findGlobal({ slug, depth: 0, draft: true, overrideAccess: true })) as unknown as Record<string, unknown>)
    : null
  const rascunho = ultima?._status === 'draft' ? ultima : null

  const noPublicado = topoSemPadraoAntigo(publicado.topo as TopoGravado | null)
  const noRascunho = rascunho ? topoSemPadraoAntigo(rascunho.topo as TopoGravado | null) : null
  if (!noPublicado && !noRascunho) return 'nada a fazer: o topo não tem o texto antigo do BKS (vazio já mostra a apresentação da ASKART)'

  if (noPublicado) {
    await payload.updateGlobal({
      slug,
      draft: false,
      overrideAccess: true,
      context: { ...contexto },
      data: { ...semControle(publicado), topo: noPublicado.topo, ...(comRascunho ? { _status: 'published' } : {}) } as never,
    })
  }
  if (rascunho) {
    await payload.updateGlobal({
      slug,
      draft: true,
      overrideAccess: true,
      context: { ...contexto },
      data: { ...semControle(rascunho), ...(noRascunho ? { topo: noRascunho.topo } : {}), _status: 'draft' } as never,
    })
  }
  return [
    noPublicado ? `topo publicado: ${noPublicado.trocados.join(', ')} do BKS trocado(s) pela apresentação da ASKART` : null,
    noRascunho ? `rascunho em edição: ${noRascunho.trocados.join(', ')} trocado(s)` : rascunho ? 'o rascunho em edição foi mantido' : null,
  ]
    .filter(Boolean)
    .join('; ')
}

/**
 * Só na prévia com exemplos: o Kart indoor entra na temporada de demonstração (as etapas futuras acompanham)
 * e cada subcategoria indoor ganha warm-up, classificação, corrida 1 e corrida 2 com horários de exemplo.
 */
async function exemplosDoIndoor(payload: Payload): Promise<string> {
  const { docs: cats } = await payload.find({
    collection: 'categorias',
    where: { nome: { in: [...Object.keys(SUBCATEGORIAS), 'Kart indoor'] } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })
  const subsDe = (c: (typeof cats)[number]) => (c.subcategorias ?? []).map((x) => x.nome?.trim() ?? '').filter(Boolean)
  const indoor = cats.find((c) => c.nome === 'Kart indoor')
  if (!indoor || !subsDe(indoor).length) return 'nada a fazer: Kart indoor sem subcategorias'
  const { docs: temporadas } = await payload.find({ collection: 'temporadas', limit: 50, depth: 0, overrideAccess: true })
  const demo = temporadas.filter((t) => String(t.nome ?? '').includes(DEMO) && t.status !== 'encerrada')
  if (!demo.length) return 'nenhuma temporada de demonstração aberta: nada a fazer'
  let criadas = 0
  for (const t of demo) {
    const atuais = (t.categorias ?? []).map((x) => idDaRel(x as IdRel))
    if (!atuais.includes(indoor.id)) {
      await payload.update({
        collection: 'temporadas',
        id: t.id,
        data: { categorias: [...atuais, indoor.id] } as never,
        overrideAccess: true,
        context: { ...contexto },
      })
    }
    const { docs: etapas } = await payload.find({
      collection: 'etapas',
      where: { temporada: { equals: t.id } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })
    const ordem = [...cats.filter((c) => c.nome !== 'Kart indoor'), indoor].map((c) => ({ id: c.id, subcategorias: subsDe(c) }))
    for (const e of etapas) {
      const futura = Boolean(e.inicio) && new Date(e.inicio as string).getTime() > Date.now() && e.status !== 'realizada' && e.status !== 'cancelada'
      if (!futura || !(e.categorias ?? []).some((x) => idDaRel(x as IdRel) === indoor.id)) continue
      criadas += await criarSessoesDeExemplo(payload, { id: e.id, inicio: e.inicio as string }, ordem.filter((c) => c.subcategorias.length))
    }
  }
  return `${criadas} sessão(ões) de exemplo do Kart indoor nas etapas futuras de demonstração`
}

/* ─────────────────── 8. Cores do BKS: as da logo, com o azul como principal ─────────────────── */

type CoresGravadas = { primaria?: string | null; secundaria?: string | null; destaque?: string | null } | null | undefined

/**
 * A aba BKS ganhou a identidade da logo: azul royal (principal: topo, faixas, títulos, botões), vermelho (apoio:
 * onda do topo, compra, selos) e branco (destaque). O campeonato BKS (sigla BKS ou o campeonato principal das
 * Configurações) recebe essas cores SÓ se as dele ainda estiverem vazias ou iguais às antigas do dados:oficiais
 * (#D02D21 principal, #0201B8 apoio, #FFFFFF destaque). Qualquer cor escolhida no painel fica como está. O site já
 * trata as antigas como "sem cores" (variaveisDoTemaBks); este passo só deixa o painel mostrando as certas.
 */
async function coresDoBks(payload: Payload): Promise<string> {
  const configuracoes = (await payload.findGlobal({ slug: 'configuracoes', depth: 0, overrideAccess: true })) as unknown as {
    campeonatoPrincipal?: IdRel
  }
  const principal = idDaRel(configuracoes.campeonatoPrincipal)
  const { docs } = await payload.find({
    collection: 'campeonatos',
    where: principal !== null ? { or: [{ sigla: { equals: 'BKS' } }, { id: { equals: principal } }] } : { sigla: { equals: 'BKS' } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  })
  const campeonatos = docs as unknown as { id: number; nome?: string | null; cores?: CoresGravadas }[]
  if (!campeonatos.length) return 'nada a fazer: campeonato BKS não encontrado'
  const trocados: string[] = []
  const mantidos: string[] = []
  for (const c of campeonatos) {
    if (!coresDoBksSemEscolha(c.cores)) {
      mantidos.push(`"${c.nome ?? c.id}"`)
      continue
    }
    await payload.update({ collection: 'campeonatos', id: c.id, data: { cores: { ...CORES_BKS } } as never, overrideAccess: true, context: { ...contexto } })
    trocados.push(`"${c.nome ?? c.id}"`)
  }
  return [
    trocados.length
      ? `cores da logo gravadas em ${trocados.join(', ')} (principal ${CORES_BKS.primaria}, apoio ${CORES_BKS.secundaria}, destaque ${CORES_BKS.destaque})`
      : null,
    mantidos.length ? `cores escolhidas no painel mantidas em ${mantidos.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('; ')
}

/* ─────────────────── 9. Taxa de pista (R$ 80,00 avulsa) e mensalidade ─────────────────── */

/**
 * Kartódromo com rascunho: grava a versão PUBLICADA (só com os campos trocados; nada do rascunho vai para o site)
 * e, se havia um rascunho em edição, grava-o de novo (com os mesmos cuidados) para ele continuar sendo o mais
 * recente no painel — o mesmo jeito do topo da página inicial.
 */
type MudancaNoKartodromo = (doc: Record<string, unknown>) => { dados: Record<string, unknown>; feitos: string[]; avisos: string[] }

const taxaDePistaEMensalidade = (payload: Payload) => atualizarKartodromo(payload, taxasDe2026)

/** Aviso de que quem treina no horário de iniciante paga só a ambulância, no Kartódromo e na pergunta frequente. */
async function iniciantesSoAmbulancia(payload: Payload): Promise<string> {
  const noKartodromo = await atualizarKartodromo(payload, iniciantesSemTaxaDePista)
  const { docs } = await payload.find({
    collection: 'perguntas',
    where: { pergunta: { equals: PERGUNTA_TAXAS } },
    depth: 0,
    limit: 10,
    overrideAccess: true,
  })
  const textoDe = (no: unknown): string => {
    if (!no || typeof no !== 'object') return ''
    const n = no as { text?: unknown; children?: unknown[]; root?: unknown }
    if (n.root) return textoDe(n.root)
    return (typeof n.text === 'string' ? n.text : '') + (n.children ?? []).map(textoDe).join('')
  }
  let perguntas = 0
  for (const d of docs) {
    if (textoDe(d.resposta).trim() !== RESPOSTA_TAXAS_ANTIGA) continue
    await payload.update({
      collection: 'perguntas',
      id: d.id,
      data: { resposta: textoParaLexical(RESPOSTA_TAXAS) as never },
      overrideAccess: true,
      context: { ...contexto },
    })
    perguntas++
  }
  return `${noKartodromo}. Pergunta frequente das taxas: ${perguntas ? 'resposta atualizada' : 'mantida (já mudada no painel ou inexistente)'}`
}

async function atualizarKartodromo(payload: Payload, mudanca: MudancaNoKartodromo): Promise<string> {
  const slug = 'kartodromo' as const
  const global = payload.config.globals.find((g) => g.slug === slug)
  if (!global) return 'global do kartódromo não encontrado: nada feito'
  const comRascunho = Boolean(global.versions && global.versions.drafts)

  const publicado = (await payload.findGlobal({ slug, depth: 0, draft: false, overrideAccess: true })) as unknown as Record<string, unknown>
  const ultima = comRascunho
    ? ((await payload.findGlobal({ slug, depth: 0, draft: true, overrideAccess: true })) as unknown as Record<string, unknown>)
    : null
  const rascunho = ultima?._status === 'draft' ? ultima : null

  const noPublicado = mudanca(publicado)
  const noRascunho = rascunho ? mudanca(rascunho) : null
  const mudaPublicado = noPublicado.feitos.length > 0
  const mudaRascunho = Boolean(noRascunho?.feitos.length)
  if (!mudaPublicado && !mudaRascunho) return `nada a fazer: ${noPublicado.avisos.join('; ') || 'tudo já estava preenchido'}`

  if (mudaPublicado) {
    await payload.updateGlobal({
      slug,
      draft: false,
      overrideAccess: true,
      context: { ...contexto },
      data: { ...semControle(publicado), ...noPublicado.dados, ...(comRascunho ? { _status: 'published' } : {}) } as never,
    })
  }
  if (rascunho) {
    await payload.updateGlobal({
      slug,
      draft: true,
      overrideAccess: true,
      context: { ...contexto },
      data: { ...semControle(rascunho), ...(noRascunho?.dados ?? {}), _status: 'draft' } as never,
    })
  }
  return [
    mudaPublicado ? `site (versão publicada): ${noPublicado.feitos.join(', ')}` : 'versão publicada sem mudança',
    noPublicado.avisos.length ? `mantido no publicado: ${noPublicado.avisos.join('; ')}` : null,
    rascunho ? (mudaRascunho ? `rascunho em edição: ${noRascunho!.feitos.join(', ')}` : 'o rascunho em edição foi mantido') : null,
  ]
    .filter(Boolean)
    .join('. ')
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
  { chave: 'atualizacao:2026-10-exemplos-por-subcategoria', descricao: 'Exemplos com subcategorias e melhor volta', aplicar: exemplosComSubcategorias },
  {
    chave: 'atualizacao:2026-10-exemplos-horarios-por-subcategoria',
    descricao: 'Exemplos de horários por subcategoria',
    aplicar: exemplosDeHorariosPorSubcategoria,
  },
  { chave: 'atualizacao:2026-10-exemplos-do-indoor', descricao: 'Exemplos do Kart indoor por subcategoria', aplicar: exemplosDoIndoor },

  {
    chave: 'atualizacao:2026-10-etapa-pela-media-das-corridas',
    descricao: 'Regra do BKS: etapa pela média das corridas, por subcategoria',
    aplicar: etapaPelaMediaDasCorridas,
  },
  { chave: 'atualizacao:2026-10-topo-da-askart', descricao: 'Topo da página inicial com a apresentação da ASKART', aplicar: topoDaAskart },
  { chave: 'atualizacao:2026-10-cores-do-bks', descricao: 'Cores do BKS pela logo (azul royal, vermelho e branco)', aplicar: coresDoBks },
  {
    chave: 'atualizacao:2026-10-taxa-de-pista-e-mensalidade',
    descricao: 'Taxa de pista R$ 80,00 (avulsa) e mensalidade da taxa de pista',
    aplicar: taxaDePistaEMensalidade,
  },
  {
    chave: 'atualizacao:2026-10-iniciante-so-ambulancia',
    descricao: 'Quem treina no horário de iniciante paga só a taxa de ambulância',
    aplicar: iniciantesSoAmbulancia,
  },
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
