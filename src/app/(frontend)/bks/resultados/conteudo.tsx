import Link from 'next/link'
import { dataPorExtenso, nomeDaEtapa } from '@/components/site/bks/pecas'
import s from '@/components/site/bks/Bks.module.css'
import { ResultadoCategoria } from '@/components/site/bks/Tabelas'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { lerCategorias, lerResultadosEtapa } from '@/lib/publico'
import type { Etapa } from '@/payload-types'

/** Conteúdo da sub-aba Resultados: seletor de etapas realizadas e o resultado de cada categoria. */
export async function ResultadosBks({ etapas, atual }: { etapas: Etapa[]; atual: Etapa | null }) {
  const realizadas = etapas.filter((e) => e.status === 'realizada')
  const resultado = atual ? await lerResultadosEtapa(atual.id) : null
  const categorias = await lerCategorias((resultado?.categorias ?? []).map((c) => Number(c.categoria)))
  const cor = new Map(categorias.map((c) => [String(c.id), c.cor ?? null]))

  return (
    <section className="secao-compacta" aria-labelledby="resultados">
      <div className="conteiner">
        <div className={s.cabecalhoSecao}>
          <h2 id="resultados" className="titulo-marca h2">
            Resultados
          </h2>
          <p className="texto-2">Resultado oficial de cada etapa, por categoria.</p>
        </div>
        {!realizadas.length ? (
          <EstadoVazio texto="Os resultados aparecem aqui assim que a primeira etapa tiver resultado oficial." />
        ) : (
          <>
            <nav className={s.seletorEtapas} aria-label="Escolha a etapa">
              {realizadas.map((e) => (
                <Link key={e.id} href={`/bks/resultados/${e.numero}`} aria-current={atual?.id === e.id ? 'page' : undefined}>
                  {e.numero}ª etapa
                </Link>
              ))}
            </nav>
            {atual && (
              <div className={s.resultadoEtapa}>
                <h3 className="h3">
                  <TextoDemo texto={nomeDaEtapa(atual)} /> <span className="texto-2">· {dataPorExtenso(atual)}</span>
                </h3>
                {!resultado || !resultado.categorias.some((c) => c.corridas.length) ? (
                  <EstadoVazio texto="O resultado desta etapa ainda não foi publicado." />
                ) : (
                  resultado.categorias.map((c) =>
                    c.corridas.length ? (
                      <section key={String(c.categoria)} className={s.categoria} aria-label={semDemo(c.categoriaNome) || 'Categoria'}>
                        <h4 className={`h3 ${s.tituloCategoria}`}>
                          <span className={s.corCategoria} style={{ background: cor.get(String(c.categoria)) ?? 'var(--camp-primaria, var(--marca-primaria))' }} aria-hidden="true" />
                          <TextoDemo texto={c.categoriaNome} />
                        </h4>
                        <ResultadoCategoria resultado={c} cor={cor.get(String(c.categoria))} />
                      </section>
                    ) : null,
                  )
                )}
                <p>
                  <Link className={s.linkSeta} href={`/etapas/${atual.id}`}>
                    Página da etapa (fotos e notícias) <span aria-hidden="true">→</span>
                  </Link>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
