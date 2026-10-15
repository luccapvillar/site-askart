/**
 * Testes da agenda de treinos (src/lib/agenda.ts) — funções puras, sem banco.
 * Horários, categorias e tipos são dados de TESTE, não dados oficiais da ASKART.
 *
 * Calendário usado: 2026-10-17 = sábado, 2026-10-18 = domingo, 2026-10-19 = segunda.
 */
import { describe, expect, it } from 'vitest'
import {
  agruparPorDia,
  categoriasSeCruzam,
  chaveDaData,
  chaveDoInstante,
  conflitosDaGrade,
  conflitosDoTreino,
  diaSemanaDaChave,
  duracaoTexto,
  expandirAgenda,
  filtrarAgenda,
  filtrarPorCategoria,
  filtrarPorTipo,
  formatarDuracao,
  horariosSobrepoem,
  intervaloDaVisao,
  listarDias,
  MAX_DIAS_AGENDA,
  paraAgendaSite,
  tituloHorario,
  tituloTreino,
  type HorarioGrade,
  type OcorrenciaTreino,
  type TreinoAvulso,
} from '@/lib/agenda'

const LIVRE = { id: 'livre', nome: 'Treino livre', slug: 'treino-livre', cor: '#1A7F37' }
const ESCOLINHA = { id: 'escolinha', nome: 'Escolinha', slug: 'escolinha', cor: '#0B5394' }
const CAT_A = { id: 'a', nome: 'Categoria A', slug: 'categoria-a' }
const CAT_B = { id: 'b', nome: 'Categoria B', slug: 'categoria-b' }

const horario = (id: string, extra: Partial<HorarioGrade> = {}): HorarioGrade => ({
  id,
  diaSemana: 'sabado',
  horaInicio: '08:00',
  horaFim: '10:00',
  categorias: [],
  tipo: LIVRE,
  visibilidade: 'visivel',
  ...extra,
})

const treino = (id: string, extra: Partial<TreinoAvulso> = {}): TreinoAvulso => ({
  id,
  dia: '2026-10-17',
  status: 'liberado',
  visibilidade: 'visivel',
  ...extra,
})

const agenda = (grade: HorarioGrade[], excecoes: TreinoAvulso[] = [], inicio = '2026-10-17', fim = inicio) =>
  expandirAgenda({ grade, excecoes, inicio, fim })

const resumo = (lista: OcorrenciaTreino[]) =>
  lista.map((o) => `${o.dia} ${o.horaInicio}-${o.horaFim} ${o.status}${o.categorias.length ? ` [${o.categorias.map((c) => c.id).join(',')}]` : ''}${o.exceto.length ? ` -[${o.exceto.map((c) => c.id).join(',')}]` : ''}`)

describe('chaves de dia e fuso', () => {
  it('lê o campo "só data" pelo dia gravado, qualquer que seja o formato', () => {
    expect(chaveDaData('2026-10-17')).toBe('2026-10-17')
    expect(chaveDaData('2026-10-17T12:00:00.000Z')).toBe('2026-10-17') // como o painel grava
    expect(chaveDaData('2026-10-17T00:00:00.000Z')).toBe('2026-10-17') // "AAAA-MM-DD" enviado pela API
    expect(chaveDaData('2026-10-17T03:00:00.000Z')).toBe('2026-10-17') // meia-noite de Brasília
    expect(chaveDaData(new Date(Date.UTC(2026, 9, 17, 12)))).toBe('2026-10-17')
    expect(chaveDaData('17/10/2026')).toBe('2026-10-17')
    expect(chaveDaData('2026-02-30')).toBeNull()
    expect(chaveDaData('não é data')).toBeNull()
    expect(chaveDaData(null)).toBeNull()
  })

  it('"agora" às 23:30 de Brasília (02:30 UTC do dia seguinte) ainda é o dia de Brasília', () => {
    expect(chaveDoInstante('2026-10-18T02:30:00.000Z')).toBe('2026-10-17')
    expect(chaveDoInstante(new Date('2026-10-18T03:00:00.000Z'))).toBe('2026-10-18')
    expect(chaveDoInstante('2026-10-17')).toBe('2026-10-17')
  })

  it('dia da semana sai da chave, sem depender do fuso do servidor', () => {
    expect(diaSemanaDaChave('2026-10-17')).toBe('sabado')
    expect(diaSemanaDaChave('2026-10-18')).toBe('domingo')
    expect(diaSemanaDaChave('2026-10-19')).toBe('segunda')
  })

  it('exceção gravada com qualquer representação do mesmo dia cai no mesmo dia', () => {
    const grade = [horario('h1')]
    for (const data of ['2026-10-17T12:00:00.000Z', '2026-10-17T03:00:00.000Z', '2026-10-17']) {
      const lista = agenda(grade, [{ id: 'x', data, substitui: 'h1', status: 'cancelado' }])
      expect(lista).toHaveLength(1)
      expect(lista[0].status).toBe('cancelado')
    }
  })

  it('visões "hoje" e "calendário" usam o dia de Brasília', () => {
    expect(intervaloDaVisao('hoje', '2026-10-18T02:30:00.000Z')).toEqual({ inicio: '2026-10-17', fim: '2026-10-17' })
    expect(intervaloDaVisao('semana', '2026-10-17')).toEqual({ inicio: '2026-10-12', fim: '2026-10-18' })
    expect(intervaloDaVisao('calendario', '2026-02-10')).toEqual({ inicio: '2026-02-01', fim: '2026-02-28' })
  })
})

