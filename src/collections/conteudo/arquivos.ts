/**
 * Tipos e tamanhos de arquivo aceitos (docs/ARQUITETURA.md §8 — Uploads).
 *
 * O Payload já recusa tipos fora de `upload.mimeTypes` (conferindo o conteúdo do arquivo, não só o nome).
 * Aqui conferimos ANTES de processar, com mensagens em português para leigos, e aplicamos o limite
 * de tamanho — inclusive no envio direto do navegador para o armazenamento (clientUploads), que não
 * passa pelo limite do servidor. `req.file.size` é sempre o tamanho original enviado.
 */
import { APIError, type CollectionBeforeOperationHook } from 'payload'

const MB = 1024 * 1024

export type GeneroArquivo = 'imagem' | 'video' | 'documento'

export const LIMITES_MB: Record<GeneroArquivo, number> = { imagem: 15, video: 60, documento: 25 }

export const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
export const TIPOS_VIDEO = ['video/mp4', 'video/webm'] as const
export const TIPOS_DOCUMENTO = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/csv',
  'application/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

/** Regras de cada coleção: tipo de arquivo → gênero (que define o limite) e a lista aceita, por extenso. */
export interface RegrasArquivo {
  generos: Record<string, GeneroArquivo>
  aceitos: string
}

export const REGRAS_MIDIA: RegrasArquivo = {
  generos: {
    ...Object.fromEntries(TIPOS_IMAGEM.map((t) => [t, 'imagem' as const])),
    ...Object.fromEntries(TIPOS_VIDEO.map((t) => [t, 'video' as const])),
  },
  aceitos: 'fotos em JPG, PNG, WebP ou AVIF, ou vídeos em MP4 ou WebM (SVG não é aceito, por segurança)',
}

export const REGRAS_DOCUMENTOS: RegrasArquivo = {
  generos: Object.fromEntries(TIPOS_DOCUMENTO.map((t) => [t, 'documento' as const])),
  aceitos: 'PDF, Word (.docx), Excel (.xlsx), CSV ou imagens JPG, PNG e WebP',
}

/** "18,3 MB" */
export const formatarMB = (bytes: number) =>
  `${(bytes / MB).toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: bytes < 10 * MB ? 1 : 0 })} MB`

const DICAS: Record<GeneroArquivo, string> = {
  imagem: 'Reduza a foto (por exemplo, exportando em qualidade um pouco menor) e envie de novo. O site já gera as versões menores sozinho.',
  video: 'Para vídeos maiores, publique no YouTube ou no Vimeo e use o campo "Vídeo externo".',
  documento: 'Comprima o arquivo (por exemplo, salvando o PDF em "tamanho reduzido") e envie de novo.',
}

const NOMES: Record<GeneroArquivo, string> = { imagem: 'A foto', video: 'O vídeo', documento: 'O arquivo' }

/**
 * Confere tipo e tamanho. Devolve a mensagem de erro (em português) ou null se estiver tudo certo.
 * Função pura (testada em tests/int/conteudo.int.spec.ts).
 */
export function conferirArquivo(
  arquivo: { mimetype?: string | null; size?: number | null },
  regras: RegrasArquivo,
): string | null {
  const tipo = (arquivo.mimetype ?? '').split(';')[0].trim().toLowerCase()
  const genero = regras.generos[tipo]
  if (!genero) return `Tipo de arquivo não aceito aqui. Envie ${regras.aceitos}.`
  const limite = LIMITES_MB[genero] * MB
  const tamanho = arquivo.size ?? 0
  if (tamanho > limite) {
    return `${NOMES[genero]} tem ${formatarMB(tamanho)} e o limite é ${LIMITES_MB[genero]} MB. ${DICAS[genero]}`
  }
  return null
}

/** beforeOperation: recusa o arquivo inválido antes de qualquer processamento (sharp, gravação). */
export const validarArquivoEnviado =
  (regras: RegrasArquivo): CollectionBeforeOperationHook =>
  ({ args, operation, req }) => {
    if (operation !== 'create' && operation !== 'update') return args
    const arquivo = req.file
    if (!arquivo) return args
    const erro = conferirArquivo(arquivo, regras)
    if (erro) throw new APIError(erro, 400, undefined, true)
    return args
  }
