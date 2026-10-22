/**
 * Transformações dos dados do painel para o site (menus, canais de contato, cores, datas de etapa).
 * Funções puras: testáveis sem banco.
 */
import type { Configuracoe, Contato, Etapa, Navegacao } from '@/payload-types'
import { ROTAS_FIXAS, atributosDoLink, rotuloDoLink, type ValorLink } from '@/fields/link'
import {
  chaveDia,
  diaDaSemana,
  formatarHora,
  instanteDeChave,
  minutosEntre,
  partes,
  somarDias,
} from './datas'

export type ItemMenu = { rotulo: string; href: string; externo?: boolean; subitens?: ItemMenu[] }

const MENU_PADRAO: ItemMenu[] = [
  { rotulo: 'BKS', href: ROTAS_FIXAS.bks.caminho },
  { rotulo: 'Kartódromo', href: ROTAS_FIXAS.kartodromo.caminho },
  { rotulo: 'Notícias', href: ROTAS_FIXAS.noticias.caminho },
  { rotulo: 'Avisos', href: ROTAS_FIXAS.comunicados.caminho },
  { rotulo: 'Contato', href: ROTAS_FIXAS.contato.caminho },
]

/** Nomes curtos das abas: "BKS — Brasília Kart Series" vira "BKS" no menu. */
const ROTULOS_CURTOS: Record<string, string> = { bks: 'BKS', sobre: 'Sobre' }

export function itemDoLink(link: ValorLink | null | undefined): ItemMenu | null {
  const attrs = atributosDoLink(link)
  if (!attrs) return null
  const digitado = link?.rotulo?.trim()
  const curto = link?.tipo === 'rota' && link.rota ? ROTULOS_CURTOS[link.rota] : undefined
  const rotulo = digitado || curto || rotuloDoLink(link)
  if (!rotulo) return null
  return {
    rotulo,
    href: attrs.href,
    externo: attrs.target === '_blank' || link?.tipo === 'externo',
  }
}

export function menuDoSite(navegacao: Navegacao | null | undefined): ItemMenu[] {
  const itens = (navegacao?.menu ?? [])
    .map((i) => {
      const item = itemDoLink(i.link as ValorLink)
      if (!item) return null
      const subitens = (i.subitens ?? [])
        .map((s) => itemDoLink(s.link as ValorLink))
        .filter((s): s is ItemMenu => s !== null)
      return subitens.length ? { ...item, subitens } : item
    })
    .filter((i): i is ItemMenu => i !== null)
  return itens.length ? itens : MENU_PADRAO
}

/* ───────────────────────────── contato ───────────────────────────── */

export type TipoCanal = 'telefone' | 'whatsapp' | 'email' | 'outro'
export type Canal = {
  tipo: TipoCanal
  rotulo: string
  valor: string
  href: string | null
  provisorio: boolean
  observacao?: string | null
}
export type LocalCanal = 'rodape' | 'contato' | 'kartodromo' | 'bks'

const ROTULO_TIPO: Record<TipoCanal, string> = {
  telefone: 'Telefone',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  outro: 'Contato',
}

/** Link de cada canal. Contato provisório nunca ganha link (não é contato oficial). */
export function hrefDoCanal(tipo: TipoCanal, valor: string, provisorio: boolean): string | null {
  if (provisorio) return null
  const digitos = valor.replace(/\D/g, '')
  const comPais = digitos.length <= 11 ? `55${digitos}` : digitos
  if (tipo === 'whatsapp' && digitos.length >= 10) return `https://wa.me/${comPais}`
  if (tipo === 'telefone' && digitos.length >= 10) return `tel:+${comPais}`
  if (tipo === 'email' && /@/.test(valor)) return `mailto:${valor.trim()}`
  return null
}

