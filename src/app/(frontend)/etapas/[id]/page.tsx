import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MatrizesDaModalidade, resultadoComCategorias } from '@/components/site/bks/AreaResultados'
import b from '@/components/site/bks/Bks.module.css'
import {
  chaveDaCategoria,
  DataEtapa,
  dataPorExtenso,
  LinkMapa,
  mapaDeSubcategorias,
  NomeEtapa,
  nomeDaEtapa,
  opcoesDeSubcategoria,
  Programacao,
  SeloEtapa,
} from '@/components/site/bks/pecas'
import { SeletorSubcategoria } from '@/components/site/bks/SeletorSubcategoria'
import { Etiquetas } from '@/components/site/base/Etiquetas'
import { Botao } from '@/components/site/Botao'
import { CartaoNoticia, GradeCartoes } from '@/components/site/Cartoes'
import { CompraETreinos, EventoPublico, FaixaJaOcorreu, transmissoesVisiveis } from '@/components/site/etapa/BlocosEtapa'
import e from '@/components/site/etapa/Etapa.module.css'
import { Transmissoes } from '@/components/site/etapa/TransmissaoEtapa'
import { Galeria } from '@/components/site/Galeria'
import { imagemDoCartao } from '@/components/site/Foto'
import { Secao, Sumario, TopoPagina } from '@/components/site/paginas/TopoPagina'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico } from '@/components/site/TextoRico'
import { formatarData, formatarHora } from '@/lib/datas'
import { creditosDasFotos, fotosDaGaleria } from '@/lib/galeria'
import { comoDoc, lerBks, lerConfiguracoes, lerContato, lerConteudoDaEtapa, lerEtapa, lerProgramacao, lerResultadosEtapa } from '@/lib/publico'
import { caminhoDaArea, corridaNaModalidade, eventoPublico, mapaDaEtapa, modalidadeDe, modalidadesDaEtapa, ROTULO_MODALIDADE, situacaoDaEtapa } from '@/lib/site'
import type { Campeonato, Categoria, CategoriasNoticia, Midia, Temporada } from '@/payload-types'

export const revalidate = 60
export const dynamicParams = true
export const generateStaticParams = async () => []

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const etapa = await lerEtapa(Number((await params).id))
  if (!etapa) return { title: 'Etapa não encontrada' }
  const t = comoDoc<Temporada>(etapa.temporada)
  return {
    title: `${semDemo(nomeDaEtapa(etapa))}${t ? ` — ${t.ano}` : ''}`,
    description: `${dataPorExtenso(etapa)}${etapa.local ? ` · ${semDemo(etapa.local)}` : ''}: ingressos, treinos livres, transmissão ao vivo e programação por categoria.`,
  }
}

/**
 * Página da etapa. Antes da etapa, nesta ordem: comprar a etapa, comprar os treinos livres, a grade horária
 * dos treinos livres e a transmissão (karts profissionais e karts indoor). Depois da etapa as compras somem
 * sozinhas e aparece "Esta etapa já ocorreu em …"; a transmissão continua (a gravação fica no link) e
 * entra o resultado (matriz por subcategoria, com o melhor tempo de cada sessão em roxo). A regra está em
 * situacaoDaEtapa (src/lib/site.ts).
 */
