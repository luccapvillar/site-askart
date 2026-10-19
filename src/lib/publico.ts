/**
 * Única porta de leitura do site público (docs/ARQUITETURA.md §5): sempre como visitante anônimo
 * (`overrideAccess: false`), sem rascunhos, com profundidade explícita. As páginas são geradas e
 * guardadas (ISR, 60 s) e refeitas na hora quando algo muda no painel (src/lib/revalidar.ts).
 *
 * Pré-visualização: com o modo de prévia do Next ligado (só pela rota /previa, para administrador ou
 * editor logado no painel), as coleções e globais com rascunho são lidos na última versão, com os
 * mesmos filtros do público (visibilidade, agendamento, janela, lixeira) — src/lib/previa/filtros.ts.
 * Ler `draftMode()` não torna a página dinâmica: na geração estática ele vem desligado, e o ISR segue.
 */
import config from '@payload-config'
import { draftMode } from 'next/headers'
import { getPayload, type CollectionSlug, type Where } from 'payload'
import { cache } from 'react'
import type {
  Campeonato,
  Categoria,
  Configuracoe,
  Contato,
  Corrida,
  Etapa,
  Galeria,
  Kartodromo,
  Midia,
  Navegacao,
  Noticia,
  PaginaInicial,
  Pergunta,
  Temporada,
  TextosPagina,
} from '@/payload-types'
import { carregarAgenda, paraAgendaSite } from './agenda'
import { classificacoesDaTemporada, resultadosDaEtapa } from './carregar-competicao'
import { lerFotografiaFinal } from './classificacao'
import { chaveDia, somarDias } from './datas'
import { podiosPorSubcategoria, SEM_SUBCATEGORIA } from './subcategorias'
import { filtroDoPublicoSemStatus } from './previa/filtros'

export const payloadSite = cache(() => getPayload({ config }))

const PUBLICO = { overrideAccess: false, draft: false } as const

/** Modo de prévia ligado nesta requisição. Fora de uma requisição do Next (scripts, testes), desligado. */
export const emPrevia = cache(async (): Promise<boolean> => {
  try {
    return (await draftMode()).isEnabled
  } catch {
    return false
  }
})

const filtroPrevia = cache(async (colecao: CollectionSlug) => filtroDoPublicoSemStatus(await payloadSite(), colecao))

/**
 * Opções de leitura de uma coleção: público (sempre) ou, na prévia, últimas versões com os filtros do
 * público reproduzidos (a regra de acesso esconderia os rascunhos). Coleção sem rascunho: igual ao público.
 */
async function leitura(colecao: CollectionSlug, where?: Where): Promise<{ where?: Where; overrideAccess: boolean; draft: boolean }> {
  if (!(await emPrevia())) return { where, ...PUBLICO }
  const payload = await payloadSite()
  if (!payload.collections[colecao]?.config.versions?.drafts) return { where, ...PUBLICO }
  const regra = await filtroPrevia(colecao)
  if (regra === false) return { where, ...PUBLICO }
  const filtro = regra === true ? where : where ? { and: [where, regra] } : regra
  return { where: filtro, overrideAccess: true, draft: true }
}

/** Globais com rascunho: na prévia, a última versão (o público lê sem filtro além do "publicado"). */
const leituraGlobal = async () => ((await emPrevia()) ? ({ overrideAccess: true, draft: true } as const) : PUBLICO)

/** Leitura que nunca derruba a página: em erro, registra e devolve o padrão. */
async function seguro<T>(rotulo: string, padrao: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (erro) {
    console.error(`[site] falha ao ler ${rotulo}:`, erro)
    return padrao
  }
}

export const idDe = (v: unknown): number | null =>
  typeof v === 'number' ? v : v && typeof v === 'object' && 'id' in v ? Number((v as { id: unknown }).id) : null

export const comoDoc = <T extends object>(v: unknown): T | null => (v && typeof v === 'object' ? (v as T) : null)

/* ───────────────────────────── globais ───────────────────────────── */