export function canaisDoContato(contato: Contato | null | undefined, local?: LocalCanal): Canal[] {
  return (contato?.canais ?? [])
    .filter((c) => !local || !c.exibirEm?.length || c.exibirEm.includes(local))
    .map((c) => {
      const tipo = (c.tipo ?? 'outro') as TipoCanal
      const provisorio = Boolean(c.provisorio)
      return {
        tipo,
        rotulo: c.rotulo?.trim() || ROTULO_TIPO[tipo],
        valor: c.valor,
        href: hrefDoCanal(tipo, c.valor, provisorio),
        provisorio,
        observacao: c.observacao,
      }
    })
}

export const NOMES_REDES: Record<string, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  x: 'X (Twitter)',
  outra: 'Rede social',
}

/* ───────────────────────────── cores ───────────────────────────── */

export const CORES_PADRAO = { primaria: '#3F8A47', secundaria: '#EDD357', escura: '#111111' }

const hexValido = (c: unknown): c is string => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)

/** Luminância relativa (WCAG) de uma cor #RRGGBB. */
export function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** Texto legível sobre a cor: preto ou branco, o que tiver mais contraste. */
export const textoSobre = (fundo: string) =>
  contraste(fundo, '#111111') >= contraste(fundo, '#FFFFFF') ? '#111111' : '#FFFFFF'

