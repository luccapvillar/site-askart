import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Dados } from '@/components/site/base/Dados'
import { Subcategorias } from '@/components/site/base/Subcategorias'
import i from '@/components/site/conteudo/Institucional.module.css'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { Foto } from '@/components/site/Foto'
import { Secao, TopoPagina } from '@/components/site/paginas/TopoPagina'
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
  return p ? { title: semDemo(p.nomeExibicao || p.nome), alternates: { canonical: `/pilotos/${p.slug}` } } : { title: 'Piloto não encontrado' }
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

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
  const nome = piloto.nomeExibicao || piloto.nome
  const local = [piloto.cidade, piloto.uf].filter(Boolean).join(' – ')
  const ano = bks?.temporada?.ano

  return (
    <>
      <TopoPagina
        trilha={[{ rotulo: 'BKS', href: '/bks' }, { rotulo: 'Classificação', href: '/bks/classificacao' }, { rotulo: semDemo(nome) }]}
        rotulo="Piloto"
        titulo={<TextoDemo texto={nome} />}
        intro={local || undefined}
      />
      <Secao id="temporada" rotulo="Classificação" titulo={ano ? `Temporada ${ano}` : 'Temporada atual'} fundo="branco" ampla>
        <div className={i.perfil}>
          {foto?.url && (
            <figure className={i.perfilFoto}>
              <Foto midia={foto} ate="card" sizes="(min-width: 900px) 360px, 100vw" alt={`Foto de ${semDemo(nome)}`} />
              {foto.credito && <figcaption className="texto-2 texto-pequeno">Foto: {foto.credito}</figcaption>}
            </figure>
          )}
          <div className={i.pilha}>
            {linhas.length ? (
              <ul className={i.posicoes}>
                {linhas.map(({ c, linha }) => {
                  const cat = porId.get(String(c.categoria))
                  return (
                    <li key={String(c.categoria)} className={i.posicao} style={{ '--cor-cat': cat?.cor || 'var(--verde)' } as React.CSSProperties}>
                      <div className={i.posicaoCabeca}>
                        <PlacaNumero numero={linha.numero} cor={cat?.cor} tamanho="g" />
                        <div>
                          <h3 className={i.cartaoTitulo}>
                            <TextoDemo texto={cat?.nome || 'Categoria'} />
                          </h3>
                          <Subcategorias itens={cat?.subcategorias} rotulo={`Subcategorias da ${semDemo(cat?.nome) || 'categoria'}`} />
                        </div>
                      </div>
                      <Dados
                        itens={[
                          { termo: 'Posição', valor: `${linha.posicao}º` },
                          { termo: 'Pontos', valor: linha.pontos },
                          { termo: 'Vitórias', valor: linha.vitorias },
                          { termo: 'Pódios', valor: linha.podios },
                        ]}
                      />
                      <p className="texto-2 texto-pequeno">
                        {plural(linha.corridas, 'corrida disputada', 'corridas disputadas')}
                        {linha.equipeNome ? (
                          <>
                            {' · Equipe '}
                            <TextoDemo texto={linha.equipeNome} />
                          </>
                        ) : null}
                      </p>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EstadoVazio texto="Este piloto não aparece na classificação da temporada atual." />
            )}
            <TextoRico dados={piloto.biografia} />
            <p>
              <Link className="link-seta" href="/bks/classificacao">
                Ver a classificação completa
              </Link>
            </p>
          </div>
        </div>
      </Secao>
    </>
  )
}