export const lerConfiguracoes = cache(() =>
  seguro('configurações', {} as Configuracoe, async () =>
    (await payloadSite()).findGlobal({ slug: 'configuracoes', depth: 1, ...PUBLICO }),
  ),
)
export const lerContato = cache(() =>
  seguro('contato', {} as Contato, async () => (await payloadSite()).findGlobal({ slug: 'contato', depth: 1, ...(await leituraGlobal()) })),
)
export const lerNavegacao = cache(() =>
  seguro('navegação', {} as Navegacao, async () => (await payloadSite()).findGlobal({ slug: 'navegacao', depth: 1, ...(await leituraGlobal()) })),
)
export const lerKartodromo = cache(() =>
  seguro('kartódromo', {} as Kartodromo, async () => (await payloadSite()).findGlobal({ slug: 'kartodromo', depth: 2, ...(await leituraGlobal()) })),
)
export const lerPaginaInicial = cache(() =>
  seguro('página inicial', {} as PaginaInicial, async () =>
    (await payloadSite()).findGlobal({ slug: 'pagina-inicial', depth: 2, ...(await leituraGlobal()) }),
  ),
)
export const lerInstitucional = cache(() =>
  seguro('institucional', null, async () => (await payloadSite()).findGlobal({ slug: 'institucional', depth: 2, ...(await leituraGlobal()) })),
)
export const lerTextosPaginas = cache(() =>
  seguro('textos das seções', {} as TextosPagina, async () =>
    (await payloadSite()).findGlobal({ slug: 'textos-paginas', depth: 1, ...(await leituraGlobal()) }),
  ),
)

/** Textos personalizados de uma seção fixa (ou nada, e a página usa os padrões). */
export async function textosDaSecao(rota: string) {
  const textos = await lerTextosPaginas()
  return textos.paginas?.find((p) => p.rota === rota) ?? null
}

/* ───────────────────────────── BKS (campeonato principal) ───────────────────────────── */

export type ContextoBks = {
  campeonato: Campeonato
  temporada: Temporada | null
  logo: Midia | null
}

/** Campeonato principal (Configurações) e a temporada atual dele. */
export const lerBks = cache(async (): Promise<ContextoBks | null> => {
  const configuracoes = await lerConfiguracoes()
  const id = idDe(configuracoes.campeonatoPrincipal)
  return seguro('campeonato principal', null, async () => {
    const payload = await payloadSite()
    let campeonato: Campeonato | undefined
    if (id !== null) {
      campeonato = (await payload.find({ collection: 'campeonatos', where: { id: { equals: id } }, depth: 2, limit: 1, ...PUBLICO })).docs[0]
    }
    campeonato ??= (await payload.find({ collection: 'campeonatos', sort: '_order', depth: 2, limit: 1, ...PUBLICO })).docs[0]
    if (!campeonato) return null
    return {
      campeonato,
      temporada: comoDoc<Temporada>(campeonato.temporadaAtual),
      logo: comoDoc<Midia>(campeonato.logo),
    }
  })
})

export const lerEtapas = cache((temporada: number) =>
  seguro('etapas', [] as Etapa[], async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({
      collection: 'etapas',
      sort: 'numero',
      depth: 1,
      limit: 100,
      select: {
        titulo: true,
        numero: true,
        nome: true,
        inicio: true,
        fim: true,
        status: true,
        categorias: true,
        local: true,
        localMapa: true,
        linkIngressos: true,
        linkTreinosLivres: true,
        gradeTreinosLivres: true,
        imagemGradeTreinosLivres: true,
        transmissaoProfissional: true,
        transmissaoIndoor: true,
        imagem: true,
        temporada: true,
      },
      populate: { categorias: { nome: true, sigla: true, slug: true, cor: true, modalidade: true }, temporadas: { nome: true, ano: true } },
      ...(await leitura('etapas', { and: [{ temporada: { equals: temporada } }, { visibilidade: { in: ['visivel', 'arquivado'] } }] })),
    })
    return docs as Etapa[]
  }),
)

export const lerEtapa = cache((id: number) =>
  seguro('etapa', null as Etapa | null, async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'etapas', depth: 2, limit: 1, ...(await leitura('etapas', { id: { equals: id } })) })
    return docs[0] ?? null
  }),
)

/**
 * Programação: corridas de várias etapas, com horário, categorias e as subcategorias de cada sessão (vazio =
 * todas). As categorias vêm com as subcategorias, na ordem cadastrada (a ordem dos grupos na programação).
 */
