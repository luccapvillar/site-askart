import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Foto } from '@/components/site/Foto'
import { Secao, TopoPagina } from '@/components/site/paginas/TopoPagina'
import s from '@/components/site/paginas/Paginas.module.css'
import { PlacaNumero } from '@/components/site/PlacaNumero'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico } from '@/components/site/TextoRico'
import { comoDoc, lerBks, lerCategorias, lerClassificacoes, lerPiloto } from '@/lib/publico'
import type { Midia } from '@/payload-types'

export const revalidate = 60
export const dynamicParams = true
export const generateStaticParams = async () => []

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await lerPiloto((await params).slug)
  return { title: p ? semDemo(p.nomeExibicao || p.nome) : 'Piloto não encontrado' }
}

/** Perfil público do piloto: só dados públicos (nascimento e autorização de imagem nunca aparecem). */
export default async function PaginaPiloto({ params }: Props) {
  const piloto = await lerPiloto((await params).slug)
  if (!piloto) notFound()
  const bks = await lerBks()
  const classificacoes = bks?.temporada ? await lerClassificacoes(bks.temporada.id) : []
  const linhas = classificacoes
    .map((c) => ({ c, linha: c.linhas.find((l) => String(l.piloto) === String(piloto.id)) }))
    .filter((x): x is { c: (typeof classificacoes)[number]; linha: NonNullable<(typeof x)['linha']> } => Boolean(x.linha))
  const categorias = await lerCategorias(linhas.map((x) => Number(x.c.categoria)))
  const porId = new Map(categorias.map((c) => [String(c.id), c]))
  const foto = comoDoc<Midia>(piloto.foto)

  return (
    <>
      <TopoPagina
        rotulo="Piloto"
        titulo={<TextoDemo texto={piloto.nomeExibicao || piloto.nome} />}
        intro={[piloto.cidade, piloto.uf].filter(Boolean).join(' – ') || undefined}
      />
      <Secao id="temporada" titulo={`Temporada ${bks?.temporada?.ano ?? ''}`.trim()} branca>
        <div className={s.duas}>
          {foto && <Foto midia={foto} className={s.fotoArredondada} ate="card" sizes="(min-width: 900px) 40vw, 100vw" credito />}
          <div style={{ display: 'grid', gap: 16 }}>
            {linhas.length ? (
              linhas.map(({ c, linha }) => {
                const cat = porId.get(String(c.categoria))
                return (
                  <div key={String(c.categoria)} className={s.cartao} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <PlacaNumero numero={linha.numero} cor={cat?.cor} tamanho="g" />
                    <div>
                      <p className="rotulo texto-2">{semDemo(cat?.nome)}</p>
                      <p className="h3">
                        {linha.posicao}º lugar · {linha.pontos} pontos
                      </p>
                      <p className="texto-2">
                        {linha.vitorias} vitória(s) · {linha.podios} pódio(s) · {linha.corridas} corrida(s)
                        {linha.equipeNome ? ` · ${semDemo(linha.equipeNome)}` : ''}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="texto-2">Sem classificação na temporada atual.</p>
            )}
            <TextoRico dados={piloto.biografia} />
            <p>
              <Link href="/bks/classificacao">Ver classificação completa →</Link>
            </p>
          </div>
        </div>
      </Secao>
    </>
  )
}
