import type { GlobalConfig } from 'payload'
import { comAcessoRestrito, editores, lerGlobalPublicado, membros } from '../access'
import { editorPadrao, editorSimples } from '../collections/conteudo/editores'
import { campoImagem, GRUPO_SITE, RASCUNHO_GLOBAL, HOOKS_GLOBAL } from './comum'

export { VALOR_A_CONFIRMAR, valorDaTaxa } from '../lib/taxas'

/**
 * Aba Kartódromo: onde fica, história, taxas, como treinar, estrutura e informações.
 * Endereço, mapa e contatos vêm do global "Contato"; a tabela de treinos vem da Agenda de treinos.
 */
export const Kartodromo: GlobalConfig = comAcessoRestrito(
  {
    slug: 'kartodromo',
    label: 'Kartódromo',
    versions: RASCUNHO_GLOBAL,
    admin: {
      group: GRUPO_SITE,
      description:
        'Textos da aba Kartódromo. Endereço e contatos ficam em "Contato e redes sociais"; horários de treino, em "Grade semanal de treinos" e "Treinos e exceções".',
    },
    access: { read: lerGlobalPublicado, update: editores, readVersions: membros },
    fields: [
      {
        type: 'tabs',
        tabs: [
          {
            label: 'Apresentação',
            fields: [
              {
                name: 'nome',
                label: 'Nome do kartódromo',
                type: 'text',
                required: true,
                defaultValue: 'Kartódromo Ayrton Senna do Guará',
              },
              {
                name: 'resumo',
                label: 'Resumo',
                type: 'textarea',
                maxLength: 300,
                admin: { description: 'Uma ou duas frases no topo da aba.' },
              },
              campoImagem('imagemTopo', 'Foto do topo', 'Foto larga do kartódromo (ideal: vista aérea, 1920 px de largura).'),
              {
                name: 'historia',
                label: 'História do kartódromo',
                type: 'richText',
                editor: editorPadrao,
              },
              {
                name: 'galerias',
                label: 'Galerias de fotos',
                type: 'relationship',
                relationTo: 'galerias',
                hasMany: true,
                admin: { description: 'Galerias mostradas na aba (cadastre as fotos em Galerias).' },
              },
            ],
          },
          {
            label: 'Taxas e valores',
            fields: [
              {
                name: 'taxasIntroducao',
                label: 'Texto antes da tabela',
                type: 'textarea',
                maxLength: 400,
                defaultValue: 'Para correr no kartódromo é obrigatório pagar a taxa de pista e a taxa de ambulância.',
              },
              {
                name: 'taxas',
                label: 'Taxas',
                labels: { singular: 'Taxa', plural: 'Taxas' },
                type: 'array',
                admin: {
                  description: 'Enquanto o valor não estiver definido, deixe "Valor a confirmar" marcado: o site mostra "R$ X".',
                },
                defaultValue: [
                  { item: 'Taxa de pista', aConfirmar: true, obrigatoria: true },
                  { item: 'Taxa de ambulância', aConfirmar: true, obrigatoria: true },
                ],
                fields: [
                  {
                    type: 'row',
                    fields: [
                      { name: 'item', label: 'Taxa', type: 'text', required: true, admin: { width: '40%' } },
                      {
                        name: 'valor',
                        label: 'Valor (R$)',
                        type: 'number',
                        min: 0,
                        admin: { width: '20%', step: 0.01, condition: (_, irmaos) => !irmaos?.aConfirmar },
                      },
                      {
                        name: 'aConfirmar',
                        label: 'Valor a confirmar (mostra "R$ X")',
                        type: 'checkbox',
                        defaultValue: true,
                        admin: { width: '20%' },
                      },
                      {
                        name: 'obrigatoria',
                        label: 'Obrigatória para correr',
                        type: 'checkbox',
                        defaultValue: false,
                        admin: { width: '20%' },
                      },
                    ],
                  },
                  {
                    name: 'observacao',
                    label: 'Observação',
                    type: 'text',
                    maxLength: 160,
                    admin: { placeholder: 'Ex.: por dia de treino; por piloto; pago na secretaria' },
                  },
                ],
              },
            ],
          },
          {
            label: 'Como treinar',
            fields: [
              {
                name: 'comoTreinarIntroducao',
                label: 'Introdução',
                type: 'richText',
                editor: editorSimples,
              },
              {
                name: 'comoTreinar',
                label: 'Passo a passo',
                labels: { singular: 'Passo', plural: 'Passos' },
                type: 'array',
                admin: { description: 'Na ordem em que o piloto deve seguir. Arraste para reordenar.' },
                fields: [
                  { name: 'titulo', label: 'Passo', type: 'text', required: true, maxLength: 80 },
                  { name: 'texto', label: 'Explicação', type: 'textarea', maxLength: 500 },
                ],
              },
            ],
          },
          {
            label: 'Estrutura e pista',
            fields: [
              {
                name: 'estrutura',
                label: 'Estrutura',
                labels: { singular: 'Item', plural: 'Itens' },
                type: 'array',
                admin: { description: 'Ex.: boxes, arquibancada, lanchonete, estacionamento (só o que existe).' },
                fields: [
                  { name: 'titulo', label: 'Título', type: 'text', required: true, maxLength: 80 },
                  { name: 'texto', label: 'Texto', type: 'textarea', maxLength: 400 },
                  campoImagem('imagem', 'Foto'),
                ],
              },
              {
                name: 'dadosPista',
                label: 'Dados da pista',
                labels: { singular: 'Dado', plural: 'Dados' },
                type: 'array',
                admin: { description: 'Só dados confirmados. Ex.: Extensão → 1.000 m; Curvas → 12.' },
                fields: [
                  {
                    type: 'row',
                    fields: [
                      { name: 'rotulo', label: 'Dado', type: 'text', required: true, admin: { width: '50%' } },
                      { name: 'valor', label: 'Valor', type: 'text', required: true, admin: { width: '50%' } },
                    ],
                  },
                ],
              },
              campoImagem('tracado', 'Desenho do traçado', 'Opcional. Imagem do traçado da pista.'),
            ],
          },
          {
            label: 'Informações',
            fields: [
              { name: 'infoPilotos', label: 'Para pilotos', type: 'richText', editor: editorPadrao },
              { name: 'infoVisitantes', label: 'Para visitantes', type: 'richText', editor: editorPadrao },
            ],
          },
        ],
      },
    ],
    hooks: HOOKS_GLOBAL,
  },
  'global',
)