export const lerProgramacao = cache((etapas: number[]) =>
  seguro('programação', [] as Corrida[], async () => {
    if (!etapas.length) return []
    const payload = await payloadSite()
    const { docs } = await payload.find({
      collection: 'corridas',
      where: { and: [{ etapa: { in: etapas } }, { status: { not_equals: 'cancelada' } }] },
      sort: 'inicio',
      depth: 1,
      limit: 500,
      select: { etapa: true, nome: true, tipo: true, inicio: true, categorias: true, subcategorias: true, status: true },
      populate: { categorias: { nome: true, sigla: true, slug: true, cor: true, modalidade: true, subcategorias: true } },
      ...PUBLICO,
    })
    return docs as Corrida[]
  }),
)

export const lerClassificacoes = cache((temporada: number) =>
  seguro('classificações', [] as Awaited<ReturnType<typeof classificacoesDaTemporada>>, async () =>
    classificacoesDaTemporada({ payload: await payloadSite(), temporada, publico: true }),
  ),
)

export const lerResultadosEtapa = cache((etapa: number) =>
  seguro('resultados da etapa', null as Awaited<ReturnType<typeof resultadosDaEtapa>>, async () =>
    resultadosDaEtapa({ payload: await payloadSite(), etapa, publico: true }),
  ),
)

export const lerCategorias = cache((ids: number[]) =>
  seguro('categorias', [] as Categoria[], async () => {
    if (!ids.length) return []
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'categorias', where: { id: { in: ids } }, sort: '_order', depth: 0, limit: 100, ...PUBLICO })
    return docs
  }),
)

/** Categorias visíveis de uma modalidade (karts profissionais ou indoor), na ordem do painel. */
export const lerCategoriasDaModalidade = cache((modalidade: 'profissional' | 'indoor') =>
  seguro('categorias da modalidade', [] as Categoria[], async () => {
    const payload = await payloadSite()
    // Categoria gravada antes da divisão (sem modalidade) é de karts profissionais
    const where: Where =
      modalidade === 'indoor' ? { modalidade: { equals: 'indoor' } } : { or: [{ modalidade: { equals: 'profissional' } }, { modalidade: { exists: false } }] }
    const { docs } = await payload.find({
      collection: 'categorias',
      where,
      sort: '_order',
      depth: 0,
      limit: 100,
      select: { nome: true, sigla: true, slug: true, cor: true, modalidade: true, subcategorias: true },
      ...PUBLICO,
    })
    return docs as Categoria[]
  }),
)

/** Ids das categorias que estão na grade semanal de treinos do kartódromo (ex.: Moto, que é só de treino). */
export const lerIdsCategoriasDeTreino = cache(() =>
  seguro('categorias da grade de treinos', [] as number[], async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'horarios-treino', depth: 0, limit: 500, select: { categorias: true }, ...PUBLICO })
    const ids = new Set<number>()
    for (const d of docs) for (const c of (d as { categorias?: unknown[] | null }).categorias ?? []) if (idDe(c) !== null) ids.add(idDe(c)!)
    return [...ids]
  }),
)

/* ───────────────────────────── conteúdo ───────────────────────────── */

const publicado = (): Where => ({ publicarEm: { less_than_equal: new Date().toISOString() } })

export const lerNoticias = cache((limite: number, pagina = 1, filtro?: Where) =>
  seguro('notícias', { docs: [] as Noticia[], totalPages: 0, page: 1 }, async () => {
    const payload = await payloadSite()
    const r = await payload.find({
      collection: 'noticias',
      sort: '-publicarEm',
      depth: 1,
      limit: limite,
      page: pagina,
      select: { titulo: true, subtitulo: true, slug: true, capa: true, categoria: true, publicarEm: true, etapa: true },
      populate: { 'categorias-noticia': { nome: true, slug: true, cor: true } },
      ...(await leitura('noticias', filtro ? { and: [publicado(), filtro] } : publicado())),
    })
    return { docs: r.docs as Noticia[], totalPages: r.totalPages, page: r.page ?? 1 }
  }),
)

export const lerNoticia = cache((slug: string) =>
  seguro('notícia', null as Noticia | null, async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'noticias', depth: 2, limit: 1, ...(await leitura('noticias', { and: [{ slug: { equals: slug } }, publicado()] })) })
    return docs[0] ?? null
  }),
)

export const lerAvisos = cache((limite = 5) =>
  seguro('avisos', [] as import('@/payload-types').Aviso[], async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'avisos', sort: '-publicarEm', depth: 1, limit: limite, ...(await leitura('avisos')) })
    return docs
  }),
)

