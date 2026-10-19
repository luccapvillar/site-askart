/**
 * Topo da página inicial — funções PURAS (sem React nem Payload), testadas em tests/int.
 *
 * O topo apresenta a ASKART (pedido do cliente: "o começo do site é mais da ASKART, e não do kartódromo nem
 * do BKS"), com dois caminhos equivalentes: o BKS e o Kartódromo do Guará. Antes ele abria com o campeonato
 * ("Brasília Kart Series 2026"). Aqui ficam o texto padrão novo e o reconhecimento do padrão ANTIGO, usado
 * pela atualização (scripts/atualizacoes.ts) que limpa o texto antigo do BKS gravado no painel — só ele: o
 * que o moderador escreveu por conta própria fica como está.
 */

/** Título padrão: a sigla da associação (Configurações › Sigla). */
export const TITULO_TOPO_PADRAO = 'ASKART'

/** Nome por extenso (Configurações › Nome da associação), logo abaixo da sigla. */
export const NOME_TOPO_PADRAO = 'Associação de Pilotos de Kart de Brasília'

/** Texto já aprovado no site (Sobre e rodapé), sem acrescentar fatos. */
export const SUBTITULO_TOPO_PADRAO =
  'A associação responsável pela administração do Kartódromo Ayrton Senna do Guará e pela organização dos campeonatos de kart de Brasília.'

/** Texto comparável: sem acento, espaços simples, minúsculo. */
const normalizar = (t: string | null | undefined) =>
  (t ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/** Título antigo do topo: o nome do campeonato, com ou sem o ano ("Brasília Kart Series 2026", "BKS 2026"). */
export function ehTituloAntigoDoTopo(titulo: string | null | undefined): boolean {
  return /^(brasilia kart series|bks)( ?[-–—·]? ?\d{4})?$/.test(normalizar(titulo))
}

/**
 * Subtítulo antigo do topo: "Calendário, classificação e resultados do campeonato organizado pela ASKART no
 * Kartódromo Ayrton Senna do Guará, em Brasília." (com a sigla e o nome do kartódromo que estivessem no painel).
 */
export function ehSubtituloAntigoDoTopo(subtitulo: string | null | undefined): boolean {
  return /^calendario, classificacao e resultados do campeonato organizado pela .+ no .+, em brasilia\.?$/.test(normalizar(subtitulo))
}

/**
 * Botões antigos do topo: "Calendário" (/bks) e "Classificação" (/bks/classificacao), um ou os dois. `caminho` é
 * o endereço já resolvido, sem barra no fim; o texto pode ter o ano ("Calendário 2026").
 */
export function ehBotoesAntigosDoTopo(botoes: { caminho: string | null; rotulo?: string | null }[]): boolean {
  if (!botoes.length) return false
  return botoes.every((b) => {
    const rotulo = normalizar(b.rotulo)
    return (b.caminho === '/bks' && /^calendario( \d{4})?$/.test(rotulo)) || (b.caminho === '/bks/classificacao' && rotulo === 'classificacao')
  })
}