describe('grade semanal', () => {
  it('repete o horário em todo dia da semana correspondente do intervalo', () => {
    const lista = agenda([horario('h1')], [], '2026-10-01', '2026-10-31')
    expect(lista.map((o) => o.dia)).toEqual(['2026-10-03', '2026-10-10', '2026-10-17', '2026-10-24', '2026-10-31'])
    expect(lista[0]).toMatchObject({ origem: 'grade', status: 'liberado', horarioId: 'h1', treinoId: null, duracaoMin: 120 })
  })

  it('virada de semana: sexta a segunda traz sábado, domingo e segunda na ordem', () => {
    const grade = [
      horario('seg', { diaSemana: 'segunda', horaInicio: '14:00', horaFim: '16:00' }),
      horario('dom', { diaSemana: 'domingo', horaInicio: '09:00', horaFim: '11:00' }),
      horario('sab', { diaSemana: 'sabado' }),
    ]
    const lista = agenda(grade, [], '2026-10-16', '2026-10-19')
    expect(lista.map((o) => `${o.diaSemana} ${o.dia}`)).toEqual([
      'sabado 2026-10-17',
      'domingo 2026-10-18',
      'segunda 2026-10-19',
    ])
  })

  it('respeita "válido de/até" (limites inclusivos) e não acaba sem data de fim', () => {
    const grade = [
      horario('antigo', { validoAte: '2026-10-10T12:00:00.000Z' }),
      horario('novo', { horaInicio: '09:00', horaFim: '11:00', validoDe: '2026-10-17T12:00:00.000Z' }),
    ]
    const lista = agenda(grade, [], '2026-10-01', '2026-10-31')
    expect(lista.filter((o) => o.horarioId === 'antigo').map((o) => o.dia)).toEqual(['2026-10-03', '2026-10-10'])
    expect(lista.filter((o) => o.horarioId === 'novo').map((o) => o.dia)).toEqual(['2026-10-17', '2026-10-24', '2026-10-31'])
    // Sem "válido até": continua valendo anos depois
    expect(agenda(grade, [], '2030-01-05')).toHaveLength(1)
  })

  it('visibilidade: oculto só entra no painel (marcado); arquivado nunca', () => {
    const grade = [horario('vis'), horario('oc', { visibilidade: 'oculto', horaInicio: '10:00', horaFim: '12:00' }), horario('arq', { visibilidade: 'arquivado' })]
    expect(agenda(grade).map((o) => o.horarioId)).toEqual(['vis'])
    const painel = expandirAgenda({ grade, excecoes: [], inicio: '2026-10-17', fim: '2026-10-17', incluirOcultos: true })
    expect(painel.map((o) => [o.horarioId, o.oculto])).toEqual([
      ['vis', false],
      ['oc', true],
    ])
  })

  it('ordena por dia e hora, com avulsos entre os horários fixos', () => {
    const grade = [horario('tarde', { horaInicio: '14:00', horaFim: '16:00' }), horario('manha')]
    const extra = treino('e1', { horaInicio: '11:00', horaFim: '12:00', status: 'extra', tipo: ESCOLINHA })
    const lista = agenda(grade, [extra, treino('e0', { dia: '2026-10-18', horaInicio: '07:00', horaFim: '08:00', status: 'extra' })], '2026-10-17', '2026-10-18')
    expect(lista.map((o) => `${o.dia} ${o.horaInicio} ${o.origem}`)).toEqual([
      '2026-10-17 08:00 grade',
      '2026-10-17 11:00 avulso',
      '2026-10-17 14:00 grade',
      '2026-10-18 07:00 avulso',
    ])
    expect(lista[1]).toMatchObject({ status: 'extra', treinoId: 'e1', tipo: ESCOLINHA })
  })
})

