import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BotaoIzy, DataEtapa, dataPorExtenso, LinkMapa, NomeEtapa, nomeDaEtapa, Programacao, SeloEtapa } from '@/components/site/bks/pecas'
import b from '@/components/site/bks/Bks.module.css'
import { ResultadoCategoria } from '@/components/site/bks/Tabelas'
import { CartaoNoticia, GradeCartoes } from '@/components/site/Cartoes'
import { Galeria } from '@/components/site/Galeria'
import { imagemDoCartao } from '@/components/site/Foto'
import { Secao, TopoPagina } from '@/components/site/paginas/TopoPagina'
import s from '@/components/site/paginas/Paginas.module.css'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico } from '@/components/site/TextoRico'
import { formatarData, formatarHora } from '@/lib/datas'
import { fotosDaGaleria } from '@/lib/galeria'
import { comoDoc, lerBks, lerCategorias, lerConfiguracoes, lerContato, lerConteudoDaEtapa, lerEtapa, lerProgramacao, lerResultadosEtapa } from '@/lib/publico'
import { etapaFutura, ingressosDaEtapa, mapaDaEtapa, variaveisDoCampeonato } from '@/lib/site'
import type { Campeonato, CategoriasNoticia, Midia, Temporada } from '@/payload-types'

export const revalidate = 60
export const dynamicParams = true
export const generateStaticParams = async () => []

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await lerEtapa(Number((await params).id))
  if (!e) return { title: 'Etapa não encontrada' }
  const t = comoDoc<Temporada>(e.temporada)
  return { title: `${semDemo(nomeDaEtapa(e))}${t ? ` — ${t.ano}` : ''}`, description: `${dataPorExtenso(e)} · ${e.local ?? ''}: programação por categoria, local e ingressos.` }
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
  const categorias = await lerCategorias((resultado?.categorias ?? []).map((c) => Number(c.categoria)))
  const cor = new Map(categorias.map((c) => [String(c.id), c.cor ?? null]))
  const futura = etapaFutura(etapa)
  const temResultado = resultado?.categorias.some((c) => c.corridas.length)

  return (
    <div className={b.tema} style={variaveisDoCampeonato(campeonato?.cores) as CSSProperties}>
      <TopoPagina
        rotulo={`${campeonato?.sigla || 'BKS'} ${temporada?.ano ?? ''} · ${etapa.numero}ª etapa`}
        titulo={<NomeEtapa etapa={etapa} />}
        intro={
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', alignItems: 'center' }}>
            <SeloEtapa status={etapa.status} /> {dataPorExtenso(etapa)}
            {etapa.inicio && ` · ${formatarHora(etapa.inicio)}`}
            {etapa.local && ` · ${etapa.local}`}
          </span>
        }
        foto={comoDoc<Midia>(etapa.imagem)}
        acoes={
          <>
            {futura && etapa.status !== 'cancelada' && <BotaoIzy href={ingressosDaEtapa(etapa, config)} texto={semDemo(config.izyPassTexto)} claro />}
            <LinkMapa href={mapaDaEtapa(etapa, contato)} rotulo="Como chegar" />
          </>
        }
      />

      <Secao id="programacao" rotulo="Horários" titulo="Programação por categoria" branca>
        <div className={`${s.duas} ${s.duasLargo}`}>
          <Programacao corridas={programacao} />
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
        {Boolean((etapa.descricao as { root?: { children?: unknown[] } } | null)?.root?.children?.length) && (
          <div style={{ marginTop: 32 }}>
            <TextoRico dados={etapa.descricao} />
          </div>
        )}
      </Secao>

      {temResultado && (
        <Secao id="resultado" rotulo={resultado?.parcial ? 'Parcial' : 'Oficial'} titulo="Resultado">
          <div className={b.pilhaCategorias}>
            {resultado!.categorias.map((c) =>
              c.corridas.length ? (
                <section key={String(c.categoria)} className={b.categoria} aria-label={semDemo(c.categoriaNome) || 'Categoria'}>
                  <h3 className={`h3 ${b.tituloCategoria}`}>
                    <span className={b.corCategoria} style={{ background: cor.get(String(c.categoria)) ?? 'var(--camp-p)' }} aria-hidden="true" />
                    <TextoDemo texto={c.categoriaNome} />
                  </h3>
                  <ResultadoCategoria resultado={c} cor={cor.get(String(c.categoria))} />
                </section>
              ) : null,
            )}
          </div>
        </Secao>
      )}

      {conteudo.galerias.map((g) => (
        <Secao key={g.id} id={`fotos-${g.id}`} rotulo="Fotos" titulo={<TextoDemo texto={g.titulo} />} branca>
          <Galeria fotos={fotosDaGaleria(g)} exibicao={g.exibicao ?? 'grade'} />
        </Secao>
      ))}

      {conteudo.noticias.length > 0 && (
        <Secao id="noticias" rotulo="Sobre esta etapa" titulo="Notícias">
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
        <Link className={b.linkSeta} href="/bks">
          ← Calendário completo
        </Link>
      </div>
    </div>
  )
}