export default async function PaginaEtapa({ params }: Props) {
  const id = Number((await params).id)
  if (!Number.isInteger(id)) notFound()
  const etapa = await lerEtapa(id)
  if (!etapa) notFound()
  const [config, contato, bks, programacao, resultado, conteudo] = await Promise.all([
    lerConfiguracoes(),
    lerContato(),
    lerBks(),
    lerProgramacao([etapa.id]),
    lerResultadosEtapa(etapa.id),
    lerConteudoDaEtapa(etapa.id),
  ])
  const temporada = comoDoc<Temporada>(etapa.temporada)
  const campeonato = comoDoc<Campeonato>(temporada?.campeonato) ?? bks?.campeonato ?? null
  // Programação e resultado agrupados por modalidade (karts profissionais e karts indoor), só as que têm dados
  const modalidadesProgramacao = modalidadesDaEtapa(etapa, programacao)
  const { comCorridas: comResultado, porId } = await resultadoComCategorias(etapa.id)
  const modalidadesResultado = modalidadesDaEtapa({ categorias: comResultado.map((c) => porId.get(String(c.categoria)) ?? { id: c.categoria }) })
  const temResultado = comResultado.length > 0
  // Antes da etapa: compra, treinos livres e grade. Depois: o aviso no lugar (a página se atualiza a cada minuto).
  const situacao = situacaoDaEtapa(etapa)
  const publico = situacao.antes ? eventoPublico(config) : null
  const mostrarTransmissao = transmissoesVisiveis(situacao).length > 0
  const temDescricao = Boolean((etapa.descricao as { root?: { children?: unknown[] } } | null)?.root?.children?.length)
  const categorias = (etapa.categorias ?? []).filter((c): c is Categoria => typeof c === 'object' && c !== null)
  const subcategorias = mapaDeSubcategorias(categorias)
  // Seletor "Escolha a subcategoria": as categorias da etapa (e as das corridas, se a etapa não as listar)
  const categoriasDasCorridas = programacao.flatMap((c) => (c.categorias ?? []).filter((x): x is Categoria => typeof x === 'object' && x !== null))
  const opcoesSeletor = opcoesDeSubcategoria([...categorias, ...categoriasDasCorridas])
  const comSeletor = programacao.length > 0 && opcoesSeletor.flatMap((g) => g.opcoes).length > 1
  const areaPrincipal = modalidadesProgramacao.includes('profissional') ? 'profissional' : 'indoor'
  const sigla = semDemo(campeonato?.sigla) || 'BKS'
  const mapa = mapaDaEtapa(etapa, contato)
  // Sem foto própria, a etapa usa a foto do campeonato
  const foto = comoDoc<Midia>(etapa.imagem) ?? comoDoc<Midia>(campeonato?.banner) ?? null

  // Fundo alternado entre as seções, na ordem em que aparecem
  let branca = true
  const proximoFundo = () => (branca = !branca)

  const sumario = [
    situacao.antes && { id: 'ingressos', rotulo: 'Ingressos e treinos livres' },
    mostrarTransmissao && { id: 'transmissao', rotulo: 'Transmissão' },
    publico && { id: 'publico', rotulo: 'Aberto ao público' },
    { id: 'programacao', rotulo: 'Programação' },
    temResultado && { id: 'resultado', rotulo: 'Resultado' },
    conteudo.galerias.length > 0 && { id: `fotos-${conteudo.galerias[0].id}`, rotulo: 'Fotos' },
    conteudo.noticias.length > 0 && { id: 'noticias', rotulo: 'Notícias' },
  ].filter((i): i is { id: string; rotulo: string } => Boolean(i))

  return (
    <>
      <TopoPagina
        trilha={[
          { rotulo: 'BKS', href: '/bks' },
          { rotulo: ROTULO_MODALIDADE[areaPrincipal], href: caminhoDaArea(areaPrincipal) },
          { rotulo: semDemo(nomeDaEtapa(etapa)) },
        ]}
        rotulo={`${sigla} ${temporada?.ano ?? ''} · ${etapa.numero}ª etapa`.replace(/\s+/g, ' ')}
        titulo={<NomeEtapa etapa={etapa} />}
        intro={
          <span className={e.topoMeta}>
            <SeloEtapa status={etapa.status} jaOcorreu={situacao.jaOcorreu} />
            <span>
              {dataPorExtenso(etapa)}
              {etapa.inicio && ` · ${formatarHora(etapa.inicio)}`}
            </span>
          </span>
        }
        foto={foto}
        acoes={
          situacao.linkCompra || mapa ? (
            <>
              {situacao.linkCompra && (
                <Botao href={situacao.linkCompra} externo seta variante="destaque">
                  Comprar esta etapa
                </Botao>
              )}
              <LinkMapa href={mapa} rotulo="Como chegar" claro />
            </>
          ) : undefined
        }
        lateral={
          <div className={e.ficha}>
            <DataEtapa etapa={etapa} grande apagada={situacao.jaOcorreu || situacao.cancelada} />
            <dl className={e.fichaDados}>
              <div>
                <dt>Data</dt>
                <dd>{dataPorExtenso(etapa)}</dd>
              </div>
              <div>
                <dt>Local</dt>
                <dd>{semDemo(etapa.local) || 'A definir'}</dd>
              </div>
              {categorias.length > 0 && (
                <div>
                  <dt>Categorias</dt>
                  <dd>
                    <Etiquetas rotulo="Categorias desta etapa" itens={categorias.map((c) => <TextoDemo key={c.id} texto={c.nome} />)} />
                  </dd>
                </div>
              )}
            </dl>
          </div>
        }
      />
      <Sumario itens={sumario} />

      {situacao.antes && (
        <Secao id="ingressos" rotulo="Antes da etapa" titulo="Ingressos e treinos livres" fundo={proximoFundo() ? 'branco' : 'papel'} intro="Primeiro a compra da etapa, depois os treinos livres e a grade horária deles.">
          <CompraETreinos etapa={etapa} situacao={situacao} />
        </Secao>
      )}

      {situacao.jaOcorreu && (
        <FaixaJaOcorreu etapa={etapa}>
          {temResultado && (
            <p>
              <a href="#resultado" className="link-seta">
                Ver o resultado
              </a>
            </p>
          )}
        </FaixaJaOcorreu>
      )}

      {mostrarTransmissao && (
        <Secao
          id="transmissao"
          rotulo={situacao.jaOcorreu ? 'Para rever' : 'Ao vivo no YouTube'}
          titulo={situacao.jaOcorreu ? 'Transmissão' : 'Transmissão ao vivo'}
          fundo={proximoFundo() ? 'branco' : 'papel'}
          intro={
            situacao.jaOcorreu
              ? 'A gravação continua no mesmo link da transmissão. O vídeo só carrega quando você tocar nele.'
              : 'Uma transmissão para os karts profissionais e outra para os karts indoor. O vídeo só carrega quando você tocar nele.'
          }
        >
          <Transmissoes situacao={situacao} nomeEtapa={semDemo(nomeDaEtapa(etapa))} />
        </Secao>
      )}

      {publico && (
        <Secao id="publico" rotulo="Venha assistir" titulo="Aberto ao público" fundo={proximoFundo() ? 'branco' : 'papel'}>
          <EventoPublico info={publico} />
        </Secao>
      )}

      <Secao id="programacao" rotulo="Horários" titulo="Programação por categoria" fundo={proximoFundo() ? 'branco' : 'papel'}>
        {comSeletor && (
          <SeletorSubcategoria
            alvo="programacao-horarios"
            grupos={opcoesSeletor}
            ajuda="A programação abaixo passa a mostrar só os horários da subcategoria escolhida."
          />
        )}
        <div className={e.programacao} id="programacao-horarios">
          {modalidadesProgramacao.map((m) => {
            const corridas = programacao.filter((c) => corridaNaModalidade(c, m))
            return (
              <section key={m} aria-labelledby={`programacao-${m}`} className={e.blocoModalidade} data-programacao-modalidade={m}>
                <h3 id={`programacao-${m}`} className={`titulo-marca h3 ${e.tituloModalidade}`}>
                  {ROTULO_MODALIDADE[m]}
                </h3>
                <Programacao
                  corridas={corridas}
                  subcategorias={subcategorias}
                  vazio={`A programação dos ${ROTULO_MODALIDADE[m].toLowerCase()} nesta etapa ainda não foi publicada.`}
                  // Etapa sem categorias escolhidas = todas as da temporada: não dá para dizer "não corre"
                  categoriasDaEtapa={categorias.length ? categorias.filter((c) => modalidadeDe(c) === m).map(chaveDaCategoria) : null}
                />
              </section>
            )
          })}
        </div>
        {temDescricao && (
          <div className={e.descricao}>
            <TextoRico dados={etapa.descricao} className="prosa" />
          </div>
        )}
      </Secao>

      {temResultado && (
        <Secao
          id="resultado"
          rotulo={resultado?.parcial ? 'Resultado parcial' : 'Resultado oficial'}
          titulo="Resultado da etapa"
          fundo={proximoFundo() ? 'branco' : 'papel'}
          intro="Warm-up, classificação, corridas e o resultado da etapa de cada piloto, por subcategoria quando a categoria tem. Em roxo, o melhor tempo de cada sessão."
        >
          <div className={e.pilhaModalidades}>
            {modalidadesResultado.map((m) => (
              <section key={m} aria-labelledby={`resultado-${m}`}>
                <h3 id={`resultado-${m}`} className={`titulo-marca h3 ${e.tituloModalidade}`}>
                  {ROTULO_MODALIDADE[m]}
                </h3>
                <MatrizesDaModalidade etapaId={etapa.id} modalidade={m} nivelTitulo={4} />
              </section>
            ))}
          </div>
        </Secao>
      )}

      {conteudo.galerias.map((g) => {
        const fotos = fotosDaGaleria(g)
        const creditos = creditosDasFotos(fotos)
        return (
          <Secao
            key={g.id}
            id={`fotos-${g.id}`}
            rotulo="Fotos"
            titulo={<TextoDemo texto={g.titulo} />}
            fundo={proximoFundo() ? 'branco' : 'papel'}
            acao={
              <Link className="link-seta" href={`/galeria/${g.slug}`}>
                Abrir a galeria
              </Link>
            }
          >
            <Galeria fotos={fotos} exibicao={g.exibicao === 'carrossel' ? 'carrossel' : 'grade'} />
            {creditos.length > 0 && <p className={b.creditos}>Créditos das fotos: {creditos.join('; ')}.</p>}
          </Secao>
        )
      })}

      {conteudo.noticias.length > 0 && (
        <Secao id="noticias" rotulo="Sobre esta etapa" titulo="Notícias" fundo={proximoFundo() ? 'branco' : 'papel'}>
          <GradeCartoes>
            {conteudo.noticias.map((n) => (
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
        </Secao>
      )}

      <nav className={e.voltar} aria-label="Voltar ao calendário">
        <div className="conteiner">
          {/* Etapa só de kart indoor volta para o calendário indoor */}
          <Link className={e.voltarLink} href={caminhoDaArea(areaPrincipal)}>
            <span aria-hidden="true">←</span> Calendário dos {ROTULO_MODALIDADE[areaPrincipal].toLowerCase()}
          </Link>
        </div>
      </nav>
    </>
  )
}
