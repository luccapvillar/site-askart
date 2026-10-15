import type { Access, CollectionConfig } from 'payload'
import { campoSomenteMembros, comAcessoRestrito, editores, ehMembro } from '../../access'
import { COLECOES } from '../../hooks/competicao/api'
import {
  antesDeExcluirInscricao,
  aposExcluirInscricao,
  aposSalvarInscricao,
  categoriasDaTemporadaEscolhida,
  prepararInscricao,
  regrasDaInscricao,
  temporadaPadrao,
} from '../../hooks/competicao/inscricoes'
import { validarInteiro } from '../../hooks/competicao/validacoes'
import { campoTitulo, REL } from './campos'

/** Público vê as inscrições das temporadas visíveis (ou arquivadas, no histórico). */
const lerInscricao: Access = ({ req }) =>
  ehMembro(req.user) ? true : { 'temporada.visibilidade': { in: ['visivel', 'arquivado'] } }

/**
 * Inscrições: o piloto em cada temporada e categoria, com número do kart, equipe e condição.
 * É daqui que saem o número e a equipe nas tabelas de resultados e de classificação.
 */
export const Inscricoes: CollectionConfig = comAcessoRestrito({
  slug: COLECOES.inscricoes,
  labels: { singular: 'Inscrição', plural: 'Inscrições' },
  defaultSort: 'numero',
  admin: {
    group: 'Competição',
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'equipe', 'condicao', 'status'],
    listSearchableFields: ['titulo'],
    description:
      'Piloto × temporada × categoria: número do kart, equipe e condição. Um piloto que corre duas categorias tem duas inscrições. Para tirar alguém do campeonato sem apagar o histórico, mude o status.',
  },
  access: {
    read: lerInscricao,
    create: editores,
    update: editores,
    delete: editores,
  },
  indexes: [{ fields: ['temporada', 'categoria', 'piloto'], unique: true }],
  fields: [
    campoTitulo('Calculado: número, piloto, categoria e temporada.'),
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
          defaultValue: temporadaPadrao,
          admin: { width: '50%', description: 'Vem preenchida com a temporada atual.' },
        },
        {
          name: 'categoria',
          label: 'Categoria',
          type: 'relationship',
          relationTo: REL.categorias,
          required: true,
          index: true,
          filterOptions: categoriasDaTemporadaEscolhida,
          admin: { width: '50%', description: 'Só aparecem as categorias da temporada escolhida.' },
        },
      ],
    },
    {
      name: 'piloto',
      label: 'Piloto',
      type: 'relationship',
      relationTo: REL.pilotos,
      required: true,
      index: true,
      admin: { allowCreate: true, description: 'Piloto novo? Cadastre pelo botão "+" sem sair daqui.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'numero',
          label: 'Número do kart',
          type: 'number',
          index: true,
          validate: validarInteiro(0, 999, 'O número'),
          admin: {
            width: '30%',
            description: 'Não pode repetir entre as inscrições ativas da categoria.',
          },
        },
        {
          name: 'equipe',
          label: 'Equipe',
          type: 'relationship',
          relationTo: REL.equipes,
          admin: { width: '70%', allowCreate: true, description: 'Opcional.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'condicao',
          label: 'Condição',
          type: 'select',
          required: true,
          defaultValue: 'titular',
          options: [
            { label: 'Titular (pontua no campeonato)', value: 'titular' },
            { label: 'Convidado (corre, mas não pontua)', value: 'convidado' },
          ],
          admin: {
            width: '50%',
            description: 'Convidado aparece nos resultados, mas fica fora da classificação; a regra diz se os titulares sobem.',
          },
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'ativa',
          index: true,
          options: [
            { label: 'Ativa', value: 'ativa' },
            { label: 'Desistente', value: 'desistente' },
            { label: 'Transferida', value: 'transferida' },
            { label: 'Excluída do campeonato', value: 'excluida' },
          ],
          admin: {
            width: '50%',
            description: 'Só "Ativa" reserva o número. Os resultados já lançados continuam no histórico.',
          },
        },
      ],
    },
    {
      name: 'observacao',
      label: 'Observação interna',
      type: 'textarea',
      access: { read: campoSomenteMembros },
      admin: { description: 'Opcional. Só aparece aqui no painel (nunca no site).' },
    },
  ],
  hooks: {
    beforeValidate: [prepararInscricao],
    beforeChange: [regrasDaInscricao],
    afterChange: [aposSalvarInscricao],
    beforeDelete: [antesDeExcluirInscricao],
    afterDelete: [aposExcluirInscricao],
  },
})
