/** Texto mostrado no lugar do valor enquanto a ASKART não informa o preço (pedido do cliente). */
export const VALOR_A_CONFIRMAR = 'R$ X'

/** Valor em reais no formato brasileiro: 450 → "R$ 450,00". */
export function formatarReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function valorDaTaxa(taxa: { valor?: number | null; aConfirmar?: boolean | null }): string {
  if (taxa.aConfirmar || taxa.valor === null || taxa.valor === undefined) return VALOR_A_CONFIRMAR
  return formatarReais(taxa.valor)
}

/* ───────────────────── Mensalidade da taxa de pista ───────────────────── */

type Valor = number | null | undefined

/** Valores de uma opção do plano, como ficam gravados no painel ("Sem desconto" ou "Com desconto bônus"). */
export type ValoresGravados = { pista?: Valor; ambulancias?: Valor } | null | undefined

/** Plano da mensalidade como fica gravado no painel (global "kartodromo", campo mensalidadePlanos). */
export type PlanoGravado = {
  id?: string | null
  ambulanciasIncluidas?: Valor
  semDesconto?: ValoresGravados
  comDesconto?: ValoresGravados
}

/** Uma opção pronta para o site. Valor ausente = null (o site mostra "R$ X"); o total só existe com as duas partes. */
export type OpcaoMensalidade = { pista: number | null; ambulancias: number | null; total: number | null }

export type PlanoMensalidade = {
  chave: string
  ambulanciasIncluidas: number
  semDesconto: OpcaoMensalidade | null
  comDesconto: OpcaoMensalidade | null
}

const ehValor = (v: Valor): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0

/** Soma em reais sem erro de arredondamento (centavos). */
export const somarReais = (a: number, b: number) => Math.round(a * 100 + b * 100) / 100

/**
 * Opção do plano: o TOTAL é calculado aqui (mensalidade da pista + taxas de ambulância), nunca digitado.
 * Sem nenhum dos dois valores, a opção não existe (null).
 */
export function opcaoDaMensalidade(valores: ValoresGravados): OpcaoMensalidade | null {
  const pista = ehValor(valores?.pista) ? valores.pista : null
  const ambulancias = ehValor(valores?.ambulancias) ? valores.ambulancias : null
  if (pista === null && ambulancias === null) return null
  return { pista, ambulancias, total: pista !== null && ambulancias !== null ? somarReais(pista, ambulancias) : null }
}

/**
 * Planos que o site mostra, na ordem do painel. Fica de fora o plano sem a quantidade de taxas de ambulância
 * ou sem nenhum valor. `semDesconto`/`comDesconto` dizem se a coluna aparece (algum plano tem valor nela).
 */
export function planosDaMensalidade(planos: PlanoGravado[] | null | undefined) {
  const lista: PlanoMensalidade[] = (planos ?? []).flatMap((p, i) => {
    const quantidade = p.ambulanciasIncluidas
    if (!ehValor(quantidade) || quantidade < 1) return []
    const semDesconto = opcaoDaMensalidade(p.semDesconto)
    const comDesconto = opcaoDaMensalidade(p.comDesconto)
    if (!semDesconto && !comDesconto) return []
    return [{ chave: p.id || `plano-${i}`, ambulanciasIncluidas: quantidade, semDesconto, comDesconto }]
  })
  return {
    planos: lista,
    semDesconto: lista.some((p) => p.semDesconto),
    comDesconto: lista.some((p) => p.comDesconto),
  }
}

/** "taxa de ambulância" (1) ou "taxas de ambulância". */
export const nomeTaxasDeAmbulancia = (quantidade: number) => (quantidade === 1 ? 'taxa de ambulância' : 'taxas de ambulância')

/** "1 taxa de ambulância", "4 taxas de ambulância". */
export const taxasDeAmbulancia = (quantidade: number) => `${quantidade} ${nomeTaxasDeAmbulancia(quantidade)}`

/** Valor da opção para o site: "R$ 450,00" ou "R$ X" quando falta. */
export const reaisOuAConfirmar = (valor: number | null) => (valor === null ? VALOR_A_CONFIRMAR : formatarReais(valor))

/* ───────────────────── Dados oficiais (enviados pelo cliente em 21/10/2026) ───────────────────── */

/** Taxa de pista avulsa (cliente, 21/10/2026). */
export const TAXA_DE_PISTA_AVULSA = 80

/** Introdução da mensalidade (padrão do painel e dos dados oficiais). */
export const INTRODUCAO_MENSALIDADE_PADRAO =
  'A taxa de pista também pode ser paga por mês. A mensalidade é só para quem não corre no horário de iniciante e já inclui algumas taxas de ambulância.'

/**
 * Comunicado afixado no kartódromo ("Brasília, 12 de Fevereiro de 2026"): opções de mensalidade da taxa de pista
 * que incluem taxas de ambulância. "Sem desconto" = "Valor total sem desconto atual"; "Com desconto bônus" =
 * "Valor total com desconto bônus". Valores em reais, exatamente como no comunicado (o total é calculado no site).
 */
export const PLANOS_MENSALIDADE_OFICIAIS = [
  { ambulanciasIncluidas: 4, semDesconto: { pista: 320, ambulancias: 200 }, comDesconto: { pista: 300, ambulancias: 150 } },
  { ambulanciasIncluidas: 8, semDesconto: { pista: 320, ambulancias: 400 }, comDesconto: { pista: 300, ambulancias: 300 } },
  { ambulanciasIncluidas: 12, semDesconto: { pista: 320, ambulancias: 600 }, comDesconto: { pista: 300, ambulancias: 450 } },
] as const

