import Link from 'next/link'
import { MidiaCartao } from '@/components/site/Cartoes'
import { Foto } from '@/components/site/Foto'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { formatarData, formatarDataExtenso } from '@/lib/datas'
import { comoDoc } from '@/lib/publico'
import type { CategoriasNoticia, Midia, Noticia } from '@/payload-types'
import s from './Conteudo.module.css'

type Nivel = 2 | 3

/** Campos de uma notícia usados nas listas (a leitura das listas traz só estes). */
export type NoticiaLista = Pick<Noticia, 'id' | 'titulo' | 'subtitulo' | 'slug' | 'capa' | 'categoria' | 'publicarEm'>

const hrefDa = (n: NoticiaLista) => `/noticias/${n.slug}`
const categoriaDa = (n: NoticiaLista) => semDemo(comoDoc<CategoriasNoticia>(n.categoria)?.nome) || null
const capaDa = (n: NoticiaLista) => {
  const m = comoDoc<Midia>(n.capa)
  return m?.url ? m : null
}

/** Categoria + data (a data vai em <time>, legível e com o valor de máquina). */
function MetaNoticia({ n, extenso = false }: { n: NoticiaLista; extenso?: boolean }) {
  const categoria = categoriaDa(n)
  return (
    <p className={s.noticiaMeta}>
      {categoria && <span className={s.noticiaCategoria}>{categoria}</span>}
      {n.publicarEm && <time dateTime={n.publicarEm}>{extenso ? formatarDataExtenso(n.publicarEm) : formatarData(n.publicarEm)}</time>}
    </p>
  )
}

/** Notícia em destaque: foto grande ao lado do texto (no celular, foto em cima). O cartão inteiro é clicável. */
export function NoticiaDestaque({ noticia: n, nivel = 2 }: { noticia: NoticiaLista; nivel?: Nivel }) {
  const H = nivel === 2 ? 'h2' : 'h3'
  const capa = capaDa(n)
  return (
    <article className={s.destaque}>
      <div className={s.destaqueMidia}>
        {capa ? <Foto midia={capa} ate="destaque" sizes="(min-width: 1040px) 680px, 100vw" alt="" /> : <MidiaCartao imagem={null} />}
      </div>
      <div className={s.destaqueCorpo}>
        <MetaNoticia n={n} extenso />
        <H className={`titulo-marca ${s.destaqueTitulo}`}>
          <Link className={s.linkCartao} href={hrefDa(n)}>
            <TextoDemo texto={n.titulo} />
          </Link>
        </H>
        {n.subtitulo && <p className={s.destaqueResumo}>{semDemo(n.subtitulo)}</p>}
        <span className={s.ler} aria-hidden="true">
          Ler a notícia <span className={s.seta}>→</span>
        </span>
      </div>
    </article>
  )
}

/** Cartão de notícia (foto em cima). O cartão inteiro é clicável pelo link do título. */
export function CartaoNoticiaSite({ noticia: n, nivel = 3 }: { noticia: NoticiaLista; nivel?: Nivel }) {
  const H = nivel === 2 ? 'h2' : 'h3'
  const capa = capaDa(n)
  return (
    <article className={s.cartaoNoticia}>
      <div className={s.cartaoMidia}>
        {capa ? <Foto midia={capa} ate="card" sizes="(min-width: 1040px) 400px, (min-width: 720px) 50vw, 100vw" alt="" /> : <MidiaCartao imagem={null} />}
      </div>
      <div className={s.cartaoCorpo}>
        <MetaNoticia n={n} />
        <H className={s.cartaoTitulo}>
          <Link className={s.linkCartao} href={hrefDa(n)}>
            <TextoDemo texto={n.titulo} />
          </Link>
        </H>
        {n.subtitulo && <p className={s.cartaoResumo}>{semDemo(n.subtitulo)}</p>}
      </div>
    </article>
  )
}

/** Linha compacta (miniatura + título + data), para listas ao lado do destaque. */
export function ItemNoticia({ noticia: n, nivel = 3 }: { noticia: NoticiaLista; nivel?: Nivel }) {
  const H = nivel === 2 ? 'h2' : 'h3'
  const capa = capaDa(n)
  return (
    <article className={s.item}>
      <div className={s.itemMidia}>{capa ? <Foto midia={capa} ate="miniatura" sizes="160px" alt="" /> : <MidiaCartao imagem={null} />}</div>
      <div className={s.itemCorpo}>
        <MetaNoticia n={n} />
        <H className={s.itemTitulo}>
          <Link className={s.linkCartao} href={hrefDa(n)}>
            <TextoDemo texto={n.titulo} />
          </Link>
        </H>
      </div>
    </article>
  )
}
