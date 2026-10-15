import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { AgendaTreinos } from '@/components/site/AgendaTreinos'
import { BotaoIzy, DataEtapa, dataPorExtenso, LinkMapa, NomeEtapa, Programacao, SeloEtapa } from '@/components/site/bks/pecas'
import { Botao } from '@/components/site/Botao'
import { Canais } from '@/components/site/Canais'
import { CartaoNoticia, GradeCartoes } from '@/components/site/Cartoes'
import { ContagemRegressiva } from '@/components/site/ContagemRegressiva'
import { Foto, imagemDoCartao } from '@/components/site/Foto'
import { Galeria } from '@/components/site/Galeria'
import s from '@/components/site/inicio/Inicio.module.css'
import { PlacaNumero } from '@/components/site/PlacaNumero'
import { Perguntas } from '@/components/site/Perguntas'
import { Taxas } from '@/components/site/Taxas'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TituloSecao } from '@/components/site/TituloSecao'
import { atributosDoLink, type ValorLink } from '@/fields/link'
import { ORDEM_PADRAO_INICIO } from '@/globals/ordem-inicio'
import { formatarData, formatarDataExtenso } from '@/lib/datas'
import { fotosDaGaleria } from '@/lib/galeria'
import {
  comoDoc,
  lerAgenda,
  lerAvisos,
  lerBks,
  lerCategorias,
  lerClassificacoes,
  lerConfiguracoes,
  lerContato,
  lerEtapas,
  lerGalerias,
  lerKartodromo,
  lerNoticias,
  lerPaginaInicial,
  lerPerguntas,
  lerProgramacao,
} from '@/lib/publico'
import { canaisDoContato, ingressosDaEtapa, mapaDaEtapa, proximaEtapa } from '@/lib/site'
import type { CategoriasNoticia, Galeria as TipoGaleria, Midia, PaginaInicial, Piloto } from '@/payload-types'

export const revalidate = 60

export const metadata: Metadata = {}

type Bloco = NonNullable<PaginaInicial['secoes']>[number]

/** Botão de uma seção: o configurado no painel ou o padrão. */
function BotaoSecao({ bloco, padrao }: { bloco?: Bloco; padrao: { href: string; texto: string } }) {
  const link = (bloco as { botao?: ValorLink } | undefined)?.botao
  const attrs = atributosDoLink(link)
  const texto = link?.rotulo?.trim() || padrao.texto
  return (
    <Botao href={attrs?.href ?? padrao.href} variante="contorno" seta pequeno externo={attrs?.target === '_blank'}>
      {texto}
    </Botao>
  )
}

