import type { Metadata } from 'next'
import Link from 'next/link'
import { ListaAvisos } from '@/components/site/avisos/ListaAvisos'
import s from '@/components/site/avisos/Avisos.module.css'
import { SeloNivel } from '@/components/site/avisos/SeloNivel'
import { Paginacao } from '@/components/site/conteudo/Paginacao'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { TopoPagina } from '@/components/site/paginas/TopoPagina'
import { comoDoc, lerAvisos, textosDaSecao } from '@/lib/publico'
import type { Midia } from '@/payload-types'

export const revalidate = 60

/** Os textos do topo vêm de "Textos das seções" → Comunicados (a mesma seção, agora chamada Avisos). */
const SECAO = 'comunicados'
const POR_PAGINA = 20
/** Só avisos no ar (publicados e dentro do período de exibição) chegam aqui. */
const LIMITE = 200

export async function generateMetadata(): Promise<Metadata> {
  const textos = await textosDaSecao(SECAO)
  return {
    title: textos?.seoTitulo || 'Avisos',
    description:
      textos?.seoDescricao || 'Avisos e comunicados oficiais da ASKART sobre treinos, etapas e o Kartódromo do Guará.',
    alternates: { canonical: '/avisos' },
  }
}

export default async function Avisos({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { pagina: p } = await searchParams
  const [avisos, textos] = await Promise.all([lerAvisos(LIMITE), textosDaSecao(SECAO)])
  const total = Math.max(1, Math.ceil(avisos.length / POR_PAGINA))
  const pagina = Math.min(total, Math.max(1, Math.floor(Number(p)) || 1))
  const daPagina = avisos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  return (
    <>
      <TopoPagina
        trilha={[{ rotulo: 'Avisos' }]}
        rotulo="Comunicados oficiais da ASKART"
        titulo={textos?.titulo || 'Avisos'}
        intro={
          textos?.introducao ||
          'Mudanças de treino, de etapa e de horário, cancelamentos e comunicados oficiais. Os mais recentes aparecem primeiro.'
        }
        foto={comoDoc<Midia>(textos?.imagem)}
      />

      <section className="secao-compacta fundo-papel" aria-labelledby="avisos-no-ar">
        <div className={`conteiner ${s.pagina}`}>
          <div className={s.principal}>
            <h2 id="avisos-no-ar" className={s.contagem}>
              {!avisos.length
                ? 'Avisos no ar'
                : avisos.length === 1
                  ? '1 aviso no ar'
                  : `${avisos.length} avisos no ar`}
              {total > 1 && <span className="texto-2"> · página {pagina} de {total}</span>}
            </h2>
            {!avisos.length ? (
              <EstadoVazio
                texto={textos?.textoVazio || 'Nenhum aviso no momento.'}
                acao={
                  <Link className="link-seta" href="/noticias">
                    Ver as notícias
                  </Link>
                }
              />
            ) : (
              <ListaAvisos avisos={daPagina} />
            )}
            <Paginacao pagina={pagina} total={total} base="/avisos" rotulo="Páginas de avisos" />
          </div>

          <aside className={s.lateral} aria-labelledby="sobre-avisos">
            <h2 id="sobre-avisos" className={s.lateralTitulo}>
              Como ler os avisos
            </h2>
            <p className="texto-2 texto-pequeno">Cada aviso traz o nível em texto e em ícone, do mais leve ao mais importante:</p>
            <ul className={s.legenda} aria-label="Níveis dos avisos">
              <li>
                <SeloNivel nivel="informativo" />
              </li>
              <li>
                <SeloNivel nivel="atencao" />
              </li>
              <li>
                <SeloNivel nivel="urgente" />
              </li>
            </ul>
            <p className="texto-2 texto-pequeno">Antes de ir ao kartódromo, confira também:</p>
            <ul className={s.atalhos}>
              <li>
                <Link className="link-seta" href="/kartodromo#grade">
                  Grade de treinos
                </Link>
              </li>
              <li>
                <Link className="link-seta" href="/bks">
                  Calendário do BKS
                </Link>
              </li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  )
}
