/**
 * Modelo do editor da grade semanal (/admin/grade-treinos), usado no navegador (editor e pré-visualização)
 * e no servidor (POST /api/horarios-treino/salvar-grade). Funções puras, sem nada de servidor.
 *
 * Cada horário da grade vira uma "linha". As regras repetem as da coleção (src/collections/kartodromo):
 * horários de 5 em 5 min, fim depois do início, turma obrigatória, observação até 300 caracteres e o aviso
 * de sobreposição do hook `prepararHorario` (mesmo dia, mesmas categorias, validade que se cruza).
 *
 * Atenção: este arquivo é carregado junto com a configuração do Payload (scripts e geração de tipos rodam
 * fora do Next), então não pode importar CSS nem componentes — a pré-visualização fica em ./previa.ts.
 */
import {
  chaveDaData,
  conflitosDaGrade,
  dataDoDia,
  ehChave,
  formatarChave,
  HORARIOS_FIM,
  HORARIOS_INICIO,
  idDe,
  intervaloValido,
  minutosDoDia,
  refsCategorias,
  type DiaSemana,
  type HorarioGrade,
  type ID,
} from '@/lib/agenda'

/* ----------------------------------------------------------------------------------------------
 * Tipos
 * -------------------------------------------------------------------------------------------- */

export type LinhaGrade = {
  /** Identifica a linha no editor: "h12" (horário salvo, id 12) ou "n…" (novo, ainda não salvo). */
  chave: string
  id: ID | null
  diaSemana: DiaSemana
  horaInicio: string
  horaFim: string
  tipo: ID | null
  categorias: ID[]
  observacao: string
  /** Visível no site (falso = "Oculto": sai da grade sem ser apagado). */
  visivel: boolean
  /** "AAAA-MM-DD" ou nulo. */
  validoDe: string | null
  validoAte: string | null
  permitirSobreposicao: boolean
  /** updatedAt do horário quando o editor abriu (detecta alteração feita por outra pessoa). */
  atualizadoEm: string | null
  /** Quantos registros em "Treinos e exceções" substituem este horário (com vínculo, não se apaga). */
  vinculos: number
}

export type OpcaoTipo = { id: ID; nome: string; cor: string | null }
/** `publica`: o visitante vê a categoria (oculta não aparece no quadro do site). */
export type OpcaoCategoria = { id: ID; nome: string; sigla: string | null; publica: boolean }

/**
 * Horário visível que não está no editor (vencido, ou criado por outra pessoa depois que o editor abriu) e
 * ainda conta no aviso de sobreposição. `nota` explica ao moderador o que fazer.
 */
export type HorarioDeFora = {
  id: ID
  titulo: string
  nota: string
  diaSemana: DiaSemana
  horaInicio: string
  horaFim: string
  categorias: ID[]
  validoDe: string | null
  validoAte: string | null
}

/** O que o editor carrega do banco (e o que o endpoint de gravação devolve depois de salvar). */
export type DadosGrade = {
  linhas: LinhaGrade[]
  tipos: OpcaoTipo[]
  categorias: OpcaoCategoria[]
  /** Horários fora do editor: os visíveis contam no aviso de sobreposição; `total` inclui arquivados. */
  foraDoEditor: { visiveis: HorarioDeFora[]; total: number }
}

/** Dados + cores legíveis de cada tipo (mesma conta do site, feita no servidor por src/lib/grade.ts). */
export type EstadoGrade = DadosGrade & { cores: Record<string, { fundo: string; texto: string }> }

export type ErroDeLinha = { chave: string | null; mensagem: string }

/* ----------------------------------------------------------------------------------------------
 * Dias e horários
 * -------------------------------------------------------------------------------------------- */

/** Segunda → domingo, como no quadro do site. */
export const DIAS_EDITOR: ReadonlyArray<{ chave: DiaSemana; nome: string; curto: string }> = [
  { chave: 'segunda', nome: 'Segunda-feira', curto: 'Seg' },
  { chave: 'terca', nome: 'Terça-feira', curto: 'Ter' },
  { chave: 'quarta', nome: 'Quarta-feira', curto: 'Qua' },
  { chave: 'quinta', nome: 'Quinta-feira', curto: 'Qui' },
  { chave: 'sexta', nome: 'Sexta-feira', curto: 'Sex' },
  { chave: 'sabado', nome: 'Sábado', curto: 'Sáb' },
  { chave: 'domingo', nome: 'Domingo', curto: 'Dom' },
]

export const ehDiaSemana = (v: unknown): v is DiaSemana => DIAS_EDITOR.some((d) => d.chave === v)
export const nomeDoDia = (d: string) => DIAS_EDITOR.find((x) => x.chave === d)?.nome ?? d
const posicaoDoDia = (d: string) => {
  const i = DIAS_EDITOR.findIndex((x) => x.chave === d)
  return i < 0 ? 9 : i
}

