import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, somenteAdmin, todos } from '../../access'
import { COLECOES } from '../../hooks/competicao/api'
import { endpointDuplicarRegra } from '../../hooks/competicao/endpoints'
import { bloquearExclusaoComVinculos } from '../../hooks/competicao/exclusao'
import { nomeDaCopia, prepararRegra, protegerRegraEmUso } from '../../hooks/competicao/regras'
import { validarInteiro, validarPontos } from '../../hooks/competicao/validacoes'

/**
 * Regras de pontuação (do regulamento de cada campeonato). Nada vem preenchido: os valores são os
 * do regulamento oficial informado pela ASKART. A conta é feita por src/lib/classificacao.ts.
 */
export const RegrasPontuacao: CollectionConfig = comAcessoRestrito({
  slug: COLECOES.regras,
  labels: { singular: 'Regra de pontuação', plural: 'Regras de pontuação' },
  defaultSort: 'nome',
  versions: { maxPerDoc: 25 },
  admin: {
    group: 'Competição',
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'updatedAt'],
    listSearchableFields: ['nome'],
    description:
      'Como os pontos são contados, conforme o regulamento. Regra usada por temporada encerrada fica travada: para mudar a pontuação de uma nova temporada, duplique a regra.',
  },
  access: {
    // A tabela de pontos é pública (o site mostra como a classificação é calculada)
    read: todos,
    readVersions: editores,
    create: editores,
    update: editores,
    delete: somenteAdmin,
  },
  endpoints: [endpointDuplicarRegra],
  fields: [
    {
      name: 'nome',
      label: 'Nome da regra',
      type: 'text',
      required: true,
      hooks: { beforeDuplicate: [nomeDaCopia] },
      admin: { description: 'Ex.: "Regulamento 2026". Aparece só no painel e na página da temporada.' },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Pontos',
          fields: [
            {
              name: 'tabelas',
              label: 'Tabelas de pontos',
              labels: { singular: 'Tabela', plural: 'Tabelas' },
              type: 'array',
              minRows: 1,
              admin: {
                description:
                  'Uma tabela para cada tipo de corrida que pontua diferente (ex.: "Bateria" e "Final"). A primeira é a usada quando a corrida não indica outra.',
              },
              fields: [
                {
                  name: 'nome',
                  label: 'Nome da tabela',
                  type: 'text',
                  required: true,
                  admin: { description: 'Ex.: Bateria, Final. As corridas escolhem a tabela por este nome.' },
                },
                {
                  name: 'pontos',
                  label: 'Pontos por posição',
                  type: 'number',
                  hasMany: true,
                  required: true,
                  minRows: 1,
                  validate: validarPontos(),
                  admin: {
                    step: 0.1,
                    description:
                      'Digite os pontos em ordem: 1º lugar, 2º, 3º… Posições além da lista não ganham pontos de tabela. Até uma casa decimal.',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'pontosPole',
                  label: 'Pontos da pole',
                  type: 'number',
                  validate: validarPontos(),
                  admin: { width: '33%', step: 0.1, description: 'Para o 1º da tomada de tempo. Vazio = 0.' },
                },
                {
                  name: 'pontosVoltaRapida',
                  label: 'Pontos da volta mais rápida',
                  type: 'number',
                  validate: validarPontos(),
                  admin: { width: '33%', step: 0.1, description: 'Por corrida que conta. Vazio = 0.' },
                },
                {
                  name: 'pontosParticipacao',
                  label: 'Pontos de participação',
                  type: 'number',
                  validate: validarPontos(),
                  admin: { width: '33%', step: 0.1, description: 'Por corrida que conta. Vazio = 0.' },
                },
              ],
            },
            {
              name: 'requisitoParticipacao',
              label: 'Quem ganha os pontos de participação',
              type: 'select',
              options: [
                { label: 'Quem esteve presente (está no resultado)', value: 'presente' },
                { label: 'Quem largou', value: 'largou' },
                { label: 'Quem foi classificado', value: 'classificado' },
              ],
              admin: { condition: (data) => Number(data?.pontosParticipacao) > 0 },
            },
          ],
        },
        {
          label: 'Situações especiais',
          fields: [
            {
              name: 'abandono',
              label: 'Piloto que abandona',
              type: 'select',
              required: true,
              options: [
                { label: 'Pontua pela posição (classificado atrás de quem terminou, por voltas)', value: 'pela-posicao' },
                { label: 'Ganha só os pontos de participação', value: 'so-participacao' },
                { label: 'Não pontua', value: 'zero' },
              ],
            },
            {
              name: 'percentualMinimoVoltas',
              label: 'Mínimo de voltas para ser classificado (%)',
              type: 'number',
              validate: validarInteiro(0, 100, 'O percentual'),
              admin: {
                description:
                  'Percentual das voltas do vencedor. Ex.: 75 = precisa completar 75% das voltas. Vazio = sem mínimo.',
              },
            },
            {
              name: 'convidados',
              label: 'Pilotos convidados (não pontuam)',
              type: 'select',
              required: true,
              options: [
                { label: 'Os titulares sobem (o 2º atrás de um convidado recebe os pontos de 1º)', value: 'reclassificar-elegiveis' },
                { label: 'Cada um mantém a posição (os pontos do convidado não vão para ninguém)', value: 'manter-posicoes' },
              ],
            },
          ],
        },
        {
          label: 'Descartes',
          fields: [
            {
              name: 'descartes',
              label: 'Descartes',
              type: 'group',
              admin: {
                description:
                  'Piores resultados que não entram na soma. Desclassificação nunca é descartada, e penalidades/ajustes de pontos são aplicados depois dos descartes.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'quantidade',
                      label: 'Quantos descartar',
                      type: 'number',
                      validate: validarInteiro(0, 50, 'A quantidade'),
                      admin: { width: '33%', description: 'Vazio ou 0 = sem descarte.' },
                    },
                    {
                      name: 'unidade',
                      label: 'Descartar',
                      type: 'select',
                      options: [
                        { label: 'Etapas inteiras', value: 'etapa' },
                        { label: 'Corridas avulsas', value: 'corrida' },
                      ],
                      validate: (valor: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
                        Number(siblingData?.quantidade) > 0 && !valor ? 'Escolha se descarta etapas ou corridas.' : true,
                      admin: { width: '33%' },
                    },
                    {
                      name: 'aPartirDeEtapas',
                      label: 'Vale a partir de quantas etapas realizadas',
                      type: 'number',
                      validate: validarInteiro(0, 50, 'O número de etapas'),
                      admin: { width: '33%', description: 'Vazio = vale sempre.' },
                    },
                  ],
                },
                {
                  name: 'ultimaEtapaDescartavel',
                  label: 'A última etapa do calendário pode ser descartada',
                  type: 'checkbox',
                  defaultValue: true,
                },
              ],
            },
          ],
        },
        {
          label: 'Desempate',
          fields: [
            {
              name: 'criteriosDesempate',
              label: 'Critérios de desempate',
              labels: { singular: 'Critério', plural: 'Critérios' },
              type: 'array',
              minRows: 1,
              admin: {
                description:
                  'Na ordem do regulamento: o primeiro critério é usado primeiro. Arraste para reordenar. Se ainda houver empate, vale a ordem alfabética.',
              },
              fields: [
                {
                  name: 'criterio',
                  label: 'Critério',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Mais vitórias', value: 'mais-vitorias' },
                    { label: 'Mais 1º lugares, depois 2º lugares e assim por diante', value: 'contagem-de-posicoes' },
                    { label: 'Melhor resultado na última etapa (voltando etapa a etapa)', value: 'melhor-resultado-ultima-etapa' },
                    { label: 'Mais poles', value: 'mais-poles' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Onde é usada',
          fields: [
            {
              name: 'temporadas',
              label: 'Temporadas que usam esta regra',
              type: 'join',
              collection: COLECOES.temporadas,
              on: 'regra',
              admin: { allowCreate: false, defaultColumns: ['nome', 'ano', 'status'] },
            },
            {
              name: 'classificacoes',
              label: 'Categorias com esta regra própria',
              type: 'join',
              collection: COLECOES.temporadaCategorias,
              on: 'regra',
              admin: { allowCreate: false, defaultColumns: ['titulo', 'modo'] },
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [prepararRegra],
    beforeChange: [protegerRegraEmUso],
    beforeDelete: [bloquearExclusaoComVinculos({ alvo: COLECOES.regras, oQue: 'esta regra' })],
  },
})
