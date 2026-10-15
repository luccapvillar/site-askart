/**
 * Única porta de leitura do site público (docs/ARQUITETURA.md §5): sempre como visitante anônimo
 * (`overrideAccess: false`), sem rascunhos, com profundidade explícita. As páginas são geradas e
 * guardadas (ISR, 60 s) e refeitas na hora quando algo muda no painel (src/lib/revalidar.ts).
 */
import config from '@payload-config'
import { getPayload, type Where } from 'payload'
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
import { chaveDia, somarDias } from './datas'

export const payloadSite = cache(() => getPayload({ config }))

const PUBLICO = { overrideAccess: false, draft: false } as const

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
  seguro('contato', {} as Contato, async () => (await payloadSite()).findGlobal({ slug: 'contato', depth: 1, ...PUBLICO })),
)
export const lerNavegacao = cache(() =>
  seguro('navegação', {} as Navegacao, async () => (await payloadSite()).findGlobal({ slug: 'navegacao', depth: 1, ...PUBLICO })),
)
export const lerKartodromo = cache(() =>
  seguro('kartódromo', {} as Kartodromo, async () => (await payloadSite()).findGlobal({ slug: 'kartodromo', depth: 2, ...PUBLICO })),
)
export const lerPaginaInicial = cache(() =>
  seguro('página inicial', {} as PaginaInicial, async () =>
    (await payloadSite()).findGlobal({ slug: 'pagina-inicial', depth: 2, ...PUBLICO }),
  ),
)
export const lerInstitucional = cache(() =>
  seguro('institucional', null, async () => (await payloadSite()).findGlobal({ slug: 'institucional', depth: 2, ...PUBLICO })),
)
export const lerTextosPaginas = cache(() =>
  seguro('textos das seções', {} as TextosPagina, async () =>
    (await payloadSite()).findGlobal({ slug: 'textos-paginas', depth: 1, ...PUBLICO }),
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
      where: { and: [{ temporada: { equals: temporada } }, { visibilidade: { in: ['visivel', 'arquivado'] } }] },
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
        imagem: true,
        temporada: true,
      },
      populate: { categorias: { nome: true, sigla: true, slug: true, cor: true }, temporadas: { nome: true, ano: true } },
      ...PUBLICO,
    })
    return docs as Etapa[]
  }),
)

export const lerEtapa = cache((id: number) =>
  seguro('etapa', null as Etapa | null, async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'etapas', where: { id: { equals: id } }, depth: 2, limit: 1, ...PUBLICO })
    return docs[0] ?? null
  }),
)

/** Programação: corridas de várias etapas, com horário e categorias. */
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
      select: { etapa: true, nome: true, tipo: true, inicio: true, categorias: true, status: true },
      populate: { categorias: { nome: true, sigla: true, slug: true, cor: true } },
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

/* ───────────────────────────── conteúdo ───────────────────────────── */

const publicado = (): Where => ({ publicarEm: { less_than_equal: new Date().toISOString() } })

export const lerNoticias = cache((limite: number, pagina = 1, filtro?: Where) =>
  seguro('notícias', { docs: [] as Noticia[], totalPages: 0, page: 1 }, async () => {
    const payload = await payloadSite()
    const r = await payload.find({
      collection: 'noticias',
      where: filtro ? { and: [publicado(), filtro] } : publicado(),
      sort: '-publicarEm',
      depth: 1,
      limit: limite,
      page: pagina,
      select: { titulo: true, subtitulo: true, slug: true, capa: true, categoria: true, publicarEm: true, etapa: true },
      populate: { 'categorias-noticia': { nome: true, slug: true, cor: true } },
      ...PUBLICO,
    })
    return { docs: r.docs as Noticia[], totalPages: r.totalPages, page: r.page ?? 1 }
  }),
)

export const lerNoticia = cache((slug: string) =>
  seguro('notícia', null as Noticia | null, async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'noticias', where: { and: [{ slug: { equals: slug } }, publicado()] }, depth: 2, limit: 1, ...PUBLICO })
    return docs[0] ?? null
  }),
)

