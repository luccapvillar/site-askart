/**
 * Bloqueio de exclusão com vínculos ("Não se apaga histórico", docs/ARQUITETURA.md §2.5).
 *
 * No Postgres do Payload, excluir um documento usado em outro apaga a referência em silêncio
 * (ON DELETE SET NULL / linhas de _rels removidas): o piloto some dos resultados e o campeão vira vazio.
 * Por isso, antes de excluir, procuramos em TODAS as coleções (inclusive as de outras frentes:
 * notícias, galerias, treinos…) os campos de relacionamento que apontam para o documento.
 * Havendo uso, a exclusão é recusada com a orientação "use Desativar".
 */
import type { CollectionBeforeDeleteHook, FlattenedField, PayloadRequest } from 'payload'
import { contar } from './api'
import { falhar, MENSAGEM_DESATIVAR } from './erros'
import type { ID } from './util'

export interface Referencia {
  colecao: string
  rotulo: string
  caminho: string
}

/** Coleções internas do Payload (preferências, travas de edição…) não contam como vínculo. */
const ehInterna = (slug: string) => slug.startsWith('payload-')

function rotuloPlural(labels: unknown, slug: string): string {
  const plural = (labels as { plural?: unknown } | undefined)?.plural
  if (typeof plural === 'string') return plural
  if (plural && typeof plural === 'object') {
    const pt = (plural as Record<string, unknown>).pt
    if (typeof pt === 'string') return pt
  }
  return slug
}

function percorrer(campos: FlattenedField[], prefixo: string, alvo: string, saida: string[]) {
  for (const campo of campos) {
    if (campo.type === 'join') continue
    if ('virtual' in campo && campo.virtual) continue
    if (campo.type === 'relationship' || campo.type === 'upload') {
      // Relacionamentos polimórficos (vários destinos) ficam de fora: a consulta é diferente e eles
      // só aparecem em links genéricos de outras frentes.
      if (!Array.isArray(campo.relationTo) && campo.relationTo === alvo) saida.push(`${prefixo}${campo.name}`)
      continue
    }
    // Desce em grupos, listas e abas nomeadas; blocos ficam de fora (consulta por caminho não é confiável)
    if ((campo.type === 'group' || campo.type === 'array' || campo.type === 'tab') && 'flattenedFields' in campo) {
      percorrer(campo.flattenedFields, `${prefixo}${campo.name}.`, alvo, saida)
    }
  }
}

/** Todos os campos (de todas as coleções) que apontam para a coleção `alvo`. */
export function referenciasPara(req: PayloadRequest, alvo: string): Referencia[] {
  const referencias: Referencia[] = []
  for (const colecao of req.payload.config.collections) {
    if (ehInterna(colecao.slug)) continue
    const caminhos: string[] = []
    percorrer(colecao.flattenedFields, '', alvo, caminhos)
    for (const caminho of caminhos) {
      referencias.push({ colecao: colecao.slug, rotulo: rotuloPlural(colecao.labels, colecao.slug), caminho })
    }
  }
  return referencias
}

/** Conta, por coleção, quantos documentos usam o registro. */
export async function contarUsos(
  req: PayloadRequest,
  alvo: string,
  id: ID,
  ignorar: Array<{ colecao: string; caminho?: string }> = [],
): Promise<Array<{ rotulo: string; total: number }>> {
  const porColecao = new Map<string, { rotulo: string; total: number }>()
  for (const ref of referenciasPara(req, alvo)) {
    const ignorado = ignorar.some((i) => i.colecao === ref.colecao && (!i.caminho || i.caminho === ref.caminho))
    if (ignorado) continue
    const total = await contar(req, ref.colecao, { [ref.caminho]: { equals: id } })
    if (!total) continue
    const atual = porColecao.get(ref.colecao)
    // O mesmo documento pode usar o registro em dois campos; o maior número é uma boa aproximação
    if (!atual || total > atual.total) porColecao.set(ref.colecao, { rotulo: ref.rotulo, total })
  }
  return [...porColecao.values()]
}

const listar = (itens: string[]) =>
  itens.length <= 1 ? (itens[0] ?? '') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`

/** "Não é possível excluir este piloto, porque está em uso em: Inscrições (3) e Notícias (1). Use Desativar…" */
export function mensagemVinculos(oQue: string, usos: Array<{ rotulo: string; total: number }>, extra?: string) {
  const motivos = [extra, usos.length ? `está em uso em: ${listar(usos.map((u) => `${u.rotulo} (${u.total})`))}` : '']
    .filter(Boolean)
    .join('; ')
  return `Não é possível excluir ${oQue}, porque ${motivos}. ${MENSAGEM_DESATIVAR}`
}

/**
 * beforeDelete padrão: recusa a exclusão quando o registro é usado em qualquer lugar.
 * `ignorar` tira da conta vínculos que a própria coleção trata (ex.: corridas vazias da etapa,
 * que são excluídas junto).
 */
export function bloquearExclusaoComVinculos(opcoes: {
  alvo: string
  /** Ex.: "este piloto", "esta categoria" */
  oQue: string
  ignorar?: Array<{ colecao: string; caminho?: string }>
}): CollectionBeforeDeleteHook {
  return async ({ id, req }) => {
    const usos = await contarUsos(req, opcoes.alvo, id, opcoes.ignorar)
    if (usos.length) falhar(mensagemVinculos(opcoes.oQue, usos), 409)
  }
}