export const lerAviso = cache((id: number) =>
  seguro('aviso', null as import('@/payload-types').Aviso | null, async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'avisos', depth: 1, limit: 1, ...(await leitura('avisos', { id: { equals: id } })) })
    return docs[0] ?? null
  }),
)

export const lerPerguntas = cache((secoes: Array<'bks' | 'kartodromo' | 'geral'>, limite = 50) =>
  seguro('perguntas', [] as Pergunta[], async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'perguntas', sort: '_order', depth: 0, limit: limite, ...(await leitura('perguntas', { secao: { in: secoes } })) })
    return docs
  }),
)

export const lerGalerias = cache((filtro: Where | undefined, limite = 12) =>
  seguro('galerias', [] as Galeria[], async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'galerias', sort: '-data', depth: 1, limit: limite, ...(await leitura('galerias', filtro)) })
    return docs
  }),
)

export const lerGaleria = cache((slug: string) =>
  seguro('galeria', null as Galeria | null, async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'galerias', depth: 1, limit: 1, ...(await leitura('galerias', { slug: { equals: slug } })) })
    return docs[0] ?? null
  }),
)

export const lerPagina = cache((slug: string) =>
  seguro('página', null as import('@/payload-types').Pagina | null, async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'paginas', depth: 2, limit: 1, ...(await leitura('paginas', { slug: { equals: slug } })) })
    return docs[0] ?? null
  }),
)

/* ───────────────────────────── treinos ───────────────────────────── */

/** Agenda dos próximos dias (grade semanal + exceções), já no formato dos componentes. */
export const lerAgenda = cache((dias: number) =>
  seguro('agenda', [] as ReturnType<typeof paraAgendaSite>, async () => {
    const hoje = chaveDia(new Date())
    const agenda = await carregarAgenda({ payload: await payloadSite(), inicio: hoje, fim: somarDias(hoje, dias - 1), publico: true })
    return paraAgendaSite(agenda.dias)
  }),
)

/** Grade semanal (modelo fixo), para a tabela "dias e horários de cada categoria". */
export const lerGradeSemanal = cache(() =>
  seguro('grade semanal', [] as import('@/payload-types').HorariosTreino[], async () => {
    const payload = await payloadSite()
    const agora = new Date().toISOString()
    const { docs } = await payload.find({
      collection: 'horarios-treino',
      where: {
        and: [
          { visibilidade: { equals: 'visivel' } },
          { or: [{ validoAte: { exists: false } }, { validoAte: { greater_than_equal: agora } }] },
        ],
      },
      sort: 'ordemNaSemana',
      depth: 1,
      limit: 200,
      ...PUBLICO,
    })
    return docs
  }),
)

/* ───────────────────────────── história e documentos do campeonato ───────────────────────────── */

export type CampeaoDaTemporada = { ano: number; temporada: string; categoria: string; campeao: string; vice: string | null; terceiro: string | null }

/**
 * Campeões das temporadas encerradas de um campeonato (gravados no encerramento). Categoria com pontos por
 * subcategoria (regra do BKS) e mais de uma subcategoria: um pódio por subcategoria ("F400 · Novatos"), lido
 * da fotografia final (nomes como estavam no encerramento), na ordem cadastrada das subcategorias.
 */