const tituloDe = (bloco: Bloco | undefined, padrao: string) => (bloco as { titulo?: string | null } | undefined)?.titulo?.trim() || padrao
const subtituloDe = (bloco: Bloco | undefined) => (bloco as { subtitulo?: string | null } | undefined)?.subtitulo?.trim() || null
const quantidadeDe = (bloco: Bloco | undefined, padrao: number) => (bloco as { quantidade?: number | null } | undefined)?.quantidade || padrao

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
  const programacaoProxima = proxima ? await lerProgramacao([proxima.id]) : []

  // Seções na ordem do painel (ou a padrão, enquanto ninguém configurou)
  const blocos: Bloco[] = inicio.secoes?.length
    ? inicio.secoes.filter((b) => (b as { ativo?: boolean | null }).ativo !== false)
    : ORDEM_PADRAO_INICIO.map((blockType) => ({ blockType, ativo: true }) as Bloco)

  const blocoProxima = blocos.find((b) => b.blockType === 'proxima-etapa') as { contagem?: boolean | null } | undefined
  const nomeCampeonato = bks?.campeonato.nome || 'Brasília Kart Series'
  const titulo = inicio.topo?.titulo?.trim() || `${nomeCampeonato}${temporada ? ` ${temporada.ano}` : ''}`
  const subtitulo =
    inicio.topo?.subtitulo?.trim() ||
    `Campeonato organizado pela ${config.sigla || 'ASKART'} no ${kartodromo.nome || 'Kartódromo Ayrton Senna do Guará'}, em Brasília.`
  const fotoTopo = comoDoc<Midia>(inicio.topo?.imagem) ?? comoDoc<Midia>(bks?.campeonato.banner)
  const botoes = (inicio.topo?.botoes ?? []).map((b) => ({ attrs: atributosDoLink(b.link as ValorLink), texto: (b.link as ValorLink)?.rotulo }))

  const secoes: Record<string, (b: Bloco) => Promise<ReactNode> | ReactNode> = {
    'proxima-etapa': () => null, // fica no topo da página
    lideres: (b) => <Lideres bloco={b} temporada={temporada?.id ?? null} />,
    calendario: (b) => <Calendario bloco={b} etapas={etapas} proximaId={proxima?.id ?? null} />,
    noticias: (b) => <Noticias bloco={b} />,
    comunicados: (b) => <Comunicados bloco={b} />,
    treinos: (b) => <Treinos bloco={b} />,
    kartodromo: (b) => <SecaoKartodromo bloco={b} />,
    ingressos: (b) => <Ingressos bloco={b} href={ingressosDaEtapa(proxima, config)} textoBotao={semDemo(config.izyPassTexto)} />,
    'galeria-destaque': (b) => <GaleriaDestaque bloco={b} />,
    perguntas: (b) => <SecaoPerguntas bloco={b} />,
    contato: (b) => <SecaoContato bloco={b} />,
    pilotos: (b) => <PilotosDestaque bloco={b} />,
    apoiadores: (b) => <Apoiadores bloco={b} />,
  }

  return (
    <>
      <section className={s.topo} aria-labelledby="titulo-inicio">
        <Foto midia={fotoTopo} className={s.topoFoto} prioridade sizes="100vw" alt="" />
        <div className={`conteiner ${s.topoGrade}`}>
          <div className={s.topoTextos}>
            <p className="rotulo">{config.sigla || 'ASKART'} · Kart em Brasília</p>
            <h1 id="titulo-inicio" className="titulo-marca h1">
              {titulo}
            </h1>
            <p className={s.topoSub}>{subtitulo}</p>
            <div className={s.topoBotoes}>
              {botoes.length
                ? botoes.map((b, i) =>
                    b.attrs ? (
                      <Botao key={i} href={b.attrs.href} variante={i === 0 ? 'destaque' : 'contorno'} externo={b.attrs.target === '_blank'}>
                        {b.texto || 'Saiba mais'}
                      </Botao>
                    ) : null,
                  )
                : (
                    <>
                      <Botao href="/bks" variante="destaque" seta>
                        Calendário {temporada?.ano ?? ''}
                      </Botao>
                      <Botao href="/bks/classificacao" variante="contorno">
                        Classificação
                      </Botao>
                    </>
                  )}
            </div>
          </div>

          {blocoProxima && (
            <aside className={s.proxima} aria-labelledby="proxima-etapa">
              <p className="rotulo">Próxima etapa</p>
              {proxima ? (
                <>
                  <div className={s.proximaCabeca}>
                    <DataEtapa etapa={proxima} grande />
                    <div>
                      <h2 id="proxima-etapa" className="h3">
                        <NomeEtapa etapa={proxima} />
                      </h2>
                      <p className={s.proximaMeta}>
                        <SeloEtapa status={proxima.status} /> {dataPorExtenso(proxima)}
                      </p>
                      {proxima.local && <p className={s.proximaMeta}>{proxima.local}</p>}
                    </div>
                  </div>
                  {proxima.inicio && blocoProxima?.contagem !== false && (
                    <ContagemRegressiva alvo={proxima.inicio} textoAlternativo={formatarDataExtenso(proxima.inicio)} claro />
                  )}
                  <details className={s.proximaProgramacao}>
                    <summary>Horários por categoria</summary>
                    <Programacao corridas={programacaoProxima} />
                  </details>
                  <div className={s.proximaAcoes}>
                    <BotaoIzy href={ingressosDaEtapa(proxima, config)} texto={semDemo(config.izyPassTexto)} />
                    <LinkMapa href={mapaDaEtapa(proxima, contato)} />
                  </div>
                </>
              ) : (
                <p id="proxima-etapa">O calendário da próxima temporada será divulgado em breve.</p>
              )}
            </aside>
          )}
        </div>
      </section>

      {await Promise.all(
        blocos.map(async (b, i) => {
          const render = secoes[b.blockType]
          if (!render) return null
          const conteudo = await render(b)
          return conteudo ? <div key={`${b.blockType}-${i}`}>{conteudo}</div> : null
        }),
      )}
    </>
  )
}

