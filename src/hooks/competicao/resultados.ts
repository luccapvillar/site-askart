/**
 * Resultados de uma corrida (funções puras, testadas em tests/int/competicao.int.spec.ts).
 *
 * Aqui ficam as conferências de cada linha, com a mensagem apontando o campo no formulário.
 * A posição oficial é calculada pelo motor (calcularResultadoCorrida em src/lib/classificacao.ts),
 * para que painel, site e classificação usem exatamente a mesma conta.
 *
 * Regras (docs/ARQUITETURA.md §4, corridas):
 * - Cada inscrição aparece uma vez; posição de chegada não se repete; classificado precisa de chegada.
 * - Desclassificado e "não largou" nunca têm posição oficial.
 * - A posição oficial pode ser corrigida à mão com "Ajustar posição oficial" + motivo; as demais
 *   linhas ocupam as posições que sobrarem, e o resultado final é único e contínuo (1, 2, 3… N).
 */
import type { ID } from './util'
import { idDe } from './util'
import { temNoMaximoUmaCasa } from './validacoes'

export type StatusResultado = 'classificado' | 'nao-classificado' | 'abandono' | 'desclassificado' | 'nao-largou'
export type TipoPenalidade = 'tempo' | 'posicoes' | 'pontos' | 'advertencia'

export interface LinhaResultado {
  id?: string | null
  inscricao?: ID | { id: ID } | null
  posicaoChegada?: number | null
  status?: StatusResultado | null
  voltas?: number | null
  melhorVoltaMs?: number | null
  penalidade?: { tipo?: TipoPenalidade | null; valor?: number | null; motivo?: string | null } | null
  ajustarPosicao?: boolean | null
  posicaoOficial?: number | null
  pontosManuais?: number | null
  motivoAjuste?: string | null
  observacao?: string | null
  [outro: string]: unknown
}

export interface ErroLinha {
  /** Índice da linha (0 = primeira) */
  indice: number
  /** Campo dentro da linha (para apontar o erro no formulário) */
  campo: string
  mensagem: string
}

/** Status que nunca têm posição oficial. */
export const STATUS_SEM_POSICAO: StatusResultado[] = ['desclassificado', 'nao-largou']

const inteiro = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)
const preenchido = (v: unknown) => v !== null && v !== undefined && v !== ''

