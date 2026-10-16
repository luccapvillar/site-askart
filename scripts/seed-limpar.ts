/**
 * Remove os dados de demonstração (npm run seed:limpar): tudo o que tem o prefixo "[DEMONSTRAÇÃO]".
 * Fotos e logos enviadas continuam na Mídia (são fotos reais, com crédito). Desliga a faixa de prévia.
 */
import { getPayload, type CollectionSlug, type Payload, type Where } from 'payload'
import config from '../src/payload.config'
import { publicarPorPadrao } from './comum'

const DEMO = '[DEMONSTRAÇÃO]'
const contexto = { semRevalidar: true, semRegistro: true }
const tem = (campo: string): Where => ({ [campo]: { like: DEMO } })

async function ids(payload: Payload, collection: CollectionSlug, where: Where) {
  const { docs } = await payload.find({ collection, where, limit: 0, pagination: false, depth: 0, trash: true })
  return docs.map((d) => d.id)
}

/**
 * Conteúdo editorial sai pela API normal (leva junto as versões). A competição sai direto do banco:
 * as travas do painel (ex.: "corrida com resultado não pode ser excluída") protegem dados reais, não
 * a limpeza de um conjunto de demonstração inteiro, removido na ordem certa.
 */
async function apagar(payload: Payload, collection: CollectionSlug, where: Where, direto = false) {
  const lista = await ids(payload, collection, where)
  if (!lista.length) return
  if (direto) await payload.db.deleteMany({ collection, where: { id: { in: lista } } })
  else for (const id of lista) await payload.delete({ collection, id, context: contexto, trash: false } as never)
  payload.logger.info(`${collection}: ${lista.length} removido(s)`)
}

async function principal() {
  const payload = publicarPorPadrao(await getPayload({ config }))
  const temporadas = await ids(payload, 'temporadas', tem('nome'))
  const etapas = temporadas.length ? await ids(payload, 'etapas', { temporada: { in: temporadas } }) : []

  // Campeonato fica (nome real); só perde a temporada atual de demonstração
  const campeonatos = temporadas.length ? await ids(payload, 'campeonatos', { temporadaAtual: { in: temporadas } }) : []
  for (const id of campeonatos) {
    await payload.update({ collection: 'campeonatos', id, data: { temporadaAtual: null, descricao: null, historia: null }, context: contexto })
  }

  await apagar(payload, 'avisos', tem('titulo'))
  await apagar(payload, 'noticias', tem('titulo'))
  await apagar(payload, 'galerias', tem('titulo'))
  if (etapas.length) await apagar(payload, 'corridas', { etapa: { in: etapas } }, true)
  if (temporadas.length) {
    await apagar(payload, 'etapas', { temporada: { in: temporadas } }, true)
    await apagar(payload, 'inscricoes', { temporada: { in: temporadas } }, true)
    await apagar(payload, 'temporada-categorias', { temporada: { in: temporadas } }, true)
    await apagar(payload, 'temporadas', { id: { in: temporadas } }, true)
  }
  await apagar(payload, 'horarios-treino', tem('observacao'), true)
  await apagar(payload, 'treinos', tem('observacao'), true)
  await apagar(payload, 'tipos-treino', tem('nome'), true)
  await apagar(payload, 'pilotos', tem('nome'), true)
  await apagar(payload, 'equipes', tem('nome'), true)
  await apagar(payload, 'categorias', tem('nome'), true)
  await apagar(payload, 'regras-pontuacao', tem('nome'), true)
  await apagar(payload, 'categorias-noticia', tem('nome'))
  await apagar(payload, 'perguntas', tem('pergunta'))
  await apagar(payload, 'paginas', tem('titulo'))

  // Textos de exemplo dos globais
  const contato = await payload.findGlobal({ slug: 'contato', depth: 0 })
  await payload.updateGlobal({
    slug: 'contato',
    context: contexto,
    data: {
      endereco: { ...contato.endereco, texto: contato.endereco?.texto?.includes(DEMO) ? null : contato.endereco?.texto },
      horarios: (contato.horarios ?? []).filter((h) => !h.dias?.includes(DEMO)),
      redes: (contato.redes ?? []).filter((r) => !r.usuario?.includes(DEMO)),
    },
  })
  const contem = (v: unknown) => JSON.stringify(v ?? '').includes(DEMO)
  const kartodromo = await payload.findGlobal({ slug: 'kartodromo', depth: 0 })
  await payload.updateGlobal({
    slug: 'kartodromo',
    context: contexto,
    data: {
      historia: contem(kartodromo.historia) ? null : kartodromo.historia,
      comoTreinarIntroducao: contem(kartodromo.comoTreinarIntroducao) ? null : kartodromo.comoTreinarIntroducao,
    },
  })
  const institucional = await payload.findGlobal({ slug: 'institucional', depth: 0 })
  await payload.updateGlobal({
    slug: 'institucional',
    context: contexto,
    data: { sobre: contem(institucional.sobre) ? null : institucional.sobre },
  })
  await payload.updateGlobal({ slug: 'configuracoes', context: contexto, data: { faixaDemonstracao: false } })
  payload.logger.info('Pronto: dados de demonstração removidos. Confira o contato provisório (+55 61 00000-0000) no painel.')
}

try {
  await principal()
  process.exit(0)
} catch (erro) {
  console.error(erro)
  process.exit(1)
}
