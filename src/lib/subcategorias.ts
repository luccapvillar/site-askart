/**
 * Subcategorias no site — funções PURAS (sem React nem Payload), testadas em tests/int.
 *
 * Uma categoria pode ter subcategorias (ex.: F400 → Novatos, Junior, Graduados). Elas aparecem:
 * - no resultado da etapa e na classificação: uma tabela por subcategoria, com a posição dentro dela e a
 *   posição geral ao lado (os pontos são sempre os do campeonato: a subcategoria não muda pontos);
 * - na programação da etapa: os horários de cada subcategoria, quando a corrida diz para quais vale.
 *
 * Regras comuns (iguais em todo o site):
 * - ordem = a cadastrada na categoria; nome gravado com outra grafia vira o da categoria ("junior" → "Junior");
 * - nome que não está mais na lista da categoria vem depois das cadastradas, pela ordem alfabética;
 * - quem não tem subcategoria fica num grupo à parte (`null`), que cada tela nomeia e posiciona.
 */

export const SEM_SUBCATEGORIA = 'Sem subcategoria'
export const TODAS_AS_SUBCATEGORIAS = 'Todas as subcategorias'

type ItemSubcategoria = { nome?: string | null } | string | null | undefined

/** Texto comparável: sem acento, sem pontuação, minúsculo ("GSS/60+" → "gss 60"). */
export const normalizarSubcategoria = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

/** Nomes das subcategorias cadastradas (na ordem da categoria, sem vazios nem repetidos). */
export function nomesCadastrados(subcategorias: ItemSubcategoria[] | null | undefined): string[] {
  const nomes = (subcategorias ?? []).map((s) => (typeof s === 'string' ? s : s?.nome)?.trim() ?? '')
  return nomes.filter((n, i) => n && nomes.indexOf(n) === i)
}

/** Nome como está cadastrado na categoria ("junior" → "Junior"); desconhecido fica como veio; vazio → null. */
export function nomeOficial(nome: string | null | undefined, cadastradas: string[]): string | null {
  const t = typeof nome === 'string' ? nome.trim() : ''
  if (!t) return null
  return cadastradas.find((c) => c === t) ?? cadastradas.find((c) => normalizarSubcategoria(c) === normalizarSubcategoria(t)) ?? t
}

/** Chave para ids de HTML: "GSS/60+" → "gss-60". */
export const chaveDeSubcategoria = (nome: string) => normalizarSubcategoria(nome).replace(/ /g, '-') || 'subcategoria'

/**
 * Agrupa itens pela subcategoria: as cadastradas na ordem da categoria, depois as que saíram da lista (pelo
 * nome) e, no fim, os itens sem subcategoria (`nome: null`). Só grupos com itens; a ordem dos itens é mantida.
 */
export function agruparPorSubcategoria<T>(
  itens: T[],
  subcategoriaDe: (item: T) => string | null | undefined,
  cadastradas: string[],
): { nome: string | null; itens: T[] }[] {
  const comNome = itens.map((item) => ({ item, nome: nomeOficial(subcategoriaDe(item), cadastradas) }))
  const extras = [...new Set(comNome.map((x) => x.nome).filter((n): n is string => n !== null && !cadastradas.includes(n)))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true }),
  )
  return [...cadastradas, ...extras, null]
    .map((nome) => ({ nome, itens: comNome.filter((x) => x.nome === nome).map((x) => x.item) }))
    .filter((g) => g.itens.length > 0)
}

/** Posição dentro do grupo: 1 + quantos do grupo estão à frente (mesma posição geral = mesma posição no grupo). */
export const posicaoRelativa = (geral: number | null | undefined, gerais: number[]): number | null =>
  typeof geral === 'number' && Number.isFinite(geral) ? 1 + gerais.filter((g) => g < geral).length : null

/* ───────────────────────────── classificação do campeonato ───────────────────────────── */

type LinhaComPosicao = { posicao: number; posicaoAnterior?: number | null; subcategoria?: string | null }

export interface LinhaNaSubcategoria<L> {
  linha: L
  /** Posição exibida: dentro da subcategoria (tabelas separadas) ou a geral (tabela única). */
  posicao: number
  /** Posição geral na categoria — só nas tabelas por subcategoria (para "1º (3º geral)"). */
  posicaoGeral: number | null
  /** Posição anterior no mesmo critério de `posicao` (para a seta de subiu/caiu). */
  posicaoAnterior: number | null
}

export interface GrupoClassificacao<L> {
  /** Chave estável para ids de HTML ("novatos", "sem-subcategoria"; "categoria" na tabela única). */
  chave: string
  /** Nome da subcategoria ("Sem subcategoria" para quem não tem); null na tabela única da categoria. */
  nome: string | null
  semSubcategoria: boolean
  linhas: LinhaNaSubcategoria<L>[]
}

export interface ClassificacaoSeparada<L> {
  /** true = uma tabela por subcategoria (com posição relativa); false = uma tabela só, como antes. */
  porSubcategoria: boolean
  grupos: GrupoClassificacao<L>[]
}

