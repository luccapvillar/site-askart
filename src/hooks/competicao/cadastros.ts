/**
 * Hooks dos cadastros simples: categorias, equipes, campeonatos e pilotos.
 */
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  Where,
} from 'payload'
import { buscar, buscarPorId, COLECOES } from './api'
import { atualizarDerivados, derivadosEquipe, derivadosNomeSigla, derivadosPiloto } from './derivados'
import { falharNoCampo } from './erros'
import { normalizarBusca } from './texto'
import type { PilotoDoc, TemporadaDoc } from './tipos'
import { idDe, mesmoId, mudouAlgum } from './util'

/* ----------------------------------------------------------------------------------------------
 * Categorias
 * -------------------------------------------------------------------------------------------- */

export const buscaPorNomeESigla: CollectionBeforeChangeHook = ({ data }) => {
  Object.assign(data, derivadosNomeSigla(data))
  return data
}

/** Categoria renomeada: atualiza os títulos que mostram o nome dela. */
export const propagarNomeCategoria: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (operation !== 'update' || !mudouAlgum(doc, previousDoc, ['nome', 'sigla'])) return doc
  await atualizarDerivados(req, COLECOES.inscricoes, { categoria: { equals: doc.id } })
  await atualizarDerivados(req, COLECOES.corridas, { categorias: { equals: doc.id } })
  await atualizarDerivados(req, COLECOES.temporadaCategorias, { categoria: { equals: doc.id } })
  return doc
}

/* ----------------------------------------------------------------------------------------------
 * Equipes
 * -------------------------------------------------------------------------------------------- */

export const buscaEquipe: CollectionBeforeChangeHook = ({ data }) => {
  Object.assign(data, derivadosEquipe(data))
  return data
}

/* ----------------------------------------------------------------------------------------------
 * Campeonatos
 * -------------------------------------------------------------------------------------------- */

/** A temporada atual precisa ser uma temporada do próprio campeonato. */
export const validarTemporadaAtual: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data
  const temporadaId = idDe(data.temporadaAtual)
  if (temporadaId === null) return data
  const campeonatoId = idDe(originalDoc?.id)
  if (campeonatoId === null) {
    falharNoCampo(req, COLECOES.campeonatos, [
      {
        caminho: 'temporadaAtual',
        mensagem: 'Salve o campeonato primeiro; depois crie a temporada e volte aqui para marcá-la como atual.',
      },
    ])
  }
  const temporada = await buscarPorId<TemporadaDoc>(req, COLECOES.temporadas, temporadaId)
  if (!temporada || !mesmoId(temporada.campeonato, campeonatoId)) {
    falharNoCampo(req, COLECOES.campeonatos, [
      { caminho: 'temporadaAtual', mensagem: 'Escolha uma temporada deste campeonato.' },
    ])
  }
  return data
}

/** Campeonato renomeado: atualiza a busca das temporadas e os títulos das inscrições (sigla). */
export const propagarNomeCampeonato: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (operation !== 'update' || !mudouAlgum(doc, previousDoc, ['nome', 'sigla'])) return doc
  const temporadas = await buscar<TemporadaDoc>(req, COLECOES.temporadas, { where: { campeonato: { equals: doc.id } } })
  if (!temporadas.length) return doc
  const ids = temporadas.map((t) => t.id)
  await atualizarDerivados(req, COLECOES.temporadas, { id: { in: ids } })
  await atualizarDerivados(req, COLECOES.inscricoes, { temporada: { in: ids } })
  return doc
}

/* ----------------------------------------------------------------------------------------------
 * Pilotos
 * -------------------------------------------------------------------------------------------- */

/**
 * Nome de exibição padrão = nome. Aviso de possível duplicado: se já existe piloto com o mesmo
 * nome (sem acento/caixa), pede para confirmar "Não é a mesma pessoa" antes de salvar.
 */
export const prepararPiloto: CollectionBeforeValidateHook = async ({ data, originalDoc, req, operation }) => {
  if (!data) return data
  if (typeof data.nome === 'string') data.nome = data.nome.trim().replace(/\s+/g, ' ')
  if (!data.nomeExibicao?.toString().trim()) data.nomeExibicao = data.nome
  const nomeMudou = operation === 'create' || normalizarBusca(data.nome) !== normalizarBusca(originalDoc?.nome)
  if (nomeMudou && data.nome && !data.confirmarNaoDuplicado) {
    const id = idDe(originalDoc?.id)
    const candidatos = await buscar<PilotoDoc>(req, COLECOES.pilotos, {
      where: {
        and: [
          { textoBusca: { like: normalizarBusca(data.nome) } },
          ...(id !== null ? ([{ id: { not_equals: id } }] as Where[]) : []),
        ],
      },
      limit: 20,
    })
    const iguais = candidatos.filter((p) => normalizarBusca(p.nome) === normalizarBusca(data.nome))
    if (iguais.length) {
      const quem = iguais.map((p) => `"${p.nome}"${p.cidade ? ` (${p.cidade})` : ''}`).join(', ')
      falharNoCampo(req, COLECOES.pilotos, [
        {
          caminho: 'nome',
          mensagem:
            `Já existe piloto com este nome: ${quem}. Se for a mesma pessoa, edite o cadastro existente ` +
            '(cadastro duplicado divide vitórias e histórico). Se for outra pessoa, marque "Não é a mesma pessoa" e salve de novo.',
        },
      ])
    }
  }
  return data
}

export const buscaPiloto: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  Object.assign(data, await derivadosPiloto(req, { ...data, id: originalDoc?.id }))
  // Campo virtual de confirmação não é guardado
  delete data.confirmarNaoDuplicado
  return data
}

/** Piloto renomeado: atualiza os títulos das inscrições ("#33 Nome · Categoria · 2026"). */
export const propagarNomePiloto: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (operation !== 'update' || !mudouAlgum(doc, previousDoc, ['nome', 'nomeExibicao'])) return doc
  await atualizarDerivados(req, COLECOES.inscricoes, { piloto: { equals: doc.id } })
  return doc
}
