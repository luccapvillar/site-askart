import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { fotosDasGalerias, criarEscolha } from '@/components/site/inicio/fotos'
import {
  Apoiadores,
  AvisosInicio,
  BlocoBks,
  Calendario,
  ChamadaKartodromo,
  ContatoInicio,
  FotosInicio,
  Ingressos,
  Lideres,
  LinkSecao,
  NoticiasInicio,
  PerguntasInicio,
  PilotosDestaque,
  type LiderInicio,
} from '@/components/site/inicio/Secoes'
import { CartaoProximaEtapa, TopoInicio, type BotaoTopo } from '@/components/site/inicio/Topo'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { atributosDoLink, type ValorLink } from '@/fields/link'
import { ORDEM_PADRAO_INICIO } from '@/globals/ordem-inicio'
import {
  comoDoc,
  lerAvisos,
  lerBks,
  lerCategorias,
  lerCategoriasDaModalidade,
  lerClassificacoes,
  lerConfiguracoes,
  lerContato,
  lerEtapas,
  lerGalerias,
  lerIdsCategoriasDeTreino,
  lerKartodromo,
  lerNoticias,
  lerPaginaInicial,
  lerPerguntas,
  lerProgramacao,
} from '@/lib/publico'
import {
  canaisDoContato,
  categoriasDaArea,
  eventoPublico,
  idsDasCategorias,
  mapaDaEtapa,
  proximaEtapa,
  ROTULO_MODALIDADE,
  situacaoDaEtapa,
} from '@/lib/site'
import { separarClassificacao } from '@/lib/subcategorias'
import type { Galeria, Midia, PaginaInicial, Piloto } from '@/payload-types'

export const revalidate = 60

export const metadata: Metadata = {}

type Bloco = NonNullable<PaginaInicial['secoes']>[number]

/* Campos comuns dos blocos do painel (título, subtítulo, botão, quantidade) */
const tituloDe = (bloco: Bloco | undefined, padrao: string) => (bloco as { titulo?: string | null } | undefined)?.titulo?.trim() || padrao
const subtituloDe = (bloco: Bloco | undefined) => (bloco as { subtitulo?: string | null } | undefined)?.subtitulo?.trim() || null
const quantidadeDe = (bloco: Bloco | undefined, padrao: number) => (bloco as { quantidade?: number | null } | undefined)?.quantidade || padrao

/** Botão de uma seção: o configurado no painel ou o padrão. */
function botaoDe(bloco: Bloco | undefined, padrao: { href: string; texto: string }) {
  const link = (bloco as { botao?: ValorLink } | undefined)?.botao
  const attrs = atributosDoLink(link)
  return { href: attrs?.href ?? padrao.href, texto: link?.rotulo?.trim() || padrao.texto, externo: attrs?.target === '_blank' }
}

function AcaoSecao({ bloco, padrao }: { bloco?: Bloco; padrao: { href: string; texto: string } }) {
  const b = botaoDe(bloco, padrao)
  return (
    <LinkSecao href={b.href} externo={b.externo}>
      {b.texto}
    </LinkSecao>
  )
}

/** Primeira linha do endereço ("Guará II, QE 25, Área Especial do CAVE"). */
const primeiraLinha = (texto: string | null | undefined) => semDemo(texto?.split('\n')[0]) || null

