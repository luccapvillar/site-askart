/**
 * Regras puras da frente Competição (src/hooks/competicao) — sem banco.
 * Nomes e números abaixo são dados de TESTE, não dados oficiais da ASKART.
 */
import { describe, expect, it } from 'vitest'
import {
  categoriasDoGrupo,
  conferirAjustes,
  conferirLinhasManuais,
  rotuloDestaqueValido,
} from '@/hooks/competicao/classificacoes'
import { categoriasPermitidas, conferirInscricoesDasLinhas } from '@/hooks/competicao/corridas'
import { nomeDeCopia } from '@/hooks/competicao/endpoints'
import { corridaTemResultado, ehNomeAutomatico, fimAntesDoInicio } from '@/hooks/competicao/etapas'
import { conflitoDeNumero } from '@/hooks/competicao/inscricoes'
import { aplicarPosicoesOficiais, validarResultados, type LinhaResultado } from '@/hooks/competicao/resultados'
import {
  nomeEtapaPadrao,
  nomeProximaTemporada,
  normalizarBusca,
  rotuloCurtoTemporada,
  tituloClassificacao,
  tituloCorrida,
  tituloEtapa,
  tituloInscricao,
} from '@/hooks/competicao/texto'
import { camposAlterados, idDaRota, idDe, idsDe, mesmoId, mudouAlgum, semIdsDeLinha } from '@/hooks/competicao/util'
import {
  chaveCorrida,
  criteriosRepetidos,
  encontrarTabela,
  planejarCorridas,
  pontosDoAjuste,
  statusEtapaAutomatico,
  temNoMaximoUmaCasa,
  validarCorHex,
  validarFator,
  validarInteiro,
  validarPontos,
  validarUrl,
} from '@/hooks/competicao/validacoes'
import { calcularResultadoCorrida } from '@/lib/classificacao'
import { paraCorrida } from '@/lib/carregar-competicao'

describe('util', () => {
  it('extrai ids de relacionamentos (id puro, documento populado ou vazio)', () => {
    expect(idDe(3)).toBe(3)
    expect(idDe('abc')).toBe('abc')
    expect(idDe({ id: 7, nome: 'x' })).toBe(7)
    expect(idDe(null)).toBeNull()
    expect(idDe('')).toBeNull()
    expect(idsDe([1, { id: 2 }, 1, null, '3'])).toEqual([1, 2, '3'])
    expect(mesmoId('12', 12)).toBe(true)
    expect(mesmoId(null, null)).toBe(false)
  })

  it('compara campos alterados ignorando formato de id, datas ISO e listas vazias', () => {
    const antigo = { categorias: [1, 2], inicio: '2026-05-10T13:00:00.000Z', nome: 'A', descricao: null }
    const novo = { categorias: [{ id: 1, createdAt: 'x' }, '2'], inicio: '2026-05-10T13:00:00Z', nome: 'A', descricao: [] }
    expect(camposAlterados(novo, antigo)).toEqual([])
    expect(camposAlterados({ ...novo, nome: 'B' }, antigo)).toEqual(['nome'])
    expect(camposAlterados({ ...novo, nome: 'B' }, antigo, ['nome'])).toEqual([])
    expect(mudouAlgum({ status: 'oficial' }, { status: 'rascunho' }, ['status'])).toBe(true)
    expect(mudouAlgum({ status: 'oficial' }, undefined, ['status'])).toBe(true)
  })

  it('valida ids vindos da URL', () => {
    expect(idDaRota('15')).toBe(15)
    expect(idDaRota(' 15 ')).toBe(15)
    expect(idDaRota('0')).toBeNull()
    expect(idDaRota('1; drop table')).toBeNull()
    expect(idDaRota('../x')).toBeNull()
    expect(idDaRota('3f2b8c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f')).toBe('3f2b8c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f')
  })

  it('copia linhas de listas sem os ids (inclusive listas aninhadas)', () => {
    const copia = semIdsDeLinha([{ id: 'a', nome: 'T', sub: [{ id: 'b', v: 1 }] }])
    expect(copia).toEqual([{ nome: 'T', sub: [{ v: 1 }] }])
  })
})

