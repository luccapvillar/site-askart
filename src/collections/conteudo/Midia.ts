import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook, CollectionConfig, DefaultValue, FieldAccess } from 'payload'
import { campoSomenteMembros, comAcessoRestrito, editores, membros, todos } from '../../access'
import { REGRAS_MIDIA, TIPOS_IMAGEM, TIPOS_VIDEO, validarArquivoEnviado } from './arquivos'
import { editarPropriaMidia } from './acesso'
import { GRUPO_CONTEUDO, REL, SO_IMAGENS } from './comum'
import { bloquearExclusaoEmUso } from './hooks'

const ehImagem = (mimeType: unknown) => typeof mimeType === 'string' && mimeType.startsWith('image/')
const ehVideo = (mimeType: unknown) => typeof mimeType === 'string' && mimeType.startsWith('video/')

/** Campos preenchidos só pelo sistema. */
const ninguemDigita: FieldAccess = () => false

/** Versões geradas em WebP (leves); a de compartilhamento fica em JPEG, aceito por todas as redes sociais. */
const webp = { format: 'webp' as const, options: { quality: 80 } }

/** Texto alternativo vazio usa a legenda; o título (para listas e seletores) vem do que houver. */
const prepararTextos: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data
  for (const campo of ['alt', 'legenda', 'credito'] as const) {
    if (typeof data[campo] === 'string') data[campo] = data[campo].trim()
  }
  const mimeType = data.mimeType ?? originalDoc?.mimeType
  const legenda = data.legenda ?? originalDoc?.legenda
  if (ehImagem(mimeType) && !data.alt && typeof legenda === 'string' && legenda) data.alt = legenda.slice(0, 200)
  return data
}

const prepararRegistro: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  if (!data) return data
  if (operation === 'create' && req.user) data.enviadoPor = req.user.id
  const alt = data.alt ?? originalDoc?.alt
  const legenda = data.legenda ?? originalDoc?.legenda
  const arquivo = data.filename ?? originalDoc?.filename
  data.titulo = (alt || legenda || arquivo || null) as string | null
  return data
}

/**
 * Crédito padrão: o último crédito que esta pessoa usou (economiza digitação ao enviar as fotos de
 * um mesmo fotógrafo). Aparece preenchido no formulário e pode ser trocado.
 */
