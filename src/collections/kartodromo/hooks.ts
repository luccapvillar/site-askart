/**
 * Hooks do Kartódromo: grade semanal (horarios-treino), treinos/exceções (treinos) e tipos de treino.
 *
 * - Toda operação aninhada repassa `req` (mesma transação de quem salvou).
 * - Leituras internas usam overrideAccess: o papel já foi conferido pela regra de acesso da coleção.
 * - Títulos derivados são regravados direto no banco (sem hooks), o que evita laços e não esbarra no
 *   aviso de sobreposição de registros antigos.
 */
import {
  APIError,
  ValidationError,
  type CollectionAfterChangeHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type FlattenedField,
  type PayloadRequest,
  type Where,
} from 'payload'
import {
  chaveDaData,
  conflitosDaGrade,
  conflitosDoTreino,
  dataDoDia,
  DIAS_SEMANA,
  diaSemanaDaChave,
  ehHora,
  formatarChave,
  horarioValeNoDia,
  idDe,
  intervaloValido,
  mesmoId,
  nomeDoDiaSemana,
  refsCategorias,
  tituloHorario,
  tituloTreino,
  type ConflitoAgenda,
  type DiaSemana,
  type HorarioGrade,
  type ID,
  type TreinoAvulso,
} from '../../lib/agenda'
import { REL, rel } from './campos'

type Doc = Record<string, unknown>
type HorarioDoc = HorarioGrade & { permitirSobreposicao?: boolean | null }
type TreinoDoc = TreinoAvulso & { permitirSobreposicao?: boolean | null }

/* ----------------------------------------------------------------------------------------------
 * Acesso ao banco (sempre com req)
 * -------------------------------------------------------------------------------------------- */

async function buscar<T>(req: PayloadRequest, slug: string, where: Where, limit = 0): Promise<T[]> {
  const { docs } = await req.payload.find({
    collection: rel(slug),
    where,
    depth: 0,
    limit,
    pagination: limit > 0,
    overrideAccess: true,
    req,
  })
  return docs as unknown as T[]
}

async function buscarPorId<T>(req: PayloadRequest, slug: string, id: ID | null): Promise<T | null> {
  if (id === null) return null
  const doc = await req.payload.findByID({
    collection: rel(slug),
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req,
  })
  return (doc as unknown as T) ?? null
}

const colecaoExiste = (req: PayloadRequest, slug: string) => req.payload.config.collections.some((c) => c.slug === slug)

/** Recusa a gravação apontando o campo (o painel mostra a mensagem ao lado dele). */
function falharNoCampo(req: PayloadRequest, colecao: string, caminho: string, mensagem: string): never {
  throw new ValidationError({ collection: colecao, errors: [{ path: caminho, message: mensagem }], req }, req.t)
}

/** Nome do tipo de treino (para o título). */
async function nomeDoTipo(req: PayloadRequest, tipo: unknown): Promise<string | null> {
  const id = idDe(tipo)
  if (id === null) return null
  if (tipo && typeof tipo === 'object' && typeof (tipo as { nome?: unknown }).nome === 'string') {
    return (tipo as { nome: string }).nome
  }
  const doc = await buscarPorId<{ nome?: string | null }>(req, REL.tipos, id)
  return doc?.nome ?? null
}

/** Nomes das categorias, na ordem escolhida (para o título da grade). */
async function nomesDasCategorias(req: PayloadRequest, categorias: unknown): Promise<string[]> {
  const refs = refsCategorias(categorias as HorarioGrade['categorias'])
  if (!refs.length || !colecaoExiste(req, REL.categorias)) return []
  const docs = await buscar<{ id: ID; nome?: string | null; sigla?: string | null }>(req, REL.categorias, {
    id: { in: refs.map((c) => c.id) },
  })
  const porId = new Map(docs.map((d) => [String(d.id), d.nome || d.sigla || '']))
  return refs.map((c) => porId.get(String(c.id)) ?? '').filter(Boolean)
}

