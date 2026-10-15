/**
 * Transformações dos dados do painel para o site (menus, canais de contato, cores, datas de etapa).
 * Funções puras: testáveis sem banco.
 */
import type { Configuracoe, Contato, Etapa, Navegacao } from '@/payload-types'
import { ROTAS_FIXAS, atributosDoLink, rotuloDoLink, type ValorLink } from '@/fields/link'
import { formatarHora, partes } from './datas'

export type ItemMenu = { rotulo: string; href: string; externo?: boolean; subitens?: ItemMenu[] }

const MENU_PADRAO: ItemMenu[] = [
  { rotulo: 'BKS', href: ROTAS_FIXAS.bks.caminho },
  { rotulo: 'Kartódromo', href: ROTAS_FIXAS.kartodromo.caminho },
  { rotulo: 'Notícias', href: ROTAS_FIXAS.noticias.caminho },
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
  return { rotulo, href: attrs.href, externo: attrs.target === '_blank' || link?.tipo === 'externo' }
}

export function menuDoSite(navegacao: Navegacao | null | undefined): ItemMenu[] {
  const itens = (navegacao?.menu ?? [])
    .map((i) => {
      const item = itemDoLink(i.link as ValorLink)
      if (!item) return null
      const subitens = (i.subitens ?? []).map((s) => itemDoLink(s.link as ValorLink)).filter((s): s is ItemMenu => s !== null)
      return subitens.length ? { ...item, subitens } : item
    })
    .filter((i): i is ItemMenu => i !== null)
  return itens.length ? itens : MENU_PADRAO
}

/* ───────────────────────────── contato ───────────────────────────── */

export type TipoCanal = 'telefone' | 'whatsapp' | 'email' | 'outro'
export type Canal = { tipo: TipoCanal; rotulo: string; valor: string; href: string | null; provisorio: boolean; observacao?: string | null }
export type LocalCanal = 'rodape' | 'contato' | 'kartodromo' | 'bks'

const ROTULO_TIPO: Record<TipoCanal, string> = { telefone: 'Telefone', whatsapp: 'WhatsApp', email: 'E-mail', outro: 'Contato' }

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
export const textoSobre = (fundo: string) => (contraste(fundo, '#111111') >= contraste(fundo, '#FFFFFF') ? '#111111' : '#FFFFFF')

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
  const secundaria = hexValido(config?.corSecundaria) ? config.corSecundaria : CORES_PADRAO.secundaria
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
export function variaveisDoCampeonato(cores: { primaria?: string | null; secundaria?: string | null; destaque?: string | null } | null | undefined) {
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

/** Link de compra da IZY Pass: o da etapa ou, na falta, o geral (Configurações). */
export const ingressosDaEtapa = (etapa: Pick<Etapa, 'linkIngressos'> | null, config: Configuracoe | null | undefined) =>
  etapa?.linkIngressos || config?.izyPass || null

export const etapaFutura = (etapa: Pick<Etapa, 'inicio' | 'status'>, agora = new Date()) =>
  etapa.status !== 'realizada' && etapa.status !== 'cancelada' && (!etapa.inicio || new Date(etapa.inicio) >= new Date(agora.getTime() - 12 * 3600e3))

/** Próxima etapa (a primeira ainda não realizada, a partir de hoje). */
export function proximaEtapa<T extends Pick<Etapa, 'inicio' | 'status'>>(etapas: T[], agora = new Date()): T | null {
  return etapas.find((e) => etapaFutura(e, agora)) ?? null
}
