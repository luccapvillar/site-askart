import type { Metadata } from 'next'
import s from '@/components/site/bks/Bks.module.css'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { TextoDemo } from '@/components/site/TextoDemo'
import { formatarData } from '@/lib/datas'
import { comoDoc, lerBks, lerDocumentos } from '@/lib/publico'
import type { Documento } from '@/payload-types'

export const revalidate = 60

export const metadata: Metadata = { title: 'BKS — Regulamento', description: 'Regulamento e documentos oficiais do BKS — Brasília Kart Series.' }

const tamanho = (bytes?: number | null) => (bytes ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : null)

/** Sub-aba Regulamento: o regulamento em vigor e os demais documentos do campeonato. */
export default async function RegulamentoBks() {
  const bks = await lerBks()
  const regulamento = comoDoc<Documento>(bks?.campeonato.regulamento)
  const documentos = bks ? await lerDocumentos({ campeonato: { equals: bks.campeonato.id } }) : []
  const lista = [...(regulamento ? [regulamento] : []), ...documentos.filter((d) => d.id !== regulamento?.id)]

  return (
    <section className="secao-compacta" aria-labelledby="regulamento">
      <div className="conteiner">
        <div className={s.cabecalhoSecao}>
          <h2 id="regulamento" className="titulo-marca h2">
            Regulamento e documentos
          </h2>
        </div>
        {!lista.length ? (
          <EstadoVazio texto="O regulamento será publicado aqui pela organização." />
        ) : (
          <ul className={s.documentos}>
            {lista.map((d) => (
              <li key={d.id}>
                <a href={`/documentos/${d.slug}/arquivo`} className={s.documento}>
                  <span className={s.docIcone} aria-hidden="true">
                    {(d.filename?.split('.').pop() ?? 'doc').toUpperCase()}
                  </span>
                  <span>
                    <strong>
                      <TextoDemo texto={d.titulo} />
                    </strong>
                    <span className="texto-2">
                      {[d.revisao, d.vigenteDesde ? `em vigor desde ${formatarData(d.vigenteDesde)}` : null, tamanho(d.filesize)].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
