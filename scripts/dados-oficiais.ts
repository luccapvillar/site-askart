/**
 * Dados CONFIRMADOS (npm run dados:oficiais) — entram também no site oficial.
 *
 * Fontes: grade oficial de treinos do Kartódromo do Guará (ASKART + Secretaria de Esporte e Lazer, enviada pelo
 * cliente em 16/10/2026); informações publicadas pela equipe Pro Kart Racing (uso autorizado pelo cliente):
 * taxa de ambulância de R$ 50,00 por piloto por dia de treino, endereço, turmas de iniciantes por idade e regra
 * de horários; informações do cliente: o kartódromo é só para treinos e corridas (sem aluguel de kart), há treino
 * quase todos os dias, BKS = Brasília Kart Series, taxa de pista (valor ainda não informado: "R$ X"); a categoria
 * "Kart indoor" com as subcategorias informadas (só os nomes) e o texto do evento aberto ao público (food trucks,
 * telão, mesas e cadeiras, narrador).
 *
 * Roda uma vez só (marca em Configurações): depois disso, o moderador é dono dos dados e nada é sobrescrito.
 */
import { getPayload, type Payload } from 'payload'
import config from '../src/payload.config'
import { CATEGORIAS_INDOOR_OFICIAIS } from '../src/collections/competicao/Categorias'
import { textoParaLexical } from '../src/collections/conteudo/editores'
import { ITENS_EVENTO_PUBLICO_PADRAO, TEXTO_EVENTO_PUBLICO_PADRAO } from '../src/globals/Configuracoes'
import { CORES_BKS } from '../src/lib/site'
import { contexto, fotosOficiais, type Id, SUBCATEGORIAS, publicarPorPadrao } from './comum'

type Dia = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo'

/** Turmas da grade oficial, com as cores do documento da ASKART. */
const TURMAS = {
  mc: { nome: 'Mirim / Cadete', cor: '#2E9E4F', categorias: ['Mirim', 'Cadete'] },
  mci: {
    nome: 'Mirim / Cadete (iniciante)',
    cor: '#1E88E5',
    categorias: ['Mirim', 'Cadete'],
    descricao: 'Para pilotos de 5 a 11 anos que ainda não têm experiência no kart ou na pista.',
  },
  c125: { nome: '125cc', cor: '#F2D100', categorias: ['125cc'] },
  f400: { nome: 'F400', cor: '#E0261B', categorias: ['F400'] },
  ini: {
    nome: '125cc / F400 (iniciante)',
    cor: '#8C8C8C',
    categorias: ['125cc', 'F400'],
    descricao: 'Para pilotos a partir de 12 anos que ainda não têm experiência no kart ou na pista.',
  },
  livre: { nome: '125cc / F400 (livre)', cor: '#D9D9D9', categorias: ['125cc', 'F400'] },
  f400camp: { nome: 'F400 (campeonato)', cor: '#E0261B', categorias: ['F400'] },
  f400livre: { nome: 'F400 (livre)', cor: '#E0261B', categorias: ['F400'] },
  moto: { nome: 'Moto', cor: '#D9D9D9', categorias: ['Moto'] },
  fechada: { nome: 'Pista fechada', cor: '#4A4A4A', categorias: [] as string[] },
} as const

type Turma = keyof typeof TURMAS
type Linha = [string, string, Turma]