/* ───────────────────────────── seções ───────────────────────────── */

async function Lideres({ bloco, temporada }: { bloco: Bloco; temporada: number | null }) {
  if (!temporada) return null
  const classificacoes = (await lerClassificacoes(temporada)).filter((c) => c.lider)
  if (!classificacoes.length) return null
  const categorias = await lerCategorias(classificacoes.map((c) => Number(c.categoria)))
  const porId = new Map(categorias.map((c) => [String(c.id), c]))
  const demo = classificacoes.some((c) => semDemo(c.lider?.linha.nome) !== c.lider?.linha.nome)
  return (
    <section className="secao fundo-branco" aria-labelledby="lideres">
      <div className="conteiner">
        <TituloSecao
          id="lideres"
          rotulo="Classificação"
          titulo={tituloDe(bloco, 'Líderes por categoria')}
          subtitulo={subtituloDe(bloco)}
          acao={<BotaoSecao bloco={bloco} padrao={{ href: '/bks/classificacao', texto: 'Classificação completa' }} />}
        />
        {demo && <p className={s.notaDemo}>Nomes e pontos de exemplo (demonstração).</p>}
        <ul className={s.lideres}>
          {classificacoes.slice(0, quantidadeDe(bloco, 6)).map((c) => {
            const cat = porId.get(String(c.categoria))
            const lider = c.lider!.linha
            const segundo = c.linhas[1]
            return (
              <li key={String(c.categoria)} className={s.lider} style={{ borderTopColor: cat?.cor ?? 'var(--marca-primaria)' }}>
                <p className="rotulo">{semDemo(cat?.nome) || 'Categoria'}</p>
                <div className={s.liderNome}>
                  <PlacaNumero numero={lider.numero} cor={cat?.cor} tamanho="m" />
                  <div>
                    <strong>{semDemo(lider.nome)}</strong>
                    {lider.equipeNome && <span className="texto-2">{semDemo(lider.equipeNome)}</span>}
                  </div>
                </div>
                <p className={s.liderPontos}>
                  <span className="mono">{lider.pontos}</span> pts
                  {segundo && <span className="texto-2"> · {lider.pontos - segundo.pontos} à frente do 2º</span>}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function Calendario({ bloco, etapas, proximaId }: { bloco: Bloco; etapas: Awaited<ReturnType<typeof lerEtapas>>; proximaId: number | null }) {
  if (!etapas.length) return null
  return (
    <section className="secao" aria-labelledby="calendario-inicio">
      <div className="conteiner">
        <TituloSecao
          id="calendario-inicio"
          rotulo="BKS"
          titulo={tituloDe(bloco, 'Calendário da temporada')}
          subtitulo={subtituloDe(bloco)}
          acao={<BotaoSecao bloco={bloco} padrao={{ href: '/bks', texto: 'Horários de cada etapa' }} />}
        />
        <ol className={s.linhaTempo}>
          {etapas.map((e) => (
            <li key={e.id} className={`${s.marco} ${e.id === proximaId ? s.marcoProximo : ''} ${e.status === 'realizada' ? s.marcoFeito : ''}`}>
              <Link href={e.status === 'realizada' ? `/bks/resultados/${e.numero}` : `/etapas/${e.id}`}>
                <DataEtapa etapa={e} />
                <span className={s.marcoNome}>
                  {e.numero}ª etapa
                  {e.id === proximaId && <span className={s.marcoTag}>Próxima</span>}
                </span>
                <span className={s.marcoStatus}>{e.status === 'realizada' ? 'Ver resultado' : e.status === 'cancelada' ? 'Cancelada' : 'Programação'}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

async function Noticias({ bloco }: { bloco: Bloco }) {
  const { docs } = await lerNoticias(quantidadeDe(bloco, 3))
  if (!docs.length) return null
  return (
    <section className="secao fundo-branco" aria-labelledby="noticias-inicio">
      <div className="conteiner">
        <TituloSecao
          id="noticias-inicio"
          rotulo="Notícias e anúncios"
          titulo={tituloDe(bloco, 'Últimas notícias')}
          subtitulo={subtituloDe(bloco)}
          acao={<BotaoSecao bloco={bloco} padrao={{ href: '/noticias', texto: 'Todas as notícias' }} />}
        />
        <GradeCartoes>
          {docs.map((n) => (
            <CartaoNoticia
              key={n.id}
              href={`/noticias/${n.slug}`}
              titulo={semDemo(n.titulo)}
              resumo={n.subtitulo}
              data={n.publicarEm ? formatarData(n.publicarEm) : ''}
              categoria={semDemo(comoDoc<CategoriasNoticia>(n.categoria)?.nome) || null}
              imagem={imagemDoCartao(n.capa)}
            />
          ))}
        </GradeCartoes>
      </div>
    </section>
  )
}

async function Comunicados({ bloco }: { bloco: Bloco }) {
  const avisos = await lerAvisos(quantidadeDe(bloco, 3))
  if (!avisos.length) return null
  return (
    <section className="secao-compacta" aria-labelledby="comunicados-inicio">
      <div className="conteiner">
        <TituloSecao id="comunicados-inicio" rotulo="Oficial" titulo={tituloDe(bloco, 'Comunicados')} subtitulo={subtituloDe(bloco)} />
        <ul className={s.comunicados}>
          {avisos.map((a) => (
            <li key={a.id}>
              <Link href={`/comunicados/${a.id}`}>
                <span className="mono texto-2">{a.publicarEm ? formatarData(a.publicarEm) : ''}</span>
                <strong>
                  <TextoDemo texto={a.titulo} />
                </strong>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

async function Treinos({ bloco }: { bloco: Bloco }) {
  const dias = await lerAgenda(2)
  return (
    <section className="secao" aria-labelledby="treinos-inicio">
      <div className="conteiner">
        <TituloSecao
          id="treinos-inicio"
          rotulo="Kartódromo"
          titulo={tituloDe(bloco, 'Treinos de hoje e amanhã')}
          subtitulo={subtituloDe(bloco)}
          acao={<BotaoSecao bloco={bloco} padrao={{ href: '/kartodromo#treinos', texto: 'Tabela de treinos' }} />}
        />
        <AgendaTreinos dias={dias.map((d) => ({ ...d, horarios: d.horarios.map((h) => ({ ...h, tipo: semDemo(h.tipo), observacao: semDemo(h.observacao) || null, categorias: h.categorias.map(semDemo) })) }))} semana textoSemHorario="Sem treinos programados neste dia." />
      </div>
    </section>
  )
}

async function SecaoKartodromo({ bloco }: { bloco: Bloco }) {
  const kartodromo = await lerKartodromo()
  const foto = comoDoc<Midia>(kartodromo.imagemTopo)
  return (
    <section className="secao escuro" aria-labelledby="kartodromo-inicio">
      <div className={`conteiner ${s.kartodromo}`}>
        <div className={s.kartodromoFoto}>
          <Foto midia={foto} ate="destaque" sizes="(min-width: 900px) 50vw, 100vw" credito />
        </div>
        <div className={s.kartodromoTextos}>
          <TituloSecao id="kartodromo-inicio" rotulo="Onde tudo acontece" titulo={tituloDe(bloco, kartodromo.nome || 'Kartódromo')} subtitulo={subtituloDe(bloco) || kartodromo.resumo} />
          {(kartodromo.taxas?.length ?? 0) > 0 && <Taxas taxas={kartodromo.taxas ?? []} introducao={kartodromo.taxasIntroducao} />}
          <BotaoSecao bloco={bloco} padrao={{ href: '/kartodromo', texto: 'Como treinar no kartódromo' }} />
        </div>
      </div>
    </section>
  )
}

function Ingressos({ bloco, href, textoBotao }: { bloco: Bloco; href: string | null; textoBotao: string }) {
  return (
    <section className={s.ingressos} aria-labelledby="ingressos-inicio">
      <div className={`conteiner ${s.ingressosConteudo}`}>
        <div>
          <h2 id="ingressos-inicio" className="titulo-marca h2">
            {tituloDe(bloco, 'Treinos livres e corridas')}
          </h2>
          <p>{subtituloDe(bloco) || 'A compra dos treinos livres e das corridas de cada etapa é feita pela IZY Pass.'}</p>
        </div>
        <BotaoIzy href={href} texto={textoBotao} claro />
      </div>
    </section>
  )
}

async function GaleriaDestaque({ bloco }: { bloco: Bloco }) {
  const escolhida = comoDoc<TipoGaleria>((bloco as { galeria?: unknown }).galeria)
  const galeria = escolhida?.fotos ? escolhida : (await lerGalerias(undefined, 1))[0]
  if (!galeria) return null
  const fotos = fotosDaGaleria(galeria).slice(0, 7)
  if (!fotos.length) return null
  return (
    <section className="secao" aria-labelledby="galeria-inicio">
      <div className="conteiner">
        <TituloSecao
          id="galeria-inicio"
          rotulo="Fotos"
          titulo={tituloDe(bloco, semDemo(galeria.titulo) || 'Galeria')}
          subtitulo={subtituloDe(bloco)}
          acao={<BotaoSecao bloco={bloco} padrao={{ href: `/galeria/${galeria.slug}`, texto: 'Ver galeria' }} />}
        />
        <Galeria fotos={fotos} exibicao="mosaico" />
      </div>
    </section>
  )
}

async function SecaoPerguntas({ bloco }: { bloco: Bloco }) {
  const perguntas = await lerPerguntas(['bks', 'kartodromo', 'geral'], quantidadeDe(bloco, 5))
  if (!perguntas.length) return null
  return (
    <section className="secao fundo-branco" aria-labelledby="perguntas-inicio">
      <div className={`conteiner ${s.perguntas}`}>
        <TituloSecao
          id="perguntas-inicio"
          rotulo="Dúvidas"
          titulo={tituloDe(bloco, 'Perguntas frequentes')}
          subtitulo={subtituloDe(bloco)}
          acao={<BotaoSecao bloco={bloco} padrao={{ href: '/contato#duvidas', texto: 'Mais dúvidas' }} />}
        />
        <Perguntas perguntas={perguntas} />
      </div>
    </section>
  )
}

async function SecaoContato({ bloco }: { bloco: Bloco }) {
  const contato = await lerContato()
  const canais = canaisDoContato(contato, 'contato')
  return (
    <section className="secao" aria-labelledby="contato-inicio">
      <div className={`conteiner ${s.contato}`}>
        <TituloSecao
          id="contato-inicio"
          rotulo="Fale com a ASKART"
          titulo={tituloDe(bloco, 'Contato')}
          subtitulo={subtituloDe(bloco) || semDemo(contato.endereco?.texto?.split('\n')[0])}
          acao={<BotaoSecao bloco={bloco} padrao={{ href: '/contato', texto: 'Todos os contatos' }} />}
        />
        <Canais canais={canais} />
      </div>
    </section>
  )
}

function PilotosDestaque({ bloco }: { bloco: Bloco }) {
  const pilotos = ((bloco as { pilotos?: unknown[] }).pilotos ?? []).map((p) => comoDoc<Piloto>(p)).filter((p): p is Piloto => p !== null)
  if (!pilotos.length) return null
  return (
    <section className="secao fundo-branco" aria-labelledby="pilotos-inicio">
      <div className="conteiner">
        <TituloSecao id="pilotos-inicio" rotulo="Pilotos" titulo={tituloDe(bloco, 'Pilotos em destaque')} subtitulo={subtituloDe(bloco)} />
        <ul className={s.pilotos}>
          {pilotos.map((p) => (
            <li key={p.id}>
              <Link href={`/pilotos/${p.slug}`} className={s.piloto}>
                <Foto midia={comoDoc<Midia>(p.foto)} ate="card" sizes="240px" />
                <strong>{semDemo(p.nomeExibicao || p.nome)}</strong>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Apoiadores({ bloco }: { bloco: Bloco }) {
  const lista = (bloco as { apoiadores?: { nome: string; logo?: unknown; url?: string | null }[] }).apoiadores ?? []
  if (!lista.length) return null
  return (
    <section className="secao-compacta fundo-branco" aria-labelledby="apoiadores-inicio">
      <div className="conteiner">
        <h2 id="apoiadores-inicio" className="rotulo texto-2">
          {tituloDe(bloco, 'Apoiadores')}
        </h2>
        <ul className={s.apoiadores}>
          {lista.map((a) => {
            const logo = <Foto midia={comoDoc<Midia>(a.logo)} ate="miniatura" sizes="160px" alt={a.nome} />
            return <li key={a.nome}>{a.url ? <a href={a.url} target="_blank" rel="noopener noreferrer">{logo}</a> : logo}</li>
          })}
        </ul>
      </div>
    </section>
  )
}

