import type { Metadata } from 'next'
import { Dados } from '@/components/site/base/Dados'
import { DocumentoParaBaixar } from '@/components/site/conteudo/Artigo'
import i from '@/components/site/conteudo/Institucional.module.css'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { Foto } from '@/components/site/Foto'
import { Galeria } from '@/components/site/Galeria'
import { Secao, TopoPagina } from '@/components/site/paginas/TopoPagina'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico } from '@/components/site/TextoRico'
import { fotosDaGaleria } from '@/lib/galeria'
import { comoDoc, lerBks, lerConfiguracoes, lerInstitucional, lerKartodromo } from '@/lib/publico'
import type { Documento, Galeria as TipoGaleria, Midia } from '@/payload-types'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const config = await lerConfiguracoes()
  return { title: `Sobre a ${config.sigla || 'ASKART'}`, description: config.descricao || undefined, alternates: { canonical: '/sobre' } }
}

export default async function Sobre() {
  const [inst, config, kartodromo, bks] = await Promise.all([lerInstitucional(), lerConfiguracoes(), lerKartodromo(), lerBks()])
  const sigla = config.sigla || 'ASKART'
  const galeria = comoDoc<TipoGaleria>(inst?.galeria)
  const fotos = galeria ? fotosDaGaleria(galeria) : []
  const documentos = (inst?.documentos ?? []).map((d) => comoDoc<Documento>(d)).filter((d): d is Documento => d !== null && Boolean(d.slug))
  const pilares = inst?.pilares ?? []
  const marcos = inst?.marcos ?? []
  const diretoria = inst?.diretoria ?? []
  const nomeCampeonato = semDemo(bks?.campeonato.nome)

  return (
    <>
      <TopoPagina
        trilha={[{ rotulo: `Sobre a ${sigla}` }]}
        rotulo={config.nome || undefined}
        titulo={`Sobre a ${sigla}`}
        intro={inst?.resumo || config.descricao}
        foto={comoDoc<Midia>(inst?.imagemTopo)}
      />

      <Secao id="quem-somos" rotulo="Institucional" titulo="Quem somos" fundo="branco" ampla>
        <div className={i.duasTexto}>
          <div className={i.pilha}>
            {inst?.sobre ? <TextoRico dados={inst.sobre} /> : <EstadoVazio texto="O texto institucional da ASKART ainda não foi publicado." />}
          </div>
          <Dados
            colunas={1}
            itens={[
              { termo: 'Nome', valor: config.nome || 'Associação de Pilotos de Kart de Brasília' },
              { termo: 'Sigla', valor: sigla },
              { termo: 'Administra', valor: kartodromo.nome || 'Kartódromo Ayrton Senna do Guará' },
              ...(nomeCampeonato ? [{ termo: 'Organiza', valor: `${nomeCampeonato}${bks?.campeonato.sigla ? ` (${bks.campeonato.sigla})` : ''}` }] : []),
            ]}
          />
        </div>
        {pilares.length > 0 && (
          <ul className={i.pilares}>
            {pilares.map((p, n) => (
              <li key={p.id ?? n} className={i.cartao}>
                <h3 className={i.cartaoTitulo}>
                  <TextoDemo texto={p.titulo} />
                </h3>
                {p.texto && <p className="texto-2">{semDemo(p.texto)}</p>}
              </li>
            ))}
          </ul>
        )}
      </Secao>

      {(inst?.historia || marcos.length > 0) && (
        <Secao id="historia" rotulo="Trajetória" titulo="História" fundo="papel" ampla>
          <div className={i.pilha}>
            <TextoRico dados={inst?.historia} />
            {marcos.length > 0 && (
              <ol className={i.marcos}>
                {marcos.map((m, n) => (
                  <li key={m.id ?? n} className={i.marco}>
                    <p className={i.marcoAno}>{m.ano}</p>
                    <div>
                      <h3 className={i.cartaoTitulo}>
                        <TextoDemo texto={m.titulo} />
                      </h3>
                      {m.texto && <p className="texto-2">{semDemo(m.texto)}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Secao>
      )}

      {diretoria.length > 0 && (
        <Secao id="diretoria" rotulo="Gestão" titulo="Diretoria" fundo="branco" ampla>
          <ul className={i.diretoria}>
            {diretoria.map((d, n) => {
              const foto = comoDoc<Midia>(d.foto)
              return (
                <li key={d.id ?? n} className={i.membro}>
                  <div className={i.membroFoto}>{foto?.url ? <Foto midia={foto} ate="card" sizes="(min-width: 1040px) 280px, 50vw" alt="" /> : null}</div>
                  <h3 className={i.cartaoTitulo}>
                    <TextoDemo texto={d.nome} />
                  </h3>
                  {d.cargo && <p className="texto-2">{semDemo(d.cargo)}</p>}
                </li>
              )
            })}
          </ul>
        </Secao>
      )}

      {documentos.length > 0 && (
        <Secao id="documentos" rotulo="Transparência" titulo="Documentos" fundo="papel" ampla>
          <ul className={i.documentos}>
            {documentos.map((d) => (
              <li key={d.id}>
                <DocumentoParaBaixar href={`/documentos/${d.slug}/arquivo`} titulo={<TextoDemo texto={d.titulo} />} />
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {galeria && fotos.length > 0 && (
        <Secao id="fotos" rotulo="Fotos" titulo={<TextoDemo texto={galeria.titulo} />} fundo="branco" ampla>
          <Galeria fotos={fotos} exibicao={galeria.exibicao ?? 'grade'} />
        </Secao>
      )}
    </>
  )
}