export const lerAvisos = cache((limite = 5) =>
  seguro('avisos', [] as import('@/payload-types').Aviso[], async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'avisos', sort: '-publicarEm', depth: 1, limit: limite, ...PUBLICO })
    return docs
  }),
)

export const lerAviso = cache((id: number) =>
  seguro('aviso', null as import('@/payload-types').Aviso | null, async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'avisos', where: { id: { equals: id } }, depth: 1, limit: 1, ...PUBLICO })
    return docs[0] ?? null
  }),
)

export const lerPerguntas = cache((secoes: Array<'bks' | 'kartodromo' | 'geral'>, limite = 50) =>
  seguro('perguntas', [] as Pergunta[], async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'perguntas', where: { secao: { in: secoes } }, sort: '_order', depth: 0, limit: limite, ...PUBLICO })
    return docs
  }),
)

export const lerGalerias = cache((filtro: Where | undefined, limite = 12) =>
  seguro('galerias', [] as Galeria[], async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'galerias', where: filtro, sort: '-data', depth: 1, limit: limite, ...PUBLICO })
    return docs
  }),
)

export const lerGaleria = cache((slug: string) =>
  seguro('galeria', null as Galeria | null, async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'galerias', where: { slug: { equals: slug } }, depth: 1, limit: 1, ...PUBLICO })
    return docs[0] ?? null
  }),
)

export const lerPagina = cache((slug: string) =>
  seguro('página', null as import('@/payload-types').Pagina | null, async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'paginas', where: { slug: { equals: slug } }, depth: 2, limit: 1, ...PUBLICO })
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

/** Campeões das temporadas encerradas de um campeonato (gravados no encerramento). */
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
      where: { and: [{ temporada: { in: encerradas } }, { campeao: { exists: true } }] },
      depth: 3,
      limit: 500,
      ...PUBLICO,
    })
    const nomePiloto = (insc: unknown) => {
      const i = comoDoc<{ piloto?: unknown }>(insc)
      const p = comoDoc<{ nome?: string; nomeExibicao?: string | null }>(i?.piloto)
      return p ? p.nomeExibicao || p.nome || null : null
    }
    const campeoes = docs
      .map((d) => {
        const t = comoDoc<{ ano?: number; nome?: string | null }>(d.temporada)
        const c = comoDoc<{ nome?: string }>(d.categoria)
        const campeao = nomePiloto(d.campeao)
        if (!campeao) return null
        return {
          ano: t?.ano ?? 0,
          temporada: t?.nome ?? String(t?.ano ?? ''),
          categoria: c?.nome ?? '',
          campeao,
          vice: nomePiloto(d.vice),
          terceiro: nomePiloto(d.terceiro),
        }
      })
      .filter((x): x is CampeaoDaTemporada => x !== null)
      .sort((a, b) => b.ano - a.ano || a.categoria.localeCompare(b.categoria, 'pt-BR'))
    return { temporadas, campeoes }
  }),
)

export const lerDocumentos = cache((filtro: Where | undefined, limite = 50) =>
  seguro('documentos', [] as import('@/payload-types').Documento[], async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'documentos', where: filtro, sort: '_order', depth: 1, limit: limite, ...PUBLICO })
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
    const [noticias, galerias] = await Promise.all([
      payload.find({ collection: 'noticias', where: { and: [{ etapa: { equals: etapa } }, publicado()] }, sort: '-publicarEm', depth: 1, limit: 6, ...PUBLICO }),
      payload.find({ collection: 'galerias', where: { etapa: { equals: etapa } }, depth: 1, limit: 3, ...PUBLICO }),
    ])
    return { noticias: noticias.docs, galerias: galerias.docs }
  }),
)

export const lerDocumento = cache((slug: string) =>
  seguro('documento', null as import('@/payload-types').Documento | null, async () => {
    const payload = await payloadSite()
    const { docs } = await payload.find({ collection: 'documentos', where: { slug: { equals: slug } }, depth: 0, limit: 1, ...PUBLICO })
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