/** "a", "a e b", "a, b e mais 2" */
function listarTitulos(titulos: string[]): string {
  const unicos = [...new Set(titulos)].map((t) => `"${t}"`)
  if (unicos.length <= 1) return unicos.join('')
  if (unicos.length <= 3) return `${unicos.slice(0, -1).join(', ')} e ${unicos[unicos.length - 1]}`
  return `${unicos.slice(0, 2).join(', ')} e mais ${unicos.length - 2}`
}

/* ----------------------------------------------------------------------------------------------
 * Grade semanal (horarios-treino)
 * -------------------------------------------------------------------------------------------- */

/** Chave de ordenação da lista: segunda (1) → domingo (7), depois início e fim. */
export function ordemNaSemana(h: Pick<HorarioGrade, 'diaSemana' | 'horaInicio' | 'horaFim'>): string {
  const i = DIAS_SEMANA.indexOf(h.diaSemana as DiaSemana)
  const posicao = i < 0 ? 9 : i === 0 ? 7 : i
  return `${posicao} ${h.horaInicio ?? ''} ${h.horaFim ?? ''}`.trim()
}

/** Normaliza a vigência, calcula o título e confere sobreposição com outros horários da grade. */
export const prepararHorario: CollectionBeforeChangeHook = async ({ data, originalDoc, req, collection }) => {
  if (!data) return data
  for (const campo of ['validoDe', 'validoAte'] as const) {
    if (!(campo in data)) continue
    const dia = chaveDaData(data[campo])
    data[campo] = dia ? dataDoDia(dia) : null
  }
  const doc = { ...(originalDoc ?? {}), ...data } as HorarioDoc

  data.ordemNaSemana = ordemNaSemana(doc)
  data.titulo = tituloHorario({
    diaSemana: doc.diaSemana,
    horaInicio: doc.horaInicio,
    horaFim: doc.horaFim,
    tipoNome: await nomeDoTipo(req, doc.tipo),
    categorias: await nomesDasCategorias(req, doc.categorias),
    validoDe: doc.validoDe,
    validoAte: doc.validoAte,
  })

  // Aviso de sobreposição (horário incompleto ou invertido fica para a validação do próprio campo)
  if (doc.permitirSobreposicao || !intervaloValido(doc.horaInicio, doc.horaFim) || !doc.diaSemana) return data
  const proprioId = idDe(originalDoc?.id)
  const filtros: Where[] = [{ diaSemana: { equals: doc.diaSemana } }, { visibilidade: { equals: 'visivel' } }]
  if (proprioId !== null) filtros.push({ id: { not_equals: proprioId } })
  const outros = await buscar<HorarioDoc>(req, REL.horarios, { and: filtros })
  const conflitos = conflitosDaGrade({ ...doc, id: proprioId ?? '__novo__' }, outros)
  if (conflitos.length) {
    falharNoCampo(
      req,
      collection.slug,
      'horaInicio',
      `Este horário coincide com ${listarTitulos(conflitos.map((c) => c.titulo || `${c.horaInicio}–${c.horaFim}`))} ` +
        '(mesmo dia da semana, mesmas categorias e validade que se cruza). Ajuste o horário, as categorias ou a validade. ' +
        'Se for intencional, marque "Permitir coincidir com outro horário".',
    )
  }
  return data
}

/* ----------------------------------------------------------------------------------------------
 * Treinos e exceções (treinos)
 * -------------------------------------------------------------------------------------------- */

