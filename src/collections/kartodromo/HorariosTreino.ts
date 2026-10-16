import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, lerVisivel } from '../../access'
import { campoVisibilidade } from '../../fields/visibilidade'
import { OPCOES_DIA_SEMANA, SLUGS_KARTODROMO } from '../../lib/agenda'
import {
  camposHorario,
  campoCategorias,
  campoDataDoDia,
  campoObservacao,
  campoPermitirSobreposicao,
  campoTipo,
  campoTitulo,
  ninguemEscreve,
} from './campos'
import { endpointSalvarGrade } from './endpoints'
import { bloquearExclusaoComVinculos, prepararHorario } from './hooks'

/**
 * Grade semanal fixa de treinos. A agenda do site = esta grade + "Treinos e exceções", calculada por
 * src/lib/agenda.ts. Um horário vale toda semana enquanto estiver visível e dentro de "válido de/até"
 * (vazio = sem limite): a grade não some sozinha.
 */
export const HorariosTreino: CollectionConfig = comAcessoRestrito({
  slug: SLUGS_KARTODROMO.horarios,
  labels: { singular: 'Horário fixo de treino', plural: 'Grade semanal de treinos' },
  // Segunda → domingo e, no mesmo dia, pelo horário (chave calculada pelo hook)
  defaultSort: 'ordemNaSemana',
  admin: {
    group: 'Kartódromo',
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'tipo', 'duracao', 'validoAte', 'visibilidade'],
    listSearchableFields: ['titulo', 'observacao'],
    description:
      'Para mudar só um dia (cancelar, bloquear, lotar ou trocar o horário), use "Treinos e exceções". ' +
      'Para mudar de vez a partir de uma data, preencha "Válido até" neste horário e crie outro com "Válido a partir de": assim o histórico fica certo.',
  },
  // POST /api/horarios-treino/salvar-grade (editor da grade, /admin/grade-treinos)
  endpoints: [endpointSalvarGrade],
  access: {
    read: lerVisivel,
    create: editores,
    update: editores,
    delete: editores,
  },
  fields: [
    campoTitulo('Calculado: dia da semana · horário · tipo · categorias · validade.'),
    {
      name: 'diaSemana',
      label: 'Dia da semana',
      type: 'select',
      required: true,
      index: true,
      options: OPCOES_DIA_SEMANA,
      admin: { description: 'O horário se repete toda semana neste dia.' },
    },
    ...camposHorario(),
    campoCategorias('Deixe vazio para valer para todas as categorias.'),
    campoTipo({ obrigatorio: true, descricao: 'Define a cor e a legenda na agenda. Os tipos são cadastrados em "Tipos de treino".' }),
    campoObservacao('Observação', 'Opcional. Aparece no site junto do horário (ex.: "Traga o transponder").'),
    {
      type: 'row',
      fields: [
        campoDataDoDia('validoDe', 'Válido a partir de', 'Opcional. Vazio = já vale.', { largura: '50%' }),
        campoDataDoDia('validoAte', 'Válido até', 'Opcional. Vazio = vale sem data para acabar. O último dia conta.', {
          depoisDe: { campo: 'validoDe', rotulo: 'Válido a partir de' },
          largura: '50%',
        }),
      ],
    },
    {
      // "1 08:00 10:00" (1 = segunda … 7 = domingo): ordena a lista como a grade é lida
      name: 'ordemNaSemana',
      type: 'text',
      index: true,
      access: { create: ninguemEscreve, update: ninguemEscreve },
      admin: { hidden: true },
    },
    campoPermitirSobreposicao(),
    campoVisibilidade(
      'Visível: faz parte da grade no site. Oculto: sai da grade sem ser apagado. Arquivado: horário antigo, guardado só como registro.',
    ),
  ],
  hooks: {
    beforeChange: [prepararHorario],
    beforeDelete: [
      bloquearExclusaoComVinculos(
        'este horário fixo',
        'Para tirá-lo da grade sem perder o histórico, preencha "Válido até" ou mude "No site" para Oculto ou Arquivado.',
      ),
    ],
  },
})
