/**
 * Dados de DEMONSTRAÇÃO para a prévia (npm run seed:demo). Nunca rode em produção.
 *
 * Regras (docs/ARQUITETURA.md §2): nenhum dado oficial inventado. Tudo o que não foi informado pelo
 * cliente leva o prefixo "[DEMONSTRAÇÃO]" (pilotos, categorias, equipes, etapas, notícias…) e sai com
 * `npm run seed:limpar`. Fatos confirmados entram sem prefixo: nome do kartódromo, BKS — Brasília Kart
 * Series, taxas de pista e de ambulância (valor "R$ X"), IZY Pass como canal de compra.
 * O único contato fictício é +55 61 00000-0000, marcado sozinho como provisório.
 */
import fs from 'node:fs'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'
import config from '../src/payload.config'
import { textoParaLexical } from '../src/collections/conteudo/editores'

export const DEMO = '[DEMONSTRAÇÃO]'
const d = (texto: string) => `${DEMO} ${texto}`
const contexto = { semRevalidar: true, semRegistro: true }
const raiz = process.cwd()
const ANO = 2026

type Id = number

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

/** Instante em Brasília (UTC−3) como ISO. */
const emBrasilia = (dia: string, hora: string) => new Date(`${dia}T${hora}:00-03:00`).toISOString()

async function enviarFoto(payload: Payload, arquivo: string, dados: { alt: string; credito?: string; legenda?: string }) {
  const filePath = path.join(raiz, arquivo)
  if (!fs.existsSync(filePath)) throw new Error(`Foto não encontrada: ${arquivo}`)
  // Reaproveita a foto se ela já foi enviada antes (seed:limpar mantém as fotos)
  const existente = await payload.find({ collection: 'midia', where: { alt: { equals: dados.alt } }, limit: 1, depth: 0 })
  if (existente.docs[0]) return existente.docs[0].id as Id
  const doc = await payload.create({ collection: 'midia', data: dados, filePath, context: contexto })
  return doc.id as Id
}