const misturar = (hex: string, alvo: number, t: number) =>
  `#${[1, 3, 5]
    .map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t) + alvo * t))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase()

/**
 * Cor de fundo que garante leitura (contraste AA 4,5:1) com texto preto ou branco. Cores do painel que
 * ficam no meio do caminho (como o verde da logo) são escurecidas só o necessário; as demais não mudam.
 */
export function fundoLegivel(hex: string): { fundo: string; texto: string } {
  if (!hexValido(hex)) return { fundo: hex, texto: '#FFFFFF' }
  for (let t = 0; t <= 0.6; t += 0.04) {
    const escura = t === 0 ? hex.toUpperCase() : misturar(hex, 0, t)
    if (contraste(escura, '#FFFFFF') >= 4.5) return { fundo: escura, texto: '#FFFFFF' }
    const clara = t === 0 ? hex.toUpperCase() : misturar(hex, 255, t)
    if (contraste(clara, '#111111') >= 4.5) return { fundo: clara, texto: '#111111' }
  }
  return { fundo: misturar(hex, 0, 0.6), texto: '#FFFFFF' }
}

/** Variáveis CSS das cores da marca (Configurações), com padrão da logo. */
export function variaveisDeCor(config: Configuracoe | null | undefined): Record<string, string> {
  const primaria = hexValido(config?.corPrimaria) ? config.corPrimaria : CORES_PADRAO.primaria
  const secundaria = hexValido(config?.corSecundaria)
    ? config.corSecundaria
    : CORES_PADRAO.secundaria
  const escura = hexValido(config?.corEscura) ? config.corEscura : CORES_PADRAO.escura
  const p = fundoLegivel(primaria)
  const sec = fundoLegivel(secundaria)
  return {
    '--marca-primaria': p.fundo,
    '--marca-secundaria': sec.fundo,
    '--marca-destaque': sec.fundo,
    '--marca-escuro': escura,
    '--sobre-primaria': p.texto,
    '--sobre-secundaria': sec.texto,
  }
}

/** Cores de um campeonato (aba BKS), com o texto legível sobre cada uma. */
export function variaveisDoCampeonato(
  cores:
    | { primaria?: string | null; secundaria?: string | null; destaque?: string | null }
    | null
    | undefined,
) {
  const v: Record<string, string> = {}
  if (hexValido(cores?.primaria)) {
    const c = fundoLegivel(cores.primaria)
    v['--camp-primaria'] = c.fundo
    v['--sobre-camp-primaria'] = c.texto
  }
  if (hexValido(cores?.secundaria)) {
    const c = fundoLegivel(cores.secundaria)
    v['--camp-secundaria'] = c.fundo
    v['--sobre-camp-secundaria'] = c.texto
  }
  if (hexValido(cores?.destaque)) v['--camp-destaque'] = cores.destaque
  return v
}

/* ───────────────────────────── tema da aba BKS ───────────────────────────── */

type CoresCampeonato =
  | { primaria?: string | null; secundaria?: string | null; destaque?: string | null }
  | null
  | undefined

/**
 * Cores da logo do BKS (bandeira em ondas azul royal e vermelha, letras brancas): o padrão da aba BKS.
 * Principal = azul (topo, faixas, títulos e botões); apoio = vermelho (onda do topo, compra, selos);
 * destaque = branco (fios e pequenos detalhes). Os mesmos valores estão em Bks.module.css (.tema).
 */
export const CORES_BKS = {
  primaria: '#0A1AB4',
  secundaria: '#D52E20',
  destaque: '#FFFFFF',
} as const

/**
 * Cores gravadas antes no BKS (npm run dados:oficiais), com o vermelho como principal. Valem como "sem cores":
 * a aba usa as da logo, e a atualização do banco (scripts/atualizacoes.ts) troca pelas novas.
 */
export const CORES_BKS_ANTIGAS = {
  primaria: '#D02D21',
  secundaria: '#0201B8',
  destaque: '#FFFFFF',
} as const

const vazia = (v: unknown) => !(typeof v === 'string' && v.trim())
const igual = (v: unknown, cor: string) => typeof v === 'string' && v.trim().toUpperCase() === cor

/** As cores do campeonato estão vazias ou ainda são as antigas (ninguém escolheu outras no painel)? */
export function coresDoBksSemEscolha(cores: CoresCampeonato): boolean {
  if (vazia(cores?.primaria) && vazia(cores?.secundaria) && vazia(cores?.destaque)) return true
  return (
    igual(cores?.primaria, CORES_BKS_ANTIGAS.primaria) &&
    igual(cores?.secundaria, CORES_BKS_ANTIGAS.secundaria) &&
    (vazia(cores?.destaque) || igual(cores?.destaque, CORES_BKS_ANTIGAS.destaque))
  )
}

/**
 * A cor, escurecida só o necessário para o texto branco ter o contraste pedido. Se precisar escurecer mais de
 * um terço (a cor deixaria de parecer a escolhida, ex.: amarelo virando oliva): null.
 */
function escurecidaParaBranco(hex: string, minimo: number): string | null {
  for (let t = 0; t <= 0.36; t += 0.04) {
    const cor = t === 0 ? hex.toUpperCase() : misturar(hex, 0, t)
    if (contraste(cor, '#FFFFFF') >= minimo) return cor
  }
  return null
}

/**
 * Variáveis do tema da aba BKS a partir das cores do campeonato (painel › Campeonatos › Cores): --bks-azul
 * (principal), --bks-vermelho (apoio) e --bks-detalhe. Os tons derivados (azul-escuro, tintas…) saem delas no
 * CSS. Sem cores, com as antigas ou com uma cor que não dá leitura com texto branco, nada é trocado e a aba
 * fica com as cores da logo. A principal leva texto branco em faixas e sobre fotos (com véu): pede 7:1; a de
 * apoio leva texto branco em botões e selos: 4,5:1.
 */
export function variaveisDoTemaBks(cores: CoresCampeonato): Record<string, string> {
  if (coresDoBksSemEscolha(cores)) return {}
  const v: Record<string, string> = {}
  const azul = hexValido(cores?.primaria) ? escurecidaParaBranco(cores.primaria, 7) : null
  const vermelho = hexValido(cores?.secundaria) ? escurecidaParaBranco(cores.secundaria, 4.5) : null
  if (azul && azul !== CORES_BKS.primaria) v['--bks-azul'] = azul
  if (vermelho && vermelho !== CORES_BKS.secundaria) v['--bks-vermelho'] = vermelho
  if (hexValido(cores?.destaque) && cores.destaque.toUpperCase() !== CORES_BKS.destaque)
    v['--bks-detalhe'] = cores.destaque.toUpperCase()
  return v
}

/* ───────────────────────────── etapas ───────────────────────────── */

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** Pedaços da data da etapa para o bloco de calendário (dia, mês, semana, horário). */
export function dataDaEtapa(etapa: Pick<Etapa, 'inicio'>) {
  if (!etapa.inicio) return null
  const p = partes(etapa.inicio)
  const semana = new Date(Date.UTC(p.ano, p.mes - 1, p.dia)).getUTCDay()
  return {
    dia: String(p.dia).padStart(2, '0'),
    mes: MESES[p.mes - 1],
    semana: SEMANA[semana],
    hora: formatarHora(etapa.inicio),
    ano: p.ano,
  }
}

/** Link do mapa da etapa: o da etapa ou, na falta, o do kartódromo (Contato). */
export const mapaDaEtapa = (etapa: Pick<Etapa, 'localMapa'>, contato: Contato | null | undefined) =>
  etapa.localMapa || contato?.endereco?.linkMapa || null

/**
 * Link de compra da IZY Pass: o da etapa ou, na falta, o geral (Configurações). Só para chamadas gerais
 * (ex.: bloco "Ingressos" da página inicial); a página e o cartão da etapa usam só o link da própria etapa.
 */
export const ingressosDaEtapa = (
  etapa: Pick<Etapa, 'linkIngressos'> | null,
  config: Configuracoe | null | undefined,
) => etapa?.linkIngressos || config?.izyPass || null

type DatasEtapa = Pick<Etapa, 'inicio' | 'status'> & Partial<Pick<Etapa, 'fim'>>

/** Último instante (23:59:59,999 de Brasília) do dia da data informada, em milissegundos. */
export function fimDoDiaEmBrasilia(v: string | Date): number {
  return instanteDeChave(somarDias(chaveDia(v), 1)).getTime() - 1
}

/**
 * A etapa já aconteceu? Sim se estiver "Realizada" ou se o fim (ou o início, quando não há fim) já
 * passou, contando até o fim daquele dia em Brasília. Etapa cancelada não aconteceu.
 */
export function etapaJaOcorreu(etapa: DatasEtapa, agora: Date = new Date()): boolean {
  if (etapa.status === 'realizada') return true
  if (etapa.status === 'cancelada') return false
  const referencia = etapa.fim || etapa.inicio
  if (!referencia || !Number.isFinite(new Date(referencia).getTime())) return false
  return agora.getTime() > fimDoDiaEmBrasilia(referencia)
}

export const etapaFutura = (etapa: DatasEtapa, agora = new Date()) =>
  etapa.status !== 'realizada' && etapa.status !== 'cancelada' && !etapaJaOcorreu(etapa, agora)

/** Próxima etapa (a primeira que ainda não aconteceu nem foi cancelada). */
export function proximaEtapa<T extends DatasEtapa>(etapas: T[], agora = new Date()): T | null {
  return etapas.find((e) => etapaFutura(e, agora)) ?? null
}

/* ─────────────────── etapas: compra, treinos livres e transmissão ─────────────────── */

/** Mensagens pedidas pelo cliente (texto exato). */
export const MENSAGENS_ETAPA = {
  semCompra: 'O link para comprar esta etapa ainda não foi disponibilizado.',
  semLinkTreinos: 'Compra dos treinos livres para essa etapa ainda não está disponível',
  semGradeTreinos: 'A grade horária para os treinos livres dessa etapa ainda não está disponível',
  semTransmissao: 'O link da transmissão ao vivo ainda não está disponível',
} as const

/** "1º" no primeiro dia do mês, como se escreve no Brasil. */
const diaDoMes = (dia: number) => (dia === 1 ? '1º' : String(dia))

const MESES_EXTENSO = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/** "17 de outubro de 2026"; dois dias: "17 e 18 de outubro de 2026"; mais: "de 16 a 18 de outubro de 2026". */
export function periodoPorExtenso(
  etapa: Pick<Etapa, 'inicio'> & Partial<Pick<Etapa, 'fim'>>,
): string | null {
  const a = etapa.inicio || etapa.fim
  if (!a) return null
  const ini = partes(a)
  const fim = etapa.fim && etapa.inicio ? partes(etapa.fim) : null
  const extenso = (p: typeof ini, comAno = true) =>
    `${diaDoMes(p.dia)} de ${MESES_EXTENSO[p.mes - 1]}${comAno ? ` de ${p.ano}` : ''}`
  if (!fim || chaveDia(etapa.fim!) <= chaveDia(a)) return extenso(ini)
  const dias = Math.round(
    (Date.UTC(fim.ano, fim.mes - 1, fim.dia) - Date.UTC(ini.ano, ini.mes - 1, ini.dia)) / 864e5,
  )
  const mesmoMes = ini.mes === fim.mes && ini.ano === fim.ano
  if (dias === 1)
    return mesmoMes
      ? `${diaDoMes(ini.dia)} e ${extenso(fim)}`
      : `${extenso(ini, ini.ano !== fim.ano)} e ${extenso(fim)}`
  return mesmoMes
    ? `de ${diaDoMes(ini.dia)} a ${extenso(fim)}`
    : `de ${extenso(ini, ini.ano !== fim.ano)} a ${extenso(fim)}`
}

/** "Esta etapa já ocorreu em 17 de outubro de 2026. Não é mais possível realizar a compra." */
export function mensagemJaOcorreu(
  etapa: Pick<Etapa, 'inicio'> & Partial<Pick<Etapa, 'fim'>>,
): string {
  const periodo = periodoPorExtenso(etapa)
  const fim = 'Não é mais possível realizar a compra.'
  if (!periodo) return `Esta etapa já ocorreu. ${fim}`
  return `Esta etapa já ocorreu ${periodo.startsWith('de ') ? periodo : `em ${periodo}`}. ${fim}`
}

/** Só links http(s) (o painel já valida; aqui é a garantia de nunca montar um link quebrado). */
export const linkExterno = (v: unknown): string | null => {
  const t = typeof v === 'string' ? v.trim() : ''
  return /^https?:\/\/\S+$/i.test(t) ? t : null
}

/* ─────────────────── transmissão no YouTube ─────────────────── */

export type VideoYoutube = { id: string; inicio: number | null }

const HOST_YOUTUBE = /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com)$/
const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/

/** "90", "90s", "1m30s", "1h2m3s" → segundos. */
function segundos(v: string | null): number | null {
  if (!v) return null
  if (/^\d+$/.test(v)) return Number(v) || null
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(v)
  if (!m || !m[0]) return null
  const total = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
  return total || null
}

/**
 * Vídeo de um link do YouTube (watch?v=, youtu.be/, /live/, /embed/, /shorts/), com o instante de início
 * quando o link traz (t= ou start=). Qualquer outro link: null (o site mostra um botão comum).
 */
export function videoDoYoutube(link: unknown): VideoYoutube | null {
  const href = linkExterno(link)
  if (!href) return null
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase()
  const partes = url.pathname.split('/').filter(Boolean)
  let id: string | null | undefined = null
  if (host === 'youtu.be' || host === 'www.youtu.be') id = partes[0]
  else if (HOST_YOUTUBE.test(host)) {
    if (partes[0] === 'watch') id = url.searchParams.get('v')
    else if (['live', 'embed', 'shorts', 'v'].includes(partes[0] ?? '')) id = partes[1]
  }
  if (!id || !ID_YOUTUBE.test(id)) return null
  return { id, inicio: segundos(url.searchParams.get('t') ?? url.searchParams.get('start')) }
}

/** Endereço do player (domínio sem cookies do YouTube), carregado só depois do clique do visitante. */
export function enderecoDoPlayer(video: VideoYoutube): string {
  const busca = new URLSearchParams({ autoplay: '1', rel: '0' })
  if (video.inicio) busca.set('start', String(video.inicio))
  return `https://www.youtube-nocookie.com/embed/${video.id}?${busca.toString()}`
}