export const lerCampeoes = cache((campeonato: number) =>
  seguro('campeões', { temporadas: [] as import('@/payload-types').Temporada[], campeoes: [] as CampeaoDaTemporada[] }, async () => {
    const payload = await payloadSite()
    const { docs: temporadas } = await payload.find({
      collection: 'temporadas',
      where: { campeonato: { equals: campeonato } },
      sort: '-ano',
      depth: 0,
      limit: 100,
      select: { ano: true, nome: true, status: true },
      ...PUBLICO,
    })
    const encerradas = temporadas.filter((t) => t.status === 'encerrada').map((t) => t.id)
    if (!encerradas.length) return { temporadas, campeoes: [] }
    const { docs } = await payload.find({
      collection: 'temporada-categorias',
      where: { temporada: { in: encerradas } },
      depth: 3,
      limit: 500,
      ...PUBLICO,
    })
    const nomePiloto = (insc: unknown) => {
      const i = comoDoc<{ piloto?: unknown }>(insc)
      const p = comoDoc<{ nome?: string; nomeExibicao?: string | null }>(i?.piloto)
      return p ? p.nomeExibicao || p.nome || null : null
    }
    type ComOrdem = CampeaoDaTemporada & { nomeCategoria: string; ordem: number }
    const campeoes = docs
      .flatMap((d): ComOrdem[] => {
        const t = comoDoc<{ ano?: number; nome?: string | null }>(d.temporada)
        const c = comoDoc<{ nome?: string; subcategorias?: { nome?: string | null }[] | null }>(d.categoria)
        const base = { ano: t?.ano ?? 0, temporada: t?.nome ?? String(t?.ano ?? ''), nomeCategoria: c?.nome ?? '' }
        const foto = lerFotografiaFinal(d.fotografiaFinal)
        const grupos = foto?.porSubcategoria ? podiosPorSubcategoria(foto.linhas, c?.subcategorias) : []
        if (grupos.length > 1) {
          return grupos
            .filter((g) => g.podio[0])
            .map((g, ordem) => ({
              ...base,
              ordem,
              categoria: `${base.nomeCategoria} · ${g.nome ?? SEM_SUBCATEGORIA}`,
              campeao: g.podio[0].nome,
              vice: g.podio[1]?.nome ?? null,
              terceiro: g.podio[2]?.nome ?? null,
            }))
        }
        const campeao = nomePiloto(d.campeao)
        if (!campeao) return []
        return [{ ...base, ordem: 0, categoria: base.nomeCategoria, campeao, vice: nomePiloto(d.vice), terceiro: nomePiloto(d.terceiro) }]
      })
      .sort((a, b) => b.ano - a.ano || a.nomeCategoria.localeCompare(b.nomeCategoria, 'pt-BR') || a.ordem - b.ordem)
      .map(({ nomeCategoria: _n, ordem: _o, ...x }): CampeaoDaTemporada => x)
    return { temporadas, campeoes }
  }),
)

export const lerDocumentos = cache((filtro: Where | undefined, limite = 50) =>
  seguro('documentos', [] as import('@/payload-types').Documento[], async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'documentos', sort: '_order', depth: 1, limit: limite, ...(await leitura('documentos', filtro)) })
    return docs
  }),
)

export const lerPiloto = cache((slug: string) =>
  seguro('piloto', null as import('@/payload-types').Piloto | null, async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'pilotos', where: { slug: { equals: slug } }, depth: 1, limit: 1, ...PUBLICO })
    return docs[0] ?? null
  }),
)

/** Corridas e notícias/galerias ligadas a uma etapa (página da etapa). */
export const lerConteudoDaEtapa = cache((etapa: number) =>
  seguro('conteúdo da etapa', { noticias: [] as Noticia[], galerias: [] as Galeria[] }, async () => {
    const payload = await payloadSite()
    const [opcoesNoticias, opcoesGalerias] = await Promise.all([
      leitura('noticias', { and: [{ etapa: { equals: etapa } }, publicado()] }),
      leitura('galerias', { etapa: { equals: etapa } }),
    ])
    const [noticias, galerias] = await Promise.all([
      payload.find({ collection: 'noticias', sort: '-publicarEm', depth: 1, limit: 6, ...opcoesNoticias }),
      payload.find({ collection: 'galerias', depth: 1, limit: 3, ...opcoesGalerias }),
    ])
    return { noticias: noticias.docs, galerias: galerias.docs }
  }),
)

export const lerDocumento = cache((slug: string) =>
  seguro('documento', null as import('@/payload-types').Documento | null, async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'documentos', depth: 0, limit: 1, ...(await leitura('documentos', { slug: { equals: slug } })) })
    return docs[0] ?? null
  }),
)

export const lerTodosParaMapa = cache(() =>
  seguro('mapa do site', { noticias: [] as { slug?: string | null; updatedAt: string }[], paginas: [] as { slug?: string | null; updatedAt: string }[], etapas: [] as { id: number; updatedAt: string }[] }, async () => {
    const payload = await payloadSite()
    const [noticias, paginas, etapas] = await Promise.all([
      payload.find({ collection: 'noticias', where: publicado(), depth: 0, limit: 500, select: { slug: true, updatedAt: true }, ...PUBLICO }),
      payload.find({ collection: 'paginas', where: publicado(), depth: 0, limit: 200, select: { slug: true, updatedAt: true }, ...PUBLICO }),
      payload.find({ collection: 'etapas', depth: 0, limit: 500, select: { updatedAt: true }, ...PUBLICO }),
    ])
    return { noticias: noticias.docs, paginas: paginas.docs, etapas: etapas.docs }
  }),
)
