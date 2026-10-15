/**
 * Hooks de temporadas:
 * - nome padrão "Campeonato X — 2026" e endereço a partir do ano;
 * - temporada encerrada congelada (só administrador reabre);
 * - ao encerrar, grava a fotografia final e o pódio de cada categoria;
 * - classificações (temporada-categorias) criadas sozinhas para cada categoria da temporada;
 * - categoria só sai da temporada se não tiver inscrições, etapas ou corridas nela.
 */
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
  FieldHook,
  PayloadRequest,
} from 'payload'
import { ehAdmin } from '../../access'
import { slugificar } from '../../fields/slug'
import { buscar, buscarPorId, COLECOES, contar, criar, excluir, type ContextoCompeticao } from './api'
import { carregarCategorias, rotuloCategoria } from './consultas'
import { estaEncerrada, mensagemCongelada } from './congelamento'
import { atualizarDerivados, derivadosTemporada } from './derivados'
import { gravarFotografiasFinais } from './encerramento'
import { falhar, falharNoCampo } from './erros'
import { contarUsos, mensagemVinculos } from './exclusao'
import { nomeTemporadaPadrao, normalizarBusca } from './texto'
import type {
  CampeonatoDoc,
  CorridaDoc,
  RegraPontuacaoDoc,
  TemporadaCategoriaDoc,
  TemporadaDoc,
} from './tipos'
import type { ID } from './util'
import { camposAlterados, contemId, idDe, idsDe, mesmoId, mudouAlgum } from './util'
import { encontrarTabela } from './validacoes'

/** Campos que continuam editáveis numa temporada encerrada (apresentação e visibilidade). */
const LIVRES_ENCERRADA = ['nome', 'slug', 'descricao', 'logo', 'banner', 'visibilidade', 'status', 'etapas', 'classificacoes']

/** Endereço padrão = ano ("2026"); editável (ex.: "2026-1" para duas temporadas no mesmo ano). */
export const slugDaTemporada: FieldHook = ({ value, data, originalDoc }) => {
  if (typeof value === 'string' && value.trim()) return slugificar(value)
  const ano = data?.ano ?? originalDoc?.ano
  return ano ? slugificar(String(ano)) : value
}

export const prepararTemporada: CollectionBeforeValidateHook = async ({ data, req }) => {
  if (!data) return data
  if (!data.nome?.toString().trim() && data.campeonato && data.ano) {
    const campeonato = await buscarPorId<CampeonatoDoc>(req, COLECOES.campeonatos, idDe(data.campeonato))
    data.nome = nomeTemporadaPadrao(campeonato?.nome, Number(data.ano))
  }

  // Formato da etapa: nomes únicos e tabela existente na regra (gravada com o nome exato da regra)
  const formato = Array.isArray(data.formatoEtapa) ? (data.formatoEtapa as NonNullable<TemporadaDoc['formatoEtapa']>) : []
  const erros: Array<{ caminho: string; mensagem: string }> = []
  const regra = await buscarPorId<RegraPontuacaoDoc>(req, COLECOES.regras, idDe(data.regra))
  const nomes = new Map<string, number>()
  formato.forEach((item, i) => {
    if (typeof item.nome === 'string') item.nome = item.nome.trim()
    const chave = normalizarBusca(item.nome ?? '')
    if (chave && nomes.has(chave)) {
      erros.push({ caminho: `formatoEtapa.${i}.nome`, mensagem: `"${item.nome}" já está na linha ${nomes.get(chave)! + 1} do formato.` })
    } else if (chave) nomes.set(chave, i)
    if (item.tabela?.trim() && regra) {
      const achada = encontrarTabela(item.tabela, regra.tabelas ?? [])
      if (achada) item.tabela = achada
      else {
        const disponiveis = (regra.tabelas ?? []).map((t) => t.nome).filter(Boolean).join(', ')
        erros.push({
          caminho: `formatoEtapa.${i}.tabela`,
          mensagem: `A regra "${regra.nome}" não tem a tabela "${item.tabela}". Tabelas disponíveis: ${disponiveis || 'nenhuma'}.`,
        })
      }
    }
  })
  if (erros.length) falharNoCampo(req, COLECOES.temporadas, erros)
  return data
}

