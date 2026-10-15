import type { GlobalConfig } from 'payload'
import { comAcessoRestrito, editores, membros, todos } from '../access'
import { ROTAS_FIXAS } from '../fields/link'
import { campoImagem, GRUPO_SITE, HISTORICO_GLOBAL, HOOKS_GLOBAL } from './comum'

const OPCOES_ROTA = Object.entries(ROTAS_FIXAS)
  .filter(([chave]) => chave !== 'inicio')
  .map(([value, { rotulo }]) => ({ label: rotulo, value }))

/** Título, introdução, foto e texto de "nada por aqui" das seções fixas do site. */
export const TextosPaginas: GlobalConfig = comAcessoRestrito(
  {
    slug: 'textos-paginas',
    label: 'Textos das seções',
    versions: HISTORICO_GLOBAL,
    admin: {
      group: GRUPO_SITE,
      description:
        'Personalize o topo de cada seção fixa do site (BKS, Kartódromo, Notícias, Contato…). Seção sem linha aqui usa os textos padrão.',
    },
    access: { read: todos, update: editores, readVersions: membros },
    fields: [
      {
        name: 'paginas',
        label: 'Seções',
        labels: { singular: 'Seção', plural: 'Seções' },
        type: 'array',
        admin: { initCollapsed: true },
        validate: (linhas: unknown) => {
          const rotas = Array.isArray(linhas) ? linhas.map((l) => (l as { rota?: string }).rota).filter(Boolean) : []
          const repetida = rotas.find((r, i) => rotas.indexOf(r) !== i)
          return repetida ? `A seção "${ROTAS_FIXAS[repetida as keyof typeof ROTAS_FIXAS]?.rotulo ?? repetida}" aparece duas vezes.` : true
        },
        fields: [
          { name: 'rota', label: 'Seção', type: 'select', required: true, options: OPCOES_ROTA },
          {
            type: 'row',
            fields: [
              { name: 'titulo', label: 'Título', type: 'text', maxLength: 80, admin: { width: '50%' } },
              { name: 'subtitulo', label: 'Subtítulo', type: 'text', maxLength: 160, admin: { width: '50%' } },
            ],
          },
          { name: 'introducao', label: 'Introdução', type: 'textarea', maxLength: 600 },
          campoImagem('imagem', 'Foto do topo'),
          {
            name: 'textoVazio',
            label: 'Texto quando não houver conteúdo',
            type: 'text',
            maxLength: 200,
            admin: { placeholder: 'Ex.: O calendário de 2027 será divulgado em breve.' },
          },
          {
            type: 'row',
            fields: [
              { name: 'seoTitulo', label: 'Título no Google', type: 'text', maxLength: 70, admin: { width: '40%' } },
              { name: 'seoDescricao', label: 'Descrição no Google', type: 'text', maxLength: 160, admin: { width: '60%' } },
            ],
          },
        ],
      },
    ],
    hooks: HOOKS_GLOBAL,
  },
  'global',
)