describe('exceções que substituem um horário', () => {
  it('troca só a ocorrência daquela data', () => {
    const lista = agenda([horario('h1')], [treino('x', { substitui: 'h1', status: 'cancelado', observacao: 'Chuva' })], '2026-10-10', '2026-10-24')
    expect(resumo(lista)).toEqual(['2026-10-10 08:00-10:00 liberado', '2026-10-17 08:00-10:00 cancelado', '2026-10-24 08:00-10:00 liberado'])
    expect(lista[1]).toMatchObject({ origem: 'grade', horarioId: 'h1', treinoId: 'x', observacao: 'Chuva', chave: 'gh1-2026-10-17' })
  })

  it('herda o que ficou vazio e usa o que foi informado ("alterar só este dia")', () => {
    const grade = [horario('h1', { categorias: [CAT_A], observacao: 'Traga o transponder' })]
    const [mudado] = agenda(grade, [treino('x', { substitui: { id: 'h1' }, horaInicio: '09:00', horaFim: '11:00', status: 'lotado' })])
    expect(mudado).toMatchObject({ horaInicio: '09:00', horaFim: '11:00', status: 'lotado', tipo: LIVRE, observacao: 'Traga o transponder' })
    expect(mudado.categorias.map((c) => c.id)).toEqual(['a'])
  })

  it('cancelar um horário que não acontece naquele dia não mostra nada; outras exceções viram avulsas', () => {
    const grade = [horario('h1', { validoAte: '2026-10-10' })]
    expect(agenda(grade, [treino('x', { substitui: 'h1', status: 'cancelado' })])).toEqual([])
    const [avulso] = agenda(grade, [treino('y', { substitui: 'h1', status: 'liberado' })])
    expect(avulso).toMatchObject({ origem: 'avulso', horaInicio: '08:00', horaFim: '10:00', treinoId: 'y' })
  })

  it('exceção oculta não vale no site', () => {
    const lista = agenda([horario('h1')], [treino('x', { substitui: 'h1', status: 'cancelado', visibilidade: 'oculto' })])
    expect(lista[0].status).toBe('liberado')
  })
})

