import type { Metadata } from 'next'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { Foto } from '@/components/site/Foto'
import { Galeria } from '@/components/site/Galeria'
import { Secao, TopoPagina } from '@/components/site/paginas/TopoPagina'
import s from '@/components/site/paginas/Paginas.module.css'
import { TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico } from '@/components/site/TextoRico'
import { fotosDaGaleria } from '@/lib/galeria'
import { comoDoc, lerConfiguracoes, lerInstitucional } from '@/lib/publico'
import type { Documento, Galeria as TipoGaleria, Midia } from '@/payload-types'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const config = await lerConfiguracoes()
  return { title: `Sobre a ${config.sigla || 'ASKART'}`, description: config.descricao || undefined }
}

export default async function Sobre() {
  const [inst, config] = await Promise.all([lerInstitucional(), lerConfiguracoes()])
  const galeria = comoDoc<TipoGaleria>(inst?.galeria)
  const documentos = (inst?.documentos ?? []).map((d) => comoDoc<Documento>(d)).filter((d): d is Documento => d !== null)
  return (
    <>
      <TopoPagina rotulo={config.nome || undefined} titulo={`Sobre a ${config.sigla || 'ASKART'}`} intro={inst?.resumo} foto={comoDoc<Midia>(inst?.imagemTopo)} />
      <Secao id="quem-somos" titulo="Quem somos" branca>
        {inst?.sobre ? <TextoRico dados={inst.sobre} /> : <EstadoVazio texto="O texto institucional será publicado em breve." />}
        {(inst?.pilares?.length ?? 0) > 0 && (
          <div className={s.estrutura} style={{ marginTop: 32 }}>
            {inst!.pilares!.map((p, i) => (
              <article key={p.id ?? i} className={s.cartao}>
                <h3 className="h3">{p.titulo}</h3>
                <p className="texto-2">{p.texto}</p>
              </article>
            ))}
          </div>
        )}
      </Secao>
      {(inst?.historia || (inst?.marcos?.length ?? 0) > 0) && (
        <Secao id="historia" titulo="História">
          <TextoRico dados={inst?.historia} />
          {(inst?.marcos?.length ?? 0) > 0 && (
            <ol className={s.passos} style={{ marginTop: 24 }}>
              {inst!.marcos!.map((m, i) => (
                <li key={m.id ?? i} className={s.cartao}>
                  <p className="mono texto-2">{m.ano}</p>
                  <h3 className="h3">{m.titulo}</h3>
                  {m.texto && <p className="texto-2">{m.texto}</p>}
                </li>
              ))}
            </ol>
          )}
        </Secao>
      )}
      {(inst?.diretoria?.length ?? 0) > 0 && (
        <Secao id="diretoria" titulo="Diretoria" branca>
          <div className={s.estrutura}>
            {inst!.diretoria!.map((d, i) => (
              <article key={d.id ?? i}>
                <Foto midia={comoDoc<Midia>(d.foto)} ate="card" sizes="280px" />
                <h3 className="h3">{d.nome}</h3>
                <p className="texto-2">{d.cargo}</p>
              </article>
            ))}
          </div>
        </Secao>
      )}
      {documentos.length > 0 && (
        <Secao id="documentos" titulo="Documentos">
          <ul className={s.lista}>
            {documentos.map((d) => (
              <li key={d.id}>
                <a href={`/documentos/${d.slug}/arquivo`}>
                  <TextoDemo texto={d.titulo} />
                </a>
              </li>
            ))}
          </ul>
        </Secao>
      )}
      {galeria && (
        <Secao id="fotos" titulo={<TextoDemo texto={galeria.titulo} />} branca>
          <Galeria fotos={fotosDaGaleria(galeria)} exibicao={galeria.exibicao ?? 'grade'} />
        </Secao>
      )}
    </>
  )
}