function mensagemDeConflito(
  conflitos: ConflitoAgenda[],
  titulo: (c: ConflitoAgenda) => string,
  temSubstitui: boolean,
): string {
  const fixos = conflitos.filter((c) => c.motivo === 'horario-fixo').map(titulo)
  const treinos = conflitos.filter((c) => c.motivo === 'treino').map(titulo)
  const bloqueios = conflitos.filter((c) => c.motivo === 'bloqueio').map(titulo)
  const partes: string[] = []
  if (fixos.length) {
    partes.push(
      temSubstitui
        ? `coincide com o horário fixo ${listarTitulos(fixos)}`
        : `coincide com o horário fixo ${listarTitulos(fixos)} — para mudar esse horário só neste dia, escolha-o em "Substitui"`,
    )
  }
  if (treinos.length) partes.push(`coincide com ${listarTitulos(treinos)}`)
  if (bloqueios.length) partes.push(`fica dentro do bloqueio ${listarTitulos(bloqueios)} e apareceria como bloqueado`)
  return (
    `Este treino ${partes.join('; ')} (mesmo dia, mesmas categorias). Ajuste o horário ou as categorias. ` +
    'Se for intencional, marque "Permitir coincidir com outro horário".'
  )
}

/**
 * Antes de gravar um treino/exceção:
 * 1. grava a data como "só dia" (meio-dia UTC) e a chave `dia` (AAAA-MM-DD) usada nas consultas;
 * 2. com "Substitui": confere dia da semana e validade do horário fixo, completa horário e tipo vazios
 *    e recusa uma segunda exceção para o mesmo horário no mesmo dia;
 * 3. calcula o título e confere sobreposição com a agenda daquele dia.
 */
export const prepararTreino: CollectionBeforeChangeHook = async ({ data, originalDoc, req, operation, collection }) => {
  if (!data) return data
  const original = (originalDoc ?? {}) as Doc
  const dia = chaveDaData('data' in data ? data.data : original.data)
  if (!dia) return data // "data" é obrigatória: a validação do campo mostra o erro
  if ('data' in data || operation === 'create') data.data = dataDoDia(dia)
  data.dia = dia

  const proprioId = idDe(original.id)
  const substituiId = idDe('substitui' in data ? data.substitui : original.substitui)
  let doc = { ...original, ...data } as TreinoDoc
  let horario: HorarioDoc | null = null

  if (substituiId !== null) {
    horario = await buscarPorId<HorarioDoc>(req, REL.horarios, substituiId)
    if (!horario) {
      falharNoCampo(req, collection.slug, 'substitui', 'O horário fixo escolhido em "Substitui" não existe mais. Escolha outro ou deixe vazio.')
    }
    // Só confere quando a data ou o vínculo mudam (editar uma exceção antiga não deve travar)
    const mudouVinculo =
      operation === 'create' || chaveDaData(original.data) !== dia || !mesmoId(original.substitui, substituiId)
    if (mudouVinculo) {
      const diaSemana = diaSemanaDaChave(dia)
      if (horario.diaSemana !== diaSemana) {
        falharNoCampo(
          req,
          collection.slug,
          'substitui',
          `O horário fixo escolhido é de ${nomeDoDiaSemana(horario.diaSemana ?? '')}, mas ${formatarChave(dia)} é ${nomeDoDiaSemana(diaSemana)}. ` +
            `Escolha um horário de ${nomeDoDiaSemana(diaSemana)} ou corrija a data.`,
        )
      }
      if (!horarioValeNoDia(horario, dia)) {
        falharNoCampo(
          req,
          collection.slug,
          'substitui',
          `O horário fixo escolhido não vale em ${formatarChave(dia)} (confira "Válido a partir de" e "Válido até" nele).`,
        )
      }
    }
    // Vazio = herda do horário fixo
    if (!ehHora(doc.horaInicio)) data.horaInicio = horario.horaInicio
    if (!ehHora(doc.horaFim)) data.horaFim = horario.horaFim
    if (idDe(doc.tipo) === null && idDe(horario.tipo) !== null) data.tipo = idDe(horario.tipo)

    // Uma exceção por horário e dia (o banco também garante, com um índice único)
    const filtros: Where[] = [{ substitui: { equals: substituiId } }, { dia: { equals: dia } }]
    if (proprioId !== null) filtros.push({ id: { not_equals: proprioId } })
    const [outra] = await buscar<TreinoDoc>(req, REL.treinos, { and: filtros }, 1)
    if (outra) {
      falharNoCampo(
        req,
        collection.slug,
        'substitui',
        `Já existe uma alteração deste horário fixo em ${formatarChave(dia)}: "${outra.titulo ?? ''}". Abra-a e edite, em vez de criar outra.`,
      )
    }
    doc = { ...original, ...data } as TreinoDoc
  }

  data.titulo = tituloTreino({
    dia,
    horaInicio: doc.horaInicio,
    horaFim: doc.horaFim,
    tipoNome: await nomeDoTipo(req, doc.tipo),
    status: doc.status,
  })

  // Aviso de sobreposição, usando a mesma conta da agenda do site
  if (doc.permitirSobreposicao || !intervaloValido(doc.horaInicio, doc.horaFim)) return data
  const grade = await buscar<HorarioDoc>(req, REL.horarios, {
    and: [{ diaSemana: { equals: diaSemanaDaChave(dia) } }, { visibilidade: { equals: 'visivel' } }],
  })
  // O horário substituído entra mesmo oculto: dele vêm as categorias herdadas
  if (horario && !grade.some((h) => mesmoId(h.id, horario?.id))) grade.push(horario)
  const filtrosOutros: Where[] = [{ dia: { equals: dia } }, { visibilidade: { equals: 'visivel' } }]
  if (proprioId !== null) filtrosOutros.push({ id: { not_equals: proprioId } })
  const outros = await buscar<TreinoDoc>(req, REL.treinos, { and: filtrosOutros })
  const conflitos = conflitosDoTreino({ treino: { ...doc, id: proprioId ?? '__novo__', dia }, grade, outros })
  if (!conflitos.length) return data

  const titulo = (c: ConflitoAgenda) =>
    (c.treinoId !== null
      ? outros.find((o) => mesmoId(o.id, c.treinoId))?.titulo
      : grade.find((h) => mesmoId(h.id, c.horarioId))?.titulo) || `${c.horaInicio}–${c.horaFim}`
  if (doc.status === 'cancelado') {
    falharNoCampo(
      req,
      collection.slug,
      'substitui',
      `Para cancelar o horário fixo ${listarTitulos(conflitos.map(titulo))} só neste dia, escolha-o em "Substitui": ` +
        'assim o site mostra o cancelamento no lugar do horário.',
    )
  }
  falharNoCampo(req, collection.slug, 'horaInicio', mensagemDeConflito(conflitos, titulo, substituiId !== null))
}