describe('bloqueios de período', () => {
  const grade = [
    horario('m', { horaInicio: '08:00', horaFim: '10:00' }),
    horario('t', { horaInicio: '14:00', horaFim: '16:00' }),
  ]

  it('bloqueio do dia inteiro: tudo bloqueado com o motivo, sem linha extra', () => {
    const lista = agenda(grade, [treino('b', { horaInicio: '00:00', horaFim: '24:00', status: 'bloqueado', observacao: 'Etapa do campeonato' })])
    expect(resumo(lista)).toEqual(['2026-10-17 08:00-10:00 bloqueado', '2026-10-17 14:00-16:00 bloqueado'])
    expect(lista.every((o) => o.motivo === 'Etapa do campeonato' && o.bloqueio?.parcial === false)).toBe(true)
  })

  it('bloqueio parcial no horário: só o que se sobrepõe, marcado como parcial; encostado não conta', () => {
    const lista = agenda(grade, [treino('b', { horaInicio: '09:00', horaFim: '14:00', status: 'bloqueado', observacao: 'Manutenção' })])
    expect(resumo(lista)).toEqual(['2026-10-17 08:00-10:00 bloqueado', '2026-10-17 14:00-16:00 liberado'])
    expect(lista[0].bloqueio).toEqual({ treinoId: 'b', das: '09:00', ate: '14:00', parcial: true })
    expect(horariosSobrepoem({ horaInicio: '10:00', horaFim: '14:00' }, { horaInicio: '14:00', horaFim: '16:00' })).toBe(false)
  })

  it('bloqueio por categoria divide o horário: a parte bloqueada e a que continua', () => {
    const lista = agenda(
      [horario('ab', { categorias: [CAT_A, CAT_B] })],
      [treino('b', { horaInicio: '08:00', horaFim: '12:00', status: 'bloqueado', categorias: ['a'] })],
    )
    expect(resumo(lista)).toEqual(['2026-10-17 08:00-10:00 liberado [b]', '2026-10-17 08:00-10:00 bloqueado [a]'])
    expect(new Set(lista.map((o) => o.chave)).size).toBe(2)
  })

  it('horário aberto a todas + bloqueio de uma categoria: "todas, exceto" continua liberado', () => {
    const lista = agenda([horario('todas')], [treino('b', { horaInicio: '08:00', horaFim: '10:00', status: 'bloqueado', categorias: [CAT_A] })])
    expect(resumo(lista)).toEqual(['2026-10-17 08:00-10:00 liberado -[a]', '2026-10-17 08:00-10:00 bloqueado [a]'])
    expect(filtrarPorCategoria(lista, 'a').map((o) => o.status)).toEqual(['bloqueado'])
    expect(filtrarPorCategoria(lista, 'categoria-b').map((o) => o.status)).toEqual(['liberado'])
  })

  it('bloqueio de outra categoria não atinge; bloqueio sem efeito aparece sozinho', () => {
    const lista = agenda([horario('b-only', { categorias: [CAT_B] })], [treino('b', { horaInicio: '08:00', horaFim: '12:00', status: 'bloqueado', categorias: [CAT_A], observacao: 'Pista reservada' })])
    expect(resumo(lista)).toEqual(['2026-10-17 08:00-10:00 liberado [b]', '2026-10-17 08:00-12:00 bloqueado [a]'])
    expect(lista[1]).toMatchObject({ origem: 'avulso', treinoId: 'b', motivo: 'Pista reservada', observacao: null })
    // Dia sem nenhum treino: o bloqueio aparece como "pista fechada"
    expect(resumo(agenda([], [treino('b2', { horaInicio: '08:00', horaFim: '18:00', status: 'bloqueado' })]))).toEqual(['2026-10-17 08:00-18:00 bloqueado'])
  })

  it('bloqueio atinge também treinos avulsos e exceções, mas não muda cancelados', () => {
    const excecoes = [
      treino('canc', { substitui: 'm', status: 'cancelado' }),
      treino('extra', { horaInicio: '15:00', horaFim: '17:00', status: 'extra' }),
      treino('b', { horaInicio: '07:00', horaFim: '18:00', status: 'bloqueado' }),
    ]
    expect(resumo(agenda(grade, excecoes))).toEqual([
      '2026-10-17 08:00-10:00 cancelado',
      '2026-10-17 14:00-16:00 bloqueado',
      '2026-10-17 15:00-17:00 bloqueado',
    ])
  })
})