/** Grade semanal oficial (início, término, turma). */
const GRADE: Record<Dia, Linha[]> = {
  segunda: [
    ['08:00', '10:00', 'ini'],
    ['10:00', '12:00', 'mci'],
    ['12:00', '18:00', 'fechada'],
  ],
  terca: [
    ['08:00', '09:00', 'livre'],
    ['09:00', '10:00', 'mc'],
    ['10:00', '11:00', 'mci'],
    ['11:00', '12:00', 'c125'],
    ['12:00', '13:30', 'f400'],
    ['13:30', '14:30', 'mc'],
    ['14:30', '15:20', 'ini'],
    ['15:20', '16:10', 'c125'],
    ['16:10', '17:10', 'mci'],
    ['17:10', '18:00', 'c125'],
  ],
  quarta: [
    ['08:00', '09:00', 'moto'],
    ['09:00', '10:00', 'mc'],
    ['10:00', '11:00', 'ini'],
    ['11:00', '12:00', 'f400'],
    ['12:00', '13:30', 'c125'],
    ['13:30', '14:20', 'mci'],
    ['14:20', '15:10', 'ini'],
    ['15:10', '16:00', 'c125'],
    ['16:00', '17:00', 'mc'],
    ['17:00', '18:00', 'f400'],
  ],
  quinta: [
    ['08:00', '09:00', 'livre'],
    ['09:00', '10:00', 'mc'],
    ['10:00', '11:00', 'mci'],
    ['11:00', '12:00', 'c125'],
    ['12:00', '13:30', 'f400'],
    ['13:30', '14:30', 'mc'],
    ['14:30', '15:20', 'ini'],
    ['15:20', '16:10', 'c125'],
    ['16:10', '17:10', 'mci'],
    ['17:10', '18:00', 'c125'],
  ],
  sexta: [
    ['08:00', '09:00', 'moto'],
    ['09:00', '10:00', 'mc'],
    ['10:00', '11:00', 'ini'],
    ['11:00', '12:00', 'f400'],
    ['12:00', '13:30', 'c125'],
    ['13:30', '14:20', 'mci'],
    ['14:20', '15:10', 'ini'],
    ['15:10', '16:00', 'c125'],
    ['16:00', '17:00', 'mc'],
    ['17:00', '18:00', 'f400'],
  ],
  sabado: [
    ['08:00', '09:20', 'c125'],
    ['09:20', '10:20', 'mc'],
    ['10:20', '11:20', 'f400camp'],
    ['11:20', '12:20', 'f400livre'],
    ['12:20', '13:20', 'mci'],
    ['13:20', '14:20', 'c125'],
    ['14:20', '15:20', 'ini'],
    ['15:20', '16:20', 'mc'],
    ['16:20', '17:20', 'mci'],
    ['17:20', '18:00', 'f400'],
  ],
  domingo: [
    ['08:00', '09:30', 'c125'],
    ['09:30', '11:00', 'f400'],
    ['11:00', '12:00', 'mci'],
    ['12:00', '13:00', 'mc'],
    ['13:00', '14:00', 'ini'],
  ],
}

const ENDERECO = 'Guará II, QE 25, Área Especial do CAVE\nGuará, Brasília/DF — CEP 71025-500'
const MAPA = 'https://www.google.com/maps/search/?api=1&query=Kart%C3%B3dromo+do+Guar%C3%A1+QE+25+Guar%C3%A1+II+Bras%C3%ADlia'

