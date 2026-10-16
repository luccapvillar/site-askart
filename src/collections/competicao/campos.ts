/**
 * Campos reutilizados pelas coleções da Competição.
 */
import type { CollectionSlug, Field, FieldAccess, Option } from 'payload'
import { COLECOES } from '../../hooks/competicao/api'
import { normalizarCorHex, validarCorHex, validarUrl } from '../../hooks/competicao/validacoes'

const ninguemEscreve: FieldAccess = () => false

/**
 * Slugs para `relationTo`/`collection`. A conversão para CollectionSlug evita depender de
 * src/payload-types.ts regenerado enquanto as frentes trabalham em paralelo (os nomes seguem a ARQUITETURA).
 */
const rel = (slug: string) => slug as CollectionSlug
export const REL = {
  campeonatos: rel(COLECOES.campeonatos),
  temporadas: rel(COLECOES.temporadas),
  temporadaCategorias: rel(COLECOES.temporadaCategorias),
  categorias: rel(COLECOES.categorias),
  equipes: rel(COLECOES.equipes),
  pilotos: rel(COLECOES.pilotos),
  inscricoes: rel(COLECOES.inscricoes),
  regras: rel(COLECOES.regras),
  etapas: rel(COLECOES.etapas),
  corridas: rel(COLECOES.corridas),
  // Coleções de outras frentes (docs/ARQUITETURA.md §4)
  midia: rel('midia'),
  documentos: rel('documentos'),
  noticias: rel('noticias'),
  galerias: rel('galerias'),
  usuarios: rel('usuarios'),
} as const

/**
 * Texto de busca (oculto): nome e afins sem acento e em minúsculas, preenchido pelo hook
 * beforeChange da coleção. Permite que "joao" ache "João" no site e no painel.
 */
export const campoTextoBusca = (): Field => ({
  name: 'textoBusca',
  type: 'text',
  index: true,
  access: { create: ninguemEscreve, update: ninguemEscreve },
  admin: { hidden: true },
})

/**
 * Título calculado (usado como título do documento no painel e nos seletores).
 * Preenchido pelo hook beforeChange da coleção; não pode ser digitado.
 */
export const campoTitulo = (descricao: string): Field => ({
  name: 'titulo',
  label: 'Título',
  type: 'text',
  index: true,
  access: { create: ninguemEscreve, update: ninguemEscreve },
  admin: { readOnly: true, position: 'sidebar', description: descricao },
})

/** Cor no formato #RRGGBB (validada: o valor vai para o CSS do site). */
export const campoCor = (descricao: string): Field => ({
  name: 'cor',
  label: 'Cor',
  type: 'text',
  validate: validarCorHex,
  hooks: { beforeValidate: [({ value }) => normalizarCorHex(value)] },
  admin: { description: descricao, placeholder: '#1A7F37' },
})

/** Link externo (https://…), validado: só http(s), sem espaços. */
export const campoLink = (nome: string, rotulo: string, descricao: string): Field => ({
  name: nome,
  label: rotulo,
  type: 'text',
  validate: validarUrl,
  hooks: { beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim() : value)] },
  admin: { description: descricao, placeholder: 'https://' },
})

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export const campoUF = (): Field => ({
  name: 'uf',
  label: 'UF',
  type: 'select',
  options: UFS.map((uf) => ({ label: uf, value: uf })),
  admin: { width: '30%' },
})

export const campoCidade = (): Field => ({
  name: 'cidade',
  label: 'Cidade',
  type: 'text',
  admin: { width: '70%' },
})

/**
 * Tipos de sessão/corrida. Nomes que a ASKART usa: Warm-up = `warm-up`; Classificação = `tomada-de-tempo`;
 * Corrida 1 e Corrida 2 = `bateria`. Warm-up nunca dá pontos nem pole (o motor o ignora).
 */
export const OPCOES_TIPO_CORRIDA: Option[] = [
  { label: 'Warm-up', value: 'warm-up' },
  { label: 'Tomada de tempo', value: 'tomada-de-tempo' },
  { label: 'Classificatória', value: 'classificatoria' },
  { label: 'Bateria', value: 'bateria' },
  { label: 'Pré-final', value: 'pre-final' },
  { label: 'Final', value: 'final' },
]

export const FORMATO_DATA_HORA = {
  pickerAppearance: 'dayAndTime',
  timeFormat: 'HH:mm',
  timeIntervals: 15,
  displayFormat: 'dd/MM/yyyy HH:mm',
} as const

export const FORMATO_DATA = { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' } as const
