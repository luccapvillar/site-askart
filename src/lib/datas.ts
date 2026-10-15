/**
 * Datas no fuso de Brasília (America/Sao_Paulo). Toda conta de data do site e do painel passa por aqui:
 * os servidores da Vercel rodam em UTC, e sem isso o "hoje", o dia da semana e os horários sairiam errados.
 */
export const FUSO = 'America/Sao_Paulo'

const fmt = (opcoes: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, ...opcoes })

const fData = fmt({ day: '2-digit', month: '2-digit', year: 'numeric' })
const fDataCurta = fmt({ day: '2-digit', month: '2-digit' })
const fHora = fmt({ hour: '2-digit', minute: '2-digit', hour12: false })
const fDiaSemana = fmt({ weekday: 'long' })
const fDiaSemanaCurto = fmt({ weekday: 'short' })
const fDataExtenso = fmt({ day: 'numeric', month: 'long', year: 'numeric' })
const fMesAno = fmt({ month: 'long', year: 'numeric' })
const fPartes = fmt({ year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })

type Entrada = string | number | Date

const d = (v: Entrada) => (v instanceof Date ? v : new Date(v))

export const formatarData = (v: Entrada) => fData.format(d(v))
export const formatarDataCurta = (v: Entrada) => fDataCurta.format(d(v))
export const formatarHora = (v: Entrada) => fHora.format(d(v))
export const formatarDataHora = (v: Entrada) => `${formatarData(v)} ${formatarHora(v)}`
export const formatarDataExtenso = (v: Entrada) => fDataExtenso.format(d(v))
export const formatarMesAno = (v: Entrada) => fMesAno.format(d(v))
export const diaDaSemana = (v: Entrada) => fDiaSemana.format(d(v))
export const diaDaSemanaCurto = (v: Entrada) => fDiaSemanaCurto.format(d(v)).replace('.', '')

/** Partes da data no fuso de Brasília. */
export function partes(v: Entrada) {
  const p = Object.fromEntries(fPartes.formatToParts(d(v)).map((x) => [x.type, x.value]))
  return { ano: +p.year, mes: +p.month, dia: +p.day, hora: +p.hour % 24, minuto: +p.minute }
}

/** "AAAA-MM-DD" do dia em Brasília (chave de agrupamento por dia). */
export function chaveDia(v: Entrada) {
  const { ano, mes, dia } = partes(v)
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Deslocamento de Brasília em relação ao UTC, em minutos, na data informada (hoje: -180, sem horário de verão). */
function deslocamentoMin(instante: Date) {
  const { ano, mes, dia, hora, minuto } = partes(instante)
  const comoUTC = Date.UTC(ano, mes - 1, dia, hora, minuto)
  return Math.round((comoUTC - instante.getTime()) / 60000)
}

/** Constrói o instante UTC de uma data e hora "de parede" em Brasília. */
export function instanteEmBrasilia(ano: number, mes: number, dia: number, hora = 0, minuto = 0) {
  const palpite = new Date(Date.UTC(ano, mes - 1, dia, hora, minuto))
  return new Date(palpite.getTime() - deslocamentoMin(palpite) * 60000)
}

/** Converte "AAAA-MM-DD" + "HH:mm" (hora de Brasília) em instante. */
export function instanteDeChave(chave: string, hhmm = '00:00') {
  const [a, m, dd] = chave.split('-').map(Number)
  const [h, mi] = hhmm.split(':').map(Number)
  return instanteEmBrasilia(a, m, dd, h || 0, mi || 0)
}

/** Soma dias a uma chave "AAAA-MM-DD" (sem efeito de fuso). */
export function somarDias(chave: string, dias: number) {
  const [a, m, dd] = chave.split('-').map(Number)
  const x = new Date(Date.UTC(a, m - 1, dd + dias))
  return x.toISOString().slice(0, 10)
}

/** Dia da semana (0 = domingo … 6 = sábado) de uma chave "AAAA-MM-DD". */
export function diaSemanaDeChave(chave: string) {
  const [a, m, dd] = chave.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, dd)).getUTCDay()
}

export const NOMES_DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

export type Periodo = 'hoje' | 'amanha' | 'semana' | 'proxima-semana'

/** Intervalo [inicio, fim] (chaves inclusivas) de um período relativo a "agora" em Brasília. Semana = segunda a domingo. */
export function intervaloDoPeriodo(periodo: Periodo, agora: Entrada = new Date()) {
  const hoje = chaveDia(agora)
  if (periodo === 'hoje') return { inicio: hoje, fim: hoje }
  if (periodo === 'amanha') {
    const a = somarDias(hoje, 1)
    return { inicio: a, fim: a }
  }
  const dow = diaSemanaDeChave(hoje)
  const segunda = somarDias(hoje, dow === 0 ? -6 : 1 - dow)
  const inicio = periodo === 'semana' ? segunda : somarDias(segunda, 7)
  return { inicio, fim: somarDias(inicio, 6) }
}

/** Minutos entre "HH:mm" e "HH:mm". */
export function minutosEntre(inicio: string, fim: string) {
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fim.split(':').map(Number)
  return h2 * 60 + m2 - (h1 * 60 + m1)
}

/** Opções "HH:mm" de 15 em 15 minutos (00:00 … 23:45), para selects de horário sem fuso. */
export const HORARIOS_15MIN = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, '0')
  const m = String((i % 4) * 15).padStart(2, '0')
  return `${h}:${m}`
})

/** Número ordinal feminino/masculino em português: 3 → "3ª" (etapa) / "3º" (lugar). */
export const ordinal = (n: number, genero: 'f' | 'm' = 'm') => `${n}${genero === 'f' ? 'ª' : 'º'}`
