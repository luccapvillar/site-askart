/**
 * Campos reutilizados pelas coleções do Kartódromo (grade semanal, treinos e tipos de treino).
 */
import type {
  CollectionSlug,
  DateFieldValidation,
  DefaultValue,
  Field,
  FieldAccess,
  SelectFieldSingleValidation,
  TextFieldSingleValidation,
} from 'payload'
import { date as validarDataPadrao, select as validarSelectPadrao } from 'payload/shared'
import {
  chaveDaData,
  diaSemanaDaChave,
  duracaoTexto,
  HORARIOS_FIM,
  HORARIOS_INICIO,
  intervaloValido,
  nomeDoDiaSemana,
  SLUGS_KARTODROMO,
} from '../../lib/agenda'

/**
 * Slugs para `relationTo`/`collection`. A conversão evita depender de src/payload-types.ts regenerado
 * enquanto as frentes trabalham em paralelo (os nomes seguem a ARQUITETURA).
 */
export const rel = (slug: string) => slug as CollectionSlug
export const REL = {
  horarios: rel(SLUGS_KARTODROMO.horarios),
  treinos: rel(SLUGS_KARTODROMO.treinos),
  tipos: rel(SLUGS_KARTODROMO.tipos),
  categorias: rel(SLUGS_KARTODROMO.categorias),
} as const

export const ninguemEscreve: FieldAccess = () => false

