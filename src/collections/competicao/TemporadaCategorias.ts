import type { Access, CollectionConfig, FieldAccess, FilterOptions, Where } from 'payload'
import { campoSomenteAdmin, campoSomenteMembros, comAcessoRestrito, editores, ehMembro, somenteAdmin } from '../../access'
import { COLECOES } from '../../hooks/competicao/api'
import {
  antesDeExcluirClassificacao,
  categoriasDoGrupo,
  prepararClassificacao,
  regrasDaClassificacao,
} from '../../hooks/competicao/classificacoes'
import { idDe } from '../../hooks/competicao/util'
import { validarInteiro, validarPontos } from '../../hooks/competicao/validacoes'
import { campoTitulo, FORMATO_DATA, FORMATO_DATA_HORA, REL } from './campos'

/** Público vê só as classificações publicadas de temporadas visíveis (ou arquivadas, no histórico). */
const lerClassificacao: Access = ({ req }) => {
  if (ehMembro(req.user)) return true
  const publicas: Where[] = [{ publicada: { equals: true } }, { 'temporada.visibilidade': { in: ['visivel', 'arquivado'] } }]
  return { and: publicas }
}

/** Campos gravados só pelo sistema (encerramento da temporada), nunca digitados. */
const soSistema: FieldAccess = () => false

/** Inscrições da temporada e das categorias desta classificação (a própria + as somadas). */
const inscricoesDoGrupo: FilterOptions = ({ data }) => {
  const temporada = idDe(data?.temporada)
  const categorias = categoriasDoGrupo({ categoria: data?.categoria, incluiResultadosDe: data?.incluiResultadosDe })
  if (temporada === null || !categorias.length) return false
  const filtro: Where[] = [{ temporada: { equals: temporada } }, { categoria: { in: categorias } }]
  return { and: filtro }
}

const etapasDaTemporada: FilterOptions = ({ data }) => {
  const temporada = idDe(data?.temporada)
  return temporada === null ? false : { temporada: { equals: temporada } }
}

/**
 * Classificação de cada categoria em cada temporada (no menu: "Classificações"). Os pontos são calculados
 * a partir dos resultados oficiais e da regra; aqui ficam só as configurações, os ajustes com motivo,
 * o destaque manual e — em temporadas históricas — as linhas digitadas.
 */