/* ----------------------------------------------------------------------------------------------
 * Títulos derivados (renomear tipo ou categoria)
 * -------------------------------------------------------------------------------------------- */

/**
 * Recalcula os títulos que mostram o nome do tipo de treino ou da categoria. Grava direto no banco
 * (sem hooks/validação), na mesma transação.
 */
export async function recalcularTitulos(req: PayloadRequest, filtro: { tipo?: ID; categoria?: ID }) {
  if (filtro.tipo === undefined && filtro.categoria === undefined) return
  const condicoes: Where[] = []
  if (filtro.tipo !== undefined) condicoes.push({ tipo: { equals: filtro.tipo } })
  if (filtro.categoria !== undefined) condicoes.push({ categorias: { in: [filtro.categoria] } })

  if (colecaoExiste(req, REL.horarios)) {
    for (const h of await buscar<HorarioDoc>(req, REL.horarios, { or: condicoes })) {
      const titulo = tituloHorario({
        diaSemana: h.diaSemana,
        horaInicio: h.horaInicio,
        horaFim: h.horaFim,
        tipoNome: await nomeDoTipo(req, h.tipo),
        categorias: await nomesDasCategorias(req, h.categorias),
        validoDe: h.validoDe,
        validoAte: h.validoAte,
      })
      if (titulo !== h.titulo) await gravarTitulo(req, REL.horarios, h.id, titulo)
    }
  }
  // O título dos treinos mostra só o tipo
  if (filtro.tipo !== undefined && colecaoExiste(req, REL.treinos)) {
    const tipoNome = await nomeDoTipo(req, filtro.tipo)
    for (const t of await buscar<TreinoDoc>(req, REL.treinos, { tipo: { equals: filtro.tipo } })) {
      const dia = chaveDaData(t.dia ?? t.data)
      if (!dia) continue
      const titulo = tituloTreino({ dia, horaInicio: t.horaInicio, horaFim: t.horaFim, tipoNome, status: t.status })
      if (titulo !== t.titulo) await gravarTitulo(req, REL.treinos, t.id, titulo)
    }
  }
}

