import { docAnterior } from './util'
/**
 * Hooks de regras-pontuacao: nomes de tabela únicos, critérios sem repetição e o bloqueio de edição
 * quando a regra já foi usada por uma temporada encerrada (o histórico não pode mudar).
 */
import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook, PayloadRequest } from 'payload'
import { buscar, COLECOES } from './api'
import { falhar, falharNoCampo } from './erros'
import { normalizarBusca } from './texto'
import type { CorridaDoc, RegraPontuacaoDoc, TemporadaCategoriaDoc, TemporadaDoc } from './tipos'
import type { ID } from './util'
import { camposAlterados, idsDe } from './util'
import { criteriosRepetidos } from './validacoes'

/** Temporadas que usam a regra (direto na temporada ou como regra própria de uma categoria). */
export async function temporadasQueUsam(req: PayloadRequest, regraId: ID): Promise<TemporadaDoc[]> {
  const diretas = await buscar<TemporadaDoc>(req, COLECOES.temporadas, { where: { regra: { equals: regraId } } })
  const porCategoria = await buscar<TemporadaCategoriaDoc>(req, COLECOES.temporadaCategorias, {
    where: { regra: { equals: regraId } },
  })
  const ids = new Set(diretas.map((t) => String(t.id)))
  const faltam = idsDe(porCategoria.map((c) => c.temporada)).filter((id) => !ids.has(String(id)))
  const extras = faltam.length
    ? await buscar<TemporadaDoc>(req, COLECOES.temporadas, { where: { id: { in: faltam } } })
    : []
  return [...diretas, ...extras]
}

export const prepararRegra: CollectionBeforeValidateHook = ({ data, req }) => {
  if (!data) return data
  const tabelas = Array.isArray(data.tabelas) ? (data.tabelas as Array<{ nome?: string | null }>) : []
  const vistos = new Map<string, number>()
  const erros: Array<{ caminho: string; mensagem: string }> = []
  tabelas.forEach((t, i) => {
    if (typeof t.nome === 'string') t.nome = t.nome.trim().replace(/\s+/g, ' ')
    const chave = normalizarBusca(t.nome ?? '')
    if (!chave) return
    if (vistos.has(chave)) {
      erros.push({ caminho: `tabelas.${i}.nome`, mensagem: `Já existe uma tabela chamada "${t.nome}" (linha ${vistos.get(chave)! + 1}).` })
    } else vistos.set(chave, i)
  })
  const repetidos = criteriosRepetidos(data.criteriosDesempate as Array<{ criterio?: string }>)
  if (repetidos.length) {
    erros.push({ caminho: 'criteriosDesempate', mensagem: 'Cada critério de desempate só pode aparecer uma vez na lista.' })
  }
  if (typeof data.pontosParticipacao === 'number' && data.pontosParticipacao > 0 && !data.requisitoParticipacao) {
    erros.push({ caminho: 'requisitoParticipacao', mensagem: 'Diga quem ganha os pontos de participação.' })
  }
  if (erros.length) falharNoCampo(req, COLECOES.regras, erros)
  return data
}

/** Marca (só do servidor, em `context`) de scripts/atualizacoes.ts: volta a regra de temporada encerrada para "por corrida". */
export const CONTEXTO_CALCULO_ANTIGO = 'calculoDaEtapaAntigo'

/**
 * Regra usada por temporada encerrada: "Como a etapa é pontuada" só pode virar "por corrida" — o cálculo com que
 * a classificação final dela foi feita, então o resultado não muda:
 * - a partir do vazio (regra gravada antes do campo existir, que o motor já calcula por corrida);
 * - pelo servidor (`peloServidor`: scripts/atualizacoes.ts), também a partir do padrão "média das corridas" que
 *   a migração do campo grava nas regras que já existiam. Pelo painel isso nunca é permitido.
 */
export const soPreencheCalculoAntigo = (novo: unknown, antigo: unknown, peloServidor = false) =>
  novo === 'por-corrida' && (peloServidor || antigo === null || antigo === undefined || antigo === '')

/**
 * Regra usada por temporada encerrada: só o nome pode mudar. Tabela renomeada ou removida não pode
 * estar em uso por corridas nem pelo formato de etapa das temporadas.
 */
export const protegerRegraEmUso: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  if (operation !== 'update' || !docAnterior(originalDoc)) return data
  const usos = await temporadasQueUsam(req, originalDoc.id)
  const encerradas = usos.filter((t) => t.status === 'encerrada')
  const peloServidor = req.context?.[CONTEXTO_CALCULO_ANTIGO] === true
  const calculoAntigo = soPreencheCalculoAntigo(data.calculoDaEtapa, originalDoc.calculoDaEtapa, peloServidor)
  const livres = ['nome', 'temporadas', 'classificacoes', ...(calculoAntigo ? ['calculoDaEtapa'] : [])]
  if (encerradas.length && camposAlterados(data, originalDoc, livres).length) {
    falhar(
      `Esta regra foi usada na temporada encerrada "${encerradas[0].nome}" e não pode mudar (o resultado oficial ficaria diferente). ` +
        'Para outra temporada, use "Duplicar regra" e edite a cópia.',
      409,
    )
  }

  // Tabelas que deixaram de existir (removidas ou renomeadas). Gravação parcial sem as tabelas (ex.: só o
  // "Como a etapa é pontuada", por scripts/atualizacoes.ts) não mexe nelas: não há o que conferir.
  if (!Array.isArray(data.tabelas)) return data
  type Tabelas = NonNullable<RegraPontuacaoDoc['tabelas']>
  const novas = new Set(((data.tabelas ?? []) as Tabelas).map((t) => normalizarBusca(t?.nome ?? '')))
  const sumiram = ((originalDoc.tabelas ?? []) as Tabelas)
    .map((t) => t.nome ?? '')
    .filter((nome) => nome && !novas.has(normalizarBusca(nome)))
  if (!sumiram.length || !usos.length) return data

  const alvo = new Set(sumiram.map((n) => normalizarBusca(n)))
  const noFormato = usos.filter((t) => (t.formatoEtapa ?? []).some((f) => f.tabela && alvo.has(normalizarBusca(f.tabela))))
  const corridas = await buscar<CorridaDoc>(req, COLECOES.corridas, {
    where: { and: [{ 'etapa.temporada': { in: usos.map((t) => t.id) } }, { tabela: { exists: true } }] },
  })
  const emCorridas = corridas.filter((c) => c.tabela && alvo.has(normalizarBusca(c.tabela)))
  if (noFormato.length || emCorridas.length) {
    const onde = [
      noFormato.length ? `no formato de etapa de ${noFormato.map((t) => `"${t.nome}"`).join(', ')}` : '',
      emCorridas.length ? `em ${emCorridas.length} corrida(s)` : '',
    ]
      .filter(Boolean)
      .join(' e ')
    falhar(
      `A tabela "${sumiram.join('", "')}" está em uso ${onde}. Mantenha o nome ou troque a tabela nesses lugares antes.`,
      409,
    )
  }
  return data
}

/** "Duplicar": nome com "(cópia)". */
export const nomeDaCopia = ({ value }: { value?: unknown }) =>
  typeof value === 'string' && value ? `${value} (cópia)` : value