describe('texto', () => {
  it('normaliza a busca sem acento e em minúsculas', () => {
    expect(normalizarBusca('João  da Silva', 33, null, 'Guará')).toBe('joao da silva 33 guara')
  })

  it('monta os títulos calculados', () => {
    expect(nomeEtapaPadrao(3)).toBe('3ª Etapa')
    // 10/05/2026 às 10h em Brasília = 13h UTC (um domingo)
    expect(tituloEtapa({ ano: 2026, numero: 3, inicio: '2026-05-10T13:00:00.000Z' })).toBe('2026 · 3ª Etapa · dom 10/05')
    // 23h30 de sábado em Brasília continua sábado (02h30 UTC de domingo)
    expect(tituloEtapa({ ano: 2026, nome: 'Abertura', inicio: '2026-05-10T02:30:00.000Z' })).toBe('2026 · Abertura · sáb 09/05')
    expect(tituloCorrida({ ano: 2026, etapa: '3ª Etapa', categorias: ['Cat A', 'Cat B'], nome: 'Final' })).toBe(
      '2026 · 3ª Etapa · Cat A + Cat B · Final',
    )
    expect(tituloInscricao({ numero: 33, piloto: 'Piloto Teste', categoria: 'Cat A', temporada: 'CT 2026' })).toBe(
      '#33 Piloto Teste · Cat A · CT 2026',
    )
    expect(tituloClassificacao({ categoria: 'Cat A', temporada: 'Campeonato Teste — 2026' })).toBe('Cat A · Campeonato Teste — 2026')
    expect(rotuloCurtoTemporada({ sigla: 'CT', ano: 2026 })).toBe('CT 2026')
  })

  it('sugere o nome da temporada seguinte', () => {
    expect(nomeProximaTemporada('Campeonato Teste — 2026', 2026, 2027, 'Campeonato Teste')).toBe('Campeonato Teste — 2027')
    expect(nomeProximaTemporada('Edição especial', 2026, 2027, 'Campeonato Teste')).toBe('Campeonato Teste — 2027')
  })
})

describe('validações de campos', () => {
  it('pontos com no máximo uma casa decimal', () => {
    expect(temNoMaximoUmaCasa(12.5)).toBe(true)
    expect(temNoMaximoUmaCasa(0.1 + 0.2)).toBe(true)
    expect(temNoMaximoUmaCasa(12.25)).toBe(false)
    expect(validarPontos()([25, 18, 15])).toBe(true)
    expect(validarPontos()(-1)).not.toBe(true)
    expect(validarPontos({ negativos: true })(-2.5)).toBe(true)
    expect(validarPontos()(1.25)).not.toBe(true)
  })

  it('fator, inteiros, cores e links', () => {
    expect(validarFator(2)).toBe(true)
    expect(validarFator(0)).not.toBe(true)
    expect(validarFator(0.333)).not.toBe(true)
    expect(validarInteiro(1, 99)(3)).toBe(true)
    expect(validarInteiro(1, 99)(3.5)).not.toBe(true)
    expect(validarCorHex('#1A7F37')).toBe(true)
    expect(validarCorHex('#1A7F3')).not.toBe(true)
    expect(validarCorHex('red; background:url(x)')).not.toBe(true)
    expect(validarUrl('https://maps.google.com/?q=x')).toBe(true)
    expect(validarUrl('javascript:alert(1)')).not.toBe(true)
    expect(validarUrl('www.exemplo.com')).not.toBe(true)
    expect(validarUrl('')).toBe(true)
  })

  it('tabelas e critérios de desempate', () => {
    expect(encontrarTabela('final', [{ nome: 'Bateria' }, { nome: 'Final' }])).toBe('Final')
    expect(encontrarTabela('Prova', [{ nome: 'Final' }])).toBeNull()
    expect(criteriosRepetidos([{ criterio: 'mais-vitorias' }, { criterio: 'mais-poles' }, { criterio: 'mais-vitorias' }])).toEqual([
      'mais-vitorias',
    ])
  })

  it('sinal dos ajustes de pontos', () => {
    expect(pontosDoAjuste('penalidade', 5)).toBe(-5)
    expect(pontosDoAjuste('bonificacao', -3)).toBe(3)
    expect(pontosDoAjuste('correcao', -2.5)).toBe(-2.5)
  })
})

