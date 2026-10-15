import type { CollectionConfig, FilterOptions } from 'payload'
import { comAcessoRestrito, editores, lerVisivel } from '../../access'
import { campoVisibilidade } from '../../fields/visibilidade'
import { COLECOES } from '../../hooks/competicao/api'
import { carregarTemporada, temporadaPadrao } from '../../hooks/competicao/consultas'
import { endpointGerarCorridas } from '../../hooks/competicao/endpoints'
import {
  antesDeExcluirEtapa,
  aposSalvarEtapa,
  categoriasPadrao,
  localPadrao,
  nomePadrao,
  numeroPadrao,
  prepararEtapa,
  regrasDaEtapa,
} from '../../hooks/competicao/etapas'
import { idsDe } from '../../hooks/competicao/util'
import { validarFator, validarInteiro } from '../../hooks/competicao/validacoes'
import { campoLink, campoTextoBusca, campoTitulo, FORMATO_DATA_HORA, REL } from './campos'

/**
 * Campo de notícias e galerias que aponta para a etapa (frente Conteúdo). Se lá o nome for outro,
 * ajuste aqui: o Payload recusa iniciar com um "join" para um campo inexistente.
 */
const CAMPO_ETAPA_EM_NOTICIAS = 'etapa'
const CAMPO_ETAPA_EM_GALERIAS = 'etapa'

/** No seletor de categorias, só as da temporada escolhida. */
const categoriasDaTemporada: FilterOptions = async ({ data, req }) => {
  const ids = idsDe((await carregarTemporada(req, data?.temporada))?.categorias)
  return ids.length ? { id: { in: ids } } : true
}

/**
 * Etapas do calendário. A data mora só aqui: calendário, página inicial, contagem regressiva e página
 * da etapa leem daqui. Cada etapa tem suas corridas (por categoria), com os resultados.
 */