export const TemporadaCategorias: CollectionConfig = comAcessoRestrito({
  slug: COLECOES.temporadaCategorias,
  labels: { singular: 'Classificação', plural: 'Classificações' },
  defaultSort: 'ordem',
  disableDuplicate: true,
  admin: {
    group: 'Competição',
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'modo', 'publicada', 'campeao'],
    listSearchableFields: ['titulo'],
    description:
      'Uma por categoria de cada temporada, criada sozinha. A pontuação é calculada a partir dos resultados oficiais; para corrigir pontos de um piloto, use "Ajustes de pontos" (sempre com motivo).',
  },
  access: {
    read: lerClassificacao,
    create: editores,
    update: editores,
    // Saem sozinhas junto com a categoria da temporada
    delete: somenteAdmin,
  },
  indexes: [{ fields: ['temporada', 'categoria'], unique: true }],
  fields: [
    campoTitulo('Calculado: categoria · temporada.'),
    {
      type: 'row',
      fields: [
        {
          name: 'temporada',
          label: 'Temporada',
          type: 'relationship',
          relationTo: REL.temporadas,
          required: true,
          index: true,
          admin: { width: '50%' },
        },
        {
          name: 'categoria',
          label: 'Categoria',
          type: 'relationship',
          relationTo: REL.categorias,
          required: true,
          index: true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'publicada',
      label: 'Publicada no site',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: { position: 'sidebar', description: 'Desmarque para tirar esta classificação do site sem apagar nada.' },
    },
    {
      name: 'ordem',
      label: 'Ordem',
      type: 'number',
      validate: validarInteiro(0, 999, 'A ordem'),
      admin: { position: 'sidebar', description: 'Ordem desta categoria nas páginas da temporada (1 = primeira).' },
    },
    {
      name: 'modo',
      label: 'Modo',
      type: 'select',
      required: true,
      defaultValue: 'automatico',
      options: [
        { label: 'Automático (calculado pelos resultados)', value: 'automatico' },
        { label: 'Manual (tabela digitada)', value: 'manual' },
      ],
      // Trocar o modo é decisão do administrador (§6 da ARQUITETURA)
      access: { create: campoSomenteAdmin, update: campoSomenteAdmin },
      admin: {
        position: 'sidebar',
        description:
          'Manual congela a tabela: resultados novos deixam de ser somados. Use só em temporadas antigas ou por decisão oficial. Ao passar para manual, a tabela calculada é copiada como ponto de partida.',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Ajustes de pontos',
          description:
            'Penalidades, bonificações e correções decididas pela organização. São aplicadas depois dos descartes e nunca são descartadas.',
          fields: [
            {
              name: 'ajustes',
              label: 'Ajustes',
              labels: { singular: 'Ajuste', plural: 'Ajustes' },
              type: 'array',
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
                      filterOptions: inscricoesDoGrupo,
                      admin: { width: '50%' },
                    },
                    {
                      name: 'etapa',
                      label: 'Etapa',
                      type: 'relationship',
                      relationTo: REL.etapas,
                      filterOptions: etapasDaTemporada,
                      admin: { width: '50%', description: 'Opcional. O ajuste aparece na coluna desta etapa.' },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'tipo',
                      label: 'Tipo',
                      type: 'select',
                      required: true,
                      options: [
                        { label: 'Penalidade (tira pontos)', value: 'penalidade' },
                        { label: 'Bonificação (soma pontos)', value: 'bonificacao' },
                        { label: 'Correção (+ ou -, como digitado)', value: 'correcao' },
                      ],
                      admin: { width: '50%' },
                    },
                    {
                      name: 'pontos',
                      label: 'Pontos',
                      type: 'number',
                      required: true,
                      validate: validarPontos({ negativos: true }),
                      admin: {
                        width: '50%',
                        step: 0.5,
                        description: 'Em penalidade e bonificação, digite só o número (o sinal é automático).',
                      },
                    },
                  ],
                },
                {
                  name: 'motivo',
                  label: 'Motivo',
                  type: 'textarea',
                  required: true,
                  admin: { description: 'Obrigatório. Ex.: decisão dos comissários na 2ª etapa.' },
                },
                {
                  name: 'documento',
                  label: 'Documento da decisão',
                  type: 'relationship',
                  relationTo: REL.documentos,
                  admin: { description: 'Opcional. Comunicado ou decisão publicada em Documentos.' },
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'registradoPor',
                      label: 'Lançado por',
                      type: 'relationship',
                      relationTo: REL.usuarios,
                      access: { read: campoSomenteMembros, create: soSistema, update: soSistema },
                      admin: { width: '50%', readOnly: true },
                    },
                    {
                      name: 'registradoEm',
                      label: 'Lançado em',
                      type: 'date',
                      access: { read: campoSomenteMembros, create: soSistema, update: soSistema },
                      admin: { width: '50%', readOnly: true, date: FORMATO_DATA_HORA },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Destaque e regra',
          fields: [
            {
              name: 'destaqueManual',
              label: 'Piloto em destaque (substitui o líder exibido)',
              type: 'group',
              admin: {
                description:
                  'Opcional. Mostra este piloto no lugar do líder calculado, com o rótulo escolhido (nunca "Líder"), até a data indicada.',
              },
              fields: [
                {
                  name: 'inscricao',
                  label: 'Piloto',
                  type: 'relationship',
                  relationTo: REL.inscricoes,
                  filterOptions: inscricoesDoGrupo,
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'rotulo',
                      label: 'Rótulo',
                      type: 'text',
                      defaultValue: 'Destaque',
                      admin: { width: '50%' },
                    },
                    {
                      name: 'exibirAte',
                      label: 'Exibir até',
                      type: 'date',
                      admin: { width: '50%', date: FORMATO_DATA, description: 'Vazio = até ser removido.' },
                    },
                  ],
                },
              ],
            },
            {
              name: 'regra',
              label: 'Regra própria desta categoria',
              type: 'relationship',
              relationTo: REL.regras,
              admin: { description: 'Opcional. Vazio = regra da temporada.' },
            },
            {
              name: 'incluiResultadosDe',
              label: 'Somar também os resultados de',
              type: 'relationship',
              relationTo: REL.categorias,
              hasMany: true,
              filterOptions: ({ data }) => {
                const propria = idDe(data?.categoria)
                return propria === null ? true : { id: { not_equals: propria } }
              },
              admin: {
                description:
                  'Opcional. Para uma classificação que reúne pilotos de outras categorias da temporada (ex.: uma geral).',
              },
            },
          ],
        },
        {
          label: 'Tabela manual',
          description:
            'Só no modo manual (temporadas antigas ou decisão oficial). No modo automático esta tabela é ignorada.',
          fields: [
            {
              name: 'linhasManuais',
              label: 'Linhas da classificação',
              labels: { singular: 'Linha', plural: 'Linhas' },
              type: 'array',
              admin: { condition: (data) => data?.modo === 'manual' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'posicao',
                      label: 'Posição',
                      type: 'number',
                      required: true,
                      validate: validarInteiro(1, 999, 'A posição'),
                      admin: { width: '15%' },
                    },
                    {
                      name: 'piloto',
                      label: 'Piloto',
                      type: 'relationship',
                      relationTo: REL.pilotos,
                      required: true,
                      admin: { width: '45%' },
                    },
                    {
                      name: 'numero',
                      label: 'Número',
                      type: 'number',
                      validate: validarInteiro(0, 999, 'O número'),
                      admin: { width: '15%' },
                    },
                    {
                      name: 'equipe',
                      label: 'Equipe',
                      type: 'relationship',
                      relationTo: REL.equipes,
                      admin: { width: '25%' },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'pontos',
                      label: 'Pontos',
                      type: 'number',
                      validate: validarPontos({ negativos: true }),
                      admin: { width: '25%', step: 0.5 },
                    },
                    {
                      name: 'vitorias',
                      label: 'Vitórias',
                      type: 'number',
                      validate: validarInteiro(0, 999, 'Vitórias'),
                      admin: { width: '25%' },
                    },
                    {
                      name: 'podios',
                      label: 'Pódios',
                      type: 'number',
                      validate: validarInteiro(0, 999, 'Pódios'),
                      admin: { width: '25%' },
                    },
                    {
                      name: 'corridas',
                      label: 'Corridas',
                      type: 'number',
                      validate: validarInteiro(0, 999, 'Corridas'),
                      admin: { width: '25%' },
                    },
                  ],
                },
                { name: 'observacao', label: 'Observação', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Resultado final',
          description: 'Gravado sozinho ao encerrar a temporada. Para corrigir, um administrador reabre e encerra de novo.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'campeao',
                  label: 'Campeão',
                  type: 'relationship',
                  relationTo: REL.inscricoes,
                  access: { create: soSistema, update: soSistema },
                  admin: { width: '33%', readOnly: true },
                },
                {
                  name: 'vice',
                  label: 'Vice',
                  type: 'relationship',
                  relationTo: REL.inscricoes,
                  access: { create: soSistema, update: soSistema },
                  admin: { width: '33%', readOnly: true },
                },
                {
                  name: 'terceiro',
                  label: '3º colocado',
                  type: 'relationship',
                  relationTo: REL.inscricoes,
                  access: { create: soSistema, update: soSistema },
                  admin: { width: '34%', readOnly: true },
                },
              ],
            },
            {
              name: 'fotografiaFinal',
              label: 'Classificação final gravada',
              type: 'json',
              access: { create: soSistema, update: soSistema },
              admin: { readOnly: true, description: 'Cópia congelada da tabela final (usada no histórico).' },
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [prepararClassificacao],
    beforeChange: [regrasDaClassificacao],
    beforeDelete: [antesDeExcluirClassificacao],
  },
})
