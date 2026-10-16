import type { GlobalConfig } from 'payload'
import { comAcessoRestrito, membros, somenteAdmin, todos } from '../access'
import { campoCor } from '../collections/conteudo/comum'
import { campoImagem, campoUrl, GRUPO_SITE, HISTORICO_GLOBAL, HOOKS_GLOBAL } from './comum'

/**
 * Configurações gerais: identidade, cores, campeonato principal (BKS), IZY Pass, rodapé e SEO.
 * Só o administrador altera (o moderador cuida do conteúdo, não da identidade do site).
 */
export const Configuracoes: GlobalConfig = comAcessoRestrito(
  {
    slug: 'configuracoes',
    label: 'Configurações gerais',
    versions: HISTORICO_GLOBAL,
    admin: {
      group: GRUPO_SITE,
      description: 'Identidade do site. Só o administrador altera.',
    },
    access: { read: todos, update: somenteAdmin, readVersions: membros },
    fields: [
      {
        type: 'tabs',
        tabs: [
          {
            label: 'Identidade',
            fields: [
              {
                type: 'row',
                fields: [
                  {
                    name: 'nome',
                    label: 'Nome da associação',
                    type: 'text',
                    required: true,
                    defaultValue: 'Associação de Pilotos de Kart de Brasília',
                    admin: { width: '70%' },
                  },
                  { name: 'sigla', label: 'Sigla', type: 'text', required: true, defaultValue: 'ASKART', admin: { width: '30%' } },
                ],
              },
              {
                name: 'descricao',
                label: 'Descrição curta',
                type: 'textarea',
                maxLength: 220,
                admin: { description: 'Uma ou duas frases. Aparece no rodapé e nos resultados do Google.' },
              },
              {
                type: 'row',
                fields: [
                  campoImagem('logo', 'Logo', 'Versão para fundo claro. PNG ou WebP com fundo transparente, de preferência.'),
                  campoImagem('logoFundoEscuro', 'Logo para fundo escuro', 'Opcional. Usada no rodapé.'),
                  campoImagem('favicon', 'Ícone do navegador', 'Imagem quadrada, mínimo 512 × 512 px.'),
                ],
              },
            ],
          },
          {
            label: 'Cores',
            description:
              'Cores da ASKART usadas no site. Vazias = cores da logo (verde, amarelo e preto). O site escolhe sozinho texto preto ou branco sobre cada cor.',
            fields: [
              {
                type: 'row',
                fields: [
                  campoCor('Cor principal: faixas, botões e destaques.', 'corPrimaria', 'Principal'),
                  campoCor('Cor de apoio: placas de número e detalhes.', 'corSecundaria', 'Secundária'),
                  campoCor('Cor escura: cabeçalho e rodapé.', 'corEscura', 'Escura'),
                ],
              },
            ],
          },
          {
            label: 'BKS e ingressos',
            fields: [
              {
                name: 'campeonatoPrincipal',
                label: 'Campeonato principal',
                type: 'relationship',
                relationTo: 'campeonatos',
                admin: {
                  description:
                    'O campeonato da aba BKS (Brasília Kart Series). Também é o padrão da classificação e do calendário.',
                },
              },
              campoUrl(
                'izyPass',
                'Link da IZY Pass',
                'Página geral da IZY Pass (topo da aba BKS, Kartódromo e bloco de ingressos da página inicial). O link de compra de cada etapa fica na própria etapa, na aba "Compra, treinos livres e transmissão".',
              ),
              {
                name: 'izyPassTexto',
                label: 'Texto do botão da IZY Pass',
                type: 'text',
                maxLength: 60,
                defaultValue: 'Comprar na IZY Pass',
              },
              {
                // Grupo sem nome: os campos ficam no primeiro nível (config.textoEventoPublico…)
                type: 'group',
                label: 'Etapas do BKS: informações ao público',
                admin: {
                  description:
                    'Aparece na página de cada etapa (bloco "Aberto ao público") e, resumido, no calendário do BKS. Some nas etapas canceladas e nas que já aconteceram.',
                },
                fields: [
                  {
                    name: 'exibirEventoPublico',
                    label: 'Mostrar o bloco "Aberto ao público" nas etapas',
                    type: 'checkbox',
                    defaultValue: true,
                  },
                  {
                    name: 'textoEventoPublico',
                    label: 'Texto',
                    type: 'textarea',
                    maxLength: 300,
                    defaultValue: 'O evento é aberto ao público, com entrada gratuita.',
                    admin: { description: 'Vazio = "O evento é aberto ao público, com entrada gratuita."' },
                  },
                  {
                    name: 'itensEventoPublico',
                    label: 'O que o público encontra',
                    labels: { singular: 'Item', plural: 'Itens' },
                    type: 'array',
                    maxRows: 12,
                    defaultValue: [{ texto: 'Food trucks' }, { texto: 'Telão' }, { texto: 'Mesas e cadeiras' }, { texto: 'Narrador' }],
                    admin: {
                      description:
                        'Cada item vira uma etiqueta com ícone. Lista vazia = Food trucks, Telão, Mesas e cadeiras e Narrador.',
                    },
                    fields: [{ name: 'texto', label: 'Texto', type: 'text', required: true, maxLength: 40 }],
                  },
                ],
              },
            ],
          },
          {
            label: 'Rodapé',
            fields: [
              {
                name: 'textoRodape',
                label: 'Texto do rodapé',
                type: 'textarea',
                maxLength: 400,
                admin: { description: 'Opcional. Ex.: CNPJ, endereço resumido, aviso legal.' },
              },
            ],
          },
          {
            label: 'Google e compartilhamento',
            fields: [
              {
                name: 'tituloSite',
                label: 'Título do site',
                type: 'text',
                maxLength: 70,
                admin: { description: 'Aparece na aba do navegador e no Google. Vazio = sigla e nome da associação.' },
              },
              campoImagem(
                'imagemCompartilhamento',
                'Imagem de compartilhamento',
                'Aparece quando alguém envia o link do site no WhatsApp ou nas redes. Ideal: 1200 × 630 px.',
              ),
            ],
          },
          {
            label: 'Prévia',
            fields: [
              {
                // Marca de que os dados oficiais iniciais (grade, taxas, endereço) já foram carregados uma vez
                name: 'dadosOficiaisEm',
                type: 'date',
                access: { create: () => false, update: () => false },
                admin: { hidden: true },
              },
              {
                // Marca de que os exemplos já foram carregados uma vez: a implantação nunca os recarrega
                name: 'demonstracaoCarregadaEm',
                type: 'date',
                access: { create: () => false, update: () => false },
                admin: { hidden: true },
              },
              {
                name: 'faixaDemonstracao',
                label: 'Mostrar a faixa "Versão de demonstração"',
                type: 'checkbox',
                defaultValue: false,
                admin: {
                  description:
                    'Ligue enquanto o site tiver dados de exemplo. Desligue antes de divulgar o site oficialmente.',
                },
              },
            ],
          },
        ],
      },
    ],
    hooks: HOOKS_GLOBAL,
  },
  'global',
)
