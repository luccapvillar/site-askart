/**
 * "Refazer com IA" no editor da grade semanal (/admin/grade-treinos).
 *
 * O editor manda ao assistente de sempre (POST /api/assistente) o pedido do moderador junto com a grade do
 * editor (inclusive o que ainda não foi salvo). A proposta que volta (operações em "horarios-treino") NÃO é
 * gravada: vira mudança no editor, para o moderador ver na pré-visualização e então salvar, descartar,
 * pedir de novo ou ajustar à mão. Funções puras (rodam no navegador).
 */
import type { ID } from '@/lib/agenda'
import {
  ehDiaSemana,
  lerLinhaRecebida,
  novaChave,
  ordenarLinhas,
  type LinhaGrade,
  type OpcaoCategoria,
  type OpcaoTipo,
} from '@/components/admin/grade/modelo'
import type { Operacao } from './ferramentas'

export const ALVO_GRADE = 'horarios-treino'

/** Id que a IA usa para cada linha: o id gravado ou, para horário ainda não salvo, um número negativo. */
export function referenciasDasLinhas(linhas: LinhaGrade[]): Map<string, string> {
  const refs = new Map<string, string>()
  let temporario = 0
  for (const l of ordenarLinhas(linhas)) refs.set(l.id !== null ? String(l.id) : String(--temporario), l.chave)
  return refs
}

/** Texto enviado ao assistente: o pedido, as regras desta tela e a grade atual do editor em JSON. */
export function pedidoDaGrade(
  pedido: string,
  linhas: LinhaGrade[],
  refs: Map<string, string>,
  tipos: OpcaoTipo[],
  categorias: OpcaoCategoria[],
): string {
  const porChave = new Map([...refs].map(([ref, chave]) => [chave, Number(ref)]))
  const grade = ordenarLinhas(linhas).map((l) => ({
    id: porChave.get(l.chave),
    diaSemana: l.diaSemana,
    horaInicio: l.horaInicio,
    horaFim: l.horaFim,
    tipo: l.tipo,
    categorias: l.categorias,
    ...(l.observacao.trim() ? { observacao: l.observacao.trim() } : {}),
    ...(l.visivel ? {} : { visibilidade: 'oculto' }),
    ...(l.validoDe ? { validoDe: l.validoDe } : {}),
    ...(l.validoAte ? { validoAte: l.validoAte } : {}),
    ...(l.permitirSobreposicao ? { permitirSobreposicao: true } : {}),
    ...(l.vinculos ? { temAlteracoesEmTreinos: true } : {}),
  }))
  return [
    `Pedido do moderador, feito no editor da grade semanal de treinos: ${pedido.trim()}`,
    '',
    'Como responder a este pedido:',
    `- Mude só a grade semanal ("${ALVO_GRADE}"). Não consulte "${ALVO_GRADE}": a grade abaixo é a do editor agora, com mudanças que ainda não foram salvas.`,
    `- Termine chamando "propor_alteracoes" com operações em "${ALVO_GRADE}": criar (dados: diaSemana, horaInicio, horaFim, tipo, categorias, observacao), atualizar (id da grade abaixo; em dados, só o que muda) ou excluir (id).`,
    '- Ids negativos são horários ainda não salvos: use o mesmo id para alterar ou excluir.',
    '- "tipo" é o id da turma (lista "Turmas"); "categorias" são ids da lista "Categorias" (lista vazia = todas as categorias).',
    '- Horários "HH:MM" de 5 em 5 minutos; o término vem depois do início (24:00 = meia-noite). Dois horários do mesmo dia não podem se cruzar nas mesmas categorias, a não ser que o moderador peça.',
    '- Horário com "temAlteracoesEmTreinos" não pode ser excluído: para tirá-lo do site, atualize com visibilidade "oculto".',
    '- Se faltar informação ou a turma/categoria pedida não existir, pergunte em vez de chutar. Não invente turmas, categorias nem observações.',
    '- Nada é gravado agora: as mudanças aparecem na pré-visualização para o moderador conferir e salvar.',
    '',
    `Turmas (tipos de treino): ${JSON.stringify(tipos.map((t) => ({ id: t.id, nome: t.nome })))}`,
    `Categorias: ${JSON.stringify(categorias.map((c) => ({ id: c.id, nome: c.nome, ...(c.sigla ? { sigla: c.sigla } : {}) })))}`,
    `Grade atual (JSON): ${JSON.stringify(grade)}`,
  ].join('\n')
}

/** "8:00" → "08:00"; "8h" → "08:00"; o resto passa como veio (a validação do editor aponta o erro). */
function hora(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor
  const m = /^(\d{1,2})(?::|h)?(\d{2})?$/.exec(valor.trim())
  return m ? `${m[1].padStart(2, '0')}:${m[2] ?? '00'}` : valor.trim()
}

const CAMPOS = ['diaSemana', 'horaInicio', 'horaFim', 'tipo', 'categorias', 'observacao', 'validoDe', 'validoAte', 'permitirSobreposicao'] as const