export type Transmissao = {
  tipo: Modalidade
  rotulo: string
  href: string | null
  video: VideoYoutube | null
}

export type CamposEtapaSite = DatasEtapa &
  Partial<
    Pick<
      Etapa,
      | 'linkIngressos'
      | 'linkTreinosLivres'
      | 'gradeTreinosLivres'
      | 'imagemGradeTreinosLivres'
      | 'transmissaoProfissional'
      | 'transmissaoIndoor'
    >
  >

export type SituacaoEtapa = {
  cancelada: boolean
  jaOcorreu: boolean
  /** Antes da etapa e não cancelada: mostra compra, treinos livres e grade. */
  antes: boolean
  linkCompra: string | null
  linkTreinosLivres: string | null
  temGradeTreinos: boolean
  transmissoes: Transmissao[]
  temTransmissao: boolean
}

/**
 * O que o site mostra de uma etapa. Depois dela, a compra, o link e a grade dos treinos livres saem
 * sozinhos (as páginas se atualizam a cada minuto); a transmissão continua, para quem quiser rever.
 * Etapa sem link de compra próprio usa o link geral da IZY Pass (Configurações gerais), que vale para
 * todas as etapas, profissionais e indoor (cliente, 21/10/2026).
 */
/** Instagram oficial do BKS (cliente, 22/10/2026). */
export const INSTAGRAM_BKS = {
  rede: 'instagram' as const,
  usuario: '@brasiliakartseries',
  url: 'https://www.instagram.com/brasiliakartseries/',
  referente: 'bks' as const,
}

