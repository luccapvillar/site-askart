import type { Access, CollectionConfig, FieldAccess } from 'payload'
import { comAcessoRestrito, editores, ehMembro } from '../../access'
import { COLECOES } from '../../hooks/competicao/api'
import {
  antesDeExcluirCorrida,
  aposExcluirCorrida,
  aposSalvarCorrida,
  categoriasDaEtapaEscolhida,
  inscricoesDaCorrida,
  prepararCorrida,
  regrasDaCorrida,
} from '../../hooks/competicao/corridas'
import { validarFator, validarInteiro } from '../../hooks/competicao/validacoes'
import { campoTitulo, FORMATO_DATA_HORA, OPCOES_TIPO_CORRIDA, REL } from './campos'

/** Público vê as corridas das etapas visíveis (ou arquivadas, no histórico). */
const lerCorrida: Access = ({ req }) =>
  ehMembro(req.user) ? true : { 'etapa.visibilidade': { in: ['visivel', 'arquivado'] } }

/** Resultados em rascunho não aparecem para o público (nem pela API). */
const lerResultados: FieldAccess = ({ req, doc }) => ehMembro(req.user) || doc?.status === 'oficial'

/** Campo calculado pelo sistema, nunca digitado. */
const soSistema: FieldAccess = () => false

/**
 * Corridas de cada etapa (warm-up, tomada de tempo, baterias, final…) com os resultados. A classificação é
 * calculada a partir das corridas OFICIAIS das etapas realizadas. Warm-up só mostra posições (nunca pontua).
 */
