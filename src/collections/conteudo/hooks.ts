/**
 * Hooks da frente Conteúdo. As regras puras (sem banco) ficam separadas e são testadas em
 * tests/int/conteudo.int.spec.ts. Toda operação aninhada repassa `req` (mesma transação).
 */
import {
  APIError,
  ValidationError,
  type CollectionAfterChangeHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionBeforeValidateHook,
  type CollectionSlug,
  type DefaultValue,
  type Where,
} from 'payload'
import { contarUsos } from '../../hooks/competicao/exclusao'
import { ROTAS_FIXAS } from '../../fields/link'
import { idDe, idsDe, mesmoId, REL, type ID } from './comum'

/* ------------------------------------------------------------------ regras puras */

/** Primeiro endereço livre: "base", senão "base-2", "base-3"… */
export function slugLivre(base: string, usados: Set<string>): string {
  if (!usados.has(base)) return base
  let n = 2
  while (usados.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

/**
 * Endereços que já pertencem ao site (seções fixas, painel, API, arquivos do sistema).
 * Uma página livre fica em "/{endereço}", então não pode usar nenhum deles.
 */
export const ENDERECOS_RESERVADOS = new Set<string>([
  ...Object.values(ROTAS_FIXAS)
    .map((r) => r.caminho.replace(/^\//, '').split('/')[0])
    .filter(Boolean),
  'admin',
  'api',
  'etapas',
  'galerias',
  'paginas',
  'midia',
  'arquivos',
  'sitemap-xml',
  'robots-txt',
  'favicon-ico',
  'next',
  'login',
  'painel',
  'previa',
])

/** Endereço de página livre fora dos reservados: "noticias" vira "noticias-pagina". */
export function enderecoDePagina(slug: string): string {
  return ENDERECOS_RESERVADOS.has(slug) ? `${slug}-pagina` : slug
}

/** Verdadeiro quando as duas datas existem e o fim vem antes do início. */
export function intervaloInvalido(inicio: unknown, fim: unknown): boolean {
  if (!inicio || !fim) return false
  const a = new Date(inicio as string).getTime()
  const b = new Date(fim as string).getTime()
  return Number.isFinite(a) && Number.isFinite(b) && b < a
}

/** Capa da galeria: a escolhida ou, na falta dela, a primeira foto. */
export function capaPadrao(capa: unknown, fotos: unknown): ID | null {
  return idDe(capa) ?? idsDe(fotos)[0] ?? null
}

const listar = (itens: string[]) =>
  itens.length <= 1 ? (itens[0] ?? '') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`

/* ------------------------------------------------------------------ valores padrão */

const nomeDoUsuario = (user: unknown): string | null => {
  const nome = (user as { nome?: unknown } | null | undefined)?.nome
  return typeof nome === 'string' && nome.trim() ? nome.trim() : null
}

/** Autor padrão: o nome de quem está escrevendo (editável). */
export const autorPadrao: DefaultValue = ({ user }) => nomeDoUsuario(user) ?? ''

/** Garante o autor mesmo quando o item é criado fora do formulário (API, importação). */
export const preencherAutor: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (!data) return data
  if (operation === 'create' && !(typeof data.autor === 'string' && data.autor.trim())) {
    const nome = nomeDoUsuario(req.user)
    if (nome) data.autor = nome
  }
  return data
}

/* ------------------------------------------------------------------ endereço (slug) */

/**
 * Endereço sem colisão: se "regulamento-2026" já existe, usa "regulamento-2026-2"… Evita o erro técnico
 * de "valor único". Considera também os itens na lixeira (o endereço continua ocupado até a exclusão definitiva).
 * Roda no beforeValidate da coleção, depois que o campo slug (src/fields/slug.ts) já foi gerado.
 */
export const slugUnico =
  (colecao: CollectionSlug, opcoes: { ajustar?: (slug: string) => string } = {}): CollectionBeforeValidateHook =>
  async ({ data, originalDoc, req }) => {
    if (!data || typeof data.slug !== 'string' || !data.slug) return data
    const base = opcoes.ajustar ? opcoes.ajustar(data.slug) : data.slug
    const condicoes: Where[] = [{ slug: { like: base } }]
    const id = idDe(originalDoc?.id)
    if (id !== null) condicoes.push({ id: { not_equals: id } })
    const { docs } = await req.payload.find({
      collection: colecao,
      where: { and: condicoes },
      limit: 0,
      pagination: false,
      depth: 0,
      overrideAccess: true,
      trash: true,
      req,
    })
    const usados = new Set(docs.map((d) => (d as { slug?: string | null }).slug).filter((s): s is string => Boolean(s)))
    data.slug = slugLivre(base, usados)
    return data
  }

/**
 * Nome único em cadastros simples (tags, categorias de notícia, tipos de documento): em vez de criar
 * "Kart" e "kart" como dois itens, avisa que já existe. Compara pelo endereço (sem acento e sem maiúsculas).
 */
export const nomeUnico =
  (colecao: CollectionSlug, oQue: string): CollectionBeforeValidateHook =>
  async ({ data, originalDoc, req, collection }) => {
    if (!data) return data
    if (typeof data.nome === 'string') data.nome = data.nome.trim().replace(/\s+/g, ' ')
    const slug = typeof data.slug === 'string' ? data.slug : null
    if (!slug) return data
    const condicoes: Where[] = [{ slug: { equals: slug } }]
    const id = idDe(originalDoc?.id)
    if (id !== null) condicoes.push({ id: { not_equals: id } })
    const { totalDocs } = await req.payload.count({ collection: colecao, where: { and: condicoes }, overrideAccess: true, req })
    if (totalDocs > 0) {
      throw new ValidationError(
        {
          collection: collection.slug,
          errors: [{ path: 'nome', message: `Já existe ${oQue} com esse nome. Escolha a existente na lista em vez de criar outra.` }],
          req,
        },
        req.t,
      )
    }
    return data
  }

/* ------------------------------------------------------------------ validações */

/**
 * Fim depois do início (ex.: "exibir até" depois de "exibir a partir de"). Em coleções com rascunho,
 * só confere ao publicar, para não interromper o autosalvamento enquanto a pessoa ainda está digitando.
 */
export const exigirIntervalo =
  (opcoes: { inicio: string; fim: string; mensagem: string }): CollectionBeforeValidateHook =>
  ({ data, originalDoc, collection, req }) => {
    if (!data) return data
    const temRascunho = Boolean(collection.versions && collection.versions.drafts)
    if (temRascunho && data._status !== 'published') return data
    const inicio = data[opcoes.inicio] ?? originalDoc?.[opcoes.inicio]
    const fim = data[opcoes.fim] ?? originalDoc?.[opcoes.fim]
    if (intervaloInvalido(inicio, fim)) {
      throw new ValidationError(
        { collection: collection.slug, errors: [{ path: opcoes.fim, message: opcoes.mensagem }], req },
        req.t,
      )
    }
    return data
  }

/* ------------------------------------------------------------------ preenchimentos automáticos */

async function lerCampo(
  req: Parameters<CollectionBeforeChangeHook>[0]['req'],
  colecao: CollectionSlug,
  id: ID,
  campo: string,
): Promise<ID | null> {
  const doc = await req.payload.findByID({ collection: colecao, id, depth: 0, overrideAccess: true, disableErrors: true, req })
  return idDe((doc as Record<string, unknown> | null)?.[campo])
}

/**
 * Associações derivadas: a temporada vem da etapa e (quando a coleção tem o campo) o campeonato vem da
 * temporada. Assim basta escolher a etapa. Só consulta o banco quando a etapa/temporada muda ou falta o derivado.
 */
export const completarAssociacoes =
  (opcoes: { campeonato?: boolean } = {}): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, req }) => {
    if (!data) return data
    const etapa = idDe(data.etapa)
    if (etapa !== null && (!mesmoId(etapa, originalDoc?.etapa) || idDe(data.temporada) === null)) {
      const temporada = await lerCampo(req, REL.etapas, etapa, 'temporada')
      if (temporada !== null) data.temporada = temporada
    }
    if (opcoes.campeonato) {
      const temporada = idDe(data.temporada)
      if (temporada !== null && (!mesmoId(temporada, originalDoc?.temporada) || idDe(data.campeonato) === null)) {
        const campeonato = await lerCampo(req, REL.temporadas, temporada, 'campeonato')
        if (campeonato !== null) data.campeonato = campeonato
      }
    }
    return data
  }

/** Galeria sem capa escolhida usa a primeira foto. */
export const preencherCapaDaGaleria: CollectionBeforeChangeHook = ({ data }) => {
  if (!data) return data
  const capa = capaPadrao(data.capa, data.fotos)
  if (capa !== null) data.capa = capa
  return data
}

/**
 * Documento novo que "substitui" outro: ao ser publicado, o anterior vai para "Arquivado" (sai das listas
 * atuais, mas continua com página própria e no histórico). Só age na publicação e só uma vez.
 */
export const arquivarDocumentoSubstituido: CollectionAfterChangeHook = async ({ doc, previousDoc, req, context }) => {
  if (context?.arquivandoSubstituido) return doc
  if (doc?._status !== 'published') return doc
  const antigo = idDe(doc.substitui)
  if (antigo === null || mesmoId(antigo, doc.id)) return doc
  if (previousDoc?._status === 'published' && mesmoId(previousDoc?.substitui, antigo)) return doc

  const anterior = (await req.payload.findByID({
    collection: REL.documentos,
    id: antigo,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req,
  })) as { visibilidade?: string } | null
  if (!anterior || anterior.visibilidade !== 'visivel') return doc

  // O Payload mescla `context` no req compartilhado; restauramos depois para a marca não vazar.
  const contextoOriginal = req.context
  try {
    await req.payload.update({
      collection: REL.documentos,
      id: antigo,
      data: { visibilidade: 'arquivado' } as never,
      depth: 0,
      overrideAccess: true,
      context: { arquivandoSubstituido: true },
      req,
    })
  } finally {
    req.context = contextoOriginal
  }
  return doc
}

/* ------------------------------------------------------------------ exclusão */

/**
 * Recusa a exclusão definitiva de algo que ainda é usado (no Postgres, excluir apagaria a referência
 * em silêncio: a notícia ficaria sem capa, o aviso sem anexo…). Procura em todas as coleções.
 */
export const bloquearExclusaoEmUso =
  (opcoes: { alvo: CollectionSlug; oQue: string; dica: string }): CollectionBeforeDeleteHook =>
  async ({ id, req }) => {
    const usos = await contarUsos(req, opcoes.alvo, id)
    if (!usos.length) return
    const onde = listar(usos.map((u) => `${u.rotulo} (${u.total})`))
    throw new APIError(`Não é possível excluir ${opcoes.oQue}, porque está em uso em: ${onde}. ${opcoes.dica}`, 409, undefined, true)
  }