describe('etapas', () => {
  it('vira "realizada" quando todas as corridas que contam estão oficiais', () => {
    expect(statusEtapaAutomatico('confirmada', [{ status: 'oficial' }, { status: 'oficial', contaParaClassificacao: true }])).toBe('realizada')
    // Corrida que não conta e corrida cancelada não seguram a etapa
    expect(
      statusEtapaAutomatico('agendada', [{ status: 'oficial' }, { status: 'rascunho', contaParaClassificacao: false }, { status: 'cancelada' }]),
    ).toBe('realizada')
    expect(statusEtapaAutomatico('confirmada', [{ status: 'oficial' }, { status: 'rascunho' }])).toBeNull()
    expect(statusEtapaAutomatico('realizada', [{ status: 'rascunho' }])).toBe('confirmada')
    expect(statusEtapaAutomatico('cancelada', [{ status: 'oficial' }])).toBeNull()
    expect(statusEtapaAutomatico('agendada', [])).toBeNull()
  })

  it('nome automático acompanha o número; datas e resultados', () => {
    expect(ehNomeAutomatico('3ª Etapa')).toBe(true)
    expect(ehNomeAutomatico('')).toBe(true)
    expect(ehNomeAutomatico('Etapa de abertura')).toBe(false)
    expect(fimAntesDoInicio('2026-05-10T13:00:00Z', '2026-05-10T12:00:00Z')).toBe(true)
    expect(fimAntesDoInicio('2026-05-10T13:00:00Z', null)).toBe(false)
    expect(corridaTemResultado({ status: 'rascunho', resultados: [] })).toBe(false)
    expect(corridaTemResultado({ status: 'rascunho', resultados: [{ inscricao: 1 }] })).toBe(true)
    expect(corridaTemResultado({ status: 'oficial', resultados: [] })).toBe(true)
  })

  it('"Gerar corridas" cria formato × categorias sem repetir as existentes', () => {
    const formato = [
      { nome: 'Tomada de tempo', tipo: 'tomada-de-tempo' as const, contaParaClassificacao: false },
      { nome: 'Final', tipo: 'final' as const, tabela: 'Final', fator: 2 },
      { nome: '  ' },
    ]
    const existentes = new Set([chaveCorrida(10, [1], 'final')])
    const { criar, jaExistiam } = planejarCorridas(10, formato, [1, 2], existentes)
    expect(jaExistiam).toBe(1)
    expect(criar.map((c) => `${c.categorias[0]}:${c.nome}`)).toEqual(['1:Tomada de tempo', '2:Tomada de tempo', '2:Final'])
    expect(criar[0]).toMatchObject({ contaParaClassificacao: false, fator: 1, status: 'rascunho', tipo: 'tomada-de-tempo' })
    expect(criar[2]).toMatchObject({ tabela: 'Final', fator: 2 })
    // Rodar de novo com as criadas não cria nada
    const todas = new Set([...existentes, ...criar.map((c) => c.chaveUnica)])
    expect(planejarCorridas(10, formato, [1, 2], todas).criar).toHaveLength(0)
  })

  it('chave única da corrida ignora ordem das categorias, acentos e caixa', () => {
    expect(chaveCorrida(5, [2, 1], 'Pré-Final')).toBe(chaveCorrida('5', [{ id: 1 }, '2'], 'pre-final'))
  })
})

