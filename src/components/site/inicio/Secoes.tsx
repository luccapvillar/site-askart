/**
 * Seções da página inicial. Todas de servidor (sem JavaScript no navegador). Cada uma some sozinha quando
 * não há dado publicado; nada aqui inventa conteúdo: textos fixos só descrevem o que o cliente confirmou.
 */
import Link from 'next/link'
import type { ReactNode } from 'react'
import { SeloNivel } from '@/components/site/avisos/SeloNivel'
import { nivelSeguro, dataDoAviso } from '@/components/site/avisos/comum'
import { Etiquetas } from '@/components/site/base/Etiquetas'
import { FaixaFoto } from '@/components/site/base/FaixaFoto'
import { Subcategorias } from '@/components/site/base/Subcategorias'
import { Botao } from '@/components/site/Botao'
import { Canais } from '@/components/site/Canais'
import { ItemNoticia, NoticiaDestaque, type NoticiaLista } from '@/components/site/conteudo/Noticias'
import { Foto } from '@/components/site/Foto'
import { Perguntas } from '@/components/site/Perguntas'
import { PlacaNumero } from '@/components/site/PlacaNumero'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TituloSecao } from '@/components/site/TituloSecao'
import { formatarData } from '@/lib/datas'
import { dataDaEtapa, etapaJaOcorreu, NOMES_REDES, type Canal } from '@/lib/site'
import type { Aviso, Categoria, Etapa, Midia, Pergunta, Piloto } from '@/payload-types'
import s from './Inicio.module.css'

/** Link de ação no cabeçalho das seções. */
export function LinkSecao({ href, children, externo = false }: { href: string; children: ReactNode; externo?: boolean }) {
  if (externo || /^https?:/.test(href)) {
    return (
      <a className="link-seta" href={href} target="_blank" rel="noopener noreferrer">
        {children}
        <span className="visualmente-oculto"> (abre em nova aba)</span>
      </a>
    )
  }
  return (
    <Link className="link-seta" href={href}>
      {children}
    </Link>
  )
}

/* ───────────────────────────── avisos no ar ───────────────────────────── */