const PERGUNTAS: Array<{ pergunta: string; resposta: string; secao: 'kartodromo' | 'bks' | 'geral' }> = [
  {
    pergunta: 'O kartódromo aluga karts?',
    resposta: 'Não. O Kartódromo do Guará é usado só para treinos e corridas; não há aluguel de karts.',
    secao: 'kartodromo',
  },
  {
    pergunta: 'Quais taxas preciso pagar para andar na pista?',
    resposta:
      'A taxa de ambulância (R$ 50,00 por piloto, por dia de treino) e a taxa de pista são obrigatórias. O pagamento é feito na Administração do Kartódromo, antes de entrar na pista.',
    secao: 'kartodromo',
  },
  {
    pergunta: 'Nunca andei de kart. Qual horário devo escolher?',
    resposta:
      'Os horários de iniciantes: Mirim / Cadete (iniciante), para pilotos de 5 a 11 anos, e 125cc / F400 (iniciante), para pilotos a partir de 12 anos.',
    secao: 'kartodromo',
  },
  {
    pergunta: 'Posso começar o treino antes ou terminar depois do horário?',
    resposta: 'Não. Os horários são definidos pela Administração do Kartódromo e não há tolerância para antecipar ou atrasar o início ou o fim de cada treino.',
    secao: 'kartodromo',
  },
  {
    pergunta: 'Onde vejo os horários de treino da minha categoria?',
    resposta: 'Na grade de treinos da aba Kartódromo. Há treino de segunda a domingo; escolha a sua categoria para ver só os seus horários.',
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

async function buscarOuCriar(payload: Payload, collection: 'categorias' | 'tipos-treino', nome: string, dados: Record<string, unknown>) {
  const achado = await payload.find({ collection, where: { nome: { equals: nome } }, limit: 1, depth: 0 })
  if (achado.docs[0]) return achado.docs[0].id as Id
  const doc = await payload.create({ collection, context: contexto, data: { nome, ...dados } as never })
  return doc.id as Id
}

export async function carregarDadosOficiais(payload: Payload) {
  const configuracoes = await payload.findGlobal({ slug: 'configuracoes', depth: 0 })
  if ((configuracoes as { dadosOficiaisEm?: string | null }).dadosOficiaisEm) {
    payload.logger.info('Dados oficiais já carregados antes: nada a fazer (o moderador é dono deles).')
    return
  }

  payload.logger.info('Fotos e logos…')
  const fotos = await fotosOficiais(payload)

  payload.logger.info('Categorias e turmas da grade de treinos…')
  const categorias = new Map<string, Id>()
  const CORES_CATEGORIA: Record<string, string> = { Mirim: '#2E9E4F', Cadete: '#1E88E5', '125cc': '#F2D100', F400: '#E0261B', Moto: '#8C8C8C' }
  for (const nome of ['Mirim', 'Cadete', '125cc', 'F400', 'Moto']) {
    const subcategorias = (SUBCATEGORIAS[nome] ?? []).map((s) => ({ nome: s }))
    categorias.set(
      nome,
      await buscarOuCriar(payload, 'categorias', nome, { cor: CORES_CATEGORIA[nome], visibilidade: 'visivel', subcategorias, modalidade: 'profissional' }),
    )
  }
  // Kart indoor: UMA categoria com as subcategorias informadas pelo cliente (só os nomes; sem cor, não informada).
  // Os nomes das subcategorias são os mesmos das antigas categorias indoor separadas.
  await buscarOuCriar(payload, 'categorias', 'Kart indoor', {
    visibilidade: 'visivel',
    modalidade: 'indoor',
    subcategorias: CATEGORIAS_INDOOR_OFICIAIS.map((s) => ({ nome: s })),
  })
  const turmas = new Map<Turma, Id>()
  for (const [chave, t] of Object.entries(TURMAS) as [Turma, (typeof TURMAS)[Turma]][]) {
    turmas.set(chave, await buscarOuCriar(payload, 'tipos-treino', t.nome, { cor: t.cor, descricao: 'descricao' in t ? t.descricao : undefined }))
  }

  payload.logger.info('Grade semanal oficial…')
  const jaTem = await payload.count({ collection: 'horarios-treino' })
  if (jaTem.totalDocs === 0) {
    for (const [dia, linhas] of Object.entries(GRADE) as [Dia, Linha[]][]) {
      for (const [inicio, fim, turma] of linhas) {
        await payload.create({
          collection: 'horarios-treino',
          context: contexto,
          data: {
            diaSemana: dia,
            horaInicio: inicio,
            horaFim: fim,
            categorias: TURMAS[turma].categorias.map((c) => categorias.get(c)!),
            tipo: turmas.get(turma)!,
            visibilidade: 'visivel',
          } as never,
        })
      }
    }
  }

  payload.logger.info('BKS, galeria e textos confirmados…')
  let bks = (await payload.find({ collection: 'campeonatos', where: { sigla: { equals: 'BKS' } }, limit: 1, depth: 0 })).docs[0]
  bks ??= await payload.create({
    collection: 'campeonatos',
    context: contexto,
    data: {
      nome: 'Brasília Kart Series',
      sigla: 'BKS',
      logo: fotos.logoBks,
      banner: fotos.pelotao,
      // Cores da logo: azul royal (principal), vermelho (apoio) e branco (destaque)
      cores: { ...CORES_BKS },
      visibilidade: 'visivel',
    },
  })
  const galeria = await payload.create({
    collection: 'galerias',
    context: contexto,
    draft: false,
    data: {
      titulo: 'Kartódromo do Guará',
      fotos: [fotos.aereo, fotos.pelotao, fotos.grid, fotos.panning, fotos.curva42, fotos.curvaAberta, fotos.chuva],
      capa: fotos.pelotao,
      exibicao: 'mosaico',
      tipo: 'kartodromo',
      campeonato: bks.id,
      descricao: 'Fotos do Kartódromo Ayrton Senna do Guará. Créditos em cada foto.',
      visibilidade: 'visivel',
      _status: 'published',
    },
  })

  for (const q of PERGUNTAS) {
    await payload.create({
      collection: 'perguntas',
      context: contexto,
      data: { pergunta: q.pergunta, resposta: textoParaLexical(q.resposta) as never, secao: q.secao, visibilidade: 'visivel' },
    })
  }

  await payload.updateGlobal({
    slug: 'configuracoes',
    context: contexto,
    data: {
      logo: fotos.logoAskart,
      campeonatoPrincipal: bks.id,
      imagemCompartilhamento: fotos.pelotao,
      descricao:
        'ASKART — associação responsável pela administração do Kartódromo Ayrton Senna do Guará e pela organização dos campeonatos de kart de Brasília.',
      textoEventoPublico: TEXTO_EVENTO_PUBLICO_PADRAO,
      itensEventoPublico: ITENS_EVENTO_PUBLICO_PADRAO.map((i) => ({ ...i })),
    },
  })
  const contato = await payload.findGlobal({ slug: 'contato', depth: 0 })
  await payload.updateGlobal({
    slug: 'contato',
    context: contexto,
    data: { endereco: { ...contato.endereco, texto: ENDERECO, linkMapa: MAPA, imagemMapa: fotos.aereo } },
  })
  await payload.updateGlobal({
    slug: 'kartodromo',
    context: contexto,
    data: {
      resumo:
        'Kartódromo administrado pela ASKART, no Guará, em Brasília. Tem treino quase todos os dias da semana e recebe as etapas do BKS. Uso exclusivo para treinos e corridas — não há aluguel de karts.',
      imagemTopo: fotos.aereo,
      galerias: [galeria.id],
      taxasIntroducao:
        'Para andar na pista são obrigatórias a taxa de ambulância e a taxa de pista. O pagamento é feito na Administração do Kartódromo, antes de entrar na pista.',
      taxas: [
        { item: 'Taxa de ambulância', valor: 50, aConfirmar: false, obrigatoria: true, observacao: 'Por piloto, por dia de treino' },
        { item: 'Taxa de pista', aConfirmar: true, obrigatoria: true },
      ],
      comoTreinar: [
        {
          titulo: 'Escolha o horário da sua turma',
          texto:
            'Veja a grade de treinos. Quem está começando deve escolher os horários de iniciantes: Mirim / Cadete (iniciante), de 5 a 11 anos, e 125cc / F400 (iniciante), a partir de 12 anos.',
        },
        {
          titulo: 'Pague as taxas na Administração',
          texto: 'Antes de entrar na pista, pague a taxa de ambulância (R$ 50,00 por piloto, por dia de treino) e a taxa de pista na Administração do Kartódromo.',
        },
        {
          titulo: 'Respeite o horário da turma',
          texto: 'Os horários são definidos pela Administração do Kartódromo e não há tolerância para antecipar ou atrasar o início ou o fim do treino.',
        },
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
      galeria: galeria.id,
    },
  })
  await payload.updateGlobal({ slug: 'pagina-inicial', context: contexto, data: { topo: { imagem: fotos.pelotao } } })

  // Campo travado para o painel: gravado direto no banco
  await payload.db.updateGlobal({ slug: 'configuracoes', data: { dadosOficiaisEm: new Date().toISOString() } as never })
  payload.logger.info('Pronto: dados oficiais carregados.')
}

try {
  const payload = publicarPorPadrao(await getPayload({ config }))
  await carregarDadosOficiais(payload)
  process.exit(0)
} catch (erro) {
  console.error(erro)
  process.exit(1)
}