/** "Instagram do BKS" / "Instagram da ASKART": com dois perfis na mesma rede, o nome sozinho confunde. */
export const nomeDaRedeComPerfil = (nome: string, referente?: string | null) =>
  referente === 'bks' ? `${nome} do BKS` : referente === 'askart' ? `${nome} da ASKART` : nome

/** Link da IZY Pass do BKS para todas as etapas, profissionais e indoor (cliente, 21/10/2026). */
export const IZY_PASS_BKS = 'https://izypass.com.br/produtor/eventos/bks'

export function situacaoDaEtapa(
  etapa: CamposEtapaSite,
  agora: Date = new Date(),
  linkGeral: string | null = null,
): SituacaoEtapa {
  const cancelada = etapa.status === 'cancelada'
  const jaOcorreu = etapaJaOcorreu(etapa, agora)
  const antes = !cancelada && !jaOcorreu
  const transmissao = (tipo: Modalidade, link: unknown): Transmissao => {
    const href = linkExterno(link)
    return {
      tipo,
      rotulo: ROTULO_MODALIDADE[tipo],
      href,
      video: href ? videoDoYoutube(href) : null,
    }
  }
  const transmissoes: Transmissao[] = [
    transmissao('profissional', etapa.transmissaoProfissional),
    transmissao('indoor', etapa.transmissaoIndoor),
  ]
  return {
    cancelada,
    jaOcorreu,
    antes,
    linkCompra: antes ? linkExterno(etapa.linkIngressos) || linkExterno(linkGeral) : null,
    linkTreinosLivres: antes ? linkExterno(etapa.linkTreinosLivres) : null,
    temGradeTreinos:
      antes &&
      (Boolean(etapa.gradeTreinosLivres?.length) || Boolean(etapa.imagemGradeTreinosLivres)),
    transmissoes,
    temTransmissao: transmissoes.some((t) => t.href),
  }
}

