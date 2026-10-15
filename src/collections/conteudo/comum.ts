/**
 * Peças compartilhadas pelas coleções da frente Conteúdo (docs/ARQUITETURA.md §3 e §4).
 */
import type { CollectionConfig, CollectionSlug, Field, UploadCollectionSlug, Where } from 'payload'

export const GRUPO_CONTEUDO = 'Conteúdo do site'

/**
 * Slugs usados em `relationTo`. A conversão evita depender de src/payload-types.ts regenerado
 * enquanto as frentes trabalham em paralelo (os nomes seguem a ARQUITETURA).
 */
const rel = (slug: string) => slug as CollectionSlug
export const REL = {
  // Esta frente
  noticias: rel('noticias'),
  categoriasNoticia: rel('categorias-noticia'),
  tags: rel('tags'),
  avisos: rel('avisos'),
  banners: rel('banners'),
  galerias: rel('galerias'),
  midia: rel('midia'),
  documentos: rel('documentos'),
  tiposDocumento: rel('tipos-documento'),
  eventos: rel('eventos'),
  paginas: rel('paginas'),
  // Outras frentes
  campeonatos: rel('campeonatos'),
  temporadas: rel('temporadas'),
  categorias: rel('categorias'),
  pilotos: rel('pilotos'),
  etapas: rel('etapas'),
  treinos: rel('treinos'),
  usuarios: rel('usuarios'),
} as const

/** Coleção de fotos e vídeos, para os campos/recursos que exigem um slug de upload. */
export const MIDIA_UPLOAD = 'midia' as UploadCollectionSlug

/**
 * Rascunho nativo do Payload: editar algo publicado não muda o site até "Publicar alterações".
 * Autosalvamento moderado (a cada 5 s de pausa) e o botão "Salvar rascunho" sempre visível —
 * sem ele o colaborador, que não publica, não teria como salvar um item novo.
 * Coleções de arquivo (documentos) ficam sem autosalvamento: o envio do arquivo é feito no salvamento.
 */
export const versoesEditoriais = (autosalvar = true): CollectionConfig['versions'] => ({
  drafts: autosalvar ? { autosave: { interval: 5000, showSaveDraftButton: true } } : true,
  maxPerDoc: 50,
})

export const FORMATO_DATA_HORA = {
  pickerAppearance: 'dayAndTime',
  timeFormat: 'HH:mm',
  timeIntervals: 15,
  displayFormat: 'dd/MM/yyyy HH:mm',
} as const

export const FORMATO_DATA = { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' } as const

/** Filtros dos seletores de mídia. */
export const SO_IMAGENS: Where = { mimeType: { contains: 'image/' } }
export const SO_VIDEOS: Where = { mimeType: { contains: 'video/' } }

export type ID = number | string

/** Id de um relacionamento, venha ele como id ou como documento carregado. */
export function idDe(valor: unknown): ID | null {
  if (valor === null || valor === undefined || valor === '') return null
  if (typeof valor === 'number' || typeof valor === 'string') return valor
  if (typeof valor === 'object' && 'id' in valor) {
    const id = (valor as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

/** Ids de um relacionamento múltiplo, sem vazios e sem repetição (mantém a ordem). */
export function idsDe(valor: unknown): ID[] {
  if (!Array.isArray(valor)) return []
  const vistos = new Set<string>()
  const ids: ID[] = []
  for (const item of valor) {
    const id = idDe(item)
    if (id === null || vistos.has(String(id))) continue
    vistos.add(String(id))
    ids.push(id)
  }
  return ids
}

export const mesmoId = (a: unknown, b: unknown) => {
  const x = idDe(a)
  const y = idDe(b)
  return x !== null && y !== null && String(x) === String(y)
}

/** Cor no formato #RRGGBB (o valor vai para o CSS do site, então só esse formato é aceito). */
export function validarCor(valor: unknown): string | true {
  if (valor === null || valor === undefined || valor === '') return true
  return typeof valor === 'string' && /^#[0-9a-fA-F]{6}$/.test(valor)
    ? true
    : 'Use o formato #RRGGBB, por exemplo #1A7F37 (copie o código da cor).'
}

export const campoCor = (descricao: string, nome = 'cor', rotulo = 'Cor', obrigatorio = false): Field => ({
  name: nome,
  label: rotulo,
  required: obrigatorio,
  type: 'text',
  validate: validarCor,
  hooks: {
    beforeValidate: [
      ({ value }) => {
        if (typeof value !== 'string') return value
        const limpo = value.trim()
        if (!limpo) return null
        // Aceita "1a7f37" e "#1a7f37" e grava sempre "#1A7F37"
        const comCerquilha = limpo.startsWith('#') ? limpo : `#${limpo}`
        return comCerquilha.toUpperCase()
      },
    ],
  },
  admin: { description: descricao, placeholder: '#1A7F37', width: '33%' },
})

/** Relacionamento com o campeonato (Competição). */
export const campoCampeonato = (descricao = 'Opcional.', largura?: string): Field => ({
  name: 'campeonato',
  label: 'Campeonato',
  type: 'relationship',
  relationTo: REL.campeonatos,
  index: true,
  admin: { description: descricao, width: largura },
})

/** Temporada, filtrada pelo campeonato escolhido (quando houver). */
export const campoTemporada = (descricao = 'Opcional.', largura?: string): Field => ({
  name: 'temporada',
  label: 'Temporada',
  type: 'relationship',
  relationTo: REL.temporadas,
  index: true,
  filterOptions: ({ data }) => {
    const campeonato = idDe(data?.campeonato)
    return campeonato !== null ? { campeonato: { equals: campeonato } } : true
  },
  admin: { description: descricao, width: largura },
})

/** Etapa, filtrada pela temporada escolhida (quando houver). */
export const campoEtapa = (descricao = 'Opcional.', largura?: string): Field => ({
  name: 'etapa',
  label: 'Etapa',
  type: 'relationship',
  relationTo: REL.etapas,
  index: true,
  filterOptions: ({ data }) => {
    const temporada = idDe(data?.temporada)
    return temporada !== null ? { temporada: { equals: temporada } } : true
  },
  admin: { description: descricao, width: largura },
})

export const campoCategoriasKart = (descricao = 'Opcional.'): Field => ({
  name: 'categorias',
  label: 'Categorias de kart',
  type: 'relationship',
  relationTo: REL.categorias,
  hasMany: true,
  admin: { description: descricao },
})

export const campoPilotos = (descricao = 'Opcional.'): Field => ({
  name: 'pilotos',
  label: 'Pilotos',
  type: 'relationship',
  relationTo: REL.pilotos,
  hasMany: true,
  admin: { description: descricao },
})