/** Corridas com resultado ainda em rascunho (impedem o encerramento). */
async function corridasPendentes(req: PayloadRequest, temporadaId: ID) {
  const corridas = await buscar<CorridaDoc>(req, COLECOES.corridas, {
    where: { and: [{ 'etapa.temporada': { equals: temporadaId } }, { status: { equals: 'rascunho' } }] },
  })
  return corridas.filter((c) => (c.resultados?.length ?? 0) > 0 && c.contaParaClassificacao !== false)
}

/** Confere se uma categoria pode sair da temporada (nada lançado para ela). */
async function conferirRemocaoDeCategorias(req: PayloadRequest, temporadaId: ID, removidas: ID[]) {
  if (!removidas.length) return
  const categorias = await carregarCategorias(req, removidas)
  for (const categoria of categorias) {
    const motivos: string[] = []
    const inscricoes = await contar(req, COLECOES.inscricoes, {
      and: [{ temporada: { equals: temporadaId } }, { categoria: { equals: categoria.id } }],
    })
    if (inscricoes) motivos.push(`${inscricoes} inscrição(ões)`)
    const etapas = await contar(req, COLECOES.etapas, {
      and: [{ temporada: { equals: temporadaId } }, { categorias: { equals: categoria.id } }],
    })
    if (etapas) motivos.push(`${etapas} etapa(s)`)
    const classificacao = (
      await buscar<TemporadaCategoriaDoc>(req, COLECOES.temporadaCategorias, {
        where: { and: [{ temporada: { equals: temporadaId } }, { categoria: { equals: categoria.id } }] },
      })
    )[0]
    if (classificacao && ((classificacao.ajustes?.length ?? 0) > 0 || (classificacao.linhasManuais?.length ?? 0) > 0)) {
      motivos.push('ajustes ou linhas manuais na classificação')
    }
    if (motivos.length) {
      falharNoCampo(req, COLECOES.temporadas, [
        {
          caminho: 'categorias',
          mensagem: `A categoria "${rotuloCategoria(categoria)}" não pode sair desta temporada porque tem ${motivos.join(', ')}. Tire a categoria das etapas e desative as inscrições antes.`,
        },
      ])
    }
  }
}

export const regrasDaTemporada: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req, context }) => {
  const anterior = originalDoc as TemporadaDoc | undefined
  const contexto = context as ContextoCompeticao
  const novoStatus = data.status ?? anterior?.status

  if (operation === 'create' && novoStatus === 'encerrada') {
    falhar('Crie a temporada como "Planejada" ou "Em andamento", lance os dados e depois encerre.', 400)
  }

  // Temporada encerrada: só administrador reabre; enquanto encerrada, só a apresentação muda
  if (anterior && estaEncerrada(anterior)) {
    if (novoStatus !== 'encerrada') {
      if (req.user && !ehAdmin(req.user)) {
        falhar('Só um administrador pode reabrir uma temporada encerrada.', 403)
      }
    } else if (camposAlterados(data, anterior, LIVRES_ENCERRADA).length) {
      falhar(mensagemCongelada(anterior.nome, 'categorias, regra e formato'), 409)
    }
  }

  // Encerrando agora: confere pendências antes de gravar a fotografia final
  if (anterior && novoStatus === 'encerrada' && !estaEncerrada(anterior) && !contexto.encerrandoTemporada) {
    if ((data.fonteDados ?? anterior.fonteDados) !== 'so-classificacao-final' && !idDe(data.regra ?? anterior.regra)) {
      falhar('Escolha a regra de pontuação da temporada antes de encerrar (sem regra não há classificação).', 400)
    }
    const pendentes = await corridasPendentes(req, anterior.id)
    if (pendentes.length) {
      const lista = pendentes.slice(0, 5).map((c) => c.titulo || c.nome).join('; ')
      falhar(
        `Há ${pendentes.length} corrida(s) com resultado em rascunho (${lista}${pendentes.length > 5 ? '…' : ''}). ` +
          'Publique como oficial ou cancele antes de encerrar a temporada.',
        409,
      )
    }
  }

  if (anterior) {
    // Trocar o campeonato de uma temporada que é a "atual" do campeonato antigo deixaria o campeonato sem temporada
    if (data.campeonato !== undefined && !mesmoId(data.campeonato, anterior.campeonato)) {
      const campeonatoAntigo = await buscarPorId<CampeonatoDoc>(req, COLECOES.campeonatos, idDe(anterior.campeonato))
      if (campeonatoAntigo && mesmoId(campeonatoAntigo.temporadaAtual, anterior.id)) {
        falharNoCampo(req, COLECOES.temporadas, [
          {
            caminho: 'campeonato',
            mensagem: `Esta é a temporada atual de "${campeonatoAntigo.nome}". Escolha outra temporada atual lá antes de mudar o campeonato.`,
          },
        ])
      }
    }
    // Categorias retiradas
    if (data.categorias !== undefined) {
      const novas = idsDe(data.categorias)
      const removidas = idsDe(anterior.categorias).filter((id) => !contemId(novas, id))
      await conferirRemocaoDeCategorias(req, anterior.id, removidas)
    }
  }

  Object.assign(data, await derivadosTemporada(req, data))
  return data
}

