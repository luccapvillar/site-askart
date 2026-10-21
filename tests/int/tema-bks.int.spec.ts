/**
 * Tema da aba BKS: as cores do campeonato (painel) viram as variáveis do tema só quando foram escolhidas e dão
 * leitura com texto branco; vazias ou iguais às antigas do dados:oficiais, a aba fica com as cores da logo.
 */
import { describe, expect, it } from 'vitest'
import { contraste, CORES_BKS, CORES_BKS_ANTIGAS, coresDoBksSemEscolha, variaveisDoTemaBks } from '@/lib/site'

describe('cores do BKS: escolhidas no painel ou não', () => {
  it('vazias ou iguais às antigas contam como "sem escolha" (a atualização do banco pode trocar)', () => {
    expect(coresDoBksSemEscolha(null)).toBe(true)
    expect(coresDoBksSemEscolha({})).toBe(true)
    expect(coresDoBksSemEscolha({ primaria: '', secundaria: '  ', destaque: null })).toBe(true)
    expect(coresDoBksSemEscolha({ ...CORES_BKS_ANTIGAS })).toBe(true)
    expect(coresDoBksSemEscolha({ primaria: '#d02d21', secundaria: '#0201b8', destaque: null })).toBe(true)
  })

  it('qualquer cor escolhida no painel fica como está', () => {
    expect(coresDoBksSemEscolha({ ...CORES_BKS })).toBe(false)
    expect(coresDoBksSemEscolha({ ...CORES_BKS_ANTIGAS, destaque: '#294939' })).toBe(false)
    expect(coresDoBksSemEscolha({ primaria: '#123456' })).toBe(false)
  })
})

describe('variáveis do tema da aba BKS', () => {
  it('sem cores, com as antigas ou com as da logo: nada a trocar (vale o CSS)', () => {
    expect(variaveisDoTemaBks(null)).toEqual({})
    expect(variaveisDoTemaBks({ ...CORES_BKS_ANTIGAS })).toEqual({})
    expect(variaveisDoTemaBks({ ...CORES_BKS })).toEqual({})
  })

  it('cor escolhida e legível entra como está', () => {
    expect(variaveisDoTemaBks({ primaria: '#123A7C', secundaria: '#B3261E' })).toEqual({ '--bks-azul': '#123A7C', '--bks-vermelho': '#B3261E' })
  })

  it('cor clara demais é escurecida só o necessário para o texto branco', () => {
    const v = variaveisDoTemaBks({ primaria: '#3366CC', secundaria: '#F04030' })
    expect(contraste(v['--bks-azul'], '#FFFFFF')).toBeGreaterThanOrEqual(7)
    expect(contraste(v['--bks-vermelho'], '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })

  it('cor que não dá leitura nem escurecida volta à da logo', () => {
    expect(variaveisDoTemaBks({ primaria: '#F2F2F2', secundaria: '#FFE14D' })).toEqual({})
  })

  it('as cores padrão do tema têm o contraste anotado no CSS', () => {
    expect(contraste(CORES_BKS.primaria, '#FFFFFF')).toBeGreaterThanOrEqual(11.5)
    expect(contraste(CORES_BKS.secundaria, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })
})
