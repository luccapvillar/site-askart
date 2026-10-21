import type { GlobalConfig, NumberField } from 'payload'
import { comAcessoRestrito, editores, lerGlobalPublicado, membros } from '../access'
import { editorPadrao, editorSimples } from '../collections/conteudo/editores'
import { INTRODUCAO_MENSALIDADE_PADRAO } from '../lib/taxas'
import { validarInteiro } from '../hooks/competicao/validacoes'
import { campoImagem, GRUPO_SITE, RASCUNHO_GLOBAL, HOOKS_GLOBAL } from './comum'

export { VALOR_A_CONFIRMAR, valorDaTaxa } from '../lib/taxas'

/** Valor em reais (opcional, a partir de zero). */
const campoReais = (name: string, label: string): NumberField => ({ name, label, type: 'number', min: 0 })

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
              {
                type: 'collapsible',
                label: 'Mensalidade da taxa de pista',
                admin: {
                  initCollapsed: false,
                  description:
                    'Aparece no site logo depois das taxas, com uma tabela "Sem desconto" × "Com desconto bônus". Sem nenhum plano cadastrado, a mensalidade não aparece.',
                },
                fields: [
                  {
                    name: 'mensalidadeIntroducao',
                    label: 'Texto antes da tabela da mensalidade',
                    type: 'textarea',
                    maxLength: 400,
                    defaultValue: INTRODUCAO_MENSALIDADE_PADRAO,
                  },
                  {
                    name: 'mensalidadePlanos',
                    label: 'Planos da mensalidade',
                    labels: { singular: 'Plano', plural: 'Planos' },
                    type: 'array',
                    admin: {
                      description:
                        'Um plano para cada quantidade de taxas de ambulância incluídas (ex.: 4, 8 e 12). Digite só a mensalidade da pista e o valor das taxas de ambulância: o site soma e mostra o valor total. Arraste para mudar a ordem.',
                      components: { RowLabel: '/components/admin/RotulosMensalidade#RotuloPlano' },
                    },
                    fields: [
                      {
                        name: 'ambulanciasIncluidas',
                        label: 'Taxas de ambulância incluídas',
                        type: 'number',
                        required: true,
                        min: 1,
                        validate: (valor: unknown) =>
                          valor === null || valor === undefined || valor === ''
                            ? 'Informe quantas taxas de ambulância o plano inclui.'
                            : validarInteiro(1, 99, 'A quantidade de taxas de ambulância')(valor),
                        admin: { step: 1, placeholder: 'Ex.: 4', description: 'Quantas taxas de ambulância o plano inclui.' },
                      },
                      {
                        name: 'semDesconto',
                        label: 'Sem desconto',
                        type: 'group',
                        admin: { description: 'Valores sem desconto. Deixe em branco se não houver.' },
                        fields: [
                          {
                            type: 'row',
                            fields: [
                              { ...campoReais('pista', 'Mensalidade da pista (R$)'), admin: { width: '50%', step: 0.01, placeholder: 'Ex.: 320' } },
                              { ...campoReais('ambulancias', 'Taxas de ambulância (R$)'), admin: { width: '50%', step: 0.01, placeholder: 'Ex.: 200' } },
                            ],
                          },
                        ],
                      },
                      {
                        name: 'comDesconto',
                        label: 'Com desconto bônus',
                        type: 'group',
                        admin: { description: 'Valores com o desconto bônus. Deixe em branco se não houver desconto.' },
                        fields: [
                          {
                            type: 'row',
                            fields: [
                              { ...campoReais('pista', 'Mensalidade da pista (R$)'), admin: { width: '50%', step: 0.01, placeholder: 'Ex.: 300' } },
                              { ...campoReais('ambulancias', 'Taxas de ambulância (R$)'), admin: { width: '50%', step: 0.01, placeholder: 'Ex.: 150' } },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'mensalidadeRegras',
                    label: 'Regras da mensalidade',
                    labels: { singular: 'Regra', plural: 'Regras' },
                    type: 'array',
                    admin: {
                      description: 'Frases curtas, uma por linha, mostradas em lista abaixo da tabela. Ex.: "O desconto é intransferível e não pode ser acumulado."',
                      components: { RowLabel: '/components/admin/RotulosMensalidade#RotuloRegra' },
                    },
                    fields: [{ name: 'texto', label: 'Regra', type: 'text', required: true, maxLength: 200 }],
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
