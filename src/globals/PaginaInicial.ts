import type { Block, Field, GlobalConfig } from 'payload'
import { comAcessoRestrito, editores, lerGlobalPublicado, membros } from '../access'
import { campoLink } from '../fields/link'
import { campoImagem, GRUPO_SITE, RASCUNHO_GLOBAL, HOOKS_GLOBAL } from './comum'
import { ORDEM_PADRAO_INICIO } from './ordem-inicio'

export { ORDEM_PADRAO_INICIO }

/** Campos comuns a todas as seções: liga/desliga, títulos e botão. */
const comuns = (tituloPadrao: string): Field[] => [
  {
    type: 'row',
    fields: [
      { name: 'ativo', label: 'Mostrar esta seção', type: 'checkbox', defaultValue: true, admin: { width: '30%' } },
      {
        name: 'titulo',
        label: 'Título',
        type: 'text',
        maxLength: 80,
        admin: { width: '70%', placeholder: tituloPadrao, description: `Vazio = "${tituloPadrao}".` },
      },
    ],
  },
  { name: 'subtitulo', label: 'Subtítulo', type: 'text', maxLength: 160 },
  campoLink({ name: 'botao', label: 'Botão', rotuloTexto: 'Texto do botão', descricao: 'Opcional. Vazio = botão padrão da seção.' }),
]

const quantidade = (padrao: number, max: number): Field => ({
  name: 'quantidade',
  label: 'Quantidade de itens',
  type: 'number',
  min: 1,
  max,
  defaultValue: padrao,
  admin: { step: 1 },
})

/** `tituloPadrao`: o título que o site usa quando o campo fica vazio (padrão = o nome da seção). */
const secao = (slug: string, rotulo: string, extras: Field[] = [], tituloPadrao = rotulo): Block => ({
  slug,
  labels: { singular: rotulo, plural: rotulo },
  fields: [...comuns(tituloPadrao), ...extras],
})

export const SECOES_INICIO: Block[] = [
  secao('proxima-etapa', 'Próxima etapa', [
    { name: 'contagem', label: 'Mostrar contagem regressiva', type: 'checkbox', defaultValue: true },
  ]),
  secao('lideres', 'Líderes por categoria', [quantidade(6, 12)]),
  secao('calendario', 'Calendário do BKS', [], 'Calendário da temporada'),
  // Slug antigo mantido ("treinos"): agora é a chamada curta do kartódromo, sem listar os horários do dia
  secao('treinos', 'Kartódromo: chamada dos treinos', [], 'Treino quase todos os dias'),
  secao('noticias', 'Notícias', [quantidade(3, 9)], 'Últimas notícias'),
  secao('comunicados', 'Avisos no ar', [quantidade(3, 6)]),
  secao('pilotos', 'Pilotos em destaque', [
    { name: 'pilotos', label: 'Pilotos', type: 'relationship', relationTo: 'pilotos', hasMany: true, maxRows: 8 },
  ]),
  secao(
    'galeria-destaque',
    'Galeria em destaque',
    [{ name: 'galeria', label: 'Galeria', type: 'relationship', relationTo: 'galerias', admin: { description: 'Vazio = a galeria mais recente.' } }],
    'título da galeria',
  ),
  // Mesma chamada do kartódromo: se "Kartódromo" e "Kartódromo: chamada dos treinos" estiverem ligadas, aparece uma vez só
  secao('kartodromo', 'Kartódromo (mesma chamada)', [], 'Treino quase todos os dias'),
  secao('ingressos', 'IZY Pass (só com o link geral cadastrado)', [], 'Etapas e treinos livres pela IZY Pass'),
  secao('perguntas', 'Perguntas frequentes', [quantidade(5, 10)]),
  secao('contato', 'Contato'),
  secao('apoiadores', 'Apoiadores', [
    {
      name: 'apoiadores',
      label: 'Logos',
      labels: { singular: 'Apoiador', plural: 'Apoiadores' },
      type: 'array',
      admin: { description: 'Só apoiadores confirmados pela ASKART.' },
      fields: [
        { name: 'nome', label: 'Nome', type: 'text', required: true },
        { ...campoImagem('logo', 'Logo'), required: true } as Field,
        { name: 'url', label: 'Site', type: 'text' },
      ],
    },
  ]),
]

export const PaginaInicial: GlobalConfig = comAcessoRestrito(
  {
    slug: 'pagina-inicial',
    label: 'Página inicial',
    versions: RASCUNHO_GLOBAL,
    admin: {
      group: GRUPO_SITE,
      description: 'Topo da página inicial e as seções abaixo dele. Arraste as seções para mudar a ordem; desmarque para esconder.',
    },
    access: { read: lerGlobalPublicado, update: editores, readVersions: membros },
    fields: [
      {
        name: 'topo',
        label: 'Topo da página',
        type: 'group',
        fields: [
          {
            name: 'titulo',
            label: 'Título',
            type: 'text',
            maxLength: 90,
            admin: { description: 'Vazio = nome do campeonato principal e da temporada atual.' },
          },
          {
            name: 'subtitulo',
            label: 'Subtítulo',
            type: 'textarea',
            maxLength: 220,
            admin: { description: 'Vazio = frase padrão sobre o campeonato e o kartódromo.' },
          },
          campoImagem('imagem', 'Foto de fundo', 'Foto larga e deitada (mínimo 1920 px). Vazio = foto do campeonato principal.'),
          {
            name: 'botoes',
            label: 'Botões',
            labels: { singular: 'Botão', plural: 'Botões' },
            type: 'array',
            maxRows: 2,
            admin: { description: 'Até dois. Vazio = "Calendário" e "Classificação".' },
            fields: [campoLink({ name: 'link', label: 'Botão', required: true, rotuloTexto: 'Texto do botão' })],
          },
        ],
      },
      {
        name: 'secoes',
        label: 'Seções',
        type: 'blocks',
        blocks: SECOES_INICIO,
        defaultValue: ORDEM_PADRAO_INICIO.map((blockType) => ({ blockType, ativo: true })),
      },
    ],
    hooks: HOOKS_GLOBAL,
  },
  'global',
)