export const Etapas: CollectionConfig = comAcessoRestrito({
  slug: COLECOES.etapas,
  labels: { singular: 'Etapa', plural: 'Etapas' },
  defaultSort: '-inicio',
  admin: {
    group: 'Competição',
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'local', 'status', 'visibilidade'],
    listSearchableFields: ['titulo', 'local', 'textoBusca'],
    description:
      'Calendário das temporadas. Mudou a data ou o local? Edite aqui e o site inteiro se atualiza. As corridas de cada etapa são criadas pelo botão "Gerar corridas" a partir do formato da temporada.',
  },
  access: {
    read: lerVisivel,
    create: editores,
    update: editores,
    delete: editores,
  },
  indexes: [{ fields: ['temporada', 'numero'], unique: true }],
  endpoints: [endpointGerarCorridas],
  fields: [
    campoTitulo('Calculado: ano · nome · dia da semana e data.'),
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Etapa',
          fields: [
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
                  name: 'numero',
                  label: 'Número',
                  type: 'number',
                  required: true,
                  index: true,
                  defaultValue: numeroPadrao,
                  validate: validarInteiro(1, 99, 'O número da etapa'),
                  admin: { width: '20%', description: 'Padrão: a última + 1.' },
                },
                {
                  name: 'nome',
                  label: 'Nome',
                  type: 'text',
                  defaultValue: nomePadrao,
                  admin: { width: '30%', description: 'Padrão: "3ª Etapa" (acompanha o número).' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'inicio',
                  label: 'Início',
                  type: 'date',
                  index: true,
                  timezone: true,
                  admin: {
                    width: '50%',
                    date: FORMATO_DATA_HORA,
                    description: 'Data e hora de Brasília. O dia da semana e a contagem regressiva saem daqui.',
                  },
                },
                {
                  name: 'fim',
                  label: 'Fim',
                  type: 'date',
                  timezone: true,
                  admin: {
                    width: '50%',
                    date: FORMATO_DATA_HORA,
                    description: 'Opcional. Para etapas de mais de um dia (ex.: sábado e domingo).',
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'status',
                  label: 'Status',
                  type: 'select',
                  required: true,
                  defaultValue: 'agendada',
                  index: true,
                  options: [
                    { label: 'Agendada', value: 'agendada' },
                    { label: 'Confirmada', value: 'confirmada' },
                    { label: 'Adiada', value: 'adiada' },
                    { label: 'Cancelada', value: 'cancelada' },
                    { label: 'Realizada', value: 'realizada' },
                  ],
                  admin: {
                    width: '50%',
                    description:
                      '"Realizada" é marcada sozinha quando todas as corridas que contam ficam oficiais. Etapa cancelada não pontua e mantém o número.',
                  },
                },
                {
                  name: 'fatorPontuacao',
                  label: 'Fator de pontuação',
                  type: 'number',
                  defaultValue: 1,
                  validate: validarFator,
                  admin: {
                    width: '50%',
                    step: 0.5,
                    description: '1 = normal; 2 = pontos em dobro (ex.: etapa final, se o regulamento prever).',
                  },
                },
              ],
            },
            {
              name: 'categorias',
              label: 'Categorias',
              type: 'relationship',
              relationTo: REL.categorias,
              hasMany: true,
              defaultValue: categoriasPadrao,
              filterOptions: categoriasDaTemporada,
              admin: { description: 'Padrão: todas as categorias da temporada. Tire as que não correm esta etapa.' },
            },
          ],
        },
        {
          label: 'Local e ingressos',
          fields: [
            {
              name: 'local',
              label: 'Local',
              type: 'text',
              defaultValue: localPadrao,
              admin: { description: 'Padrão: o kartódromo (cadastrado em Kartódromo). Troque se a etapa for em outro lugar.' },
            },
            campoLink(
              'localMapa',
              'Link do mapa do local',
              'Opcional. Link do Google Maps. Vazio = mapa do kartódromo (cadastrado em Contato).',
            ),
            campoLink(
              'linkIngressos',
              'Link de ingressos (IZY Pass)',
              'Opcional. Link da IZY Pass para comprar treinos livres e corridas desta etapa.',
            ),
          ],
        },
        {
          label: 'Apresentação',
          fields: [
            {
              name: 'descricao',
              label: 'Descrição',
              type: 'richText',
              admin: { description: 'Opcional. Informações da etapa para o site (programação, avisos…).' },
            },
            {
              name: 'imagem',
              label: 'Imagem',
              type: 'upload',
              relationTo: REL.midia,
              admin: { description: 'Opcional. Imagem do cartão e do topo da página da etapa.' },
            },
          ],
        },
        {
          label: 'Corridas e resultados',
          description: 'Use "Gerar corridas" para criar as corridas do formato da temporada para cada categoria.',
          fields: [
            {
              name: 'corridas',
              label: 'Corridas',
              type: 'join',
              collection: REL.corridas,
              on: 'etapa',
              // Ordem de criação = ordem do formato da temporada (categoria × corrida)
              defaultSort: 'createdAt',
              admin: { defaultColumns: ['titulo', 'tipo', 'status', 'inicio'] },
            },
          ],
        },
        {
          label: 'Notícias e fotos',
          fields: [
            {
              name: 'noticias',
              label: 'Notícias desta etapa',
              type: 'join',
              collection: REL.noticias,
              on: CAMPO_ETAPA_EM_NOTICIAS,
              admin: { allowCreate: true },
            },
            {
              name: 'galerias',
              label: 'Galerias desta etapa',
              type: 'join',
              collection: REL.galerias,
              on: CAMPO_ETAPA_EM_GALERIAS,
              admin: { allowCreate: true },
            },
          ],
        },
      ],
    },
    campoVisibilidade(),
    campoTextoBusca(),
  ],
  hooks: {
    beforeValidate: [prepararEtapa],
    beforeChange: [regrasDaEtapa],
    afterChange: [aposSalvarEtapa],
    beforeDelete: [antesDeExcluirEtapa],
  },
})
