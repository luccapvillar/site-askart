import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NIVEL_AVISO, Selo } from '@/components/site/Selo'
import s from '@/components/site/paginas/Leitura.module.css'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico } from '@/components/site/TextoRico'
import { formatarDataExtenso } from '@/lib/datas'
import { comoDoc, lerAviso } from '@/lib/publico'
import type { Documento, Etapa } from '@/payload-types'

export const revalidate = 60
export const dynamicParams = true
export const generateStaticParams = async () => []

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await lerAviso(Number((await params).id))
  return { title: a ? semDemo(a.titulo) : 'Comunicado não encontrado' }
}

export default async function Comunicado({ params }: Props) {
  const id = Number((await params).id)
  if (!Number.isInteger(id)) notFound()
  const a = await lerAviso(id)
  if (!a) notFound()
  const [rotulo, tom] = NIVEL_AVISO[a.nivel] ?? [a.nivel, 'info']
  const anexo = comoDoc<Documento>(a.anexo)
  const etapa = comoDoc<Etapa>(a.etapa)
  return (
    <article className={s.artigo}>
      <header className={`conteiner ${s.cabeca}`}>
        <nav aria-label="Você está em" className={s.trilha}>
          <Link href="/noticias">Notícias</Link> <span aria-hidden="true">/</span> Comunicados
        </nav>
        <p>
          <Selo tom={tom}>{rotulo}</Selo>
        </p>
        <h1 className={`h2 ${s.titulo}`}>
          <TextoDemo texto={a.titulo} />
        </h1>
        {a.publicarEm && (
          <p className={s.meta}>
            <time dateTime={a.publicarEm}>{formatarDataExtenso(a.publicarEm)}</time>
          </p>
        )}
      </header>
      <div className={`conteiner ${s.corpo}`}>
        <TextoRico dados={a.texto} />
        {anexo && (
          <p>
            <a className={s.anexo} href={`/documentos/${anexo.slug}/arquivo`}>
              Baixar: {semDemo(anexo.titulo)}
            </a>
          </p>
        )}
        {etapa && (
          <p className={s.relacionado}>
            Sobre a <Link href={`/etapas/${etapa.id}`}>{semDemo(etapa.nome) || `${etapa.numero}ª etapa`}</Link>
          </p>
        )}
      </div>
    </article>
  )
}
