import type { GlobalConfig } from 'payload'
import { comAcessoRestrito, editores, lerGlobalPublicado, membros } from '../access'
import { campoLink } from '../fields/link'
import { GRUPO_SITE, RASCUNHO_GLOBAL, HOOKS_GLOBAL } from './comum'

const rota = (r: string) => ({ link: { tipo: 'rota', rota: r } })

/** Menu do topo (as 4 abas pedidas pelo cliente) e colunas de links do rodapé. */
export const Navegacao: GlobalConfig = comAcessoRestrito(
  {
    slug: 'navegacao',
    label: 'Menu e rodapé',
    versions: RASCUNHO_GLOBAL,
    admin: {
      group: GRUPO_SITE,
      description: 'Abas do menu do topo e links do rodapé. Arraste para reordenar.',
    },
    access: { read: lerGlobalPublicado, update: editores, readVersions: membros },
    fields: [
      {
        name: 'menu',
        label: 'Abas do menu',
        labels: { singular: 'Aba', plural: 'Abas' },
        type: 'array',
        maxRows: 6,
        admin: { description: 'Padrão: BKS · Kartódromo · Notícias · Contato. Até 6 abas.' },
        defaultValue: [rota('bks'), rota('kartodromo'), rota('noticias'), rota('contato')],
        fields: [
          campoLink({ name: 'link', label: 'Aba', required: true, rotuloTexto: 'Nome da aba' }),
          {
            name: 'subitens',
            label: 'Subitens',
            labels: { singular: 'Subitem', plural: 'Subitens' },
            type: 'array',
            maxRows: 8,
            admin: { description: 'Opcional. Aparecem ao abrir a aba no celular e no menu suspenso.' },
            fields: [campoLink({ name: 'link', label: 'Subitem', required: true })],
          },
        ],
      },
      campoLink({
        name: 'botaoDestaque',
        label: 'Botão de destaque no topo',
        rotuloTexto: 'Texto do botão',
        descricao: 'Opcional. Ex.: "Comprar na IZY Pass". Aparece à direita do menu.',
      }),
      {
        name: 'rodape',
        label: 'Colunas do rodapé',
        labels: { singular: 'Coluna', plural: 'Colunas' },
        type: 'array',
        maxRows: 4,
        fields: [
          { name: 'titulo', label: 'Título da coluna', type: 'text', required: true, maxLength: 40 },
          {
            name: 'links',
            label: 'Links',
            labels: { singular: 'Link', plural: 'Links' },
            type: 'array',
            maxRows: 10,
            fields: [campoLink({ name: 'link', label: 'Link', required: true })],
          },
        ],
      },
    ],
    hooks: HOOKS_GLOBAL,
  },
  'global',
)
