import type { Field, GlobalConfig } from 'payload'
import { comAcessoRestrito, editores, membros, todos } from '../access'
import { campoImagem, campoUrl, GRUPO_SITE, HISTORICO_GLOBAL, HOOKS_GLOBAL } from './comum'

/**
 * Único número fictício autorizado para a versão de demonstração (pedido do cliente). Fica marcado
 * como provisório sozinho: o site mostra o aviso e não cria link de ligação/WhatsApp para ele.
 */
export const NUMERO_PROVISORIO = '5561000000000'

const soDigitos = (texto: unknown) => (typeof texto === 'string' ? texto.replace(/\D/g, '') : '')

export function ehNumeroProvisorio(valor: unknown): boolean {
  const digitos = soDigitos(valor)
  return digitos === NUMERO_PROVISORIO || digitos === NUMERO_PROVISORIO.slice(2)
}

export const LOCAIS_CANAL = [
  { label: 'Rodapé', value: 'rodape' },
  { label: 'Página de contato', value: 'contato' },
  { label: 'Aba Kartódromo', value: 'kartodromo' },
  { label: 'Aba BKS', value: 'bks' },
] as const

const canais: Field = {
  name: 'canais',
  label: 'Telefones, WhatsApp e e-mails',
  labels: { singular: 'Canal', plural: 'Canais' },
  type: 'array',
  admin: {
    initCollapsed: true,
    components: { RowLabel: '/components/admin/RotuloCanal#RotuloCanal' },
    description: 'Arraste para mudar a ordem. O primeiro de cada tipo é o principal.',
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'tipo',
          label: 'Tipo',
          type: 'select',
          required: true,
          defaultValue: 'whatsapp',
          options: [
            { label: 'WhatsApp', value: 'whatsapp' },
            { label: 'Telefone', value: 'telefone' },
            { label: 'E-mail', value: 'email' },
            { label: 'Outro', value: 'outro' },
          ],
          admin: { width: '25%' },
        },
        {
          name: 'rotulo',
          label: 'Setor ou nome',
          type: 'text',
          maxLength: 60,
          admin: { width: '35%', placeholder: 'Ex.: Secretaria, Kartódromo, Direção de prova' },
        },
        {
          name: 'valor',
          label: 'Número ou e-mail',
          type: 'text',
          required: true,
          admin: { width: '40%', placeholder: '+55 61 …  ou  nome@exemplo.com.br' },
          validate: (valor: unknown, { siblingData }: { siblingData: unknown }) => {
            const tipo = (siblingData as { tipo?: string } | undefined)?.tipo
            const texto = typeof valor === 'string' ? valor.trim() : ''
            if (!texto) return 'Informe o número ou e-mail.'
            if (tipo === 'email') {
              return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto) ? true : 'Confira o e-mail (ex.: contato@exemplo.com.br).'
            }
            if (tipo === 'telefone' || tipo === 'whatsapp') {
              const digitos = soDigitos(texto)
              return digitos.length >= 10 && digitos.length <= 13
                ? true
                : 'Confira o número: DDD e telefone, com ou sem +55 (ex.: +55 61 99999-9999).'
            }
            return true
          },
        },
      ],
    },
    {
      name: 'observacao',
      label: 'Observação',
      type: 'text',
      maxLength: 120,
      admin: { placeholder: 'Ex.: atendimento de segunda a sexta, das 9h às 18h' },
    },
    {
      name: 'exibirEm',
      label: 'Mostrar em',
      type: 'select',
      hasMany: true,
      defaultValue: ['rodape', 'contato', 'kartodromo'],
      options: [...LOCAIS_CANAL],
    },
    {
      name: 'provisorio',
      label: 'Contato provisório (demonstração)',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
        description:
          'Marcado sozinho para +55 61 00000-0000, o número fictício desta versão de demonstração. O site mostra o aviso "provisório" e não cria link para ele. Troque pelo contato oficial antes de divulgar o site.',
      },
      hooks: {
        beforeChange: [({ siblingData }) => ehNumeroProvisorio(siblingData?.valor)],
      },
    },
  ],
}

/** Contatos, endereço, horário, mapa e redes sociais. O moderador atualiza. */
export const Contato: GlobalConfig = comAcessoRestrito(
  {
    slug: 'contato',
    label: 'Contato e redes sociais',
    versions: HISTORICO_GLOBAL,
    admin: {
      group: GRUPO_SITE,
      description: 'Telefones, WhatsApp, e-mails, endereço, horário de atendimento, mapa e redes sociais.',
    },
    access: { read: todos, update: editores, readVersions: membros },
    fields: [
      canais,
      {
        name: 'endereco',
        label: 'Endereço',
        type: 'group',
        fields: [
          {
            name: 'texto',
            label: 'Endereço completo',
            type: 'textarea',
            maxLength: 300,
            admin: { description: 'Como deve aparecer no site (rua, número, bairro, cidade/UF, CEP).' },
          },
          campoUrl('linkMapa', 'Link do mapa', 'Cole o link "Compartilhar" do Google Maps. O site mostra o botão "Ver no mapa".'),
          campoImagem('imagemMapa', 'Imagem do local', 'Opcional. Foto aérea ou mapa estático mostrado ao lado do endereço.'),
        ],
      },
      {
        name: 'horarios',
        label: 'Horário de atendimento',
        labels: { singular: 'Horário', plural: 'Horários' },
        type: 'array',
        fields: [
          {
            type: 'row',
            fields: [
              { name: 'dias', label: 'Dias', type: 'text', required: true, admin: { width: '50%', placeholder: 'Ex.: Segunda a sexta' } },
              { name: 'horario', label: 'Horário', type: 'text', required: true, admin: { width: '50%', placeholder: 'Ex.: 9h às 18h' } },
            ],
          },
        ],
      },
      {
        name: 'redes',
        label: 'Redes sociais',
        labels: { singular: 'Rede', plural: 'Redes' },
        type: 'array',
        fields: [
          {
            type: 'row',
            fields: [
              {
                name: 'rede',
                label: 'Rede',
                type: 'select',
                required: true,
                defaultValue: 'instagram',
                options: [
                  { label: 'Instagram', value: 'instagram' },
                  { label: 'YouTube', value: 'youtube' },
                  { label: 'Facebook', value: 'facebook' },
                  { label: 'TikTok', value: 'tiktok' },
                  { label: 'X (Twitter)', value: 'x' },
                  { label: 'Outra', value: 'outra' },
                ],
                admin: { width: '25%' },
              },
              { name: 'usuario', label: 'Nome na rede', type: 'text', admin: { width: '30%', placeholder: '@perfil' } },
              {
                ...campoUrl('url', 'Endereço do perfil', undefined, true),
                admin: { width: '45%', placeholder: 'https://instagram.com/…' },
              } as Field,
            ],
          },
          {
            name: 'referente',
            label: 'Perfil de',
            type: 'select',
            defaultValue: 'askart',
            options: [
              { label: 'ASKART / kartódromo', value: 'askart' },
              { label: 'BKS — Brasília Kart Series', value: 'bks' },
            ],
          },
        ],
      },
    ],
    hooks: HOOKS_GLOBAL,
  },
  'global',
)