export async function semearDemonstracao(payload: Payload) {
  const existente = await payload.find({ collection: 'temporadas', where: { nome: { like: DEMO } }, limit: 1, depth: 0 })
  if (existente.totalDocs > 0) {
    payload.logger.info('Os dados de demonstração já existem. Para recriar: npm run seed:limpar && npm run seed:demo')
    return
  }
  payload.logger.info('Enviando fotos…')
  const creditoVM = 'Vinícius de Melo — Flickr (marcação de domínio público)'
  const creditoJH = 'Jaqueline Husni — Flickr (marcação de domínio público)'
  const fotos = {
    pelotao: await enviarFoto(payload, 'marca/fotos-livres/guara-2022-pelotao-reta.jpg', {
      alt: 'Três karts em fila na reta do Kartódromo do Guará durante uma corrida',
      credito: creditoJH,
    }),
    grid: await enviarFoto(payload, 'marca/fotos-livres/guara-2022-grid.jpg', {
      alt: 'Karts alinhados na reta antes da largada, com o comissário segurando a bandeira verde',
      credito: creditoJH,
    }),
    panning: await enviarFoto(payload, 'marca/fotos-livres/guara-2021-panning-30.jpg', {
      alt: 'Kart número 30 em alta velocidade passando pela zebra vermelha e branca',
      credito: creditoVM,
    }),
    curva42: await enviarFoto(payload, 'marca/fotos-livres/guara-2021-curva-42.jpg', {
      alt: 'Kart número 42 inclinado numa curva do kartódromo',
      credito: creditoVM,
    }),
    curvaAberta: await enviarFoto(payload, 'marca/fotos-livres/guara-2021-curva-aberta.jpg', {
      alt: 'Kart laranja contornando uma curva aberta do kartódromo',
      credito: creditoVM,
    }),
    aereo: await enviarFoto(payload, 'marca/recebidos/kartodromo-aereo-story.jpg', {
      alt: 'Vista aérea do Kartódromo Ayrton Senna do Guará',
    }),
    chuva: await enviarFoto(payload, 'marca/recebidos/largada-chuva.jpg', {
      alt: 'Largada de uma corrida de kart com pista molhada',
    }),
    logoAskart: await enviarFoto(payload, 'marca/recebidos/logo-askart-224.jpg', {
      alt: 'Logo da ASKART — Associação de Pilotos de Kart de Brasília',
    }),
    logoBks: await enviarFoto(payload, 'marca/recebidos/bks-logo-transparente.png', {
      alt: 'Logo do BKS — Brasília Kart Series',
    }),
  }

  payload.logger.info('Campeonato, temporada e categorias…')
  let bks = (await payload.find({ collection: 'campeonatos', where: { sigla: { equals: 'BKS' } }, limit: 1, depth: 0 })).docs[0]
  if (!bks) {
    bks = await payload.create({
      collection: 'campeonatos',
      context: contexto,
      data: {
        nome: 'Brasília Kart Series',
        sigla: 'BKS',
        logo: fotos.logoBks,
        banner: fotos.pelotao,
        cores: { primaria: '#D02D21', secundaria: '#0201B8', destaque: '#FFFFFF' },
        descricao: textoParaLexical(`${DEMO} Apresentação do campeonato. A ASKART vai escrever este texto.`) as never,
        historia: textoParaLexical(
          `${DEMO} Aqui entra a história do BKS: quando começou, como evoluiu e os campeões de cada ano. A ASKART vai escrever este texto.`,
        ) as never,
        visibilidade: 'visivel',
      },
    })
  }

  const categorias: Id[] = []
  for (const [i, letra] of ['A', 'B', 'C'].entries()) {
    const cat = await payload.create({
      collection: 'categorias',
      context: contexto,
      data: {
        nome: d(`Categoria ${letra}`),
        sigla: `CAT ${letra}`,
        cor: ['#3F8A47', '#0201B8', '#D02D21'][i],
        visibilidade: 'visivel',
      },
    })
    categorias.push(cat.id as Id)
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
  const numeros = [7, 12, 21, 33, 44, 5, 18, 27, 9, 14, 30, 42, 3, 23, 11, 77, 8, 16, 25, 31, 2, 19, 55, 70]
  const inscricoesPorCategoria = new Map<Id, Id[]>()
  let p = 0
  for (const [ci, categoria] of categorias.entries()) {
    const lista: Id[] = []
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
  const horarios = ['09:00', '10:30', '12:00']
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
    for (const [ci, categoria] of categorias.entries()) {
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
              }))
            : [],
        },
      })
    }
  }

  payload.logger.info('Agenda de treinos…')
  const tipoLivre = await payload.create({
    collection: 'tipos-treino',
    context: contexto,
    data: { nome: d('Treino livre'), cor: '#3F8A47' },
  })
  const grade: Array<{ diaSemana: 'quarta' | 'sexta' | 'sabado' | 'domingo'; inicio: string; fim: string; categorias: Id[] }> = [
    { diaSemana: 'quarta', inicio: '14:00', fim: '18:00', categorias: [categorias[0]] },
    { diaSemana: 'sexta', inicio: '14:00', fim: '18:00', categorias: [categorias[1], categorias[2]] },
    { diaSemana: 'sabado', inicio: '08:00', fim: '12:00', categorias },
    { diaSemana: 'domingo', inicio: '08:00', fim: '11:00', categorias: [categorias[0], categorias[1]] },
  ]
  for (const h of grade) {
    await payload.create({
      collection: 'horarios-treino',
      context: contexto,
      data: {
        diaSemana: h.diaSemana,
        horaInicio: h.inicio as never,
        horaFim: h.fim as never,
        categorias: h.categorias,
        tipo: tipoLivre.id,
        observacao: d('Horário de exemplo'),
        visibilidade: 'visivel',
      } as never,
    })
  }

  payload.logger.info('Galeria, notícias, comunicado e perguntas…')
  const galeria = await payload.create({
    collection: 'galerias',
    context: contexto,
    draft: false,
    data: {
      titulo: d('Fotos do kartódromo'),
      fotos: [fotos.aereo, fotos.pelotao, fotos.grid, fotos.panning, fotos.curva42, fotos.curvaAberta, fotos.chuva],
      capa: fotos.pelotao,
      exibicao: 'grade',
      tipo: 'kartodromo',
      campeonato: bks.id,
      descricao: 'Fotos do Kartódromo do Guará. Créditos em cada foto.',
      visibilidade: 'visivel',
      _status: 'published',
    },
  })

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
      titulo: d('Novo horário de treino aos domingos'),
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

  await payload.create({
    collection: 'avisos',
    context: contexto,
    draft: false,
    data: {
      titulo: d('Exemplo de comunicado oficial'),
      tipo: 'comunicado-oficial',
      nivel: 'informativo',
      destaque: true,
      texto: textoParaLexical(`${DEMO} Comunicados aparecem no topo do site enquanto estiverem válidos.`) as never,
      etapa: etapas[4],
      visibilidade: 'visivel',
      exibirAte: emBrasilia('2026-11-08', '18:00'),
      _status: 'published',
    },
  })

  const perguntas: Array<{ pergunta: string; resposta: string; secao: 'kartodromo' | 'bks' | 'geral' }> = [
    {
      pergunta: 'Quais taxas preciso pagar para andar na pista?',
      resposta: 'A taxa de pista e a taxa de ambulância são obrigatórias. Os valores estão na tabela de taxas desta página.',
      secao: 'kartodromo',
    },
    {
      pergunta: 'Onde vejo os horários de treino da minha categoria?',
      resposta: 'Na tabela de treinos da aba Kartódromo. Ela mostra os dias e horários de cada categoria e é atualizada pelo moderador.',
      secao: 'kartodromo',
    },
    {
      pergunta: 'Onde compro treinos livres e corridas do BKS?',
      resposta: 'Pela IZY Pass. O link fica na aba BKS e na página de cada etapa.',
      secao: 'bks',
    },
    {
      pergunta: 'Onde vejo a classificação e os resultados?',
      resposta: 'Na aba BKS: Classificação mostra a tabela de cada categoria; Resultados mostra o resultado de cada etapa.',
      secao: 'bks',
    },
  ]
  for (const q of perguntas) {
    await payload.create({
      collection: 'perguntas',
      context: contexto,
      data: { pergunta: d(q.pergunta), resposta: textoParaLexical(q.resposta) as never, secao: q.secao, visibilidade: 'visivel' },
    })
  }

  payload.logger.info('Configurações, contato, kartódromo e página inicial…')
  await payload.updateGlobal({
    slug: 'configuracoes',
    context: contexto,
    data: {
      logo: fotos.logoAskart,
      campeonatoPrincipal: bks.id,
      imagemCompartilhamento: fotos.pelotao,
      descricao:
        'ASKART — associação responsável pela administração do Kartódromo Ayrton Senna do Guará e pela organização dos campeonatos de kart de Brasília.',
      faixaDemonstracao: true,
    },
  })
  await payload.updateGlobal({
    slug: 'contato',
    context: contexto,
    data: {
      canais: [
        { tipo: 'whatsapp', rotulo: 'Contato provisório', valor: '+55 61 00000-0000', exibirEm: ['rodape', 'contato', 'kartodromo', 'bks'] },
        { tipo: 'telefone', rotulo: 'Contato provisório', valor: '+55 61 00000-0000', exibirEm: ['contato', 'kartodromo'] },
      ],
      endereco: {
        texto: `Kartódromo Ayrton Senna — Guará, Brasília/DF\n${DEMO} Endereço completo a confirmar pela ASKART.`,
        linkMapa: 'https://www.google.com/maps/search/?api=1&query=Kart%C3%B3dromo+Ayrton+Senna+Guar%C3%A1+Bras%C3%ADlia',
        imagemMapa: fotos.aereo,
      },
      horarios: [{ dias: d('Dias a confirmar'), horario: 'Horário a confirmar' }],
      redes: [{ rede: 'instagram', usuario: d('@perfil'), url: 'https://www.instagram.com/', referente: 'askart' }],
    },
  })
  await payload.updateGlobal({
    slug: 'kartodromo',
    context: contexto,
    data: {
      resumo: 'Kartódromo administrado pela ASKART, no Guará, em Brasília. Sede dos treinos e das etapas do BKS.',
      imagemTopo: fotos.aereo,
      historia: textoParaLexical(`${DEMO} A história do Kartódromo Ayrton Senna do Guará entra aqui. A ASKART vai escrever este texto.`) as never,
      galerias: [galeria.id],
      taxas: [
        { item: 'Taxa de pista', aConfirmar: true, obrigatoria: true },
        { item: 'Taxa de ambulância', aConfirmar: true, obrigatoria: true },
      ],
      comoTreinarIntroducao: textoParaLexical(`${DEMO} Passo a passo de exemplo. A ASKART vai revisar.`) as never,
      comoTreinar: [
        { titulo: 'Confira o horário da sua categoria', texto: 'Veja na tabela de treinos os dias e horários liberados para a sua categoria.' },
        { titulo: 'Pague as taxas obrigatórias', texto: 'Para andar na pista é obrigatório pagar a taxa de pista e a taxa de ambulância.' },
        { titulo: 'Tire as dúvidas antes de ir', texto: 'Fale com a ASKART pelos contatos desta página.' },
      ],
    },
  })
  await payload.updateGlobal({
    slug: 'institucional',
    context: contexto,
    data: {
      resumo:
        'A ASKART é a associação responsável pela administração do Kartódromo Ayrton Senna do Guará e pela organização dos campeonatos de kart de Brasília.',
      imagemTopo: fotos.grid,
      sobre: textoParaLexical(`${DEMO} Texto de apresentação da ASKART. A diretoria vai escrever este texto.`) as never,
      galeria: galeria.id,
    },
  })
  await payload.updateGlobal({
    slug: 'pagina-inicial',
    context: contexto,
    data: { topo: { imagem: fotos.pelotao } },
  })

  payload.logger.info('Pronto: dados de demonstração criados.')
}

async function principal() {
  if (process.env.NODE_ENV === 'production' && process.env.PERMITIR_DEMO !== '1') {
    throw new Error('Dados de demonstração não entram em produção. Para uma prévia, defina PERMITIR_DEMO=1.')
  }
  const payload = await getPayload({ config })
  await semearDemonstracao(payload)
  process.exit(0)
}

try {
  await principal()
} catch (erro) {
  console.error(erro)
  process.exit(1)
}
