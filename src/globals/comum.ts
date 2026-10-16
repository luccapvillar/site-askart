import type { Field, GlobalConfig } from 'payload'
import { validarUrlExterna } from '../fields/link'
import { revalidarGlobal } from '../lib/revalidar'

export const GRUPO_SITE = 'Site e informações'

/** Histórico de versões dos globais (restaurar uma versão anterior pelo painel). Só Configurações usa sem rascunho. */
export const HISTORICO_GLOBAL: GlobalConfig['versions'] = { max: 30 }

/**
 * Rascunho com autosalvamento: editar não muda o site até "Publicar alterações". O autosalvamento
 * (a cada 2 s de pausa) alimenta a pré-visualização; salvar rascunho não atualiza o site nem entra
 * no registro de atividades (src/lib/previa/rascunho.ts).
 */
export const RASCUNHO_GLOBAL: GlobalConfig['versions'] = {
  max: 30,
  drafts: { autosave: { interval: 2000, showSaveDraftButton: true } },
}

export const HOOKS_GLOBAL: GlobalConfig['hooks'] = { afterChange: [revalidarGlobal] }

/** Endereço de site validado (https://, mailto:, tel:). */
export const campoUrl = (name: string, label: string, descricao?: string, obrigatorio = false): Field => ({
  name,
  label,
  type: 'text',
  required: obrigatorio,
  validate: (valor: unknown) => {
    if (obrigatorio && (valor === null || valor === undefined || valor === '')) return 'Informe o endereço.'
    return validarUrlExterna(valor)
  },
  hooks: { beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim() || null : value)] },
  admin: { placeholder: 'https://', description: descricao },
})

export const campoImagem = (name: string, label: string, descricao?: string): Field => ({
  name,
  label,
  type: 'upload',
  relationTo: 'midia',
  filterOptions: { mimeType: { contains: 'image/' } },
  admin: { description: descricao },
})
