/**
 * Campo de link reutilizável (botões de banners e páginas, menu, rodapé — docs/ARQUITETURA.md §4 e §7).
 *
 * Três jeitos de apontar, sem o administrador precisar conhecer endereços:
 *   - interno: escolhe uma página, notícia, etapa, piloto… cadastrada. Se o endereço dela mudar, o link acompanha.
 *   - rota:    escolhe uma seção fixa do site (Calendário, Classificação, Contato…).
 *   - externo: endereço digitado, validado (só https://, http://, mailto: e tel:) — nada de "javascript:".
 *
 * `resolverLink(link)` transforma o valor salvo no endereço (href) usado pelo site.
 */
import { validations, type CollectionSlug, type Field, type Validate } from 'payload'

/** Coleções que podem ser destino de um link interno (slugs das frentes Conteúdo e Competição). */
export const DESTINOS_LINK_INTERNO = [
  'paginas',
  'noticias',
  'etapas',
  'temporadas',
  'categorias',
  'pilotos',
  'galerias',
  'documentos',
  'eventos',
] as const

export type DestinoLinkInterno = (typeof DESTINOS_LINK_INTERNO)[number]

/**
 * Seções fixas do site (docs/ARQUITETURA.md §0 e §7). O valor salvo é uma chave estável;
 * o caminho fica aqui, num só lugar.
 */
export const ROTAS_FIXAS = {
  inicio: { rotulo: 'Página inicial', caminho: '/' },
  bks: { rotulo: 'BKS — Brasília Kart Series', caminho: '/bks' },
  campeonatos: { rotulo: 'Campeonatos', caminho: '/campeonatos' },
  classificacao: { rotulo: 'Classificação', caminho: '/classificacao' },
  calendario: { rotulo: 'Calendário', caminho: '/calendario' },
  resultados: { rotulo: 'Resultados', caminho: '/resultados' },
  treinos: { rotulo: 'Treinos', caminho: '/treinos' },
  pilotos: { rotulo: 'Pilotos', caminho: '/pilotos' },
  categorias: { rotulo: 'Categorias', caminho: '/categorias' },
  noticias: { rotulo: 'Notícias', caminho: '/noticias' },
  comunicados: { rotulo: 'Comunicados', caminho: '/comunicados' },
  eventos: { rotulo: 'Eventos', caminho: '/eventos' },
  galeria: { rotulo: 'Galeria de fotos', caminho: '/galeria' },
  documentos: { rotulo: 'Documentos e regulamentos', caminho: '/documentos' },
  historico: { rotulo: 'Histórico', caminho: '/historico' },
  estatisticas: { rotulo: 'Estatísticas', caminho: '/estatisticas' },
  kartodromo: { rotulo: 'Kartódromo', caminho: '/kartodromo' },
  sobre: { rotulo: 'Sobre a ASKART', caminho: '/sobre' },
  contato: { rotulo: 'Contato', caminho: '/contato' },
  busca: { rotulo: 'Busca', caminho: '/busca' },
} as const satisfies Record<string, { rotulo: string; caminho: string }>

export type RotaFixa = keyof typeof ROTAS_FIXAS

export type TipoLink = 'nenhum' | 'interno' | 'rota' | 'externo'

/** Documento de destino como vem do banco: só o id (depth 0) ou o documento (depth ≥ 1). */
type DocumentoDestino =
  | number
  | string
  | {
      id?: number | string
      slug?: string | null
      titulo?: string | null
      nome?: string | null
      nomeExibicao?: string | null
      campeonato?: unknown
    }

export interface ValorLink {
  tipo?: TipoLink | null
  documento?: { relationTo: string; value: DocumentoDestino } | null
  rota?: string | null
  url?: string | null
  rotulo?: string | null
  novaAba?: boolean | null
}

const MENSAGEM_URL =
  'Use um endereço completo: https://… (site), mailto:nome@exemplo.com (e-mail) ou tel:+5561… (telefone).'

/**
 * Endereço externo seguro: só http(s), mailto: e tel:. Bloqueia "javascript:", "data:" e afins,
 * que virariam código malicioso no site. Vazio é aceito (a obrigatoriedade é conferida à parte).
 */