describe('filtros, agrupamento e formato do site', () => {
  const grade = [
    horario('a', { categorias: [CAT_A] }),
    horario('b', { categorias: [CAT_B], horaInicio: '10:00', horaFim: '12:00', tipo: ESCOLINHA }),
    horario('todas', { horaInicio: '14:00', horaFim: '16:00' }),
  ]

  it('filtra por categoria (id ou slug; "todas" vale para qualquer uma) e por tipo', () => {
    const lista = agenda(grade)
    expect(filtrarPorCategoria(lista, 'a').map((o) => o.horarioId)).toEqual(['a', 'todas'])
    expect(filtrarPorCategoria(lista, 'categoria-b').map((o) => o.horarioId)).toEqual(['b', 'todas'])
    expect(filtrarPorTipo(lista, 'escolinha').map((o) => o.horarioId)).toEqual(['b'])
    expect(filtrarPorTipo(lista, 'treino-livre').map((o) => o.horarioId)).toEqual(['a', 'todas'])
    expect(filtrarAgenda(lista, { categoria: 'b', tipo: 'livre' }).map((o) => o.horarioId)).toEqual(['todas'])
    expect(filtrarAgenda(lista, {})).toHaveLength(3)
  })

  it('agrupa por dia com os dias vazios do intervalo e marca hoje', () => {
    const dias = agruparPorDia(agenda(grade, [], '2026-10-16', '2026-10-18'), { inicio: '2026-10-16', fim: '2026-10-18', hoje: '2026-10-17' })
    expect(dias.map((d) => [d.dia, d.nome, d.data, d.hoje, d.ocorrencias.length])).toEqual([
      ['2026-10-16', 'sexta-feira', '16/10', false, 0],
      ['2026-10-17', 'sábado', '17/10', true, 3],
      ['2026-10-18', 'domingo', '18/10', false, 0],
    ])
  })

  it('converte para o componente da agenda do site', () => {
    const lista = agenda([horario('todas')], [treino('b', { horaInicio: '09:00', horaFim: '10:00', status: 'bloqueado', categorias: [CAT_A], observacao: 'Manutenção' })])
    const [dia] = paraAgendaSite(agruparPorDia(lista))
    expect(dia).toMatchObject({ chave: '2026-10-17', nome: 'sábado', data: '17/10' })
    expect(dia.horarios.map((h) => [h.inicio, h.status, h.categorias, h.observacao])).toEqual([
      ['08:00', 'liberado', ['Todas, exceto Categoria A'], null],
      ['08:00', 'bloqueado', ['Categoria A'], 'Bloqueado das 09:00 às 10:00 · Manutenção'],
    ])
    expect(dia.horarios[0]).toMatchObject({ tipo: 'Treino livre', cor: '#1A7F37' })
  })
})

describe('conflitos (aviso de sobreposição)', () => {
  it('grade: acusa mesmo dia, horário sobreposto e categoria em comum', () => {
    const novo = horario('novo', { horaInicio: '09:00', horaFim: '11:00', categorias: ['a'] })
    const outros = [
      horario('mesmo', { categorias: ['a', 'b'] }),
      horario('outra-cat', { categorias: ['b'] }),
      horario('outro-dia', { diaSemana: 'domingo' }),
      horario('encostado', { horaInicio: '11:00', horaFim: '12:00' }),
      horario('vencido', { validoAte: '2026-01-31' }),
      horario('oculto', { visibilidade: 'oculto' }),
    ]
    expect(conflitosDaGrade({ ...novo, validoDe: '2026-02-01' }, outros).map((h) => h.id)).toEqual(['mesmo'])
    expect(conflitosDaGrade({ ...novo, visibilidade: 'oculto' }, outros)).toEqual([])
  })

  it('treino avulso sobre horário fixo acusa; substituindo o próprio horário, não', () => {
    const grade = [horario('h1'), horario('h2', { horaInicio: '10:00', horaFim: '12:00' })]
    const avulso = treino('novo', { horaInicio: '09:00', horaFim: '10:30', status: 'extra' })
    expect(conflitosDoTreino({ treino: avulso, grade, outros: [] }).map((c) => [c.motivo, c.horarioId])).toEqual([
      ['horario-fixo', 'h1'],
      ['horario-fixo', 'h2'],
    ])
    const troca = treino('novo', { substitui: 'h1', horaInicio: '08:00', horaFim: '09:30' })
    expect(conflitosDoTreino({ treino: troca, grade, outros: [] })).toEqual([])
    // Categorias diferentes não conflitam
    const outraCat = treino('novo', { horaInicio: '09:00', horaFim: '10:30', categorias: ['b'] })
    expect(conflitosDoTreino({ treino: outraCat, grade: [horario('h1', { categorias: ['a'] })], outros: [] })).toEqual([])
  })

  it('cancelar sem "substitui" acusa o horário fixo; bloqueio e cancelamento com "substitui" nunca acusam', () => {
    const grade = [horario('h1')]
    const semSubstitui = treino('c', { horaInicio: '08:00', horaFim: '10:00', status: 'cancelado' })
    expect(conflitosDoTreino({ treino: semSubstitui, grade, outros: [] }).map((c) => c.motivo)).toEqual(['horario-fixo'])
    expect(conflitosDoTreino({ treino: treino('c', { substitui: 'h1', status: 'cancelado' }), grade, outros: [] })).toEqual([])
    expect(conflitosDoTreino({ treino: treino('b', { horaInicio: '00:00', horaFim: '24:00', status: 'bloqueado' }), grade, outros: [] })).toEqual([])
  })

  it('treino dentro de um bloqueio e treino sobre outro treino acusam', () => {
    const outros = [
      treino('bloq', { horaInicio: '13:00', horaFim: '18:00', status: 'bloqueado' }),
      treino('esc', { horaInicio: '08:00', horaFim: '09:00', status: 'extra' }),
    ]
    const tarde = treino('novo', { horaInicio: '14:00', horaFim: '15:00', status: 'extra' })
    expect(conflitosDoTreino({ treino: tarde, grade: [], outros }).map((c) => [c.motivo, c.treinoId])).toEqual([['bloqueio', 'bloq']])
    const manha = treino('novo', { horaInicio: '08:30', horaFim: '09:30', status: 'extra' })
    expect(conflitosDoTreino({ treino: manha, grade: [], outros }).map((c) => [c.motivo, c.treinoId])).toEqual([['treino', 'esc']])
    // Ele mesmo (edição) não conta
    expect(conflitosDoTreino({ treino: manha, grade: [], outros: [{ ...manha }] })).toEqual([])
  })

  it('categorias se cruzam com "vazio = todas" e "todas, exceto"', () => {
    expect(categoriasSeCruzam({ categorias: [] }, { categorias: ['a'] })).toBe(true)
    expect(categoriasSeCruzam({ categorias: ['a'] }, { categorias: [{ id: 'b' }] })).toBe(false)
    expect(categoriasSeCruzam({ categorias: [], exceto: ['a'] }, { categorias: ['a'] })).toBe(false)
    expect(categoriasSeCruzam({ categorias: [], exceto: ['a'] }, { categorias: ['a', 'b'] })).toBe(true)
  })
})