export { HORARIOS_FIM, HORARIOS_INICIO }

const hhmm = (minutos: number) => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`

/** Segunda → domingo; no mesmo dia, pelo início e pelo fim (a mesma ordem do site). */
export function ordenarLinhas(linhas: LinhaGrade[]): LinhaGrade[] {
  return [...linhas].sort(
    (a, b) =>
      posicaoDoDia(a.diaSemana) - posicaoDoDia(b.diaSemana) ||
      a.horaInicio.localeCompare(b.horaInicio) ||
      a.horaFim.localeCompare(b.horaFim),
  )
}

export function foraDeOrdem(doDia: LinhaGrade[]): boolean {
  for (let i = 1; i < doDia.length; i++) {
    const a = doDia[i - 1]
    const b = doDia[i]
    if (a.horaInicio > b.horaInicio || (a.horaInicio === b.horaInicio && a.horaFim > b.horaFim)) return true
  }
  return false
}

/* ----------------------------------------------------------------------------------------------
 * Criação e conversão de linhas
 * -------------------------------------------------------------------------------------------- */

let contador = 0
export const novaChave = () => `n${Date.now().toString(36)}${(contador++).toString(36)}`

/** Horário novo no dia: começa no fim do último horário do dia (ou 08:00) e dura 1 hora. */
export function linhaNova(dia: DiaSemana, doDia: LinhaGrade[], tipoPadrao: ID | null): LinhaGrade {
  const fins = doDia.map((l) => l.horaFim).filter((h) => HORARIOS_INICIO.includes(h)).sort()
  const inicio = fins.length ? fins[fins.length - 1] : '08:00'
  const fim = hhmm(Math.min(minutosDoDia(inicio) + 60, 24 * 60))
  return {
    chave: novaChave(),
    id: null,
    diaSemana: dia,
    horaInicio: inicio,
    horaFim: fim,
    tipo: tipoPadrao,
    categorias: [],
    observacao: '',
    visivel: true,
    validoDe: null,
    validoAte: null,
    permitirSobreposicao: false,
    atualizadoEm: null,
    vinculos: 0,
  }
}

/** Cópia como horário novo (duplicar ou copiar o dia). */
export const copiaDaLinha = (l: LinhaGrade, dia: DiaSemana = l.diaSemana): LinhaGrade => ({
  ...l,
  chave: novaChave(),
  id: null,
  diaSemana: dia,
  categorias: [...l.categorias],
  atualizadoEm: null,
  vinculos: 0,
})

/** Copia todos os horários de um dia para outro (opcionalmente trocando os que já existem lá). */
export function copiarDia(
  linhas: LinhaGrade[],
  de: LinhaGrade['diaSemana'],
  para: LinhaGrade['diaSemana'],
  substituir: boolean,
): { linhas: LinhaGrade[]; copiados: number; tiradosDoSite: number } {
  const copias = linhas.filter((l) => l.diaSemana === de).map((l) => copiaDaLinha(l, para))
  let tiradosDoSite = 0
  const mantidas = substituir
    ? linhas.flatMap((l) => {
        if (l.diaSemana !== para) return [l]
        if (l.vinculos > 0) {
          tiradosDoSite++
          return [{ ...l, visivel: false }]
        }
        return []
      })
    : linhas
  return { linhas: [...mantidas, ...copias], copiados: copias.length, tiradosDoSite }
}

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const dataOuNulo = (v: unknown) => chaveDaData(v) ?? null

/** Horário gravado (depth 0) → linha do editor. */
export function linhaDoDoc(doc: Record<string, unknown>, vinculos = 0): LinhaGrade {
  const id = idDe(doc.id)
  return {
    chave: `h${id ?? novaChave()}`,
    id,
    diaSemana: (ehDiaSemana(doc.diaSemana) ? doc.diaSemana : 'segunda') as DiaSemana,
    horaInicio: texto(doc.horaInicio),
    horaFim: texto(doc.horaFim),
    tipo: idDe(doc.tipo),
    categorias: refsCategorias(doc.categorias as HorarioGrade['categorias']).map((c) => c.id),
    observacao: typeof doc.observacao === 'string' ? doc.observacao : '',
    visivel: doc.visibilidade !== 'oculto' && doc.visibilidade !== 'arquivado',
    validoDe: dataOuNulo(doc.validoDe),
    validoAte: dataOuNulo(doc.validoAte),
    permitirSobreposicao: doc.permitirSobreposicao === true,
    atualizadoEm: typeof doc.updatedAt === 'string' ? doc.updatedAt : null,
    vinculos,
  }
}

/** Linha recebida no pedido de gravação (JSON de fora): só os campos conhecidos, nos tipos certos. */
export function lerLinhaRecebida(x: unknown, indice: number): LinhaGrade {
  const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
  const id = idDe(o.id)
  const lista = Array.isArray(o.categorias) ? o.categorias : []
  return {
    chave: texto(o.chave) || (id !== null ? `h${id}` : `linha-${indice + 1}`),
    id,
    diaSemana: (ehDiaSemana(o.diaSemana) ? o.diaSemana : '') as DiaSemana,
    horaInicio: texto(o.horaInicio),
    horaFim: texto(o.horaFim),
    tipo: idDe(o.tipo),
    categorias: [...new Set(lista.map(idDe).filter((c): c is ID => c !== null).map(String))].map((c) =>
      /^\d+$/.test(c) ? Number(c) : c,
    ),
    observacao: typeof o.observacao === 'string' ? o.observacao : '',
    visivel: o.visivel !== false,
    validoDe: dataOuNulo(o.validoDe),
    validoAte: dataOuNulo(o.validoAte),
    permitirSobreposicao: o.permitirSobreposicao === true,
    atualizadoEm: typeof o.atualizadoEm === 'string' ? o.atualizadoEm : null,
    vinculos: 0,
  }
}

/** Dados para gravar na coleção (mesmos nomes de campo da tela do painel). */
export function dadosParaGravar(l: LinhaGrade) {
  return {
    diaSemana: l.diaSemana,
    horaInicio: l.horaInicio,
    horaFim: l.horaFim,
    tipo: l.tipo,
    categorias: l.categorias,
    observacao: l.observacao.trim() || null,
    visibilidade: l.visivel ? 'visivel' : 'oculto',
    validoDe: l.validoDe ? dataDoDia(l.validoDe) : null,
    validoAte: l.validoAte ? dataDoDia(l.validoAte) : null,
    permitirSobreposicao: l.permitirSobreposicao,
  }
}

/* ----------------------------------------------------------------------------------------------
 * Alterações
 * -------------------------------------------------------------------------------------------- */

/** O conteúdo de duas linhas é o mesmo? (ignora chave, data de atualização e vínculos) */
export function mesmaLinha(a: LinhaGrade, b: LinhaGrade): boolean {
  return (
    a.diaSemana === b.diaSemana &&
    a.horaInicio === b.horaInicio &&
    a.horaFim === b.horaFim &&
    String(a.tipo ?? '') === String(b.tipo ?? '') &&
    a.categorias.map(String).join(',') === b.categorias.map(String).join(',') &&
    a.observacao.trim() === b.observacao.trim() &&
    a.visivel === b.visivel &&
    (a.validoDe ?? '') === (b.validoDe ?? '') &&
    (a.validoAte ?? '') === (b.validoAte ?? '') &&
    a.permitirSobreposicao === b.permitirSobreposicao
  )
}

export type Alteracoes = {
  criar: LinhaGrade[]
  alterar: LinhaGrade[]
  excluir: LinhaGrade[]
  total: number
  /** Chaves das linhas novas ou alteradas (marcadas no editor). */
  mudaram: Set<string>
}

/** O que muda da grade no ar (`base`) para a grade do editor (`atual`). */
export function calcularAlteracoes(base: LinhaGrade[], atual: LinhaGrade[]): Alteracoes {
  const basePorId = new Map(base.filter((l) => l.id !== null).map((l) => [String(l.id), l]))
  const idsAtuais = new Set(atual.filter((l) => l.id !== null).map((l) => String(l.id)))
  const criar: LinhaGrade[] = []
  const alterar: LinhaGrade[] = []
  for (const l of atual) {
    const antes = l.id !== null ? basePorId.get(String(l.id)) : undefined
    if (!antes) criar.push(l)
    else if (!mesmaLinha(antes, l)) alterar.push(l)
  }
  const excluir = base.filter((l) => l.id !== null && !idsAtuais.has(String(l.id)))
  return {
    criar,
    alterar,
    excluir,
    total: criar.length + alterar.length + excluir.length,
    mudaram: new Set([...criar, ...alterar].map((l) => l.chave)),
  }
}

/* ----------------------------------------------------------------------------------------------
 * Validação (as mesmas regras da coleção, para avisar enquanto a pessoa edita)
 * -------------------------------------------------------------------------------------------- */

export function errosDosCampos(l: LinhaGrade, tipos?: OpcaoTipo[], categorias?: OpcaoCategoria[]): string[] {
  const erros: string[] = []
  if (!ehDiaSemana(l.diaSemana)) erros.push('Escolha o dia da semana.')
  const inicioOk = HORARIOS_INICIO.includes(l.horaInicio)
  const fimOk = HORARIOS_FIM.includes(l.horaFim)
  if (!inicioOk) erros.push('Escolha a hora de início (de 5 em 5 minutos, ex.: 08:00).')
  if (!fimOk) erros.push('Escolha a hora de término (de 5 em 5 minutos; 24:00 = meia-noite).')
  if (inicioOk && fimOk && !intervaloValido(l.horaInicio, l.horaFim)) {
    erros.push(`O término precisa ser depois do início (${l.horaInicio}).`)
  }
  if (l.tipo === null) erros.push('Escolha a turma (tipo de treino).')
  else if (tipos && !tipos.some((t) => String(t.id) === String(l.tipo))) {
    erros.push('A turma escolhida não existe mais. Escolha outra.')
  }
  if (categorias && l.categorias.some((c) => !categorias.some((x) => String(x.id) === String(c)))) {
    erros.push('Uma das categorias marcadas não existe mais. Desmarque-a.')
  }
  if (l.observacao.trim().length > 300) erros.push('A observação pode ter no máximo 300 caracteres.')
  if ((l.validoDe && !ehChave(l.validoDe)) || (l.validoAte && !ehChave(l.validoAte))) erros.push('Data de validade inválida.')
  if (l.validoDe && l.validoAte && l.validoAte < l.validoDe) {
    erros.push('"Válido até" precisa ser igual ou depois de "Válido a partir de".')
  }
  return erros
}

const paraConferir = (l: LinhaGrade | HorarioDeFora, visivel: boolean): HorarioGrade => ({
  id: 'chave' in l ? l.chave : `fora-${l.id}`,
  diaSemana: l.diaSemana,
  horaInicio: l.horaInicio,
  horaFim: l.horaFim,
  categorias: l.categorias.map((id) => ({ id })),
  validoDe: l.validoDe,
  validoAte: l.validoAte,
  visibilidade: visivel ? 'visivel' : 'oculto',
})

/**
 * Problemas de cada linha (chave → mensagens). O aviso de sobreposição vale para as linhas novas ou
 * alteradas (as que serão gravadas), como no hook da coleção: confere com os outros horários visíveis do
 * mesmo dia, inclusive os vencidos que ficam fora do editor.
 */
export function validarGrade(
  atual: LinhaGrade[],
  base: LinhaGrade[],
  contexto: { tipos?: OpcaoTipo[]; categorias?: OpcaoCategoria[]; foraDoEditor?: HorarioDeFora[] } = {},
): Map<string, string[]> {
  const { mudaram } = calcularAlteracoes(base, atual)
  const nomeTipo = new Map((contexto.tipos ?? []).map((t) => [String(t.id), t.nome]))
  const erros = new Map<string, string[]>()
  const outros = [
    ...atual.map((l) => ({ ref: paraConferir(l, l.visivel), descricao: descreverLinha(l, nomeTipo) })),
    ...(contexto.foraDoEditor ?? []).map((h) => ({
      ref: paraConferir(h, true),
      descricao: `"${h.titulo}"${h.nota ? ` (${h.nota})` : ''}`,
    })),
  ]
  for (const l of atual) {
    const lista = errosDosCampos(l, contexto.tipos, contexto.categorias)
    if (!lista.length && mudaram.has(l.chave) && !l.permitirSobreposicao) {
      const conflitos = conflitosDaGrade(
        paraConferir(l, l.visivel),
        outros.map((o) => o.ref),
      )
      if (conflitos.length) {
        const nomes = conflitos.map((c) => outros.find((o) => o.ref === c)?.descricao ?? `${c.horaInicio}–${c.horaFim}`)
        lista.push(
          `Coincide com ${nomes.join(' e ')} (mesmo dia, mesmas categorias). Ajuste o horário ou as categorias. ` +
            'Se for de propósito, marque "Permitir coincidir com outro horário" em "Mais opções".',
        )
      }
    }
    if (lista.length) erros.set(l.chave, lista)
  }
  return erros
}

export function descreverLinha(l: LinhaGrade, nomeTipo?: Map<string, string>): string {
  const tipo = l.tipo !== null ? nomeTipo?.get(String(l.tipo)) : undefined
  return `${DIAS_EDITOR.find((d) => d.chave === l.diaSemana)?.curto ?? '?'} ${l.horaInicio}–${l.horaFim}${tipo ? ` (${tipo})` : ''}`
}

export const textoValidade = (l: Pick<LinhaGrade, 'validoDe' | 'validoAte'>) =>
  l.validoDe && l.validoAte
    ? `Vale de ${formatarChave(l.validoDe)} a ${formatarChave(l.validoAte)}`
    : l.validoDe
      ? `Vale a partir de ${formatarChave(l.validoDe)}`
      : l.validoAte
        ? `Vale até ${formatarChave(l.validoAte)}`
        : ''