/** Regras do comunicado de 12/02/2026, em português simples. */
export const REGRAS_MENSALIDADE_OFICIAIS = [
  'A mensalidade é só para quem não corre no horário de iniciante.',
  'O desconto vale somente para pilotos mensalistas, a partir da data do pagamento da pista.',
  'O desconto é intransferível e não pode ser acumulado.',
  'Treinos além dos incluídos no plano pagam a taxa de ambulância integral.',
  'Valores com desconto em vigor desde 12 de fevereiro de 2026.',
] as const

/** Passo "Pague as taxas na Administração" do "Como treinar": texto original (dados oficiais de 16/10/2026). */
export const TEXTO_PASSO_TAXAS_ANTIGO =
  'Antes de entrar na pista, pague a taxa de ambulância (R$ 50,00 por piloto, por dia de treino) e a taxa de pista na Administração do Kartódromo.'

/** O mesmo passo com o valor da taxa de pista e a mensalidade. */
export const TEXTO_PASSO_TAXAS =
  'Antes de entrar na pista, pague na Administração do Kartódromo a taxa de ambulância (R$ 50,00 por piloto, por dia de treino) e a taxa de pista (R$ 80,00 avulsa, ou a mensalidade para quem não treina no horário de iniciante).'

/* ───────────────────── Atualização do site já publicado ───────────────────── */

type TaxaGravada = { item?: string | null; valor?: number | null; aConfirmar?: boolean | null; observacao?: string | null } & Record<string, unknown>
type PassoGravado = { titulo?: string | null; texto?: string | null } & Record<string, unknown>

const vazio = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0)
const ehTaxaDePista = (t: TaxaGravada) =>
  (t.item ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase() === 'taxa de pista'

/**
 * Atualização do site já publicado (scripts/atualizacoes.ts, passo 9): o que muda numa versão do global
 * "kartodromo" (publicada ou rascunho) para os dados de 21/10/2026, sem tocar no que o moderador já preencheu.
 * `dados` = campos a gravar (vazio = nada a trocar); `feitos` = o que muda; `avisos` = o que ficou, e por quê.
 */
export function taxasDe2026(doc: Record<string, unknown>): { dados: Record<string, unknown>; feitos: string[]; avisos: string[] } {
  const dados: Record<string, unknown> = {}
  const feitos: string[] = []
  const avisos: string[] = []

  const taxas = (doc.taxas ?? []) as TaxaGravada[]
  const pista = taxas.findIndex(ehTaxaDePista)
  if (pista < 0) avisos.push('não há "Taxa de pista" na lista de taxas (nada mudado nela)')
  else if (taxas[pista].aConfirmar || taxas[pista].valor === null || taxas[pista].valor === undefined) {
    const t = taxas[pista]
    dados.taxas = taxas.map((x, i) =>
      i === pista ? { ...x, valor: TAXA_DE_PISTA_AVULSA, aConfirmar: false, observacao: t.observacao?.trim() || 'Avulsa' } : x,
    )
    feitos.push('taxa de pista R$ 80,00 (avulsa)')
  } else avisos.push('a taxa de pista já tinha valor no painel: mantida')

  if (vazio(doc.mensalidadeIntroducao)) {
    dados.mensalidadeIntroducao = INTRODUCAO_MENSALIDADE_PADRAO
    feitos.push('introdução da mensalidade')
  }
  if (vazio(doc.mensalidadePlanos)) {
    dados.mensalidadePlanos = PLANOS_MENSALIDADE_OFICIAIS.map((p) => ({
      ambulanciasIncluidas: p.ambulanciasIncluidas,
      semDesconto: { ...p.semDesconto },
      comDesconto: { ...p.comDesconto },
    }))
    feitos.push(`${PLANOS_MENSALIDADE_OFICIAIS.length} planos da mensalidade`)
  } else avisos.push('os planos da mensalidade já estavam preenchidos: mantidos')
  if (vazio(doc.mensalidadeRegras)) {
    dados.mensalidadeRegras = REGRAS_MENSALIDADE_OFICIAIS.map((texto) => ({ texto }))
    feitos.push(`${REGRAS_MENSALIDADE_OFICIAIS.length} regras da mensalidade`)
  } else avisos.push('as regras da mensalidade já estavam preenchidas: mantidas')

  const passos = (doc.comoTreinar ?? []) as PassoGravado[]
  const passo = passos.findIndex((p) => p.texto === TEXTO_PASSO_TAXAS_ANTIGO)
  if (passo >= 0) {
    dados.comoTreinar = passos.map((p, i) => (i === passo ? { ...p, texto: TEXTO_PASSO_TAXAS } : p))
    feitos.push(`passo "${passos[passo].titulo ?? 'Pague as taxas na Administração'}" do "Como treinar" com o valor da taxa de pista`)
  } else if (!passos.length) {
    avisos.push('o "Como treinar" está sem passos: nada mudado nele')
  } else if (!passos.some((p) => p.texto === TEXTO_PASSO_TAXAS)) {
    avisos.push('o texto do passo das taxas no "Como treinar" não é mais o original (mudado no painel): mantido')
  }

  return { dados, feitos, avisos }
}