describe('títulos, duração e limites', () => {
  it('títulos calculados', () => {
    expect(tituloTreino({ dia: '2026-10-17', horaInicio: '08:00', horaFim: '10:00', tipoNome: 'Treino livre', status: 'liberado' })).toBe(
      'sáb 17/10 · 08:00–10:00 · Treino livre',
    )
    expect(tituloTreino({ dia: '2026-10-18', horaInicio: '08:00', horaFim: '10:00', tipoNome: 'Treino livre', status: 'cancelado' })).toBe(
      'dom 18/10 · 08:00–10:00 · Treino livre · Cancelado',
    )
    expect(tituloTreino({ dia: '2026-10-19', horaInicio: '00:00', horaFim: '24:00', status: 'bloqueado' })).toBe('seg 19/10 · 00:00–24:00 · Bloqueado')
    expect(
      tituloHorario({ diaSemana: 'sabado', horaInicio: '08:00', horaFim: '10:00', tipoNome: 'Treino livre', categorias: ['Categoria A'], validoAte: '2026-12-31T12:00:00.000Z' }),
    ).toBe('sáb · 08:00–10:00 · Treino livre · Categoria A · até 31/12/2026')
  })

  it('duração mostrada e horário inválido', () => {
    expect(formatarDuracao(120)).toBe('2h')
    expect(formatarDuracao(90)).toBe('1h30')
    expect(formatarDuracao(45)).toBe('45 min')
    expect(duracaoTexto('08:00', '24:00')).toBe('16h')
    expect(duracaoTexto('10:00', '08:00')).toBe('')
    // Horário invertido não gera ocorrência
    expect(agenda([horario('inv', { horaInicio: '10:00', horaFim: '08:00' })])).toEqual([])
  })

  it('intervalo inválido ou invertido não calcula nada; intervalos enormes são limitados', () => {
    expect(listarDias('2026-10-20', '2026-10-17')).toEqual([])
    expect(listarDias('2026-13-01', '2026-13-05')).toEqual([])
    expect(listarDias('2026-01-01', '2030-12-31')).toHaveLength(MAX_DIAS_AGENDA)
    expect(agenda([horario('h1')], [], 'xx', '2026-10-17')).toEqual([])
  })
})