export const Corridas: CollectionConfig = comAcessoRestrito({
  slug: COLECOES.corridas,
  labels: { singular: 'Corrida', plural: 'Corridas e resultados' },
  defaultSort: '-createdAt',
  admin: {
    group: 'Competição',
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'tipo', 'status', 'inicio'],
    listSearchableFields: ['titulo', 'nome'],
    description:
      'Resultados de cada corrida. Lance as linhas e salve como "Rascunho"; quando conferido, mude para "Oficial" — só então os pontos entram na classificação.',
  },
  access: {
    read: lerCorrida,
    create: editores,
    update: editores,
    delete: editores,
  },
  fields: [
    campoTitulo('Calculado: ano · etapa · categoria · corrida.'),
    {
      name: 'chaveUnica',
      type: 'text',
      unique: true,
      // Etapa + categorias + nome: impede duas "Final" da mesma categoria na mesma etapa
      access: { read: () => false, create: soSistema, update: soSistema },
      admin: { hidden: true },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'etapa',
          label: 'Etapa',
          type: 'relationship',
          relationTo: REL.etapas,
          required: true,
          index: true,
          admin: { width: '50%' },
        },
        {
          name: 'categorias',
          label: 'Categoria(s)',
          type: 'relationship',
          relationTo: REL.categorias,
          hasMany: true,
          required: true,
          minRows: 1,
          filterOptions: categoriasDaEtapaEscolhida,
          admin: {
            width: '50%',
            description: 'Normalmente uma. Mais de uma quando categorias largam juntas (cada uma pontua na sua).',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'nome',
          label: 'Nome',
          type: 'text',
          required: true,
          admin: { width: '40%', placeholder: 'Ex.: Bateria 1, Final' },
        },
        {
          name: 'tipo',
          label: 'Tipo',
          type: 'select',
          required: true,
          defaultValue: 'bateria',
          options: OPCOES_TIPO_CORRIDA,
          admin: { width: '30%', description: 'A pole vem do 1º da tomada de tempo. Warm-up não vale pontos.' },
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'rascunho',
          index: true,
          options: [
            { label: 'Rascunho (não conta ainda)', value: 'rascunho' },
            { label: 'Oficial (conta na classificação)', value: 'oficial' },
            { label: 'Cancelada', value: 'cancelada' },
          ],
          admin: { width: '30%' },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Horário e pontuação',
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'inicio',
              label: 'Horário',
              type: 'date',
              timezone: true,
              admin: {
                width: '50%',
                date: FORMATO_DATA_HORA,
                description: 'Opcional. Aparece na programação da etapa, por categoria.',
              },
            },
            {
              name: 'voltasPrevistas',
              label: 'Voltas previstas',
              type: 'number',
              validate: validarInteiro(1, 999, 'As voltas previstas'),
              admin: { width: '50%', description: 'Opcional.' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'tabela',
              label: 'Tabela de pontos',
              type: 'text',
              admin: {
                width: '40%',
                description: 'Nome de uma tabela da regra (ex.: Final). Vazio = primeira tabela da regra.',
              },
            },
            {
              name: 'contaParaClassificacao',
              label: 'Conta para a classificação',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                width: '30%',
                // Warm-up nunca conta (o sistema desliga sozinho ao salvar): a caixa nem aparece.
                condition: (dados: Record<string, unknown> | undefined) => dados?.tipo !== 'warm-up',
              },
            },
            {
              name: 'fator',
              label: 'Fator',
              type: 'number',
              defaultValue: 1,
              validate: validarFator,
              admin: { width: '30%', step: 0.5, description: 'Ex.: 0,5 em corrida interrompida, se o regulamento prever.' },
            },
          ],
        },
      ],
    },
    {
      name: 'resultados',
      label: 'Resultados',
      labels: { singular: 'Linha', plural: 'Linhas' },
      type: 'array',
      access: { read: lerResultados },
      admin: {
        description:
          'Uma linha por piloto. A posição oficial é calculada ao salvar (chegada, penalidades, abandonos). Desclassificado e "não largou" ficam sem posição.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'inscricao',
              label: 'Piloto',
              type: 'relationship',
              relationTo: REL.inscricoes,
              required: true,
              filterOptions: inscricoesDaCorrida,
              admin: { width: '40%' },
            },
            {
              name: 'posicaoChegada',
              label: 'Chegada',
              type: 'number',
              validate: validarInteiro(1, 999, 'A posição de chegada'),
              admin: { width: '15%', description: 'Ordem na pista.' },
            },
            {
              name: 'status',
              label: 'Status',
              type: 'select',
              required: true,
              defaultValue: 'classificado',
              options: [
                { label: 'Classificado', value: 'classificado' },
                { label: 'Não classificado', value: 'nao-classificado' },
                { label: 'Abandono', value: 'abandono' },
                { label: 'Desclassificado', value: 'desclassificado' },
                { label: 'Não largou', value: 'nao-largou' },
              ],
              admin: { width: '25%' },
            },
            {
              name: 'posicaoOficial',
              label: 'Posição oficial',
              type: 'number',
              admin: {
                width: '20%',
                description: 'Calculada ao salvar. Para corrigir, use "Ajustar posição oficial à mão".',
              },
            },
          ],
        },
        {
          type: 'collapsible',
          label: 'Voltas, penalidade e ajustes',
          admin: { initCollapsed: true },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'voltas',
                  label: 'Voltas',
                  type: 'number',
                  validate: validarInteiro(0, 999, 'As voltas'),
                  admin: { width: '33%' },
                },
                {
                  name: 'melhorVoltaMs',
                  label: 'Melhor volta (milissegundos)',
                  type: 'number',
                  validate: validarInteiro(1, 3_600_000, 'A melhor volta'),
                  admin: { width: '33%', description: 'Ex.: 1min02s345 = 62345.' },
                },
                {
                  name: 'tempoTotalMs',
                  label: 'Tempo total (milissegundos)',
                  type: 'number',
                  validate: validarInteiro(1, 86_400_000, 'O tempo total'),
                  admin: {
                    width: '34%',
                    description: 'Opcional. Necessário para aplicar penalidade de tempo sozinho.',
                  },
                },
              ],
            },
            {
              name: 'penalidade',
              label: 'Penalidade',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'tipo',
                      label: 'Tipo',
                      type: 'select',
                      options: [
                        { label: 'Tempo (segundos)', value: 'tempo' },
                        { label: 'Perda de posições', value: 'posicoes' },
                        { label: 'Perda de pontos', value: 'pontos' },
                        { label: 'Advertência (sem efeito nos pontos)', value: 'advertencia' },
                      ],
                      admin: { width: '33%', description: 'Vazio = sem penalidade.' },
                    },
                    {
                      name: 'valor',
                      label: 'Valor',
                      type: 'number',
                      admin: {
                        width: '33%',
                        step: 0.5,
                        condition: (_: unknown, pen: Record<string, unknown> | undefined) =>
                          Boolean(pen?.tipo) && pen?.tipo !== 'advertencia',
                      },
                    },
                    {
                      name: 'motivo',
                      label: 'Motivo',
                      type: 'text',
                      admin: {
                        width: '34%',
                        condition: (_: unknown, pen: Record<string, unknown> | undefined) => Boolean(pen?.tipo),
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'ajustarPosicao',
                  label: 'Ajustar posição oficial à mão',
                  type: 'checkbox',
                  admin: {
                    width: '50%',
                    description: 'Ex.: decisão dos comissários. Exige motivo.',
                  },
                },
                {
                  name: 'pontosManuais',
                  label: 'Pontos manuais',
                  type: 'number',
                  admin: {
                    width: '50%',
                    step: 0.5,
                    description: 'Opcional. Substitui os pontos calculados desta corrida para este piloto. Exige motivo.',
                  },
                },
              ],
            },
            {
              name: 'motivoAjuste',
              label: 'Motivo do ajuste',
              type: 'text',
              admin: {
                condition: (_: unknown, linha: Record<string, unknown> | undefined) =>
                  Boolean(linha?.ajustarPosicao) || (linha?.pontosManuais !== null && linha?.pontosManuais !== undefined),
              },
            },
            { name: 'observacao', label: 'Observação', type: 'text', admin: { description: 'Opcional. Aparece no resultado.' } },
          ],
        },
      ],
    },
    {
      name: 'voltaMaisRapidaManual',
      label: 'Volta mais rápida definida à mão',
      type: 'group',
      admin: {
        description:
          'Opcional. Normalmente é calculada (menor "melhor volta"). Use só se a cronometragem oficial indicar outro piloto.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'inscricao',
              label: 'Piloto',
              type: 'relationship',
              relationTo: REL.inscricoes,
              filterOptions: inscricoesDaCorrida,
              admin: { width: '50%' },
            },
            {
              name: 'motivo',
              label: 'Motivo',
              type: 'text',
              admin: { width: '50%' },
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [prepararCorrida],
    beforeChange: [regrasDaCorrida],
    afterChange: [aposSalvarCorrida],
    beforeDelete: [antesDeExcluirCorrida],
    afterDelete: [aposExcluirCorrida],
  },
})