type Contexto = { tipos: OpcaoTipo[]; categorias: OpcaoCategoria[]; tipoPadrao: ID | null }

const normal = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

/** Id da lista; se a IA mandou o nome (ou a sigla) em vez do id, procura pelo nome. */
function resolverId(valor: unknown, lista: Array<{ id: ID; nome: string; sigla?: string | null }>): unknown {
  const bruto = valor && typeof valor === 'object' && 'id' in valor ? (valor as { id: unknown }).id : valor
  if (lista.some((x) => String(x.id) === String(bruto))) return bruto
  if (typeof bruto !== 'string' || !bruto.trim()) return bruto
  const alvo = normal(bruto)
  return lista.find((x) => normal(x.nome) === alvo || (x.sigla && normal(x.sigla) === alvo))?.id ?? bruto
}

/** Campos da proposta → campos da linha (só os que vieram). */
function camposDaProposta(dados: Record<string, unknown>, atual: LinhaGrade, contexto: Contexto): LinhaGrade {
  const entrada: Record<string, unknown> = { ...atual }
  for (const campo of CAMPOS) if (campo in dados) entrada[campo] = dados[campo]
  if ('tipo' in dados) entrada.tipo = resolverId(dados.tipo, contexto.tipos)
  if ('categorias' in dados) {
    entrada.categorias = (Array.isArray(dados.categorias) ? dados.categorias : []).map((c) => resolverId(c, contexto.categorias))
  }
  if ('horaInicio' in dados) entrada.horaInicio = hora(dados.horaInicio)
  if ('horaFim' in dados) entrada.horaFim = hora(dados.horaFim)
  if ('visibilidade' in dados) entrada.visivel = dados.visibilidade !== 'oculto' && dados.visibilidade !== 'arquivado'
  if (!ehDiaSemana(entrada.diaSemana)) entrada.diaSemana = atual.diaSemana
  const lida = lerLinhaRecebida(entrada, 0)
  return { ...lida, chave: atual.chave, id: atual.id, atualizadoEm: atual.atualizadoEm, vinculos: atual.vinculos }
}

export type ResultadoDaProposta = {
  linhas: LinhaGrade[]
  /** O que entrou no editor (descrições da IA). */
  aplicadas: string[]
  /** O que não entrou, com o motivo. */
  ignoradas: string[]
}

/** Aplica a proposta da IA nas linhas do editor (sem gravar nada). */
export function aplicarPropostaNaGrade(
  linhas: LinhaGrade[],
  operacoes: Operacao[],
  refs: Map<string, string>,
  contexto: Contexto,
): ResultadoDaProposta {
  let saida = [...linhas]
  const aplicadas: string[] = []
  const ignoradas: string[] = []
  const acharChave = (id: unknown) => (id === undefined || id === null ? undefined : refs.get(String(id)))

  for (const op of operacoes) {
    const descricao = op.descricao?.trim() || `${op.tipo} em ${op.alvo}`
    if (op.alvo !== ALVO_GRADE) {
      ignoradas.push(`${descricao} — não é da grade semanal; use o Assistente no menu para isso.`)
      continue
    }
    const dados = op.dados && typeof op.dados === 'object' ? op.dados : {}
    if (op.tipo === 'criar') {
      if (!ehDiaSemana(dados.diaSemana)) {
        ignoradas.push(`${descricao} — a IA não disse o dia da semana.`)
        continue
      }
      const modelo: LinhaGrade = {
        chave: novaChave(),
        id: null,
        diaSemana: dados.diaSemana,
        horaInicio: '',
        horaFim: '',
        tipo: contexto.tipoPadrao,
        categorias: [],
        observacao: '',
        visivel: true,
        validoDe: null,
        validoAte: null,
        permitirSobreposicao: false,
        atualizadoEm: null,
        vinculos: 0,
      }
      saida.push(camposDaProposta(dados, modelo, contexto))
      aplicadas.push(descricao)
      continue
    }
    const chave = acharChave(op.id)
    const atual = chave ? saida.find((l) => l.chave === chave) : undefined
    if (!atual) {
      ignoradas.push(`${descricao} — horário não encontrado na grade do editor.`)
      continue
    }
    if (op.tipo === 'atualizar') {
      saida = saida.map((l) => (l.chave === atual.chave ? camposDaProposta(dados, l, contexto) : l))
      aplicadas.push(descricao)
    } else if (op.tipo === 'excluir') {
      if (atual.vinculos > 0) {
        // Horário com histórico em "Treinos e exceções" não se apaga: sai do site
        saida = saida.map((l) => (l.chave === atual.chave ? { ...l, visivel: false } : l))
        aplicadas.push(`${descricao} (tem alterações em "Treinos e exceções": em vez de apagar, foi tirado do site)`)
      } else {
        saida = saida.filter((l) => l.chave !== atual.chave)
        aplicadas.push(descricao)
      }
    } else {
      ignoradas.push(`${descricao} — tipo de mudança não usado na grade.`)
    }
  }
  return { linhas: saida, aplicadas, ignoradas }
}