export function validarUrlExterna(valor: unknown): string | true {
  if (valor === null || valor === undefined || valor === '') return true
  if (typeof valor !== 'string') return MENSAGEM_URL
  const texto = valor.trim()
  if (!texto) return true
  if (/\s/.test(texto)) return 'O endereço não pode ter espaços.'
  if (/^https?:\/\//i.test(texto)) {
    try {
      const url = new URL(texto)
      if (!url.hostname.includes('.') && url.hostname !== 'localhost') {
        return 'Confira o endereço (ex.: https://exemplo.com.br/pagina).'
      }
      return true
    } catch {
      return MENSAGEM_URL
    }
  }
  if (/^mailto:/i.test(texto)) {
    return /^mailto:[^\s@/]+@[^\s@/]+\.[^\s@/]+(\?.*)?$/i.test(texto) ? true : 'Confira o e-mail (ex.: mailto:contato@exemplo.com.br).'
  }
  if (/^tel:/i.test(texto)) {
    return /^tel:\+?[0-9()\-.]{8,20}$/i.test(texto) ? true : 'Confira o telefone (ex.: tel:+5561999999999, só números).'
  }
  return MENSAGEM_URL
}

/** Link com o caminho já resolvido (ou null quando não há destino válido). */
function caminhoInterno(relationTo: string, valor: DocumentoDestino): string | null {
  const doc = typeof valor === 'object' && valor !== null ? valor : null
  const id = doc ? doc.id : valor
  const slug = doc?.slug || null
  switch (relationTo) {
    case 'etapas':
      return id !== undefined && id !== null && id !== '' ? `/etapas/${encodeURIComponent(String(id))}` : null
    case 'paginas':
      return slug ? `/${encodeURIComponent(slug)}` : null
    case 'noticias':
      return slug ? `/noticias/${encodeURIComponent(slug)}` : null
    case 'categorias':
      return slug ? `/categorias/${encodeURIComponent(slug)}` : null
    case 'pilotos':
      return slug ? `/pilotos/${encodeURIComponent(slug)}` : null
    case 'galerias':
      return slug ? `/galeria/${encodeURIComponent(slug)}` : null
    case 'documentos':
      return slug ? `/documentos/${encodeURIComponent(slug)}/arquivo` : null
    case 'eventos':
      return slug ? `/eventos/${encodeURIComponent(slug)}` : null
    case 'temporadas': {
      // A rota da temporada depende do campeonato: precisa dele carregado (depth ≥ 2 no link)
      const campeonato = doc?.campeonato as { slug?: string | null } | null | undefined
      if (slug && campeonato && typeof campeonato === 'object' && campeonato.slug) {
        return `/campeonatos/${encodeURIComponent(campeonato.slug)}/${encodeURIComponent(slug)}`
      }
      return ROTAS_FIXAS.campeonatos.caminho
    }
    default:
      return null
  }
}

/**
 * Endereço (href) de um link salvo, para o site. Devolve null quando o link está vazio, aponta para
 * um conteúdo que não foi carregado (o site deve ler com depth ≥ 1; temporadas, depth ≥ 2) ou é inválido.
 */
export function resolverLink(link: ValorLink | null | undefined): string | null {
  if (!link || !link.tipo || link.tipo === 'nenhum') return null
  if (link.tipo === 'rota') {
    const rota = link.rota as RotaFixa | null | undefined
    return rota && rota in ROTAS_FIXAS ? ROTAS_FIXAS[rota].caminho : null
  }
  if (link.tipo === 'externo') {
    const url = link.url?.trim()
    return url && validarUrlExterna(url) === true ? url : null
  }
  if (link.tipo === 'interno') {
    const destino = link.documento
    if (!destino || destino.value === null || destino.value === undefined) return null
    return caminhoInterno(destino.relationTo, destino.value)
  }
  return null
}

/** Texto a mostrar: o rótulo digitado ou, na falta dele, o título do destino / nome da seção. */
export function rotuloDoLink(link: ValorLink | null | undefined): string | null {
  if (!link) return null
  const digitado = link.rotulo?.trim()
  if (digitado) return digitado
  if (link.tipo === 'rota' && link.rota && link.rota in ROTAS_FIXAS) return ROTAS_FIXAS[link.rota as RotaFixa].rotulo
  const valor = link.tipo === 'interno' ? link.documento?.value : null
  if (valor && typeof valor === 'object') return valor.titulo || valor.nomeExibicao || valor.nome || null
  return null
}

/** Atributos do <a>: links externos ganham rel="noopener noreferrer"; "nova aba" ganha target. */
export function atributosDoLink(link: ValorLink | null | undefined): {
  href: string
  target?: '_blank'
  rel?: string
} | null {
  const href = resolverLink(link)
  if (!href) return null
  const externo = link?.tipo === 'externo' && /^https?:/i.test(href)
  const novaAba = Boolean(link?.novaAba)
  return {
    href,
    ...(novaAba ? { target: '_blank' as const } : {}),
    ...(externo || novaAba ? { rel: 'noopener noreferrer' } : {}),
  }
}

