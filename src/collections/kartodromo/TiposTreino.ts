import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, todos } from '../../access'
import { campoSlug } from '../../fields/slug'
import { SLUGS_KARTODROMO } from '../../lib/agenda'
import { campoCor } from './campos'
import { bloquearExclusaoComVinculos, propagarNomeDoTipo } from './hooks'

/**
 * Tipos de treino (legenda colorida e filtro da agenda). Os valores iniciais — genéricos e editáveis —
 * são inseridos por migração de dados (frente Plataforma): Treino livre, Treino oficial, Tomada de tempo,
 * Escolinha, Evento, Manutenção da pista. Leitura pública: é só um rótulo, sem dado sensível.
 */
export const TiposTreino: CollectionConfig = comAcessoRestrito({
  slug: SLUGS_KARTODROMO.tipos,
  labels: { singular: 'Tipo de treino', plural: 'Tipos de treino' },
  orderable: true,
  admin: {
    group: 'Kartódromo',
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'cor', 'descricao'],
    listSearchableFields: ['nome', 'descricao'],
    description:
      'Tipos usados na grade e na agenda de treinos (cor da etiqueta e filtro do site). Arraste para mudar a ordem da legenda; o primeiro é o tipo padrão de um horário novo.',
  },
  access: {
    read: todos,
    create: editores,
    update: editores,
    delete: editores,
  },
  fields: [
    {
      name: 'nome',
      label: 'Nome',
      type: 'text',
      required: true,
      unique: true,
      maxLength: 60,
      admin: { description: 'Como aparece na agenda e na legenda (ex.: Treino livre).' },
    },
    campoSlug('nome'),
    campoCor('Opcional. Cor da etiqueta na agenda, no formato #RRGGBB (ex.: #1A7F37).'),
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'textarea',
      maxLength: 300,
      admin: { rows: 2, description: 'Opcional. Explica o tipo para o público (aparece na legenda da agenda).' },
    },
  ],
  hooks: {
    afterChange: [propagarNomeDoTipo],
    beforeDelete: [
      bloquearExclusaoComVinculos(
        'este tipo de treino',
        'Troque o tipo nesses horários e treinos antes de excluir (ou apenas renomeie este tipo).',
      ),
    ],
  },
})
