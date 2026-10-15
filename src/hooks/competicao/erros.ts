/**
 * Mensagens de erro públicas (aparecem para quem usa o painel), sempre em português.
 */
import { APIError, ValidationError, type PayloadRequest } from 'payload'
import type { ErroLinha } from './resultados'

/** Recusa a operação com uma mensagem clara (400 = dado inválido, 403 = sem permissão, 409 = conflito). */
export function falhar(mensagem: string, status = 400): never {
  throw new APIError(mensagem, status, undefined, true)
}

/**
 * Recusa apontando o campo com problema no formulário (o painel mostra a mensagem ao lado do campo).
 * `caminho` segue o formato do Payload: "numero", "resultados.2.posicaoChegada".
 */
export function falharNoCampo(
  req: PayloadRequest,
  colecao: string,
  erros: Array<{ caminho: string; mensagem: string }>,
): never {
  throw new ValidationError(
    { collection: colecao, errors: erros.map((e) => ({ path: e.caminho, message: e.mensagem })), req },
    req.t,
  )
}

/** Erros das linhas de um array (ex.: resultados) apontados no formulário. */
export function falharNasLinhas(req: PayloadRequest, colecao: string, campoArray: string, erros: ErroLinha[]): never {
  falharNoCampo(
    req,
    colecao,
    erros.map((e) => ({ caminho: `${campoArray}.${e.indice}.${e.campo}`, mensagem: e.mensagem })),
  )
}

export const MENSAGEM_DESATIVAR =
  'Para tirar do site sem perder o histórico, use Desativar: em "No site", escolha Oculto ou Arquivado.'