const OPCOES_TIPO = [
  { label: 'Página ou conteúdo do site', value: 'interno' },
  { label: 'Seção fixa do site', value: 'rota' },
  { label: 'Endereço externo', value: 'externo' },
]

interface OpcoesCampoLink {
  name: string
  label: string
  /** Obrigatório: não oferece "Sem link". */
  required?: boolean
  /** Texto de ajuda do grupo. */
  descricao?: string
  /** Rótulo do campo de texto do link (ex.: "Texto do botão"). */
  rotuloTexto?: string
}

/** Valor obrigatório só quando o tipo escolhido usa este campo. */
const exigirQuando =
  (tipo: TipoLink, mensagem: string): Validate =>
  (valor, { siblingData }) => {
    const irmaos = siblingData as Partial<ValorLink> | undefined
    if (irmaos?.tipo !== tipo) return true
    if (valor === null || valor === undefined || valor === '') return mensagem
    return true
  }

/**
 * Grupo de link: tipo (interno | rota | externo), destino conforme o tipo, texto e "abrir em nova aba".
 * Quando não é obrigatório, oferece também "Sem link" (padrão).
 */
export function campoLink({ name, label, required = false, descricao, rotuloTexto }: OpcoesCampoLink): Field {
  const exigirDocumento = exigirQuando('interno', 'Escolha a página ou o conteúdo de destino.')
  const exigirRota = exigirQuando('rota', 'Escolha a seção do site.')
  const exigirUrl = exigirQuando('externo', 'Informe o endereço.')

  return {
    name,
    label,
    type: 'group',
    admin: {
      description:
        descricao ??
        'Prefira "Página ou conteúdo do site": se o endereço do conteúdo mudar, o link continua funcionando.',
    },
    fields: [
      {
        name: 'tipo',
        label: 'Para onde o link leva',
        type: 'radio',
        required,
        defaultValue: required ? 'interno' : 'nenhum',
        options: required ? OPCOES_TIPO : [{ label: 'Sem link', value: 'nenhum' }, ...OPCOES_TIPO],
        admin: { layout: 'horizontal' },
      },
      {
        name: 'documento',
        label: 'Página ou conteúdo',
        type: 'relationship',
        relationTo: DESTINOS_LINK_INTERNO.map((s) => s as CollectionSlug),
        maxDepth: 1,
        validate: async (valor, opcoes) => {
          const obrigatorio = await exigirDocumento(valor, opcoes)
          if (obrigatorio !== true) return obrigatorio
          return validations.relationship(valor as never, opcoes as never)
        },
        admin: {
          condition: (_, irmaos) => irmaos?.tipo === 'interno',
          description: 'Escolha o tipo (Páginas, Notícias, Etapas…) e depois o item.',
        },
      },
      {
        name: 'rota',
        label: 'Seção do site',
        type: 'select',
        options: Object.entries(ROTAS_FIXAS).map(([value, { rotulo }]) => ({ label: rotulo, value })),
        validate: async (valor, opcoes) => {
          const obrigatorio = await exigirRota(valor, opcoes)
          if (obrigatorio !== true) return obrigatorio
          return validations.select(valor as never, opcoes as never)
        },
        admin: { condition: (_, irmaos) => irmaos?.tipo === 'rota' },
      },
      {
        name: 'url',
        label: 'Endereço',
        type: 'text',
        validate: async (valor, opcoes) => {
          const obrigatorio = await exigirUrl(valor, opcoes)
          if (obrigatorio !== true) return obrigatorio
          return validarUrlExterna(valor)
        },
        hooks: { beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim() : value)] },
        admin: {
          condition: (_, irmaos) => irmaos?.tipo === 'externo',
          placeholder: 'https://',
          description: 'Endereço completo: https://… (site), mailto:… (e-mail) ou tel:… (telefone).',
        },
      },
      {
        type: 'row',
        admin: { condition: (_, irmaos) => Boolean(irmaos?.tipo) && irmaos?.tipo !== 'nenhum' },
        fields: [
          {
            name: 'rotulo',
            label: rotuloTexto ?? 'Texto do link',
            type: 'text',
            maxLength: 60,
            admin: {
              width: '70%',
              description: 'Opcional. Vazio = título do conteúdo ou nome da seção escolhida.',
            },
          },
          {
            name: 'novaAba',
            label: 'Abrir em nova aba',
            type: 'checkbox',
            defaultValue: false,
            admin: { width: '30%', description: 'Indicado para endereços externos.' },
          },
        ],
      },
    ],
  }
}