/**
 * Classificação de uma categoria separada por subcategoria. Cada tabela tem só os pilotos da subcategoria,
 * na ordem da classificação geral, com a posição DENTRO da subcategoria (empate na posição geral = mesma
 * posição) e a geral ao lado. A seta de subiu/caiu compara com a posição anterior dentro da subcategoria.
 * Os pontos não mudam. Categoria sem subcategorias — ou nenhum piloto com subcategoria — tem uma tabela só.
 */
export function separarClassificacao<L extends LinhaComPosicao>(
  linhas: L[],
  subcategorias: ItemSubcategoria[] | null | undefined,
): ClassificacaoSeparada<L> {
  const ordenadas = [...linhas].sort((a, b) => a.posicao - b.posicao)
  const cadastradas = nomesCadastrados(subcategorias)
  const porSubcategoria = cadastradas.length > 0 && ordenadas.some((l) => nomeOficial(l.subcategoria, cadastradas) !== null)
  if (!porSubcategoria) {
    return {
      porSubcategoria: false,
      grupos: [
        {
          chave: 'categoria',
          nome: null,
          semSubcategoria: false,
          linhas: ordenadas.map((linha) => ({ linha, posicao: linha.posicao, posicaoGeral: null, posicaoAnterior: linha.posicaoAnterior ?? null })),
        },
      ],
    }
  }
  const usadas = new Set<string>()
  const grupos = agruparPorSubcategoria(ordenadas, (l) => l.subcategoria, cadastradas).map((g, i) => {
    let chave = g.nome === null ? 'sem-subcategoria' : chaveDeSubcategoria(g.nome)
    if (usadas.has(chave)) chave = `${chave}-${i + 1}`
    usadas.add(chave)
    const gerais = g.itens.map((l) => l.posicao)
    const anteriores = g.itens.map((l) => l.posicaoAnterior).filter((n): n is number => typeof n === 'number')
    return {
      chave,
      nome: g.nome ?? SEM_SUBCATEGORIA,
      semSubcategoria: g.nome === null,
      linhas: g.itens.map((linha) => ({
        linha,
        posicao: posicaoRelativa(linha.posicao, gerais) as number,
        posicaoGeral: linha.posicao,
        posicaoAnterior: posicaoRelativa(linha.posicaoAnterior, anteriores),
      })),
    }
  })
  return { porSubcategoria: true, grupos }
}

/* ───────────────────────────── programação da etapa ───────────────────────────── */

/**
 * Para quais subcategorias uma sessão vale: a lista da corrida (com a grafia da categoria). Vazia = todas.
 */
export const subcategoriasDaSessao = (valor: unknown, cadastradas: string[]): string[] =>
  (Array.isArray(valor) ? valor : typeof valor === 'string' ? [valor] : [])
    .map((v) => nomeOficial(typeof v === 'string' ? v : null, cadastradas))
    .filter((n, i, todas): n is string => n !== null && todas.indexOf(n) === i)

export interface GrupoHorarios<S> {
  /** Chave estável para ids de HTML ("todas", "novatos"…). */
  chave: string
  /** Nome da subcategoria; null = sessões que valem para todas as subcategorias. */
  nome: string | null
  /** Texto do grupo: o nome, ou "Todas as subcategorias". */
  rotulo: string
  sessoes: S[]
}

/**
 * Horários de UMA categoria separados por subcategoria: primeiro "Todas as subcategorias" (sessões sem
 * subcategoria marcada), depois cada subcategoria na ordem cadastrada (as que saíram da lista vêm depois,
 * pelo nome). Uma sessão de duas subcategorias aparece nas duas. Só grupos com sessão; a ordem das sessões
 * (horário) é mantida. Nenhuma sessão com subcategoria marcada → null (a programação fica como sempre foi).
 */
export function agruparHorariosPorSubcategoria<S>(
  sessoes: S[],
  subcategoriasDe: (sessao: S) => unknown,
  subcategorias: ItemSubcategoria[] | null | undefined,
): GrupoHorarios<S>[] | null {
  const cadastradas = nomesCadastrados(subcategorias)
  const marcadas = sessoes.map((sessao) => ({ sessao, subs: subcategoriasDaSessao(subcategoriasDe(sessao), cadastradas) }))
  if (!marcadas.some((m) => m.subs.length > 0)) return null
  const extras = [...new Set(marcadas.flatMap((m) => m.subs).filter((n) => !cadastradas.includes(n)))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true }),
  )
  const usadas = new Set<string>()
  return [null, ...cadastradas, ...extras]
    .map((nome) => ({ nome, sessoes: marcadas.filter((m) => (nome === null ? !m.subs.length : m.subs.includes(nome))).map((m) => m.sessao) }))
    .filter((g) => g.sessoes.length > 0)
    .map((g, i) => {
      let chave = g.nome === null ? 'todas' : chaveDeSubcategoria(g.nome)
      if (usadas.has(chave)) chave = `${chave}-${i + 1}`
      usadas.add(chave)
      return { chave, nome: g.nome, rotulo: g.nome ?? TODAS_AS_SUBCATEGORIAS, sessoes: g.sessoes }
    })
}