export function AvisosInicio({ avisos, titulo, subtitulo }: { avisos: Aviso[]; titulo: string; subtitulo?: string | null }) {
  if (!avisos.length) return null
  return (
    <section className={`secao-compacta fundo-branco ${s.avisos}`} aria-labelledby="avisos-inicio">
      <div className="conteiner">
        <div className={s.avisosCabeca}>
          <div>
            <h2 id="avisos-inicio" className="titulo-marca h3">
              {titulo}
            </h2>
            {subtitulo && <p className="texto-2 texto-pequeno">{subtitulo}</p>}
          </div>
          <LinkSecao href="/avisos">Todos os avisos</LinkSecao>
        </div>
        <ul className={s.avisosLista}>
          {avisos.map((a) => {
            const data = dataDoAviso(a)
            return (
              <li key={a.id} className={`${s.aviso} ${s[`aviso_${nivelSeguro(a.nivel)}`] ?? ''}`}>
                <div className={s.avisoMeta}>
                  <SeloNivel nivel={a.nivel} />
                  {data && (
                    <time className={s.avisoData} dateTime={data}>
                      {formatarData(data)}
                    </time>
                  )}
                </div>
                <Link className={s.avisoTitulo} href={`/avisos/${a.id}`}>
                  <TextoDemo texto={a.titulo} />
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* ───────────────────────────── BKS ───────────────────────────── */

type AreaBks = { href: string; titulo: string; texto: string; categorias: Pick<Categoria, 'id' | 'nome'>[] }

/** Campeonato BKS: foto grande, as duas áreas (karts profissionais e indoor) e os atalhos do campeonato. */
export function BlocoBks({
  foto,
  nome,
  ano,
  areas,
  eventoPublico,
}: {
  foto: Midia | null
  nome: string
  ano: number | null
  areas: AreaBks[]
  eventoPublico: string | null
}) {
  return (
    <section className="secao fundo-branco" aria-labelledby="bks-inicio">
      <div className={`conteiner ${s.bks}`}>
        {foto && (
          <div className={s.bksFoto}>
            <Foto midia={foto} ate="destaque" sizes="(min-width: 1040px) 620px, 100vw" credito />
          </div>
        )}
        <div className={s.bksTextos}>
          <TituloSecao
            id="bks-inicio"
            rotulo={ano ? `Campeonato · temporada ${ano}` : 'Campeonato'}
            titulo={nome}
            subtitulo="O campeonato de kart organizado pela ASKART no Kartódromo do Guará, dividido em duas áreas: karts profissionais e karts indoor."
          />
          <ul className={s.bksAreas}>
            {areas.map((a) => (
              <li key={a.href} className={s.bksArea}>
                <h3 className={s.bksAreaTitulo}>
                  <Link href={a.href}>{a.titulo}</Link>
                </h3>
                <p className={s.bksAreaTexto}>{a.texto}</p>
                {a.categorias.length > 0 ? (
                  <Etiquetas rotulo={`Categorias — ${a.titulo}`} itens={a.categorias.map((c) => <TextoDemo key={c.id} texto={c.nome} />)} />
                ) : (
                  <p className="texto-2 texto-pequeno">As categorias desta área ainda não foram divulgadas.</p>
                )}
                <span className={s.bksAreaSeta} aria-hidden="true">
                  →
                </span>
              </li>
            ))}
          </ul>
          <nav className={s.bksAtalhos} aria-label="Atalhos do BKS">
            <Link href="/bks">Calendário</Link>
            <Link href="/bks/classificacao">Classificação</Link>
            <Link href="/bks/resultados">Resultados</Link>
            <Link href="/bks/historia">História</Link>
          </nav>
          {eventoPublico && (
            <p className={s.bksPublico}>
              <span className={s.bksPublicoIcone} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <span>
                <strong>Venha assistir.</strong> {eventoPublico}{' '}
                <Link href="/bks#venha-assistir">Veja o que o público encontra</Link>
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────────── líderes ───────────────────────────── */

export type LiderInicio = {
  chave: string
  categoria: Pick<Categoria, 'nome' | 'cor' | 'subcategorias'> | null
  numero: string | number | null
  nome: string
  equipe: string | null
  pontos: number
  vantagem: number | null
}

export function Lideres({
  lideres,
  titulo,
  subtitulo,
  rotulo,
  acao,
}: {
  lideres: LiderInicio[]
  titulo: string
  subtitulo?: string | null
  rotulo: string
  acao: ReactNode
}) {
  if (!lideres.length) return null
  return (
    <section className="secao fundo-papel" aria-labelledby="lideres-inicio">
      <div className="conteiner">
        <TituloSecao id="lideres-inicio" rotulo={rotulo} titulo={titulo} subtitulo={subtitulo} acao={acao} />
        <ul className={s.lideres}>
          {lideres.map((l) => (
            <li key={l.chave} className={s.lider} style={{ '--cor-cat': l.categoria?.cor || 'var(--verde)' } as React.CSSProperties}>
              <div className={s.liderCabeca}>
                <h3 className={s.liderCategoria}>
                  <TextoDemo texto={l.categoria?.nome || 'Categoria'} />
                </h3>
                <Subcategorias itens={l.categoria?.subcategorias} rotulo={`Subcategorias da ${semDemo(l.categoria?.nome) || 'categoria'}`} />
              </div>
              <div className={s.liderPiloto}>
                <PlacaNumero numero={l.numero} cor={l.categoria?.cor} tamanho="m" />
                <div className={s.liderNome}>
                  <span className="visualmente-oculto">Líder: </span>
                  <strong>
                    <TextoDemo texto={l.nome} />
                  </strong>
                  {l.equipe && (
                    <span className="texto-2 texto-pequeno">
                      <TextoDemo texto={l.equipe} />
                    </span>
                  )}
                </div>
              </div>
              <p className={s.liderPontos}>
                <span className={s.liderNumero}>{l.pontos}</span> <span className={s.liderPts}>pontos</span>
                {l.vantagem !== null && <span className={s.liderVantagem}>{l.vantagem === 0 ? 'empatado com o 2º' : `${l.vantagem} à frente do 2º`}</span>}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ───────────────────────────── calendário ───────────────────────────── */

export function Calendario({
  etapas,
  proximaId,
  titulo,
  subtitulo,
  rotulo,
  acao,
}: {
  etapas: Etapa[]
  proximaId: number | null
  titulo: string
  subtitulo?: string | null
  rotulo: string
  acao: ReactNode
}) {
  if (!etapas.length) return null
  return (
    <section className="secao fundo-branco" aria-labelledby="calendario-inicio">
      <div className="conteiner">
        <TituloSecao id="calendario-inicio" rotulo={rotulo} titulo={titulo} subtitulo={subtitulo} acao={acao} />
        <ol className={s.calendario}>
          {etapas.map((e) => {
            const d = dataDaEtapa(e)
            const proxima = e.id === proximaId
            const cancelada = e.status === 'cancelada'
            const feita = !cancelada && etapaJaOcorreu(e)
            const situacao = cancelada ? 'Cancelada' : proxima ? 'Próxima etapa' : feita ? 'Já aconteceu' : e.status === 'adiada' ? 'Adiada' : 'A seguir'
            return (
              <li
                key={e.id}
                className={[s.marco, proxima && s.marcoProximo, feita && s.marcoFeito, cancelada && s.marcoCancelado].filter(Boolean).join(' ')}
              >
                <p className={s.marcoSituacao}>{situacao}</p>
                <h3 className={s.marcoNome}>
                  <Link href={`/etapas/${e.id}`}>
                    <TextoDemo texto={e.nome || `${e.numero}ª etapa`} selo={false} />
                  </Link>
                </h3>
                <p className={s.marcoData}>
                  {d ? (
                    <>
                      <span className={s.marcoDia}>{d.dia}</span> {d.mes} · {d.semana}
                    </>
                  ) : (
                    'Data a definir'
                  )}
                </p>
                <p className={s.marcoAcao} aria-hidden="true">
                  {feita ? 'Ver resultado' : cancelada ? 'Detalhes' : 'Programação'} →
                </p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/* ───────────────────────────── kartódromo ───────────────────────────── */

/** Chamada curta do kartódromo: treino quase todos os dias + botão para a grade (sem listar horários). */
export function ChamadaKartodromo({
  foto,
  nome,
  titulo,
  texto,
  endereco,
  botao,
}: {
  foto: Midia | null
  nome: string
  titulo: string
  texto: string
  endereco: string | null
  botao: { href: string; texto: string; externo?: boolean }
}) {
  return (
    <FaixaFoto
      id="kartodromo-inicio"
      foto={foto}
      rotulo={nome}
      titulo={titulo}
      texto={<p>{texto}</p>}
      acoes={
        <>
          <Botao href={botao.href} variante="destaque" seta grande externo={botao.externo}>
            {botao.texto}
          </Botao>
          <Botao href="/kartodromo" variante="claro">
            Taxas e como treinar
          </Botao>
        </>
      }
    >
      {endereco && (
        <p className={s.kartEndereco}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
            <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {endereco}
        </p>
      )}
    </FaixaFoto>
  )
}

/* ───────────────────────────── notícias ───────────────────────────── */

export function NoticiasInicio({
  noticias,
  titulo,
  subtitulo,
  acao,
}: {
  noticias: NoticiaLista[]
  titulo: string
  subtitulo?: string | null
  acao: ReactNode
}) {
  if (!noticias.length) return null
  const [primeira, ...demais] = noticias
  return (
    <section className="secao fundo-papel" aria-labelledby="noticias-inicio">
      <div className="conteiner">
        <TituloSecao id="noticias-inicio" rotulo="Notícias" titulo={titulo} subtitulo={subtitulo} acao={acao} />
        <div className={s.noticias}>
          <NoticiaDestaque noticia={primeira} nivel={3} />
          {demais.length > 0 && (
            <ul className={s.noticiasLista} aria-label="Mais notícias">
              {demais.map((n) => (
                <li key={n.id}>
                  <ItemNoticia noticia={n} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────────── IZY Pass ───────────────────────────── */

/** Só aparece com o link geral da IZY Pass cadastrado (a compra de cada etapa fica no cartão da etapa). */
export function Ingressos({ href, titulo, texto, textoBotao }: { href: string | null; titulo: string; texto: string; textoBotao: string }) {
  if (!href) return null
  return (
    <section className={`secao-compacta fundo-tinta ${s.ingressos}`} aria-labelledby="ingressos-inicio">
      <div className={`conteiner ${s.ingressosConteudo}`}>
        <div>
          <h2 id="ingressos-inicio" className="titulo-marca h3">
            {titulo}
          </h2>
          <p className="texto-2">{texto}</p>
        </div>
        <Botao href={href} externo seta>
          {textoBotao}
        </Botao>
      </div>
    </section>
  )
}

/* ───────────────────────────── fotos ───────────────────────────── */

export function FotosInicio({ fotos, titulo, subtitulo, acao }: { fotos: Midia[]; titulo: ReactNode; subtitulo?: string | null; acao: ReactNode }) {
  if (fotos.length < 3) return null
  const lista = fotos.slice(0, 5)
  return (
    <section className="secao fundo-branco" aria-labelledby="fotos-inicio">
      <div className="conteiner">
        <TituloSecao id="fotos-inicio" rotulo="Fotos" titulo={titulo} subtitulo={subtitulo} acao={acao} />
        <ul className={`${s.fotos} ${s[`fotos${lista.length}`] ?? ''}`}>
          {lista.map((f, i) => (
            <li key={f.id} className={s.foto}>
              <Foto
                midia={f}
                ate={i === 0 ? 'destaque' : 'card'}
                sizes={i === 0 ? '(min-width: 1040px) 640px, 100vw' : '(min-width: 1040px) 320px, 50vw'}
                credito
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ───────────────────────────── perguntas ───────────────────────────── */

export function PerguntasInicio({ perguntas, titulo, subtitulo, acao }: { perguntas: Pergunta[]; titulo: string; subtitulo?: string | null; acao: ReactNode }) {
  if (!perguntas.length) return null
  return (
    <section className="secao fundo-papel" aria-labelledby="perguntas-inicio">
      <div className={`conteiner ${s.perguntas}`}>
        <div className={s.perguntasCabeca}>
          <TituloSecao id="perguntas-inicio" rotulo="Dúvidas" titulo={titulo} subtitulo={subtitulo} />
          {acao}
        </div>
        <Perguntas perguntas={perguntas} />
      </div>
    </section>
  )
}

/* ───────────────────────────── contato ───────────────────────────── */

export function ContatoInicio({
  canais,
  local,
  endereco,
  mapa,
  redes,
  titulo,
  subtitulo,
  acao,
}: {
  canais: Canal[]
  local: string
  endereco: string | null
  mapa: string | null
  redes: { rede: string; url: string; usuario?: string | null }[]
  titulo: string
  subtitulo?: string | null
  acao: ReactNode
}) {
  return (
    <section className="secao fundo-branco" aria-labelledby="contato-inicio">
      <div className="conteiner">
        <TituloSecao id="contato-inicio" rotulo="Fale com a ASKART" titulo={titulo} subtitulo={subtitulo} acao={acao} />
        <div className={s.contato}>
          <div className={s.contatoBloco}>
            <h3 className={s.contatoTitulo}>Telefone, WhatsApp e e-mail</h3>
            <Canais canais={canais} />
          </div>
          <div className={s.contatoBloco}>
            <h3 className={s.contatoTitulo}>Endereço</h3>
            <address className={s.endereco}>
              <strong>{local}</strong>
              {endereco ? endereco.split('\n').map((l, i) => <span key={i}>{l}</span>) : <span className="texto-2">Endereço ainda não divulgado.</span>}
            </address>
            {mapa && (
              <Botao href={mapa} variante="secundario" externo seta pequeno>
                Como chegar
              </Botao>
            )}
          </div>
          {redes.length > 0 && (
            <div className={s.contatoBloco}>
              <h3 className={s.contatoTitulo}>Redes sociais</h3>
              <ul className={s.redes}>
                {redes.map((r) => (
                  <li key={r.url}>
                    <a className={s.rede} href={r.url} target="_blank" rel="noopener noreferrer">
                      <strong>{NOMES_REDES[r.rede] ?? r.rede}</strong>
                      {r.usuario && (
                        <span className="texto-2">
                          <TextoDemo texto={r.usuario} />
                        </span>
                      )}
                      <span className="visualmente-oculto"> (abre em nova aba)</span>
                      <span className={s.redeSeta} aria-hidden="true">
                        ↗
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────────── pilotos e apoiadores ───────────────────────────── */

export function PilotosDestaque({ pilotos, titulo, subtitulo }: { pilotos: Piloto[]; titulo: string; subtitulo?: string | null }) {
  if (!pilotos.length) return null
  return (
    <section className="secao fundo-branco" aria-labelledby="pilotos-inicio">
      <div className="conteiner">
        <TituloSecao id="pilotos-inicio" rotulo="Pilotos" titulo={titulo} subtitulo={subtitulo} />
        <ul className={s.pilotos}>
          {pilotos.map((p) => (
            <li key={p.id} className={s.piloto}>
              <div className={s.pilotoFoto}>
                <Foto midia={p.foto as Midia | null} ate="card" sizes="(min-width: 1040px) 240px, 50vw" alt="" />
              </div>
              <h3 className={s.pilotoNome}>
                <Link href={`/pilotos/${p.slug}`}>
                  <TextoDemo texto={p.nomeExibicao || p.nome} />
                </Link>
              </h3>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function Apoiadores({ lista, titulo }: { lista: { nome: string; logo: Midia | null; url?: string | null }[]; titulo: string }) {
  if (!lista.length) return null
  return (
    <section className="secao-compacta fundo-branco" aria-labelledby="apoiadores-inicio">
      <div className="conteiner">
        <h2 id="apoiadores-inicio" className={`rotulo texto-2 ${s.apoiadoresTitulo}`}>
          {titulo}
        </h2>
        <ul className={s.apoiadores}>
          {lista.map((a) => {
            const logo = a.logo?.url ? <Foto midia={a.logo} ate="miniatura" sizes="160px" alt={a.nome} /> : <span>{a.nome}</span>
            return (
              <li key={a.nome}>
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noopener noreferrer">
                    {logo}
                    <span className="visualmente-oculto"> (abre em nova aba)</span>
                  </a>
                ) : (
                  logo
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
