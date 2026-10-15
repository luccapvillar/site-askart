import type { CollectionConfig, FilterOptions, Where } from 'payload'
import { comAcessoRestrito, editores, lerVisivel } from '../../access'
import { campoVisibilidade } from '../../fields/visibilidade'
import { chaveDaData, diaSemanaDaChave, idDe, OPCOES_STATUS, SLUGS_KARTODROMO } from '../../lib/agenda'
import {
  camposHorario,
  campoCategorias,
  campoDataDoDia,
  campoDiaDaSemana,
  campoObservacao,
  campoPermitirSobreposicao,
  campoTipo,
  campoTitulo,
  ninguemEscreve,
  REL,
} from './campos'
import { endpointBloquearPeriodo } from './endpoints'
import { bloquearExclusaoComVinculos, prepararTreino } from './hooks'

/**
 * No seletor "Substitui", só os horários fixos do mesmo dia da semana da data escolhida.
 * O valor já escolhido continua aceito (editar uma exceção antiga não trava se a grade mudou depois);
 * a conferência de verdade fica no hook prepararTreino, com mensagem clara.
 */
const horariosDoMesmoDia: FilterOptions = ({ data }) => {
  const dia = chaveDaData(data?.data)
  if (!dia) return true
  const doDia: Where = { diaSemana: { equals: diaSemanaDaChave(dia) } }
  const atual = idDe(data?.substitui)
  return atual === null ? doDia : { or: [doDia, { id: { equals: atual } }] }
}

/**
 * Treinos avulsos e exceções da grade semanal: cancelar, bloquear, lotar ou mudar o horário de um dia
 * (com "Substitui"), treinos extras e bloqueios de período (sem "Substitui").
 * A agenda do site = grade + exceções, calculada por src/lib/agenda.ts.
 */
export const Treinos: CollectionConfig = comAcessoRestrito({
  slug: SLUGS_KARTODROMO.treinos,
  labels: { singular: 'Treino ou exceção', plural: 'Treinos e exceções' },
  defaultSort: '-dia',
  admin: {
    group: 'Kartódromo',
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'status', 'substitui', 'observacao', 'visibilidade'],
    listSearchableFields: ['titulo', 'observacao', 'dia'],
    description:
      'Tudo o que foge da grade semanal. Para cancelar, bloquear, lotar ou mudar o horário de UM dia, escolha o horário em "Substitui". ' +
      'Sem "Substitui": treino extra ou bloqueio de período (ex.: dia de etapa, manutenção da pista), que bloqueia os horários que caírem nele.',
  },
  access: {
    read: lerVisivel,
    create: editores,
    update: editores,
    delete: editores,
  },
  // Uma exceção por horário fixo e dia (o hook avisa antes, com mensagem clara)
  indexes: [{ fields: ['substitui', 'dia'], unique: true }],
  endpoints: [endpointBloquearPeriodo],
  fields: [
    campoTitulo('Calculado: dia · horário · tipo · situação.'),
    {
      type: 'row',
      fields: [
        campoDataDoDia('data', 'Data', 'Dia do treino ou da exceção.', { obrigatorio: true, largura: '50%' }),
        campoDiaDaSemana(),
      ],
    },
    {
      name: 'status',
      label: 'Situação',
      type: 'select',
      required: true,
      defaultValue: 'liberado',
      index: true,
      options: OPCOES_STATUS,
      admin: {
        description:
          'Liberado: acontece normalmente. Horário extra: treino a mais, fora da grade. Lotado: acontece, mas sem vagas. ' +
          'Cancelado: não acontece. Bloqueado: pista fechada — com "Substitui", só aquele horário; sem "Substitui", ' +
          'bloqueia todos os horários desse período (e das categorias escolhidas).',
      },
    },
    {
      // Chave AAAA-MM-DD da data, preenchida pelo hook: consultas por dia sem erro de fuso
      name: 'dia',
      label: 'Dia (AAAA-MM-DD)',
      type: 'text',
      index: true,
      access: { create: ninguemEscreve, update: ninguemEscreve },
      admin: { hidden: true },
    },
    {
      name: 'substitui',
      label: 'Substitui (horário fixo)',
      type: 'relationship',
      relationTo: REL.horarios,
      index: true,
      filterOptions: horariosDoMesmoDia,
      admin: {
        description:
          'Para mudar UM dia da grade (cancelar, bloquear, lotar ou trocar o horário), escolha aqui o horário fixo — aparecem os do mesmo dia da semana da data. ' +
          'Os campos vazios abaixo herdam desse horário. Deixe vazio para treino extra ou bloqueio de período.',
      },
    },
    ...camposHorario({ opcionaisComSubstitui: true }),
    campoCategorias('Vazio = todas as categorias (ou, com "Substitui", as mesmas do horário fixo).'),
    campoTipo({ obrigatorio: false, descricao: 'Opcional. Vazio = o mesmo do horário substituído.' }),
    campoObservacao(
      'Motivo / observação',
      'Aparece no site junto do horário (ex.: "Cancelado por causa da chuva", "Pista reservada para a etapa").',
    ),
    campoPermitirSobreposicao(),
    campoVisibilidade(
      'Visível: vale na agenda do site. Oculto: deixa de valer, sem ser apagado (o horário fixo volta ao normal). Arquivado: guardado só como registro.',
    ),
  ],
  hooks: {
    beforeChange: [prepararTreino],
    beforeDelete: [
      bloquearExclusaoComVinculos(
        'este treino',
        'Tire o vínculo nesses registros (ex.: no aviso) ou mude "No site" para Oculto para ele deixar de valer.',
      ),
    ],
  },
})
