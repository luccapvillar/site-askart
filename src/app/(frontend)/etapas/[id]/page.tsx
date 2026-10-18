import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DataEtapa, dataPorExtenso, LinkMapa, NomeEtapa, nomeDaEtapa, Programacao, SeloEtapa } from '@/components/site/bks/pecas'
import { MatrizesDaModalidade, resultadoComCategorias } from '@/components/site/bks/AreaResultados'
import b from '@/components/site/bks/Bks.module.css'
import { CartaoNoticia, GradeCartoes } from '@/components/site/Cartoes'
import { Galeria } from '@/components/site/Galeria'
import { imagemDoCartao } from '@/components/site/Foto'
import { BotaoExterno, CompraETreinos, EventoPublico, FaixaJaOcorreu, transmissoesVisiveis } from '@/components/site/etapa/BlocosEtapa'
import { Transmissoes } from '@/components/site/etapa/TransmissaoEtapa'
import { Secao, Sumario, TopoPagina } from '@/components/site/paginas/TopoPagina'
import s from '@/components/site/paginas/Paginas.module.css'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico } from '@/components/site/TextoRico'
import { formatarData, formatarHora } from '@/lib/datas'
import { fotosDaGaleria } from '@/lib/galeria'
import { comoDoc, lerBks, lerConfiguracoes, lerContato, lerConteudoDaEtapa, lerEtapa, lerProgramacao, lerResultadosEtapa } from '@/lib/publico'
import {
  caminhoDaArea,
  corridaNaModalidade,
  eventoPublico,
  mapaDaEtapa,
  modalidadesDaEtapa,
  ROTULO_MODALIDADE,
  situacaoDaEtapa,
  variaveisDoCampeonato,
} from '@/lib/site'
import type { Campeonato, CategoriasNoticia, Midia, Temporada } from '@/payload-types'

export const revalidate = 60
export const dynamicParams = true
export const generateStaticParams = async () => []

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await lerEtapa(Number((await params).id))
  if (!e) return { title: 'Etapa não encontrada' }
  const t = comoDoc<Temporada>(e.temporada)
  return { title: `${semDemo(nomeDaEtapa(e))}${t ? ` — ${t.ano}` : ''}`, description: `${dataPorExtenso(e)} · ${e.local ?? ''}: ingressos, treinos livres, transmissão ao vivo e programação por categoria.` }
}

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

  // Fundo alternado entre as seções, na ordem em que aparecem
  let branca = false
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
    <div className={b.tema} style={variaveisDoCampeonato(campeonato?.cores) as CSSProperties}>
      <TopoPagina
        rotulo={`${campeonato?.sigla || 'BKS'} ${temporada?.ano ?? ''} · ${etapa.numero}ª etapa`}
        titulo={<NomeEtapa etapa={etapa} />}
        intro={
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', alignItems: 'center' }}>
            <SeloEtapa status={etapa.status} jaOcorreu={situacao.jaOcorreu} /> {dataPorExtenso(etapa)}
            {etapa.inicio && ` · ${formatarHora(etapa.inicio)}`}
            {etapa.local && ` · ${etapa.local}`}
          </span>
        }
        foto={comoDoc<Midia>(etapa.imagem)}
        acoes={
          <>
            {situacao.linkCompra && (
              <BotaoExterno href={situacao.linkCompra} contexto="compra desta etapa">
                Comprar esta etapa
              </BotaoExterno>
            )}
            <LinkMapa href={mapaDaEtapa(etapa, contato)} rotulo="Como chegar" />
          </>
        }
      />
      <Sumario itens={sumario} />

      {situacao.antes && (
        <Secao id="ingressos" rotulo="Antes da etapa" titulo="Ingressos e treinos livres" branca={proximoFundo()}>
          <CompraETreinos etapa={etapa} situacao={situacao} />
        </Secao>
      )}

      {situacao.jaOcorreu && (
        <FaixaJaOcorreu etapa={etapa}>
          {temResultado && (
            <p>
              <a href="#resultado">Ver o resultado</a>
            </p>
          )}
        </FaixaJaOcorreu>
      )}

      {mostrarTransmissao && (
        <Secao
          id="transmissao"
          rotulo={situacao.jaOcorreu ? 'Para rever' : 'Ao vivo'}
          titulo={situacao.jaOcorreu ? 'Transmissão' : 'Transmissão ao vivo'}
          branca={proximoFundo()}
        >
          <Transmissoes situacao={situacao} nomeEtapa={semDemo(nomeDaEtapa(etapa))} />
        </Secao>
      )}

      {publico && (
        <Secao id="publico" titulo="Aberto ao público" branca={proximoFundo()}>
          <EventoPublico info={publico} />
        </Secao>
      )}

      <Secao id="programacao" rotulo="Horários" titulo="Programação por categoria" branca={proximoFundo()}>
        <div className={`${s.duas} ${s.duasLargo}`}>
          <div className={b.pilhaModalidades}>
            {modalidadesProgramacao.map((m) => {
              const corridas = programacao.filter((c) => corridaNaModalidade(c, m))
              return (
                <section key={m} aria-labelledby={`programacao-${m}`}>
                  <h3 id={`programacao-${m}`} className={`h3 ${b.tituloModalidade}`}>
                    {ROTULO_MODALIDADE[m]}
                  </h3>
                  <Programacao corridas={corridas} vazio={`A programação dos ${ROTULO_MODALIDADE[m].toLowerCase()} nesta etapa ainda não foi publicada.`} />
                </section>
              )
            })}
          </div>
          <div className={s.cartao} style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
            <DataEtapa etapa={etapa} grande />
            <p>
              <strong>{dataPorExtenso(etapa)}</strong>
              {etapa.local && (
                <>
                  <br />
                  {etapa.local}
                </>
              )}
            </p>
            <LinkMapa href={mapaDaEtapa(etapa, contato)} rotulo="Ver no mapa" />
          </div>
        </div>
        {temDescricao && (
          <div style={{ marginTop: 32 }}>
            <TextoRico dados={etapa.descricao} />
          </div>
        )}
      </Secao>

      {temResultado && (
        <Secao id="resultado" rotulo={resultado?.parcial ? 'Parcial' : 'Oficial'} titulo="Resultado" branca={proximoFundo()}>
          <div className={b.pilhaModalidades}>
            {modalidadesResultado.map((m) => (
              <section key={m} aria-labelledby={`resultado-${m}`}>
                <h3 id={`resultado-${m}`} className={`h3 ${b.tituloModalidade}`}>
                  {ROTULO_MODALIDADE[m]}
                </h3>
                <MatrizesDaModalidade etapaId={etapa.id} modalidade={m} nivelTitulo={4} />
              </section>
            ))}
          </div>
        </Secao>
      )}

      {conteudo.galerias.map((g) => (
        <Secao key={g.id} id={`fotos-${g.id}`} rotulo="Fotos" titulo={<TextoDemo texto={g.titulo} />} branca={proximoFundo()}>
          <Galeria fotos={fotosDaGaleria(g)} exibicao={g.exibicao ?? 'grade'} />
        </Secao>
      ))}

      {conteudo.noticias.length > 0 && (
        <Secao id="noticias" rotulo="Sobre esta etapa" titulo="Notícias" branca={proximoFundo()}>
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

      <div className="conteiner" style={{ paddingBlock: 32 }}>
        {/* Etapa só de kart indoor volta para o calendário indoor */}
        <Link className={b.linkSeta} href={caminhoDaArea(modalidadesProgramacao.includes('profissional') ? 'profissional' : 'indoor')}>
          ← Calendário completo
        </Link>
      </div>
    </div>
  )
}
