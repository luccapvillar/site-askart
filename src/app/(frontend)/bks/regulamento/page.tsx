import type { Metadata } from 'next'
import { NavegacaoBks } from '@/components/site/bks/AbasBks'
import s from '@/components/site/bks/Bks.module.css'
import { CabecalhoArea } from '@/components/site/bks/Modalidades'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { TextoDemo } from '@/components/site/TextoDemo'
import { formatarData } from '@/lib/datas'
import { comoDoc, lerBks, lerDocumentos } from '@/lib/publico'
import type { Documento } from '@/payload-types'

export const revalidate = 60

export const metadata: Metadata = { title: 'BKS — Regulamento', description: 'Regulamento e documentos oficiais do BKS — Brasília Kart Series.' }

const tamanho = (bytes?: number | null) => (bytes ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : null)

/** Sub-aba Regulamento: o regulamento em vigor em destaque e os demais documentos do campeonato. */
export default async function RegulamentoBks() {
  const bks = await lerBks()
  const regulamento = comoDoc<Documento>(bks?.campeonato.regulamento)
  const documentos = bks ? await lerDocumentos({ campeonato: { equals: bks.campeonato.id } }) : []
  const lista = [...(regulamento ? [regulamento] : []), ...documentos.filter((d) => d.id !== regulamento?.id)]

  return (
    <>
      <NavegacaoBks secao="regulamento" />
      <section className={`secao-compacta ${s.secaoPrincipal}`} aria-labelledby="regulamento">
        <div className="conteiner">
          <CabecalhoArea id="regulamento" titulo="Regulamento e documentos" introducao="Documentos oficiais do campeonato, para ler no site ou baixar." />
          {!lista.length ? (
            <EstadoVazio texto="O regulamento ainda não foi publicado pela organização." />
          ) : (
            <ul className={s.documentos}>
              {lista.map((d) => {
                const emVigor = d.id === regulamento?.id
                const tipo = (d.filename?.split('.').pop() ?? 'doc').toUpperCase()
                const detalhes = [d.revisao, d.vigenteDesde ? `em vigor desde ${formatarData(d.vigenteDesde)}` : null, tamanho(d.filesize)].filter(Boolean)
                return (
                  <li key={d.id} className={`${s.documento} ${emVigor ? s.documentoVigente : ''}`}>
                    <span className={s.docIcone} aria-hidden="true">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">
                        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                        <path d="M14 3v5h5M9 13h6M9 17h6" />
                      </svg>
                      <span className={s.docTipo}>{tipo}</span>
                    </span>
                    <div className={s.docTextos}>
                      {emVigor && <p className={`rotulo ${s.docVigente}`}>Regulamento em vigor</p>}
                      <h3 className={s.docTitulo}>
                        <a href={`/documentos/${d.slug}/arquivo`}>
                          <TextoDemo texto={d.titulo} />
                          <span className="visualmente-oculto"> ({tipo}{tamanho(d.filesize) ? `, ${tamanho(d.filesize)}` : ''})</span>
                        </a>
                      </h3>
                      {detalhes.length > 0 && <p className={s.docMeta}>{detalhes.join(' · ')}</p>}
                    </div>
                    <span className={s.docAcao} aria-hidden="true">
                      Abrir <span>↓</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
