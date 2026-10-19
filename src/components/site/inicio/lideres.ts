/**
 * Líderes da página inicial agrupados por categoria — função PURA (sem React nem Payload), testada em tests/int.
 *
 * Regra do BKS: F400 e 125cc têm subcategorias (F400: Novatos, Junior, Graduados, Sênior e GSS/60+; 125cc:
 * Novatos, Junior, Graduados e Sênior), o Kart indoor também; Cadete e Mirim não têm. Cada categoria vira um
 * grupo com TODAS as subcategorias cadastradas, na ordem da categoria — um cartão por subcategoria, com o
 * líder dela e os pontos (ou "ainda sem pontos"), sem cortar nenhuma. Categoria sem subcategorias (ou cuja
 * classificação ainda não separa por subcategoria) tem um cartão só, com o líder da categoria.
 */
import { nomesCadastrados, separarClassificacao } from '@/lib/subcategorias'
import type { Categoria } from '@/payload-types'

type Linha = {
  posicao: number
  posicaoAnterior?: number | null
  subcategoria?: string | null
  pontos: number
  nome: string
  numero?: string | number | null
  equipeNome?: string | null
}

/** O mínimo da classificação calculada (src/lib/carregar-competicao.ts) que os líderes usam. */
export type ClassificacaoParaLideres = {
  categoria: number | string
  porSubcategoria: boolean
  linhas: Linha[]
  lider: { linha: Linha; tipo: 'lider' | 'destaque'; rotulo: string } | null
}

export type CategoriaDosLideres = Pick<Categoria, 'nome' | 'cor' | 'subcategorias'>

export type PilotoLider = {
  numero: string | number | null
  nome: string
  equipe: string | null
  pontos: number
  /** Pontos à frente do 2º (da subcategoria ou da categoria); null = sem 2º colocado. */
  vantagem: number | null
  /** "Líder" ou o rótulo do destaque escolhido no painel. */
  rotulo: string
}

export type CartaoLider = {
  chave: string
  /** Nome da subcategoria; null = cartão da categoria inteira. */
  subcategoria: string | null
  /** null = a subcategoria ainda não tem pontos. */
  lider: PilotoLider | null
}

export type GrupoLideres = {
  chave: string
  categoria: CategoriaDosLideres | null
  /** true = um cartão por subcategoria; false = um cartão só (categoria inteira). */
  porSubcategoria: boolean
  cartoes: CartaoLider[]
  /** Destaque escolhido no painel para a categoria, quando ela está separada por subcategoria. */
  destaque: PilotoLider | null
}

const vantagem = (lider: Linha, segundo?: Linha) => (segundo ? Math.round((lider.pontos - segundo.pontos) * 10) / 10 : null)

const piloto = (linha: Linha, segundo: Linha | undefined, rotulo: string): PilotoLider => ({
  numero: linha.numero ?? null,
  nome: linha.nome,
  equipe: linha.equipeNome ?? null,
  pontos: linha.pontos,
  vantagem: vantagem(linha, segundo),
  rotulo,
})

/**
 * Grupos de líderes, na ordem das classificações. Só entram categorias com algum líder (antes da 1ª etapa
 * com resultado oficial a seção some). `limite` = quantas categorias mostrar (cada uma sempre inteira).
 */
export function montarLideres(
  classificacoes: ClassificacaoParaLideres[],
  categoriaDe: (id: number | string) => CategoriaDosLideres | null,
  limite = Infinity,
): GrupoLideres[] {
  const grupos: GrupoLideres[] = []
  for (const c of classificacoes) {
    const categoria = categoriaDe(c.categoria)
    const chave = String(c.categoria)
    const cadastradas = nomesCadastrados(categoria?.subcategorias)
    const separada = separarClassificacao(c.linhas, categoria?.subcategorias, { pontosPorSubcategoria: c.porSubcategoria })

    if (separada.porSubcategoria) {
      const liderDoGrupo = (g: (typeof separada.grupos)[number] | undefined): PilotoLider | null => {
        const primeira = g?.linhas[0]?.linha
        return primeira && primeira.pontos > 0 ? piloto(primeira, g?.linhas[1]?.linha, 'Líder') : null
      }
      // Todas as cadastradas, na ordem da categoria (com ou sem pontos)…
      const cartoes: CartaoLider[] = cadastradas.map((nome) => {
        const g = separada.grupos.find((x) => !x.semSubcategoria && x.nome === nome)
        return { chave: `${chave}-${g?.chave ?? nome}`, subcategoria: nome, lider: liderDoGrupo(g) }
      })
      // …e as que saíram da lista ou os pilotos sem subcategoria, só quando já têm pontos
      for (const g of separada.grupos) {
        if (!g.semSubcategoria && cadastradas.includes(g.nome ?? '')) continue
        const lider = liderDoGrupo(g)
        if (lider) cartoes.push({ chave: `${chave}-${g.chave}`, subcategoria: g.nome, lider })
      }
      if (!cartoes.some((x) => x.lider)) continue
      const destaque = c.lider?.tipo === 'destaque' ? piloto(c.lider.linha, undefined, c.lider.rotulo || 'Destaque') : null
      grupos.push({ chave, categoria, porSubcategoria: true, cartoes, destaque })
      continue
    }

    if (!c.lider) continue
    const segundo = c.lider.tipo === 'lider' ? [...c.linhas].sort((a, b) => a.posicao - b.posicao)[1] : undefined
    grupos.push({
      chave,
      categoria,
      porSubcategoria: false,
      cartoes: [{ chave, subcategoria: null, lider: piloto(c.lider.linha, segundo, c.lider.rotulo || 'Líder') }],
      destaque: null,
    })
  }
  return grupos.slice(0, Math.max(1, limite))
}
