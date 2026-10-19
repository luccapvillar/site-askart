import type { CSSProperties } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { MatrizEtapa } from '@/components/site/resultados/MatrizEtapa'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { lerBks, lerCategorias, lerEtapas, lerResultadosEtapa } from '@/lib/publico'
import { caminhoDaArea, dataDaEtapa, etapaNaModalidade, modalidadeDe, type Modalidade } from '@/lib/site'
import type { Etapa } from '@/payload-types'
import { Subcategorias } from '../base/Subcategorias'
import { NavegacaoBks } from './AbasBks'
import { CabecalhoArea } from './Modalidades'
import { DataEtapa, dataPorExtenso, nomeDaEtapa } from './pecas'
import s from './Bks.module.css'

const VAZIO: Record<Modalidade, string> = {
  profissional: 'Os resultados dos karts profissionais aparecem aqui assim que a primeira etapa tiver resultado oficial.',
  indoor: 'Os resultados dos karts indoor aparecem aqui assim que a primeira etapa tiver resultado oficial.',
}

/** Etapas da área na temporada atual do BKS e a etapa pedida (pelo número) ou a última realizada. */
async function etapasDaArea(modalidade: Modalidade, numero?: string) {
  const bks = await lerBks()
  const etapas = (bks?.temporada ? await lerEtapas(bks.temporada.id) : []).filter((e) => etapaNaModalidade(e, modalidade))
  const realizadas = etapas.filter((e) => e.status === 'realizada')
  if (numero === undefined) return { realizadas, atual: realizadas.at(-1) ?? null }
  const atual = etapas.find((e) => String(e.numero) === numero)
  // Etapa que não existe (ou não tem categoria desta modalidade): página não encontrada
  if (!atual) notFound()
  return { realizadas, atual }
}

/**
 * Resultados de uma área do BKS (karts profissionais ou indoor): seletor das etapas realizadas e, da
 * etapa escolhida, a matriz de resultados de cada categoria da modalidade, na ordem do painel.
 */
export async function AreaResultados({ modalidade, numero }: { modalidade: Modalidade; numero?: string }) {
  const { realizadas, atual } = await etapasDaArea(modalidade, numero)
  return (
    <>
      <NavegacaoBks area={modalidade} secao="resultados" />
      <section className={`secao-compacta ${s.secaoPrincipal}`} aria-labelledby="resultados">
        <div className="conteiner">
          <CabecalhoArea
            id="resultados"
            modalidade={modalidade}
            titulo="Resultados"
            introducao="Resultado oficial de cada etapa, por categoria: warm-up, classificação, corridas e o resultado da etapa."
          />
          {!realizadas.length && !atual ? (
            <EstadoVazio texto={VAZIO[modalidade]} />
          ) : (
            <>
              {realizadas.length > 0 && (
                <nav className={s.seletorEtapas} aria-label="Escolha a etapa">
                  <ul>
                    {realizadas.map((e) => {
                      const d = dataDaEtapa(e)
                      return (
                        <li key={e.id}>
                          <Link href={caminhoDaArea(modalidade, 'resultados', e.numero)} aria-current={atual?.id === e.id ? 'page' : undefined}>
                            <span className={s.seletorNumero}>{e.numero}ª etapa</span>
                            {d && (
                              <span className={s.seletorData}>
                                {d.dia} {d.mes}
                              </span>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              )}
              {atual && <ResultadoDaEtapaNaArea etapa={atual} modalidade={modalidade} />}
            </>
          )}
        </div>
      </section>
    </>
  )
}

/** Resultado de uma etapa numa modalidade: a etapa, a matriz de cada categoria e o link da etapa. */
function ResultadoDaEtapaNaArea({ etapa, modalidade }: { etapa: Etapa; modalidade: Modalidade }) {
  return (
    <div className={s.resultadoEtapa}>
      <div className={s.etapaEscolhida}>
        <DataEtapa etapa={etapa} />
        <div className={s.etapaEscolhidaTextos}>
          <h3 className="titulo-marca h3">
            <TextoDemo texto={nomeDaEtapa(etapa)} />
          </h3>
          <p className="texto-2">
            {dataPorExtenso(etapa)}
            {etapa.local ? ` · ${semDemo(etapa.local)}` : ''}
          </p>
        </div>
        <Link className={`link-seta ${s.etapaEscolhidaLink}`} href={`/etapas/${etapa.id}`}>
          Página da etapa
        </Link>
      </div>
      <MatrizesDaModalidade etapaId={etapa.id} modalidade={modalidade} nivelTitulo={4} vazio="O resultado desta etapa ainda não foi publicado." />
    </div>
  )
}

/**
 * Resultado da etapa (só as categorias com corrida oficial) e as categorias dele, lidos uma vez por
 * página (a página da etapa e as matrizes de cada modalidade usam a mesma leitura).
 */
export const resultadoComCategorias = cache(async (etapaId: number) => {
  const resultado = await lerResultadosEtapa(etapaId)
  const comCorridas = (resultado?.categorias ?? []).filter((c) => c.corridas.length)
  const categorias = await lerCategorias(comCorridas.map((c) => Number(c.categoria)))
  return { resultado, comCorridas, porId: new Map(categorias.map((c) => [String(c.id), c])) }
})

/**
 * Matriz de resultados (componente MatrizEtapa) de cada categoria da modalidade que tem corrida com
 * resultado na etapa, na ordem em que o resultado da etapa vem (a ordem das categorias na temporada).
 * Usado nos resultados do BKS e na página da etapa.
 */
export async function MatrizesDaModalidade({
  etapaId,
  modalidade,
  nivelTitulo,
  vazio,
}: {
  etapaId: number
  modalidade: Modalidade
  nivelTitulo: 3 | 4
  /** Texto quando a modalidade não tem resultado nesta etapa (sem texto: não mostra nada). */
  vazio?: string
}) {
  const { resultado, comCorridas, porId } = await resultadoComCategorias(etapaId)
  const daModalidade = comCorridas.filter((c) => modalidadeDe(porId.get(String(c.categoria))) === modalidade)
  if (!daModalidade.length) return vazio ? <EstadoVazio texto={vazio} /> : null
  const Titulo = `h${nivelTitulo}` as const
  return (
    <div className={s.pilhaCategorias}>
      {daModalidade.map((c) => {
        const cat = porId.get(String(c.categoria))
        const id = `resultado-${modalidade}-${c.categoria}`
        const nome = semDemo(cat?.nome ?? c.categoriaNome) || 'Categoria'
        return (
          <section
            key={String(c.categoria)}
            className={s.blocoCategoria}
            aria-labelledby={id}
            style={{ '--cor-categoria': cat?.cor ?? 'var(--verde)' } as CSSProperties}
          >
            <header className={s.blocoCabeca}>
              <div className={s.blocoTitulos}>
                <Titulo id={id} className={`titulo-marca h3 ${s.tituloCategoria}`}>
                  <TextoDemo texto={cat?.nome ?? c.categoriaNome} />
                </Titulo>
                <Subcategorias itens={cat?.subcategorias} rotulo={`Subcategorias de ${nome}`} />
              </div>
              {resultado?.parcial && <p className={s.parcial}>Resultado parcial</p>}
            </header>
            <MatrizEtapa
              categoria={{
                id: c.categoria,
                nome: cat?.nome ?? c.categoriaNome ?? 'Categoria',
                cor: cat?.cor ?? null,
                sigla: cat?.sigla ?? null,
                subcategorias: cat?.subcategorias ?? null,
              }}
              resultado={c}
              parcial={resultado?.parcial ?? false}
            />
          </section>
        )
      })}
    </div>
  )
}
