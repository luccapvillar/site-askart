/**
 * Dados de DEMONSTRAÇÃO para a prévia (npm run seed:demo). Nunca rode em produção.
 *
 * Regras (docs/ARQUITETURA.md §2): nenhum dado oficial inventado. Tudo o que não foi informado pelo
 * cliente leva o prefixo "[DEMONSTRAÇÃO]" (pilotos, categorias, equipes, etapas, notícias…) e sai com
 * `npm run seed:limpar`. Fatos confirmados entram sem prefixo: nome do kartódromo, BKS — Brasília Kart
 * Series, taxas de pista e de ambulância (valor "R$ X"), IZY Pass como canal de compra.
 * O único contato fictício é +55 61 00000-0000, marcado sozinho como provisório.
 */
import { getPayload, type Payload } from 'payload'
import config from '../src/payload.config'
import { textoParaLexical } from '../src/collections/conteudo/editores'
import { contexto, criarSessoesDeExemplo, DEMO, emBrasilia, fotosOficiais, type Id, publicarPorPadrao } from './comum'

const d = (texto: string) => `${DEMO} ${texto}`
const ANO = 2026

/** Embaralhamento determinístico (mesma ordem a cada execução). */
function embaralhar<T>(lista: T[], semente: number): T[] {
  const copia = [...lista]
  let s = semente
  for (let i = copia.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

export async function semearDemonstracao(payload: Payload) {
  const existente = await payload.find({ collection: 'temporadas', where: { nome: { like: DEMO } }, limit: 1, depth: 0 })
  if (existente.totalDocs > 0) {
    payload.logger.info('Os dados de demonstração já existem. Para recriar: npm run seed:limpar && npm run seed:demo')
    return
  }
  // Depois de uma limpeza, a implantação não recarrega exemplos por cima dos dados reais
  const marca = (await payload.findGlobal({ slug: 'configuracoes', depth: 0 })).demonstracaoCarregadaEm
  if (marca && process.env.FORCAR_DEMO !== '1') {
    payload.logger.info(`Exemplos já foram carregados em ${marca} e depois removidos: nada a fazer (FORCAR_DEMO=1 para carregar de novo).`)
    return
  }
  const fotos = await fotosOficiais(payload)

  payload.logger.info('Campeonato, temporada e categorias…')
  let bks = (await payload.find({ collection: 'campeonatos', where: { sigla: { equals: 'BKS' } }, limit: 1, depth: 0 })).docs[0]
  if (!bks) throw new Error('Rode antes: npm run dados:oficiais (cria o BKS, as categorias e a grade).')
  bks = await payload.update({
    collection: 'campeonatos',
    id: bks.id,
    context: contexto,
    data: {
      descricao: textoParaLexical(`${DEMO} Apresentação do campeonato. A ASKART vai escrever este texto.`) as never,
      historia: textoParaLexical(
        `${DEMO} Aqui entra a história do BKS: quando começou, como evoluiu e os campeões de cada ano. A ASKART vai escrever este texto.`,
      ) as never,
    },
  })

  // Categorias reais (grade oficial); pilotos, equipes e resultados são exemplos
  const categorias: Id[] = []
  // Subcategorias oficiais de cada categoria (F400 e 125cc têm; Cadete e Mirim não), para distribuir os pilotos de exemplo
  const subcategoriasDe = new Map<Id, string[]>()
  for (const nome of ['F400', '125cc', 'Cadete', 'Mirim']) {
    const c = (await payload.find({ collection: 'categorias', where: { nome: { equals: nome } }, limit: 1, depth: 0 })).docs[0]
    if (!c) continue
    categorias.push(c.id as Id)
    subcategoriasDe.set(c.id as Id, (c.subcategorias ?? []).map((s) => s.nome?.trim() ?? '').filter(Boolean))
  }

  const regra = await payload.create({
    collection: 'regras-pontuacao',
    context: contexto,
    data: {
      nome: d('Regra de pontuação de exemplo'),
      tabelas: [{ nome: 'Final', pontos: [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4] }],
      pontosPole: 0,
      pontosVoltaRapida: 0,
      pontosParticipacao: 0,
      abandono: 'pela-posicao',
      convidados: 'reclassificar-elegiveis',
      criteriosDesempate: [{ criterio: 'mais-vitorias' }, { criterio: 'contagem-de-posicoes' }],
    },
  })

  const temporada = await payload.create({
    collection: 'temporadas',
    context: contexto,
    data: {
      campeonato: bks.id,
      ano: ANO,
      nome: d(`BKS ${ANO}`),
      status: 'em-andamento',
      categorias,
      regra: regra.id,
      fonteDados: 'resultados',
      formatoEtapa: [{ nome: 'Final', tipo: 'final', tabela: 'Final', contaParaClassificacao: true, fator: 1 }],
      visibilidade: 'visivel',
    },
  })
  await payload.update({ collection: 'campeonatos', id: bks.id, data: { temporadaAtual: temporada.id }, context: contexto })

  // Classificações (criadas sozinhas pela temporada): publicar
  const classificacoes = await payload.find({ collection: 'temporada-categorias', where: { temporada: { equals: temporada.id } }, depth: 0 })
  for (const c of classificacoes.docs) {
    await payload.update({ collection: 'temporada-categorias', id: c.id, data: { publicada: true }, context: contexto })
  }

  payload.logger.info('Equipes, pilotos e inscrições…')
  const equipes: Id[] = []
  for (let i = 1; i <= 4; i++) {
    const e = await payload.create({
      collection: 'equipes',
      context: contexto,
      data: { nome: d(`Equipe ${i}`), cidade: 'Brasília', uf: 'DF', visibilidade: 'visivel' },
    })
    equipes.push(e.id as Id)
  }
  const numeros = [7, 12, 21, 33, 44, 5, 18, 27, 9, 14, 30, 42, 3, 23, 11, 77, 8, 16, 25, 31, 2, 19, 55, 70, 4, 10, 15, 22, 28, 36, 51, 88]
  const inscricoesPorCategoria = new Map<Id, Id[]>()
  let p = 0
  for (const [ci, categoria] of categorias.entries()) {
    const lista: Id[] = []
    const subcategorias = subcategoriasDe.get(categoria) ?? []
    for (let i = 0; i < 8; i++) {
      p++
      const piloto = await payload.create({
        collection: 'pilotos',
        context: contexto,
        data: { nome: d(`Piloto ${String(p).padStart(2, '0')}`), cidade: 'Brasília', uf: 'DF', visibilidade: 'visivel' },
      })
      const inscricao = await payload.create({
        collection: 'inscricoes',
        context: contexto,
        data: {
          temporada: temporada.id,
          categoria,
          piloto: piloto.id,
          numero: numeros[ci * 8 + i],
          // Exemplo: os 8 pilotos divididos entre as subcategorias da categoria (F400: 2, 2, 1, 2, 1; 125cc: 2 em cada)
          ...(subcategorias.length ? { subcategoria: subcategorias[Math.floor((i * subcategorias.length) / 8)] } : {}),
          equipe: equipes[(i + ci) % equipes.length],
          condicao: 'titular',
          status: 'ativa',
        },
      })
      lista.push(inscricao.id as Id)
    }
    inscricoesPorCategoria.set(categoria, lista)
  }

  payload.logger.info('Etapas, corridas e resultados…')
  const datas = ['2026-03-22', '2026-05-17', '2026-07-19', '2026-09-20', '2026-11-08', '2026-12-06']
  const horarios = ['09:00', '10:15', '11:30', '12:45']
  const etapas: Id[] = []
  for (const [i, dia] of datas.entries()) {
    const realizada = i < 4
    const etapa = await payload.create({
      collection: 'etapas',
      context: contexto,
      data: {
        temporada: temporada.id,
        numero: i + 1,
        nome: d(`${i + 1}ª etapa`),
        inicio: emBrasilia(dia, '08:00'),
        fim: emBrasilia(dia, '14:00'),
        status: realizada ? 'confirmada' : 'agendada',
        categorias,
        local: 'Kartódromo Ayrton Senna do Guará',
        imagem: [fotos.grid, fotos.panning, fotos.curva42, fotos.pelotao, fotos.chuva, fotos.curvaAberta][i],
        descricao: textoParaLexical(`${DEMO} Informações da etapa (programação, inscrições e avisos) aparecem aqui.`) as never,
        visibilidade: 'visivel',
      },
    })
    etapas.push(etapa.id as Id)
    // Etapas futuras: F400 e 125cc com Warm-up, Classificação, Corrida 1 e Corrida 2 de cada subcategoria, cada
    // uma no seu horário (exemplo para o seletor "Escolha a subcategoria"); as demais categorias, a Final
    const porSubcategoria = realizada
      ? []
      : categorias.map((id) => ({ id, subcategorias: subcategoriasDe.get(id) ?? [] })).filter((c) => c.subcategorias.length > 0)
    if (porSubcategoria.length) await criarSessoesDeExemplo(payload, { id: etapa.id as Id, inicio: etapa.inicio as string }, porSubcategoria)
    for (const [ci, categoria] of categorias.entries()) {
      if (porSubcategoria.some((c) => c.id === categoria)) continue
      const inscritos = inscricoesPorCategoria.get(categoria) ?? []
      const ordem = embaralhar(inscritos, (i + 1) * 31 + ci * 7)
      await payload.create({
        collection: 'corridas',
        context: contexto,
        data: {
          etapa: etapa.id,
          categorias: [categoria],
          nome: 'Final',
          tipo: 'final',
          tabela: 'Final',
          contaParaClassificacao: true,
          fator: 1,
          status: realizada ? 'oficial' : 'rascunho',
          inicio: emBrasilia(dia, horarios[ci]),
          voltasPrevistas: 20,
          resultados: realizada
            ? ordem.map((inscricao, pos) => ({
                inscricao,
                posicaoChegada: pos + 1,
                status: pos === ordem.length - 1 && i === 2 ? ('abandono' as const) : ('classificado' as const),
                voltas: pos === ordem.length - 1 && i === 2 ? 12 : 20,
                // Melhor volta de exemplo (ms): sobe com a posição, com variação — nem sempre o vencedor tem a mais rápida
                melhorVoltaMs: 50_000 + ci * 1_500 + pos * 110 + ((pos * 7_919 + i * 104_729 + ci * 31) % 640),
              }))
            : [],
        },
      })
    }
  }

  payload.logger.info('Notícias e comunicado…')
  const catBks = await payload.create({ collection: 'categorias-noticia', context: contexto, data: { nome: d('BKS') } })
  const catKartodromo = await payload.create({ collection: 'categorias-noticia', context: contexto, data: { nome: d('Kartódromo') } })
  const noticias = [
    {
      titulo: d('Resultado da 4ª etapa do BKS'),
      subtitulo: 'Exemplo de notícia de resultado, ligada à etapa: aparece também na página da etapa.',
      capa: fotos.pelotao,
      categoria: catBks.id,
      etapa: etapas[3],
      publicarEm: emBrasilia('2026-09-21', '10:00'),
    },
    {
      titulo: d('Inscrições abertas para a 5ª etapa'),
      subtitulo: 'Exemplo de anúncio com link para a compra na IZY Pass.',
      capa: fotos.grid,
      categoria: catBks.id,
      etapa: etapas[4],
      publicarEm: emBrasilia('2026-10-10', '09:00'),
    },
    {
      titulo: d('Exemplo de aviso do kartódromo'),
      subtitulo: 'Exemplo de aviso do kartódromo para os pilotos.',
      capa: fotos.curvaAberta,
      categoria: catKartodromo.id,
      publicarEm: emBrasilia('2026-10-02', '18:00'),
    },
    {
      titulo: d('Como foi a 3ª etapa, com pista molhada'),
      subtitulo: 'Exemplo de notícia com fotos.',
      capa: fotos.chuva,
      categoria: catBks.id,
      etapa: etapas[2],
      publicarEm: emBrasilia('2026-07-20', '12:00'),
    },
  ]
  for (const n of noticias) {
    await payload.create({
      collection: 'noticias',
      context: contexto,
      draft: false,
      data: {
        ...n,
        conteudo: textoParaLexical(
          `${DEMO} Este é um texto de exemplo para mostrar como as notícias aparecem no site.\n\nO moderador escreve a notícia no painel, escolhe a foto de capa e publica na hora ou programa a publicação para outro dia.`,
        ) as never,
        visibilidade: 'visivel',
        _status: 'published',
      },
    })
  }

  // Avisos: nenhum de exemplo (o cliente quer a aba vazia até o moderador publicar)

  payload.logger.info('Textos de exemplo e contato provisório…')
  await payload.updateGlobal({ slug: 'configuracoes', context: contexto, data: { faixaDemonstracao: true } })
  // Campo travado para o painel: gravado direto no banco
  await payload.db.updateGlobal({ slug: 'configuracoes', data: { demonstracaoCarregadaEm: new Date().toISOString() } as never })
  await payload.updateGlobal({
    slug: 'contato',
    context: contexto,
    data: {
      canais: [
        { tipo: 'whatsapp', rotulo: 'Contato provisório', valor: '+55 61 00000-0000', exibirEm: ['rodape', 'contato', 'kartodromo', 'bks'] },
        { tipo: 'telefone', rotulo: 'Contato provisório', valor: '+55 61 00000-0000', exibirEm: ['contato', 'kartodromo'] },
      ],
      redes: [{ rede: 'instagram', usuario: d('@perfil'), url: 'https://www.instagram.com/', referente: 'askart' }],
    },
  })
  await payload.updateGlobal({
    slug: 'kartodromo',
    context: contexto,
    data: {
      historia: textoParaLexical(`${DEMO} A história do Kartódromo Ayrton Senna do Guará entra aqui. A ASKART vai escrever este texto.`) as never,
    },
  })
  await payload.updateGlobal({
    slug: 'institucional',
    context: contexto,
    data: { sobre: textoParaLexical(`${DEMO} Texto de apresentação da ASKART. A diretoria vai escrever este texto.`) as never },
  })

  payload.logger.info('Pronto: dados de demonstração criados.')
}

async function principal() {
  if (process.env.NODE_ENV === 'production' && process.env.PERMITIR_DEMO !== '1') {
    throw new Error('Dados de demonstração não entram em produção. Para uma prévia, defina PERMITIR_DEMO=1.')
  }
  const payload = publicarPorPadrao(await getPayload({ config }))
  await semearDemonstracao(payload)
  process.exit(0)
}

try {
  await principal()
} catch (erro) {
  console.error(erro)
  process.exit(1)
}
