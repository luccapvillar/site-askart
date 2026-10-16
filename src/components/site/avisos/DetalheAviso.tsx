import { Fragment } from 'react'
import Link from 'next/link'
import l from '@/components/site/paginas/Leitura.module.css'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico } from '@/components/site/TextoRico'
import { formatarDataExtenso } from '@/lib/datas'
import { comoDoc } from '@/lib/publico'
import type { Aviso, Documento } from '@/payload-types'
import { dataDoAviso, relacionadosDoAviso, rotuloTipo } from './comum'
import { SeloNivel } from './SeloNivel'
import s from './Avisos.module.css'

/** Página de um aviso (usada por /avisos/[id] e pelo endereço antigo /comunicados/[id]). */
export function DetalheAviso({ aviso: a }: { aviso: Aviso }) {
  const tipo = rotuloTipo(a.tipo)
  const data = dataDoAviso(a)
  const anexo = comoDoc<Documento>(a.anexo)
  const relacionados = relacionadosDoAviso(a)

  return (
    <article className={l.artigo}>
      <header className={`conteiner ${l.cabeca}`}>
        <nav aria-label="Você está em" className={l.trilha}>
          <Link href="/avisos">Avisos</Link> <span aria-hidden="true">/</span> {tipo ?? 'Aviso'}
        </nav>
        <p className={s.meta}>
          <SeloNivel nivel={a.nivel} />
          {tipo && <span className={s.tipo}>{tipo}</span>}
        </p>
        <h1 className={`h2 ${l.titulo}`}>
          <TextoDemo texto={a.titulo} />
        </h1>
        {data && (
          <p className={l.meta}>
            <span>
              Publicado em <time dateTime={data}>{formatarDataExtenso(data)}</time>
            </span>
          </p>
        )}
      </header>
      <div className={`conteiner ${l.corpo}`}>
        <TextoRico dados={a.texto} />
        {anexo?.slug && (
          <p>
            <a className={l.anexo} href={`/documentos/${anexo.slug}/arquivo`}>
              Baixar: {semDemo(anexo.titulo)}
            </a>
          </p>
        )}
        {relacionados.length > 0 && (
          <p className={l.relacionado}>
            Sobre:{' '}
            {relacionados.map((r, i) => (
              <Fragment key={r.href + r.rotulo}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                <Link href={r.href}>{r.rotulo}</Link>
              </Fragment>
            ))}
          </p>
        )}
        <p>
          <Link className={s.voltar} href="/avisos">
            <span aria-hidden="true">←</span> Ver todos os avisos
          </Link>
        </p>
      </div>
    </article>
  )
}