const ultimoCreditoUsado: DefaultValue = async ({ req, user }) => {
  if (!user) return ''
  try {
    const { docs } = await req.payload.find({
      collection: REL.midia,
      where: { and: [{ enviadoPor: { equals: user.id } }, { credito: { exists: true } }, { credito: { not_equals: '' } }] },
      sort: '-createdAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const credito = (docs[0] as { credito?: string | null } | undefined)?.credito
    return credito ?? ''
  } catch {
    return ''
  }
}

/**
 * Fotos e vídeos do site. Uma foto é enviada uma vez e usada em qualquer lugar (notícias, galerias,
 * banners, pilotos…). Trocar o arquivo de uma foto atualiza todos esses lugares de uma vez.
 */
export const Midia: CollectionConfig = comAcessoRestrito({
  slug: 'midia',
  labels: { singular: 'Foto ou vídeo', plural: 'Fotos e vídeos' },
  folders: true,
  defaultSort: '-createdAt',
  admin: {
    group: GRUPO_CONTEUDO,
    useAsTitle: 'titulo',
    defaultColumns: ['filename', 'alt', 'credito', 'pilotosMarcados', 'createdAt'],
    listSearchableFields: ['titulo', 'alt', 'legenda', 'credito', 'filename'],
    description:
      'Envie várias fotos de uma vez arrastando-as para cá. Para trocar uma foto em todo o site, abra-a e envie o novo arquivo: os lugares que a usam se atualizam sozinhos. Use pastas para organizar por temporada ou etapa.',
  },
  access: {
    // Arquivos de imagem/vídeo são públicos (o que aparece no site precisa ser baixado pelo navegador)
    read: todos,
    create: membros,
    update: editarPropriaMidia,
    delete: editores,
  },
  upload: {
    mimeTypes: [...TIPOS_IMAGEM, ...TIPOS_VIDEO],
    focalPoint: true,
    crop: true,
    displayPreview: true,
    bulkUpload: true,
    adminThumbnail: 'miniatura',
    // O original é reduzido para no máximo 2560 px e regravado sem metadados (remove o GPS das fotos de celular)
    resizeOptions: { width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true },
    imageSizes: [
      { name: 'miniatura', width: 400, withoutEnlargement: true, formatOptions: webp },
      { name: 'card', width: 800, withoutEnlargement: true, formatOptions: webp },
      { name: 'destaque', width: 1600, withoutEnlargement: true, formatOptions: webp },
      {
        // Imagem de compartilhamento (WhatsApp, Facebook…): recorte 1200×630 respeitando o ponto focal
        name: 'compartilhamento',
        width: 1200,
        height: 630,
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: false,
        formatOptions: { format: 'jpeg', options: { quality: 82, progressive: true } },
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      label: 'Descrição da imagem',
      type: 'text',
      maxLength: 200,
      validate: (valor, { data }) => {
        const mimeType = (data as { mimeType?: string } | undefined)?.mimeType
        if (ehImagem(mimeType) && !(typeof valor === 'string' && valor.trim())) {
          return 'Descreva a imagem em poucas palavras (é lida por pessoas cegas e pelo Google).'
        }
        return true
      },
      admin: {
        description:
          'Obrigatório para fotos. Diga o que aparece na imagem, em poucas palavras. Ex.: "Karts no grid de largada". Se ficar vazio, usamos a legenda.',
      },
    },
    {
      name: 'legenda',
      label: 'Legenda',
      type: 'textarea',
      maxLength: 500,
      admin: { description: 'Opcional. Texto mostrado junto da foto no site.' },
    },
    {
      name: 'credito',
      label: 'Crédito (autor da foto ou do vídeo)',
      type: 'text',
      maxLength: 120,
      defaultValue: ultimoCreditoUsado,
      admin: { description: 'Opcional. Vem preenchido com o último crédito que você usou: confira antes de salvar.' },
    },
    {
      name: 'pilotosMarcados',
      label: 'Pilotos nesta foto',
      type: 'relationship',
      relationTo: REL.pilotos,
      hasMany: true,
      admin: { description: 'Opcional. As fotos marcadas aparecem na página do piloto.' },
    },
    {
      name: 'capaDoVideo',
      label: 'Imagem de capa do vídeo',
      type: 'upload',
      relationTo: REL.midia,
      filterOptions: SO_IMAGENS,
      admin: {
        condition: (data) => ehVideo(data?.mimeType),
        description:
          'Recomendado. Mostrada antes do vídeo carregar, no celular com internet lenta e para quem prefere menos movimento na tela.',
      },
    },
    {
      // Título para listas e seletores (descrição, legenda ou nome do arquivo)
      name: 'titulo',
      label: 'Título',
      type: 'text',
      access: { create: ninguemDigita, update: ninguemDigita },
      admin: { hidden: true, disableBulkEdit: true },
    },
    {
      name: 'enviadoPor',
      label: 'Enviado por',
      type: 'relationship',
      relationTo: REL.usuarios,
      // Preenchido automaticamente; o público não vê quem enviou
      access: { read: campoSomenteMembros, create: ninguemDigita, update: ninguemDigita },
      admin: { position: 'sidebar', readOnly: true, disableBulkEdit: true },
    },
  ],
  hooks: {
    beforeOperation: [validarArquivoEnviado(REGRAS_MIDIA)],
    beforeValidate: [prepararTextos],
    beforeChange: [prepararRegistro],
    beforeDelete: [
      bloquearExclusaoEmUso({
        alvo: REL.midia,
        oQue: 'esta foto/vídeo',
        dica: 'Troque-a nesses lugares antes ou, para pôr outra imagem em todos eles de uma vez, abra-a e envie um novo arquivo.',
      }),
    ],
  },
})