export default async function Inicio() {
  const [inicio, config, contato, kartodromo, bks] = await Promise.all([
    lerPaginaInicial(),
    lerConfiguracoes(),
    lerContato(),
    lerKartodromo(),
    lerBks(),
  ])
  const temporada = bks?.temporada ?? null
  const etapas = temporada ? await lerEtapas(temporada.id) : []
  const proxima = proximaEtapa(etapas)

  // Seções na ordem do painel (ou a padrão, enquanto ninguém configurou)
  const configuradas = inicio.secoes?.length ? inicio.secoes : ORDEM_PADRAO_INICIO.map((blockType) => ({ blockType, ativo: true }) as Bloco)
  const blocos = configuradas.filter((b) => (b as { ativo?: boolean | null }).ativo !== false)
  const bloco = (tipo: string) => blocos.find((b) => b.blockType === tipo)

  /* ── fotos: todas do painel, sem repetir a mesma em dois blocos ── */
  const { escolher, reservar, mosaico } = criarEscolha()
  const escolhida = comoDoc<Galeria>((bloco('galeria-destaque') as { galeria?: unknown } | undefined)?.galeria)
  const galeriaDestaque = (escolhida?.fotos ? escolhida : null) ?? (await lerGalerias(undefined, 1))[0] ?? null
  const fotosGaleria = fotosDasGalerias([galeriaDestaque])
  const fotosKartodromo = fotosDasGalerias(kartodromo.galerias ?? [])
  const blocoNoticias = bloco('noticias')
  const noticias = blocoNoticias ? (await lerNoticias(quantidadeDe(blocoNoticias, 3))).docs : []
  // A foto escolhida no painel para o topo vale sempre que estiver deitada; senão, a primeira foto larga disponível
  const topoPainel = comoDoc<Midia>(inicio.topo?.imagem)
  const topoDeitada = Boolean(topoPainel?.url && (topoPainel.width ?? 0) > (topoPainel.height ?? 0))
  const fotoTopo = topoDeitada
    ? escolher([topoPainel], { largaObrigatoria: false })
    : escolher([bks?.campeonato.banner, ...fotosGaleria, topoPainel], { largaObrigatoria: false })
  reservar(noticias.map((n) => n.capa)) // as capas das notícias já aparecem na página
  const fotoBks = escolher([bks?.campeonato.banner, ...fotosGaleria, ...fotosKartodromo])
  const fotoKartodromo = escolher([kartodromo.imagemTopo, ...fotosKartodromo, ...fotosGaleria])

  /* ── topo ── */
  const nomeCampeonato = semDemo(bks?.campeonato.nome) || 'Brasília Kart Series'
  const nomeKartodromo = kartodromo.nome || 'Kartódromo Ayrton Senna do Guará'
  const titulo = inicio.topo?.titulo?.trim() || `${nomeCampeonato}${temporada?.ano ? ` ${temporada.ano}` : ''}`
  const subtitulo =
    inicio.topo?.subtitulo?.trim() ||
    `Calendário, classificação e resultados do campeonato organizado pela ${config.sigla || 'ASKART'} no ${nomeKartodromo}, em Brasília.`
  const botoesPainel: BotaoTopo[] = (inicio.topo?.botoes ?? [])
    .map((b): BotaoTopo | null => {
      const link = b.link as ValorLink
      const attrs = atributosDoLink(link)
      return attrs ? { href: attrs.href, texto: link?.rotulo?.trim() || 'Saiba mais', externo: attrs.target === '_blank' } : null
    })
    .filter((b): b is BotaoTopo => b !== null)
  const botoes: BotaoTopo[] = botoesPainel.length
    ? botoesPainel
    : [
        { href: '/bks', texto: temporada?.ano ? `Calendário ${temporada.ano}` : 'Calendário' },
        { href: '/bks/classificacao', texto: 'Classificação' },
      ]
  const blocoProxima = bloco('proxima-etapa') as (Bloco & { contagem?: boolean | null }) | undefined
  const cartaoProxima = blocoProxima ? (
    <CartaoProximaEtapa
      etapa={proxima}
      situacao={proxima ? situacaoDaEtapa(proxima) : null}
      mapa={proxima ? mapaDaEtapa(proxima, contato) : null}
      contagem={blocoProxima.contagem !== false}
      rotulo={tituloDe(blocoProxima, 'Próxima etapa')}
    />
  ) : null

  /* ── BKS: as duas áreas com as categorias de cada uma ── */
  const [profissionais, indoor, idsTreino, corridas] = await Promise.all([
    lerCategoriasDaModalidade('profissional'),
    lerCategoriasDaModalidade('indoor'),
    lerIdsCategoriasDeTreino(),
    lerProgramacao(etapas.map((e) => e.id)),
  ])
  const usadas = idsDasCategorias([...etapas, ...corridas])
  const treino = new Set(idsTreino)
  const areasBks = [
    {
      href: '/bks',
      titulo: ROTULO_MODALIDADE.profissional,
      texto: 'Calendário, classificação e resultados das categorias de karts profissionais.',
      categorias: categoriasDaArea(profissionais, 'profissional', usadas, treino),
    },
    {
      href: '/bks/indoor',
      titulo: ROTULO_MODALIDADE.indoor,
      texto: 'Calendário, classificação e resultados das categorias de karts indoor.',
      categorias: categoriasDaArea(indoor, 'indoor', usadas, treino),
    },
  ]
  const publico = eventoPublico(config)

  /* ── avisos no ar: na posição do bloco "Comunicados" ou, se ele não existir no painel, logo abaixo do topo ── */
  const temBlocoAvisos = configuradas.some((b) => b.blockType === 'comunicados')
  const blocoAvisos = bloco('comunicados')
  const avisos = temBlocoAvisos && !blocoAvisos ? [] : await lerAvisos(quantidadeDe(blocoAvisos, 3))
  const avisosNoTopo = !temBlocoAvisos ? (
    <AvisosInicio avisos={avisos} titulo="Avisos no ar" subtitulo="Comunicados oficiais da ASKART sobre treinos, etapas e o kartódromo." />
  ) : null

  /* ── kartódromo: uma chamada só, mesmo com os blocos "Treinos" e "Kartódromo" ligados (fica no lugar do último) ── */
  const indicesKart = blocos.map((b, i) => (b.blockType === 'treinos' || b.blockType === 'kartodromo' ? i : -1)).filter((i) => i >= 0)
  const indiceKart = indicesKart[indicesKart.length - 1] ?? -1

  const secoes: Record<string, (b: Bloco, i: number) => Promise<ReactNode> | ReactNode> = {
    'proxima-etapa': () => null, // fica no topo da página
    comunicados: (b) => <AvisosInicio avisos={avisos} titulo={tituloDe(b, 'Avisos no ar')} subtitulo={subtituloDe(b)} />,
    lideres: async (b) => {
      if (!temporada) return null
      // Regra do BKS (pontos por subcategoria): um líder por subcategoria, na ordem cadastrada na categoria.
      const lidas = await lerClassificacoes(temporada.id)
      const classificacoes = lidas.filter((c) => c.lider || c.porSubcategoria)
      if (!classificacoes.length) return null
      const categorias = await lerCategorias(classificacoes.map((c) => Number(c.categoria)))
      const porId = new Map(categorias.map((c) => [String(c.id), c]))
      const vantagem = (lider: { pontos: number }, segundo?: { pontos: number }) =>
        segundo ? Math.round((lider.pontos - segundo.pontos) * 10) / 10 : null
      const todos: LiderInicio[] = classificacoes.flatMap((c): LiderInicio[] => {
        const categoria = porId.get(String(c.categoria)) ?? null
        const separada = c.porSubcategoria ? separarClassificacao(c.linhas, categoria?.subcategorias, { pontosPorSubcategoria: true }) : null
        if (separada?.porSubcategoria && !c.lider) {
          return separada.grupos
            .filter((g) => (g.linhas[0]?.linha.pontos ?? 0) > 0)
            .map((g) => {
              const lider = g.linhas[0].linha
              return {
                chave: `${String(c.categoria)}-${g.chave}`,
                categoria,
                subcategoria: g.semSubcategoria ? null : g.nome,
                numero: lider.numero ?? null,
                nome: lider.nome,
                equipe: lider.equipeNome ?? null,
                pontos: lider.pontos,
                vantagem: vantagem(lider, g.linhas[1]?.linha),
              }
            })
        }
        if (!c.lider) return []
        const lider = c.lider.linha
        return [
          {
            chave: String(c.categoria),
            categoria,
            numero: lider.numero ?? null,
            nome: lider.nome,
            equipe: lider.equipeNome ?? null,
            pontos: lider.pontos,
            vantagem: vantagem(lider, c.linhas[1]),
          },
        ]
      })
      const lideres = todos.slice(0, quantidadeDe(b, 6))
      if (!lideres.length) return null
      return (
        <Lideres
          lideres={lideres}
          rotulo={`Classificação ${temporada.ano ?? ''}`.trim()}
          titulo={tituloDe(b, 'Líderes por categoria')}
          subtitulo={subtituloDe(b)}
          acao={<AcaoSecao bloco={b} padrao={{ href: '/bks/classificacao', texto: 'Classificação completa' }} />}
        />
      )
    },
    calendario: (b) => (
      <Calendario
        etapas={etapas}
        proximaId={proxima?.id ?? null}
        rotulo={`BKS ${temporada?.ano ?? ''}`.trim()}
        titulo={tituloDe(b, 'Calendário da temporada')}
        subtitulo={subtituloDe(b) || 'Toque numa etapa para ver os horários de cada categoria, a compra e a transmissão.'}
        acao={<AcaoSecao bloco={b} padrao={{ href: '/bks', texto: 'Calendário completo' }} />}
      />
    ),
    treinos: (b, i) => (i === indiceKart ? chamadaKartodromo(b) : null),
    kartodromo: (b, i) => (i === indiceKart ? chamadaKartodromo(b) : null),
    noticias: (b) => {
      return (
        <NoticiasInicio
          noticias={b === blocoNoticias ? noticias : []}
          titulo={tituloDe(b, 'Últimas notícias')}
          subtitulo={subtituloDe(b)}
          acao={<AcaoSecao bloco={b} padrao={{ href: '/noticias', texto: 'Todas as notícias' }} />}
        />
      )
    },
    ingressos: (b) => (
      <Ingressos
        href={config.izyPass || null}
        titulo={tituloDe(b, 'Etapas e treinos livres pela IZY Pass')}
        texto={subtituloDe(b) || 'A compra das etapas e dos treinos livres do BKS é feita pela IZY Pass.'}
        textoBotao={semDemo(config.izyPassTexto) || 'Comprar na IZY Pass'}
      />
    ),
    'galeria-destaque': (b) =>
      galeriaDestaque ? (
        <FotosInicio
          fotos={mosaico(fotosGaleria)}
          titulo={tituloDe(b, '') || <TextoDemo texto={galeriaDestaque.titulo} />}
          subtitulo={subtituloDe(b)}
          acao={<AcaoSecao bloco={b} padrao={{ href: `/galeria/${galeriaDestaque.slug}`, texto: 'Ver todas as fotos' }} />}
        />
      ) : null,
    perguntas: async (b) => (
      <PerguntasInicio
        perguntas={await lerPerguntas(['bks', 'kartodromo', 'geral'], quantidadeDe(b, 5))}
        titulo={tituloDe(b, 'Perguntas frequentes')}
        subtitulo={subtituloDe(b) || 'Respostas rápidas sobre treinos, taxas e o campeonato.'}
        acao={<AcaoSecao bloco={b} padrao={{ href: '/contato#duvidas', texto: 'Ver todas as dúvidas' }} />}
      />
    ),
    contato: (b) => (
      <ContatoInicio
        canais={canaisDoContato(contato, 'contato')}
        local={nomeKartodromo}
        endereco={semDemo(contato.endereco?.texto) || null}
        mapa={contato.endereco?.linkMapa || null}
        redes={(contato.redes ?? []).map((r) => ({ rede: r.rede, url: r.url, usuario: r.usuario }))}
        titulo={tituloDe(b, 'Contato')}
        subtitulo={subtituloDe(b)}
        acao={<AcaoSecao bloco={b} padrao={{ href: '/contato', texto: 'Todos os contatos' }} />}
      />
    ),
    pilotos: (b) => (
      <PilotosDestaque
        pilotos={((b as { pilotos?: unknown[] }).pilotos ?? []).map((p) => comoDoc<Piloto>(p)).filter((p): p is Piloto => p !== null)}
        titulo={tituloDe(b, 'Pilotos em destaque')}
        subtitulo={subtituloDe(b)}
      />
    ),
    apoiadores: (b) => (
      <Apoiadores
        titulo={tituloDe(b, 'Apoiadores')}
        lista={((b as { apoiadores?: { nome: string; logo?: unknown; url?: string | null }[] }).apoiadores ?? []).map((a) => ({
          nome: a.nome,
          logo: comoDoc<Midia>(a.logo),
          url: a.url,
        }))}
      />
    ),
  }

  /** Chamada do kartódromo (título, texto e botão podem ser trocados no painel). */
  function chamadaKartodromo(b: Bloco) {
    const padraoBotao = { href: '/kartodromo#grade', texto: 'Ver a grade de treinos' }
    return (
      <ChamadaKartodromo
        foto={fotoKartodromo}
        nome={nomeKartodromo}
        titulo={tituloDe(b, 'Treino quase todos os dias')}
        texto={
          subtituloDe(b) ||
          'A pista abre para treinos em quase todos os dias da semana, com horários definidos para cada categoria. O kartódromo é só para treinos e corridas: não há aluguel de karts.'
        }
        endereco={primeiraLinha(contato.endereco?.texto)}
        botao={botaoDe(b, padraoBotao)}
      />
    )
  }

  const conteudo = await Promise.all(
    blocos.map(async (b, i) => {
      const render = secoes[b.blockType]
      if (!render) return null
      const no = await render(b, i)
      return no ? <div key={`${b.blockType}-${i}`}>{no}</div> : null
    }),
  )

  return (
    <>
      <TopoInicio
        foto={fotoTopo}
        logo={bks?.logo ?? null}
        rotulo={`${nomeKartodromo} · Brasília/DF`}
        titulo={titulo}
        subtitulo={subtitulo}
        botoes={botoes}
        proxima={cartaoProxima}
      />
      {avisosNoTopo}
      <BlocoBks foto={fotoBks} nome={nomeCampeonato} ano={temporada?.ano ?? null} areas={areasBks} eventoPublico={publico?.texto ?? null} />
      {conteudo}
    </>
  )
}