async function gravarTitulo(req: PayloadRequest, slug: string, id: ID, titulo: string) {
  await req.payload.db.updateOne({ collection: rel(slug), id, data: { titulo }, req, returning: false })
}

/**
 * Para a frente Competição chamar quando uma categoria for renomeada (o título dos horários da grade
 * mostra o nome das categorias).
 */
export const atualizarTitulosDaCategoria = (req: PayloadRequest, categoriaId: ID) =>
  recalcularTitulos(req, { categoria: categoriaId })

/** Tipo de treino renomeado → títulos da grade e dos treinos que o usam. */
export const propagarNomeDoTipo: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (operation === 'update' && previousDoc?.nome !== doc?.nome) await recalcularTitulos(req, { tipo: doc.id })
  return doc
}

/* ----------------------------------------------------------------------------------------------
 * Exclusão com vínculos ("Não se apaga histórico", docs/ARQUITETURA.md §2.5)
 * -------------------------------------------------------------------------------------------- */

const rotuloPlural = (labels: unknown, slug: string): string => {
  const plural = (labels as { plural?: unknown } | undefined)?.plural
  if (typeof plural === 'string') return plural
  if (plural && typeof plural === 'object' && typeof (plural as Doc).pt === 'string') return (plural as Doc).pt as string
  return slug
}

/** Caminhos (em todas as coleções) dos relacionamentos simples que apontam para `alvo`. */
function caminhosPara(campos: FlattenedField[], alvo: string, prefixo = ''): string[] {
  const saida: string[] = []
  for (const campo of campos) {
    if (campo.type === 'join' || ('virtual' in campo && campo.virtual)) continue
    if (campo.type === 'relationship' || campo.type === 'upload') {
      if (!Array.isArray(campo.relationTo) && campo.relationTo === alvo) saida.push(`${prefixo}${campo.name}`)
      continue
    }
    if ((campo.type === 'group' || campo.type === 'array' || campo.type === 'tab') && 'flattenedFields' in campo) {
      saida.push(...caminhosPara(campo.flattenedFields, alvo, `${prefixo}${campo.name}.`))
    }
  }
  return saida
}

/**
 * Recusa a exclusão quando o registro é usado em outro lugar (no Postgres a referência seria apagada em
 * silêncio). A mensagem diz onde está em uso e o que fazer.
 */
export const bloquearExclusaoComVinculos =
  (oQue: string, dica: string): CollectionBeforeDeleteHook =>
  async ({ req, id, collection }) => {
    const usos: string[] = []
    for (const outra of req.payload.config.collections) {
      if (outra.slug.startsWith('payload-')) continue
      let total = 0
      for (const caminho of caminhosPara(outra.flattenedFields, collection.slug)) {
        const { totalDocs } = await req.payload.count({
          collection: rel(outra.slug),
          where: { [caminho]: { equals: id } },
          overrideAccess: true,
          req,
        })
        total = Math.max(total, totalDocs)
      }
      if (total) usos.push(`${rotuloPlural(outra.labels, outra.slug)} (${total})`)
    }
    if (usos.length) {
      throw new APIError(`Não é possível excluir ${oQue}: está em uso em ${usos.join(', ')}. ${dica}`, 409, undefined, true)
    }
  }