export type CategoriaTreino = { nome: string; cor: string | null }
export type HorarioTreinoLivre = {
  inicio: string
  fim: string | null
  categorias: CategoriaTreino[]
  observacao: string | null
}
export type DiaTreinosLivres = { chave: string; titulo: string; horarios: HorarioTreinoLivre[] }

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Grade dos treinos livres agrupada por dia (em ordem de dia e de horário). Título: "Sexta-feira, 16 de outubro". */
export function gradeTreinosPorDia(
  grade: Etapa['gradeTreinosLivres'] | null | undefined,
): DiaTreinosLivres[] {
  const dias = new Map<string, DiaTreinosLivres>()
  for (const linha of grade ?? []) {
    if (!linha?.dia || !linha.inicio || !Number.isFinite(new Date(linha.dia).getTime())) continue
    const chave = chaveDia(linha.dia)
    const p = partes(linha.dia)
    const dia = dias.get(chave) ?? {
      chave,
      titulo: `${maiuscula(diaDaSemana(linha.dia))}, ${diaDoMes(p.dia)} de ${MESES_EXTENSO[p.mes - 1]}`,
      horarios: [],
    }
    dia.horarios.push({
      inicio: linha.inicio,
      fim: linha.fim || null,
      categorias: (linha.categorias ?? [])
        .filter((c): c is Exclude<typeof c, number> => typeof c === 'object' && c !== null)
        .map((c) => ({ nome: c.nome, cor: c.cor ?? null })),
      observacao: linha.observacao?.trim() || null,
    })
    dias.set(chave, dia)
  }
  return [...dias.values()]
    .sort((a, b) => a.chave.localeCompare(b.chave))
    .map((d) => ({ ...d, horarios: d.horarios.sort((x, y) => minutosEntre(y.inicio, x.inicio)) }))
}

