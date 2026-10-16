import type { Access, CollectionConfig, Field, FilterOptions, SelectFieldSingleValidation } from 'payload'
import { select as validarSelectPadrao } from 'payload/shared'
import { comAcessoRestrito, editores, lerVisivel, membros } from '../../access'
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
import { HORARIOS_5MIN, minutosEntre } from '../../lib/datas'
import { campoLink, campoTextoBusca, campoTitulo, FORMATO_DATA, FORMATO_DATA_HORA, REL } from './campos'

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
 * Público (sem login): só etapas publicadas e visíveis. Rascunhos ficam no painel e na pré-visualização.
 * Usuários do painel continuam vendo tudo (regra de lerVisivel).
 */
const lerEtapaPublicada: Access = async (args) => {
  const regra = await lerVisivel(args)
  if (typeof regra === 'boolean') return regra
  return { and: [regra, { _status: { equals: 'published' } }] }
}

const OPCOES_HORARIO = HORARIOS_5MIN.map((h) => ({ label: h, value: h }))

/** Treino livre: o fim (opcional) precisa ser depois do início. */
const validarFimTreino: SelectFieldSingleValidation = (valor, args) => {
  const padrao = validarSelectPadrao(valor, args)
  if (padrao !== true) return padrao
  const inicio = (args.siblingData as { inicio?: unknown } | undefined)?.inicio
  if (typeof valor === 'string' && valor && typeof inicio === 'string' && inicio && minutosEntre(inicio, valor) <= 0) {
    return `O fim precisa ser depois do início (${inicio}).`
  }
  return true
}

/** Link com largura na linha do formulário. */
const naLinha = (campo: Field, largura: string): Field => ({ ...campo, admin: { ...(campo as { admin?: object }).admin, width: largura } }) as Field

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
    defaultColumns: ['titulo', 'local', 'status', 'visibilidade', '_status'],
    listSearchableFields: ['titulo', 'local', 'textoBusca'],
    description:
      'Calendário das temporadas. Mudou a data, o local ou um link? Edite aqui, confira na pré-visualização e publique: o site inteiro se atualiza. As corridas de cada etapa são criadas pelo botão "Gerar corridas" a partir do formato da temporada.',
  },
  // Rascunho: o moderador confere na pré-visualização antes de publicar
  versions: { drafts: { autosave: { interval: 2000 } }, maxPerDoc: 30 },
  access: {
    read: lerEtapaPublicada,
    create: editores,
    update: editores,
    delete: editores,
    readVersions: membros,
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
          label: 'Local',
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
          ],
        },
        {
          label: 'Compra, treinos livres e transmissão',
          description:
            'Na página da etapa, nesta ordem: comprar a etapa, treinos livres (link e grade) e transmissão. Campo vazio = o site avisa que ainda não está disponível. Depois da etapa, a compra, os treinos livres e a grade saem do site sozinhos; a transmissão continua (para quem quiser rever).',
          fields: [
            campoLink(
              'linkIngressos',
              'Link para comprar esta etapa (IZY Pass)',
              'Link da IZY Pass desta etapa específica. Vazio = "O link para comprar esta etapa ainda não foi disponibilizado."',
            ),
            campoLink(
              'linkTreinosLivres',
              'Link para comprar os treinos livres desta etapa',
              'Link para os treinos livres desta etapa. Vazio = "Compra dos treinos livres para essa etapa ainda não está disponível"',
            ),
            {
              name: 'gradeTreinosLivres',
              label: 'Grade dos treinos livres',
              labels: { singular: 'Horário', plural: 'Horários' },
              type: 'array',
              admin: {
                description:
                  'Um item por horário. O site agrupa por dia e põe em ordem. Vazia (e sem imagem) = "A grade horária para os treinos livres dessa etapa ainda não está disponível."',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'dia',
                      label: 'Dia',
                      type: 'date',
                      required: true,
                      admin: { width: '34%', date: FORMATO_DATA },
                    },
                    {
                      name: 'inicio',
                      label: 'Início',
                      type: 'select',
                      required: true,
                      options: OPCOES_HORARIO,
                      admin: { width: '33%', description: 'Hora de Brasília (digite para buscar, ex.: 08:00).' },
                    },
                    {
                      name: 'fim',
                      label: 'Fim',
                      type: 'select',
                      options: OPCOES_HORARIO,
                      validate: validarFimTreino,
                      admin: { width: '33%', isClearable: true, description: 'Opcional.' },
                    },
                  ],
                },
                {
                  name: 'categorias',
                  label: 'Categorias',
                  type: 'relationship',
                  relationTo: REL.categorias,
                  hasMany: true,
                  filterOptions: categoriasDaTemporada,
                  admin: { description: 'Opcional. Deixe vazio se o horário não for de uma categoria específica.' },
                },
                {
                  name: 'observacao',
                  label: 'Observação',
                  type: 'text',
                  maxLength: 120,
                  admin: { description: 'Opcional. Texto curto que aparece ao lado do horário.' },
                },
              ],
            },
            {
              name: 'imagemGradeTreinosLivres',
              label: 'Grade dos treinos livres em imagem',
              type: 'upload',
              relationTo: REL.midia,
              admin: {
                description:
                  'Opcional. Para quem prefere publicar a grade como imagem (a arte divulgada nas redes, por exemplo). Aparece abaixo da grade preenchida, se houver.',
              },
            },
            {
              type: 'row',
              fields: [
                naLinha(
                  campoLink(
                    'transmissaoProfissional',
                    'Transmissão ao vivo: Profissional',
                    'Link da transmissão (YouTube, Instagram…). Continua no site depois da etapa.',
                  ),
                  '50%',
                ),
                naLinha(
                  campoLink(
                    'transmissaoIndoor',
                    'Transmissão ao vivo: Indoor',
                    'Link da transmissão (YouTube, Instagram…). Continua no site depois da etapa.',
                  ),
                  '50%',
                ),
              ],
            },
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
    // Situação de publicação do rascunho (o Payload completa o campo). Nome próprio no banco: o padrão
    // (enum_etapas_status) colidiria com o do campo "Status" da etapa (agendada, confirmada…).
    {
      name: '_status',
      label: 'Publicação',
      type: 'select',
      enumName: ({ tableName }: { tableName: string }) => `enum_${tableName}_publicacao`,
    } as unknown as Field,
  ],
  hooks: {
    beforeValidate: [prepararEtapa],
    beforeChange: [regrasDaEtapa],
    afterChange: [aposSalvarEtapa],
    beforeDelete: [antesDeExcluirEtapa],
  },
})
