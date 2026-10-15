/**
 * Campos reutilizados pelas coleções da Competição.
 */
import type { Field, FieldAccess, Option } from 'payload'
import { normalizarCorHex, validarCorHex } from '../../hooks/competicao/validacoes'

const ninguemEscreve: FieldAccess = () => false

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

export const OPCOES_TIPO_CORRIDA: Option[] = [
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