/* ─────────────────── evento aberto ao público ─────────────────── */

export type ItemEventoPublico = { titulo: string; descricao: string | null }
export type InfoEventoPublico = { texto: string; itens: ItemEventoPublico[] }

/** Texto do cliente (o mesmo padrão do painel: src/globals/Configuracoes.ts). */
export const TEXTO_EVENTO_PUBLICO_PADRAO = 'O evento é aberto ao público e a entrada é de graça.'
export const ITENS_EVENTO_PUBLICO_PADRAO: ItemEventoPublico[] = [
  { titulo: 'Food trucks', descricao: 'Food trucks para o público se alimentar.' },
  { titulo: 'Telão', descricao: 'Telão para assistir à corrida de diversos ângulos.' },
  { titulo: 'Mesas e cadeiras', descricao: 'Mesas e cadeiras para acomodar o público.' },
  { titulo: 'Narrador', descricao: 'Narrador profissional narrando todas as corridas.' },
]

/**
 * Texto e itens do bloco "Venha assistir" (aba BKS) e "Aberto ao público" (etapas), de Configurações,
 * com o padrão pedido pelo cliente. Null = desligado no painel.
 */
export function eventoPublico(
  config:
    | Pick<Configuracoe, 'exibirEventoPublico' | 'textoEventoPublico' | 'itensEventoPublico'>
    | null
    | undefined,
): InfoEventoPublico | null {
  if (config?.exibirEventoPublico === false) return null
  const itens = (config?.itensEventoPublico ?? [])
    .map((i) => ({
      titulo: i?.texto?.trim() ?? '',
      descricao: (i as { descricao?: string | null } | null)?.descricao?.trim() || null,
    }))
    .filter((i) => i.titulo)
  return {
    texto: config?.textoEventoPublico?.trim() || TEXTO_EVENTO_PUBLICO_PADRAO,
    itens: itens.length ? itens : ITENS_EVENTO_PUBLICO_PADRAO,
  }
}

/* ─────────────────── BKS: karts profissionais e karts indoor ─────────────────── */

/** Modalidade da categoria (campo "modalidade" das categorias): divide a aba BKS em duas áreas. */
export type Modalidade = 'profissional' | 'indoor'

export const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  profissional: 'Karts profissionais',
  indoor: 'Karts indoor',
}

/** As duas áreas, na ordem do controle "Karts profissionais | Karts indoor". */
export const MODALIDADES: Modalidade[] = ['profissional', 'indoor']

export type SecaoArea = 'calendario' | 'classificacao' | 'resultados'

const SUFIXO_SECAO: Record<SecaoArea, string> = {
  calendario: '',
  classificacao: '/classificacao',
  resultados: '/resultados',
}