/** Cria (ou remove, se vazias) as classificações das categorias da temporada. */
async function sincronizarClassificacoes(req: PayloadRequest, temporada: TemporadaDoc) {
  const categorias = idsDe(temporada.categorias)
  const existentes = await buscar<TemporadaCategoriaDoc>(req, COLECOES.temporadaCategorias, {
    where: { temporada: { equals: temporada.id } },
  })
  const contexto: ContextoCompeticao = { criandoClassificacoes: temporada.id }
  for (const [indice, categoria] of categorias.entries()) {
    if (existentes.some((e) => mesmoId(e.categoria, categoria))) continue
    await criar(
      req,
      COLECOES.temporadaCategorias,
      { temporada: temporada.id, categoria, ordem: indice + 1, modo: 'automatico', publicada: true },
      contexto,
    )
  }
  // Categorias retiradas: a conferência do beforeChange garantiu que a classificação está vazia
  for (const sobra of existentes.filter((e) => !contemId(categorias, e.categoria))) {
    await excluir(req, COLECOES.temporadaCategorias, sobra.id, { exclusaoEmCascata: temporada.id })
  }
}

export const aposSalvarTemporada: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const temporada = doc as TemporadaDoc
  const anterior = previousDoc as TemporadaDoc | undefined

  if (operation === 'create' || mudouAlgum(temporada, anterior, ['categorias'])) {
    await sincronizarClassificacoes(req, temporada)
  }

  if (operation === 'update' && estaEncerrada(temporada) && !estaEncerrada(anterior)) {
    await gravarFotografiasFinais(req, temporada.id)
  }

  if (operation === 'update' && mudouAlgum(temporada, anterior, ['nome', 'ano', 'campeonato'])) {
    const id = temporada.id
    await atualizarDerivados(req, COLECOES.etapas, { temporada: { equals: id } })
    await atualizarDerivados(req, COLECOES.corridas, { 'etapa.temporada': { equals: id } })
    await atualizarDerivados(req, COLECOES.inscricoes, { temporada: { equals: id } })
    await atualizarDerivados(req, COLECOES.temporadaCategorias, { temporada: { equals: id } })
  }
  return doc
}

/**
 * Exclusão: só sem etapas, inscrições etc. As classificações criadas sozinhas são apagadas junto,
 * desde que estejam vazias.
 */
export const antesDeExcluirTemporada: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const usos = await contarUsos(req, COLECOES.temporadas, id, [{ colecao: COLECOES.temporadaCategorias, caminho: 'temporada' }])
  const classificacoes = await buscar<TemporadaCategoriaDoc>(req, COLECOES.temporadaCategorias, {
    where: { temporada: { equals: id } },
  })
  const comConteudo = classificacoes.filter(
    (c) => (c.ajustes?.length ?? 0) > 0 || (c.linhasManuais?.length ?? 0) > 0 || Boolean(c.fotografiaFinal),
  )
  if (usos.length || comConteudo.length) {
    falhar(
      mensagemVinculos(
        'esta temporada',
        usos,
        comConteudo.length ? `${comConteudo.length} classificação(ões) têm ajustes, linhas manuais ou resultado final` : undefined,
      ),
      409,
    )
  }
  for (const c of classificacoes) {
    await excluir(req, COLECOES.temporadaCategorias, c.id, { exclusaoEmCascata: id })
  }
}