const FORMATO_DIA = { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' } as const

/** Título calculado pelo hook (usado no painel e nos seletores); não pode ser digitado. */
export const campoTitulo = (descricao: string): Field => ({
  name: 'titulo',
  label: 'Título',
  type: 'text',
  index: true,
  access: { create: ninguemEscreve, update: ninguemEscreve },
  admin: { readOnly: true, position: 'sidebar', description: descricao },
})

const opcoesHorario = (lista: readonly string[]) => lista.map((h) => ({ label: h, value: h }))

/** O fim tem de vir depois do início (validação também no formulário, enquanto a pessoa escolhe). */
const validarHoraFim: SelectFieldSingleValidation = (valor, opcoes) => {
  const padrao = validarSelectPadrao(valor, opcoes)
  if (padrao !== true) return padrao
  const inicio = (opcoes.siblingData as { horaInicio?: unknown } | undefined)?.horaInicio
  if (valor && inicio && !intervaloValido(inicio, valor)) {
    return `A hora de término precisa ser depois da hora de início (${String(inicio)}).`
  }
  return true
}

/**
 * Início e fim como texto "HH:mm" (de 5 em 5 minutos), sem fuso: o que se escolhe é exatamente o que o
 * site mostra. `opcionaisComSubstitui`: nos treinos, ficam vazios quando a exceção herda do horário fixo.
 */
export function camposHorario(opcoes: { opcionaisComSubstitui?: boolean } = {}): Field[] {
  const herda = opcoes.opcionaisComSubstitui === true
  const validarInicio: SelectFieldSingleValidation = (valor, args) => {
    const padrao = validarSelectPadrao(valor, args)
    if (padrao !== true) return padrao
    if (herda && !valor && !(args.siblingData as { substitui?: unknown } | undefined)?.substitui) {
      return 'Informe a hora de início (ou escolha em "Substitui" o horário fixo que este treino altera).'
    }
    return true
  }
  const validarFim: SelectFieldSingleValidation = (valor, args) => {
    if (herda && !valor && !(args.siblingData as { substitui?: unknown } | undefined)?.substitui) {
      return 'Informe a hora de término.'
    }
    return validarHoraFim(valor, args)
  }
  return [
    {
      type: 'row',
      fields: [
        {
          name: 'horaInicio',
          label: 'Início',
          type: 'select',
          required: !herda,
          options: opcoesHorario(HORARIOS_INICIO),
          validate: validarInicio,
          admin: {
            width: '35%',
            isClearable: herda,
            description: herda ? 'Vazio = o mesmo do horário substituído.' : 'Hora de Brasília (digite para buscar, ex.: 08:00).',
          },
        },
        {
          name: 'horaFim',
          label: 'Fim',
          type: 'select',
          required: !herda,
          options: opcoesHorario(HORARIOS_FIM),
          validate: validarFim,
          admin: {
            width: '35%',
            isClearable: herda,
            description: herda ? 'Vazio = o mesmo do horário substituído.' : '24:00 = até a meia-noite.',
          },
        },
        campoDuracao(),
      ],
    },
  ]
}

/** Duração calculada na leitura (não é gravada): "2h", "1h30". */
export const campoDuracao = (): Field => ({
  name: 'duracao',
  label: 'Duração',
  type: 'text',
  virtual: true,
  access: { create: ninguemEscreve, update: ninguemEscreve },
  admin: { width: '30%', readOnly: true, description: 'Calculada pelo início e fim (atualiza ao salvar).' },
  hooks: {
    afterRead: [
      ({ siblingData }) => duracaoTexto(siblingData?.horaInicio, siblingData?.horaFim) || null,
    ],
  },
})

/** Dia da semana da data do treino, calculado na leitura (coluna "Dia da semana" da lista). */
export const campoDiaDaSemana = (): Field => ({
  name: 'diaDaSemana',
  label: 'Dia da semana',
  type: 'text',
  virtual: true,
  access: { create: ninguemEscreve, update: ninguemEscreve },
  admin: { readOnly: true, width: '50%', description: 'Calculado pela data (atualiza ao salvar).' },
  hooks: {
    afterRead: [
      ({ siblingData }) => {
        const dia = chaveDaData(siblingData?.dia ?? siblingData?.data)
        return dia ? nomeDoDiaSemana(diaSemanaDaChave(dia)) : null
      },
    ],
  },
})

/** Data "só dia" (sem hora e sem fuso; gravada pelo hook ao meio-dia UTC do dia escolhido). */
export const campoDataDoDia = (
  nome: string,
  rotulo: string,
  descricao: string,
  opcoes: { obrigatorio?: boolean; depoisDe?: { campo: string; rotulo: string }; largura?: string } = {},
): Field => {
  const validar: DateFieldValidation = (valor, args) => {
    const padrao = validarDataPadrao(valor, args)
    if (padrao !== true) return padrao
    if (opcoes.depoisDe && valor) {
      const antes = chaveDaData((args.siblingData as Record<string, unknown> | undefined)?.[opcoes.depoisDe.campo])
      const este = chaveDaData(valor)
      if (antes && este && este < antes) return `Precisa ser igual ou depois de "${opcoes.depoisDe.rotulo}".`
    }
    return true
  }
  return {
    name: nome,
    label: rotulo,
    type: 'date',
    required: opcoes.obrigatorio,
    index: true,
    validate: validar,
    admin: { date: FORMATO_DIA, description: descricao, width: opcoes.largura },
  }
}

/** Categorias (vazio = todas). */
export const campoCategorias = (descricao: string): Field => ({
  name: 'categorias',
  label: 'Categorias',
  type: 'relationship',
  relationTo: REL.categorias,
  hasMany: true,
  admin: { description: descricao },
})

/** Primeiro tipo de treino da lista (ordem definida arrastando em "Tipos de treino"). */
const primeiroTipo: DefaultValue = async ({ req }) => {
  if (!req?.payload?.collections?.[REL.tipos]) return undefined
  const { docs } = await req.payload.find({
    collection: REL.tipos,
    sort: '_order',
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return (docs[0] as { id?: string | number } | undefined)?.id
}

export const campoTipo = (opcoes: { obrigatorio: boolean; descricao: string }): Field => ({
  name: 'tipo',
  label: 'Tipo de treino',
  type: 'relationship',
  relationTo: REL.tipos,
  required: opcoes.obrigatorio,
  index: true,
  defaultValue: opcoes.obrigatorio ? primeiroTipo : undefined,
  admin: { description: opcoes.descricao },
})

export const campoObservacao = (rotulo: string, descricao: string): Field => ({
  name: 'observacao',
  label: rotulo,
  type: 'textarea',
  maxLength: 300,
  admin: { rows: 2, description: descricao },
})

/** Libera, de propósito, um horário que coincide com outro (o aviso de sobreposição deixa de bloquear). */
export const campoPermitirSobreposicao = (): Field => ({
  name: 'permitirSobreposicao',
  label: 'Permitir coincidir com outro horário',
  type: 'checkbox',
  defaultValue: false,
  admin: {
    position: 'sidebar',
    description:
      'O sistema avisa (e não deixa salvar) quando este horário coincide com outro no mesmo dia e nas mesmas categorias. Marque só se for intencional.',
  },
})

/** Cor no formato #RRGGBB (o valor vai para o CSS do site, por isso é validado). */
const RE_COR = /^#[0-9A-F]{6}$/

export function normalizarCor(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor
  let v = valor.trim().toUpperCase()
  if (!v) return null
  if (!v.startsWith('#')) v = `#${v}`
  if (/^#[0-9A-F]{3}$/.test(v)) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  return v
}

export const validarCor: TextFieldSingleValidation = (valor) => {
  if (valor === null || valor === undefined || valor === '') return true
  return RE_COR.test(String(valor)) || 'Use uma cor no formato #RRGGBB (ex.: #1A7F37).'
}

export const campoCor = (descricao: string): Field => ({
  name: 'cor',
  label: 'Cor',
  type: 'text',
  validate: validarCor,
  hooks: { beforeValidate: [({ value }) => normalizarCor(value)] },
  admin: { description: descricao, placeholder: '#1A7F37' },
})