/**
 * Endereço de uma seção da área. Os endereços antigos continuam sendo a área dos karts profissionais
 * (/bks, /bks/classificacao, /bks/resultados/2); a área indoor fica em /bks/indoor/….
 */
export function caminhoDaArea(
  modalidade: Modalidade,
  secao: SecaoArea = 'calendario',
  numeroEtapa?: number | null,
): string {
  const base = modalidade === 'indoor' ? '/bks/indoor' : '/bks'
  const etapa = secao === 'resultados' && numeroEtapa != null ? `/${numeroEtapa}` : ''
  return `${base}${SUFIXO_SECAO[secao]}${etapa}`
}

type ComModalidade = { id?: number | string; modalidade?: string | null }

/** Modalidade de uma categoria (sem valor: karts profissionais, o padrão). */
export const modalidadeDe = (categoria: ComModalidade | null | undefined): Modalidade =>
  categoria?.modalidade === 'indoor' ? 'indoor' : 'profissional'

/** Só as categorias que vieram completas (as ocultas chegam só como número e ficam de fora). */
const categoriasCompletas = (lista: unknown): ComModalidade[] =>
  (Array.isArray(lista) ? lista : []).filter(
    (c): c is ComModalidade => typeof c === 'object' && c !== null,
  )

/**
 * A etapa entra na área de cada modalidade que tiver pelo menos uma categoria nela (pode estar nas duas).
 * Etapa ainda sem categoria fica na área dos karts profissionais, como era antes da divisão.
 */
export function etapaNaModalidade(
  etapa: { categorias?: unknown },
  modalidade: Modalidade,
): boolean {
  const categorias = categoriasCompletas(etapa.categorias)
  if (!categorias.length) return modalidade === 'profissional'
  return categorias.some((c) => modalidadeDe(c) === modalidade)
}

/** Corrida da área: tem categoria da modalidade. Sem categoria (vale para todas), aparece em todas as áreas. */
export function corridaNaModalidade(
  corrida: { categorias?: unknown },
  modalidade: Modalidade,
): boolean {
  const categorias = categoriasCompletas(corrida.categorias)
  return !categorias.length || categorias.some((c) => modalidadeDe(c) === modalidade)
}

/**
 * Modalidades presentes numa etapa (pelas categorias da etapa e das corridas), na ordem do site.
 * Sem nenhuma categoria: só karts profissionais.
 */
export function modalidadesDaEtapa(
  etapa: { categorias?: unknown },
  corridas: { categorias?: unknown }[] = [],
): Modalidade[] {
  const todas = [
    ...categoriasCompletas(etapa.categorias),
    ...corridas.flatMap((c) => categoriasCompletas(c.categorias)),
  ]
  if (!todas.length) return ['profissional']
  return MODALIDADES.filter((m) => todas.some((c) => modalidadeDe(c) === m))
}

/** Ids das categorias (completas) de etapas e corridas. */
export function idsDasCategorias(itens: { categorias?: unknown }[]): Set<number> {
  const ids = new Set<number>()
  for (const item of itens)
    for (const c of categoriasCompletas(item.categorias)) if (c.id != null) ids.add(Number(c.id))
  return ids
}

/**
 * Categorias que a área mostra: as da modalidade que estão nas etapas e corridas da temporada. Se a área
 * ainda não tem nenhuma, as categorias cadastradas na modalidade que não são só de treino (as que estão
 * na grade de treinos do kartódromo, como a Moto, só aparecem quando entram numa etapa).
 */
export function categoriasDaArea<T extends ComModalidade & { id: number }>(
  categorias: T[],
  modalidade: Modalidade,
  usadasNaTemporada: Set<number>,
  usadasNosTreinos: Set<number>,
): T[] {
  const daModalidade = categorias.filter((c) => modalidadeDe(c) === modalidade)
  const naTemporada = daModalidade.filter((c) => usadasNaTemporada.has(Number(c.id)))
  if (naTemporada.length) return naTemporada
  return daModalidade.filter((c) => !usadasNosTreinos.has(Number(c.id)))
}