/** Confere as linhas e normaliza (status padrão, posição manual só onde faz sentido). */
export function validarResultados(entrada: LinhaResultado[] | null | undefined): {
  linhas: LinhaResultado[]
  erros: ErroLinha[]
} {
  const erros: ErroLinha[] = []
  const linhas: LinhaResultado[] = (entrada ?? []).map((l) => ({ ...l, status: l.status || 'classificado' }))
  const erro = (indice: number, campo: string, mensagem: string) => erros.push({ indice, campo, mensagem })

  const porInscricao = new Map<string, number>()
  const porChegada = new Map<number, number>()
  const porPosicaoManual = new Map<number, number>()

  linhas.forEach((linha, i) => {
    const inscricao = idDe(linha.inscricao)
    if (inscricao === null) {
      erro(i, 'inscricao', 'Escolha o piloto (inscrição) desta linha.')
    } else if (porInscricao.has(String(inscricao))) {
      erro(i, 'inscricao', `Este piloto já aparece na linha ${porInscricao.get(String(inscricao))! + 1}.`)
    } else {
      porInscricao.set(String(inscricao), i)
    }

    if (preenchido(linha.posicaoChegada)) {
      const p = linha.posicaoChegada as number
      if (!inteiro(p) || p < 1) erro(i, 'posicaoChegada', 'A posição de chegada deve ser um número inteiro a partir de 1.')
      else if (porChegada.has(p)) erro(i, 'posicaoChegada', `A posição de chegada ${p} já está na linha ${porChegada.get(p)! + 1}.`)
      else porChegada.set(p, i)
    } else if (linha.status === 'classificado' && !linha.ajustarPosicao) {
      erro(i, 'posicaoChegada', 'Informe a posição de chegada (ou mude o status).')
    }

    if (preenchido(linha.voltas) && (!inteiro(linha.voltas) || (linha.voltas as number) < 0)) {
      erro(i, 'voltas', 'Voltas deve ser um número inteiro (0 ou mais).')
    }
    if (preenchido(linha.melhorVoltaMs) && (!inteiro(linha.melhorVoltaMs) || (linha.melhorVoltaMs as number) <= 0)) {
      erro(i, 'melhorVoltaMs', 'Informe a melhor volta em milissegundos (ex.: 1min02s345 = 62345).')
    }

    const pen = linha.penalidade
    if (pen?.tipo) {
      if (pen.tipo !== 'advertencia') {
        const valor = pen.valor
        if (!preenchido(valor) || (valor as number) <= 0) {
          erro(i, 'penalidade.valor', 'Informe o valor da penalidade (maior que zero).')
        } else if (pen.tipo === 'posicoes' && !inteiro(valor)) {
          erro(i, 'penalidade.valor', 'Penalidade em posições deve ser um número inteiro.')
        } else if (pen.tipo === 'pontos' && !temNoMaximoUmaCasa(valor as number)) {
          erro(i, 'penalidade.valor', 'Pontos aceitam no máximo uma casa decimal (ex.: 2,5).')
        }
      }
      if (!pen.motivo?.trim()) erro(i, 'penalidade.motivo', 'Informe o motivo da penalidade.')
    }

    if (preenchido(linha.pontosManuais)) {
      if (!temNoMaximoUmaCasa(linha.pontosManuais as number)) {
        erro(i, 'pontosManuais', 'Pontos aceitam no máximo uma casa decimal (ex.: 12,5).')
      }
      if (!linha.motivoAjuste?.trim()) erro(i, 'motivoAjuste', 'Informe o motivo dos pontos manuais.')
    }

    if (STATUS_SEM_POSICAO.includes(linha.status as StatusResultado)) {
      // Desclassificado / não largou: sem posição oficial
      linha.ajustarPosicao = false
      linha.posicaoOficial = null
    } else if (linha.ajustarPosicao) {
      const p = linha.posicaoOficial
      if (!inteiro(p) || p < 1) {
        erro(i, 'posicaoOficial', 'Informe a posição oficial (número inteiro a partir de 1).')
      } else if (porPosicaoManual.has(p)) {
        erro(i, 'posicaoOficial', `A posição oficial ${p} já foi definida à mão na linha ${porPosicaoManual.get(p)! + 1}.`)
      } else {
        porPosicaoManual.set(p, i)
      }
      if (!linha.motivoAjuste?.trim()) erro(i, 'motivoAjuste', 'Informe o motivo do ajuste da posição oficial.')
    }
  })

  return { linhas, erros }
}

/**
 * Grava nas linhas as posições oficiais calculadas pelo motor (por índice da linha) e confere se as
 * correções manuais ficaram onde foram digitadas (o motor encaixa quem passou do total no fim).
 */
export function aplicarPosicoesOficiais(
  linhas: LinhaResultado[],
  calculadas: Array<{ indice: number; posicaoOficial: number | null }>,
): ErroLinha[] {
  const erros: ErroLinha[] = []
  const porIndice = new Map(calculadas.map((c) => [c.indice, c.posicaoOficial] as const))
  const total = calculadas.filter((c) => c.posicaoOficial !== null).length
  linhas.forEach((linha, i) => {
    const calculada = porIndice.get(i) ?? null
    if (linha.ajustarPosicao && linha.posicaoOficial !== calculada) {
      erros.push({
        indice: i,
        campo: 'posicaoOficial',
        mensagem: `Posição oficial ${linha.posicaoOficial} inválida: nesta corrida há ${total} piloto(s) com posição.`,
      })
      return
    }
    linha.posicaoOficial = calculada
  })
  return erros
}