describe('corridas e resultados', () => {
  const linha = (inscricao: number, extra: Partial<LinhaResultado> = {}): LinhaResultado => ({
    inscricao,
    posicaoChegada: inscricao,
    ...extra,
  })

  it('aponta inscrição repetida, chegada repetida e penalidade sem motivo', () => {
    const { erros } = validarResultados([
      linha(1),
      linha(2, { posicaoChegada: 1 }),
      linha(1, { posicaoChegada: 3 }),
      linha(4, { penalidade: { tipo: 'tempo', valor: 5 } }),
      linha(5, { posicaoChegada: null }),
      linha(6, { pontosManuais: 3 }),
    ])
    const porCampo = erros.map((e) => `${e.indice}:${e.campo}`)
    expect(porCampo).toContain('1:posicaoChegada')
    expect(porCampo).toContain('2:inscricao')
    expect(porCampo).toContain('3:penalidade.motivo')
    expect(porCampo).toContain('4:posicaoChegada')
    expect(porCampo).toContain('5:motivoAjuste')
  })

  it('desclassificado e "não largou" ficam sem posição oficial', () => {
    const { linhas, erros } = validarResultados([
      linha(1, { status: 'desclassificado', ajustarPosicao: true, posicaoOficial: 1, motivoAjuste: 'x' }),
      linha(2, { status: 'nao-largou', posicaoChegada: null }),
    ])
    expect(erros).toEqual([])
    expect(linhas[0]).toMatchObject({ ajustarPosicao: false, posicaoOficial: null })
  })

  it('posições oficiais calculadas pelo motor ficam únicas e contínuas', () => {
    const { linhas } = validarResultados([
      linha(1, { posicaoChegada: 2 }),
      linha(2, { posicaoChegada: 1, penalidade: { tipo: 'posicoes', valor: 2, motivo: 'Teste' } }),
      linha(3, { posicaoChegada: 3 }),
      linha(4, { status: 'desclassificado', posicaoChegada: 4 }),
    ])
    const calculo = calcularResultadoCorrida(
      paraCorrida({ id: 'c', etapa: 'e', status: 'rascunho', resultados: linhas }),
      {},
      {},
    )
    const erros = aplicarPosicoesOficiais(
      linhas,
      calculo.linhas.map((l) => ({ indice: l.indice, posicaoOficial: l.posicaoOficial })),
    )
    expect(erros).toEqual([])
    expect(linhas.map((l) => l.posicaoOficial)).toEqual([1, 3, 2, null])
  })

  it('posição oficial ajustada à mão fora do total é recusada', () => {
    const { linhas } = validarResultados([
      linha(1),
      linha(2, { ajustarPosicao: true, posicaoOficial: 9, motivoAjuste: 'Decisão' }),
    ])
    const calculo = calcularResultadoCorrida(paraCorrida({ id: 'c', etapa: 'e', status: 'rascunho', resultados: linhas }), {}, {})
    const erros = aplicarPosicoesOficiais(linhas, calculo.linhas.map((l) => ({ indice: l.indice, posicaoOficial: l.posicaoOficial })))
    expect(erros.map((e) => `${e.indice}:${e.campo}`)).toEqual(['1:posicaoOficial'])
  })

  it('inscrições das linhas: mesma temporada e categoria da corrida', () => {
    const inscricoes = new Map([
      ['1', { temporada: 10, categoria: 1 }],
      ['2', { temporada: 11, categoria: 1 }],
      ['3', { temporada: 10, categoria: 2 }],
    ])
    const erros = conferirInscricoesDasLinhas([linha(1), linha(2), linha(3), linha(4)], inscricoes, 10, [1])
    expect(erros.map((e) => e.indice)).toEqual([1, 2, 3])
  })

  it('categorias permitidas: as da etapa ou, se vazias, as da temporada', () => {
    expect(categoriasPermitidas({ categorias: [1] }, { categorias: [1, 2] })).toEqual([1])
    expect(categoriasPermitidas({ categorias: [] }, { categorias: [1, 2] })).toEqual([1, 2])
  })
})

describe('inscrições e classificações', () => {
  it('número único só entre as inscrições ativas', () => {
    const outras = [
      { id: 1, numero: 33, status: 'desistente' },
      { id: 2, numero: 7, status: 'ativa' },
    ]
    expect(conflitoDeNumero(33, null, outras)).toBeNull()
    expect(conflitoDeNumero(7, null, outras)?.id).toBe(2)
    expect(conflitoDeNumero(7, 2, outras)).toBeNull()
    expect(conflitoDeNumero(null, null, outras)).toBeNull()
  })

  it('grupo de categorias da classificação e ajustes', () => {
    expect(categoriasDoGrupo({ categoria: 1, incluiResultadosDe: [2, 1, 3] })).toEqual([1, 2, 3])
    const erros = conferirAjustes(
      [
        { inscricao: 1, tipo: 'penalidade', pontos: 5, motivo: 'Teste' },
        { inscricao: 9, tipo: 'bonificacao', pontos: 2, motivo: 'Teste' },
        { inscricao: 1, etapa: 99, tipo: 'correcao', pontos: 0, motivo: ' ' },
      ],
      new Set(['1']),
      new Set(['50']),
    )
    expect(erros.map((e) => e.caminho)).toEqual(['ajustes.1.inscricao', 'ajustes.2.etapa', 'ajustes.2.pontos', 'ajustes.2.motivo'])
  })

  it('linhas manuais sem posição ou piloto repetidos; destaque nunca se chama "Líder"', () => {
    const erros = conferirLinhasManuais([
      { posicao: 1, piloto: 1 },
      { posicao: 1, piloto: 2 },
      { posicao: 3, piloto: 1 },
    ])
    expect(erros.map((e) => e.caminho)).toEqual(['linhasManuais.1.posicao', 'linhasManuais.2.piloto'])
    expect(rotuloDestaqueValido('Destaque')).toBe(true)
    expect(rotuloDestaqueValido('Líder')).toBe(false)
    expect(rotuloDestaqueValido('lider da categoria')).toBe(false)
  })

  it('nome da cópia de uma regra', () => {
    expect(nomeDeCopia('Regulamento Teste', [])).toBe('Regulamento Teste (cópia)')
    expect(nomeDeCopia('Regulamento Teste', ['Regulamento Teste (cópia)'])).toBe('Regulamento Teste (cópia 2)')
    expect(nomeDeCopia('Regulamento Teste (cópia)', ['Regulamento Teste (cópia)'])).toBe('Regulamento Teste (cópia 2)')
  })
})
