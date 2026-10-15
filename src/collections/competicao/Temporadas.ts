import type { CollectionConfig } from 'payload'
import { comAcessoRestrito, editores, lerVisivel, somenteAdmin } from '../../access'
import { campoVisibilidade } from '../../fields/visibilidade'
import { COLECOES } from '../../hooks/competicao/api'
import { endpointCriarProximaTemporada, endpointEncerrarTemporada } from '../../hooks/competicao/endpoints'
import { slugSemColisao } from '../../hooks/competicao/slug'
import {
  antesDeExcluirTemporada,
  aposSalvarTemporada,
  prepararTemporada,
  regrasDaTemporada,
  slugDaTemporada,
} from '../../hooks/competicao/temporadas'
import { validarFator, validarInteiro } from '../../hooks/competicao/validacoes'
import { campoTextoBusca, OPCOES_TIPO_CORRIDA, REL } from './campos'

/**
 * Temporadas de cada campeonato (ex.: "Campeonato X — 2026"). Guardam as categorias do ano, a regra de
 * pontuação e o formato padrão das etapas. Encerrar grava a classificação final e congela o histórico.
 */
export const Temporadas: CollectionConfig = comAcessoRestrito({
  slug: COLECOES.temporadas,
  labels: { singular: 'Temporada', plural: 'Temporadas' },
  defaultSort: '-ano',
  disableDuplicate: true,
  admin: {
    group: 'Competição',
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'campeonato', 'ano', 'status', 'visibilidade'],
    listSearchableFields: ['nome', 'textoBusca'],
    description:
      'Cada ano (ou edição) de um campeonato: categorias, regra de pontuação e formato das etapas. Ao fim do ano, encerre a temporada para gravar os campeões e preservar o histórico.',
  },
  access: {
    read: lerVisivel,
    create: editores,
    update: editores,
    // Estrutural: só o administrador exclui (e só sem etapas, inscrições ou resultados)
    delete: somenteAdmin,
  },
  // Endereço único dentro do campeonato (/campeonatos/[campeonato]/[temporada])
  indexes: [{ fields: ['campeonato', 'slug'], unique: true }],
  endpoints: [endpointEncerrarTemporada, endpointCriarProximaTemporada],
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Temporada',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'campeonato',
                  label: 'Campeonato',
                  type: 'relationship',
                  relationTo: REL.campeonatos,
                  required: true,
                  index: true,
                  admin: { width: '60%' },
                },
                {
                  name: 'ano',
                  label: 'Ano',
                  type: 'number',
                  required: true,
                  index: true,
                  defaultValue: () => new Date().getFullYear(),
                  validate: validarInteiro(1950, 2100, 'O ano'),
                  admin: { width: '40%', description: 'Usado na ordem das listas e no endereço.' },
                },
              ],
            },
            {
              name: 'nome',
              label: 'Nome',
              type: 'text',
              admin: {
                description: 'Vazio = gerado sozinho ("Nome do campeonato — 2026"). Pode ser editado.',
              },
            },
            {
              name: 'status',
              label: 'Situação da temporada',
              type: 'select',
              required: true,
              defaultValue: 'planejada',
              index: true,
              options: [
                { label: 'Planejada', value: 'planejada' },
                { label: 'Em andamento', value: 'em-andamento' },
                { label: 'Encerrada', value: 'encerrada' },
              ],
              admin: {
                description:
                  'Encerrada: grava a classificação final e os campeões de cada categoria e congela etapas, corridas, resultados e regra. Só um administrador reabre.',
              },
            },
            {
              name: 'categorias',
              label: 'Categorias desta temporada',
              type: 'relationship',
              relationTo: REL.categorias,
              hasMany: true,
              admin: {
                description:
                  'Cada categoria escolhida ganha sua classificação (menu Classificações) sozinha. As novas etapas vêm com estas categorias.',
              },
            },
            {
              name: 'descricao',
              label: 'Descrição',
              type: 'richText',
              admin: { description: 'Opcional. Apresentação da temporada no site.' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'logo',
                  label: 'Logo própria',
                  type: 'upload',
                  relationTo: REL.midia,
                  admin: { width: '50%', description: 'Opcional. Vazio = logo do campeonato.' },
                },
                {
                  name: 'banner',
                  label: 'Banner próprio',
                  type: 'upload',
                  relationTo: REL.midia,
                  admin: { width: '50%', description: 'Opcional. Vazio = banner do campeonato.' },
                },
              ],
            },
          ],
        },
        {
          label: 'Pontuação e formato',
          description: 'Como as etapas são disputadas e pontuadas nesta temporada, conforme o regulamento.',
          fields: [
            {
              name: 'regra',
              label: 'Regra de pontuação',
              type: 'relationship',
              relationTo: REL.regras,
              admin: {
                description:
                  'Sem regra não há classificação automática. Uma categoria pode ter regra própria (menu Classificações).',
              },
            },
            {
              name: 'fonteDados',
              label: 'Dados desta temporada',
              type: 'select',
              required: true,
              defaultValue: 'resultados',
              options: [
                { label: 'Resultados corrida a corrida (classificação calculada)', value: 'resultados' },
                { label: 'Só a classificação final (temporada histórica)', value: 'so-classificacao-final' },
              ],
              admin: {
                description:
                  'Para temporadas antigas em que só existe a tabela final: as classificações passam a ser digitadas linha a linha.',
              },
            },
            {
              name: 'formatoEtapa',
              label: 'Formato padrão das etapas',
              labels: { singular: 'Corrida', plural: 'Corridas' },
              type: 'array',
              admin: {
                description:
                  'Corridas de cada categoria em cada etapa (ex.: Tomada de tempo, Bateria 1, Final). O botão "Gerar corridas" da etapa usa esta lista.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'nome',
                      label: 'Nome',
                      type: 'text',
                      required: true,
                      admin: { width: '35%', placeholder: 'Ex.: Bateria 1' },
                    },
                    {
                      name: 'tipo',
                      label: 'Tipo',
                      type: 'select',
                      required: true,
                      defaultValue: 'bateria',
                      options: OPCOES_TIPO_CORRIDA,
                      admin: { width: '30%' },
                    },
                    {
                      name: 'tabela',
                      label: 'Tabela de pontos',
                      type: 'text',
                      admin: {
                        width: '35%',
                        description: 'Nome de uma tabela da regra (ex.: Final). Vazio = primeira tabela.',
                      },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'contaParaClassificacao',
                      label: 'Conta para a classificação',
                      type: 'checkbox',
                      defaultValue: true,
                      admin: {
                        width: '50%',
                        description: 'Desmarque em corridas que não dão pontos (a tomada de tempo ainda vale para a pole).',
                      },
                    },
                    {
                      name: 'fator',
                      label: 'Fator de pontuação',
                      type: 'number',
                      defaultValue: 1,
                      validate: validarFator,
                      admin: { width: '50%', step: 0.5, description: '1 = normal; 2 = pontos em dobro; 0,5 = metade.' },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Etapas e classificações',
          fields: [
            {
              name: 'etapas',
              label: 'Etapas',
              type: 'join',
              collection: REL.etapas,
              on: 'temporada',
              defaultSort: 'numero',
              admin: { defaultColumns: ['titulo', 'status', 'visibilidade'] },
            },
            {
              name: 'classificacoes',
              label: 'Classificações por categoria',
              type: 'join',
              collection: REL.temporadaCategorias,
              on: 'temporada',
              defaultSort: 'ordem',
              admin: { allowCreate: false, defaultColumns: ['titulo', 'modo', 'publicada'] },
            },
          ],
        },
      ],
    },
    {
      name: 'slug',
      label: 'Endereço (URL)',
      type: 'text',
      index: true,
      hooks: { beforeValidate: [slugDaTemporada] },
      admin: {
        position: 'sidebar',
        description: 'Gerado a partir do ano (ex.: 2026). Use outro (ex.: 2026-2) se houver duas temporadas no mesmo ano.',
      },
    },
    campoVisibilidade(),
    campoTextoBusca(),
  ],
  hooks: {
    beforeValidate: [prepararTemporada, slugSemColisao(COLECOES.temporadas, { escopo: 'campeonato' })],
    beforeChange: [regrasDaTemporada],
    afterChange: [aposSalvarTemporada],
    beforeDelete: [antesDeExcluirTemporada],
  },
})
