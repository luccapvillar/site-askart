import type { CollectionConfig } from 'payload'
import { campoSomenteEditores, campoSomenteMembros, comAcessoRestrito, editores, lerVisivel } from '../../access'
import { campoSlug } from '../../fields/slug'
import { campoVisibilidade } from '../../fields/visibilidade'
import { COLECOES } from '../../hooks/competicao/api'
import { buscaPiloto, prepararPiloto, propagarNomePiloto } from '../../hooks/competicao/cadastros'
import { bloquearExclusaoComVinculos } from '../../hooks/competicao/exclusao'
import { slugSemColisao } from '../../hooks/competicao/slug'
import { campoCidade, campoTextoBusca, campoUF, FORMATO_DATA } from './campos'

/** Dados pessoais de menores (LGPD): só aparecem no painel, nunca na API pública nem no site. */
const privado = {
  read: campoSomenteMembros,
  create: campoSomenteEditores,
  update: campoSomenteEditores,
}

/**
 * Pilotos: só os dados pessoais. Número, categoria e equipe de cada temporada ficam nas inscrições.
 */
export const Pilotos: CollectionConfig = comAcessoRestrito({
  slug: COLECOES.pilotos,
  labels: { singular: 'Piloto', plural: 'Pilotos' },
  defaultSort: 'nome',
  disableDuplicate: true,
  admin: {
    group: 'Competição',
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'nomeExibicao', 'cidade', 'uf', 'visibilidade'],
    listSearchableFields: ['nome', 'nomeExibicao', 'textoBusca'],
    description:
      'Cadastro dos pilotos. Número, categoria e equipe de cada temporada ficam em Inscrições. Na busca, dá para procurar pelo número do kart.',
  },
  access: {
    read: lerVisivel,
    create: editores,
    update: editores,
    delete: editores,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Perfil',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'nome',
                  label: 'Nome completo',
                  type: 'text',
                  required: true,
                  admin: { width: '60%' },
                },
                {
                  name: 'nomeExibicao',
                  label: 'Nome de exibição',
                  type: 'text',
                  admin: {
                    width: '40%',
                    description: 'Como aparece nas tabelas (ex.: "J. Silva"). Vazio = nome completo.',
                  },
                },
              ],
            },
            {
              name: 'confirmarNaoDuplicado',
              label: 'Não é a mesma pessoa',
              type: 'checkbox',
              virtual: true,
              admin: {
                readOnly: false,
                description:
                  'Marque só se o sistema avisar que já existe piloto com este nome e for outra pessoa.',
              },
            },
            {
              name: 'foto',
              label: 'Foto',
              type: 'upload',
              relationTo: 'midia',
              admin: { description: 'Opcional. Confira a autorização de imagem (aba "Dados privados").' },
            },
            { type: 'row', fields: [campoCidade(), campoUF()] },
            {
              name: 'biografia',
              label: 'Biografia',
              type: 'richText',
              admin: { description: 'Opcional. Apenas informações fornecidas pelo piloto ou responsável.' },
            },
          ],
        },
        {
          label: 'Inscrições',
          description: 'Número, categoria e equipe em cada temporada. Para mudar, edite a inscrição.',
          fields: [
            {
              name: 'inscricoes',
              label: 'Inscrições',
              type: 'join',
              collection: COLECOES.inscricoes,
              on: 'piloto',
              defaultSort: '-createdAt',
              admin: { defaultColumns: ['titulo', 'condicao', 'status'] },
            },
          ],
        },
        {
          label: 'Dados privados',
          description: 'Só aparecem aqui no painel (nunca no site). Necessários para pilotos menores de idade.',
          fields: [
            {
              name: 'dataNascimento',
              label: 'Data de nascimento',
              type: 'date',
              access: privado,
              admin: { date: FORMATO_DATA, description: 'Opcional. Ajuda a evitar cadastro duplicado.' },
            },
            {
              name: 'autorizacaoImagem',
              label: 'Autorização de uso de imagem',
              type: 'group',
              access: privado,
              fields: [
                {
                  name: 'autorizada',
                  label: 'Autorizado?',
                  type: 'select',
                  options: [
                    { label: 'Sim', value: 'sim' },
                    { label: 'Não', value: 'nao' },
                  ],
                  admin: { description: 'Vazio = ainda não informado.' },
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'responsavel',
                      label: 'Responsável que autorizou',
                      type: 'text',
                      admin: { width: '60%', description: 'Para menores: nome do pai, mãe ou responsável legal.' },
                    },
                    {
                      name: 'data',
                      label: 'Data da autorização',
                      type: 'date',
                      admin: { width: '40%', date: FORMATO_DATA },
                    },
                  ],
                },
                {
                  name: 'documento',
                  label: 'Documento assinado',
                  type: 'relationship',
                  relationTo: 'documentos',
                  admin: {
                    description:
                      'Opcional. Envie em Documentos e deixe-o como rascunho ou oculto (não publique).',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    campoSlug('nome'),
    campoVisibilidade(),
    campoTextoBusca(),
  ],
  hooks: {
    beforeValidate: [prepararPiloto, slugSemColisao(COLECOES.pilotos)],
    beforeChange: [buscaPiloto],
    afterChange: [propagarNomePiloto],
    beforeDelete: [bloquearExclusaoComVinculos({ alvo: COLECOES.pilotos, oQue: 'este piloto' })],
  },
})
