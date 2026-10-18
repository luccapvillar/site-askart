import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { MatrizEtapa } from '@/components/site/resultados/MatrizEtapa'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { TextoDemo } from '@/components/site/TextoDemo'
import { lerBks, lerCategorias, lerEtapas, lerResultadosEtapa } from '@/lib/publico'
import { caminhoDaArea, etapaNaModalidade, modalidadeDe, type Modalidade } from '@/lib/site'
import type { Etapa } from '@/payload-types'
import { CabecalhoArea, SeletorModalidade } from './Modalidades'
import { dataPorExtenso, nomeDaEtapa } from './pecas'
import s from './Bks.module.css'

const VAZIO: Record<Modalidade, string> = {
  profissional:
    'Os resultados dos karts profissionais aparecem aqui assim que a primeira etapa tiver resultado oficial.',
  indoor:
    'Os resultados dos karts indoor aparecem aqui assim que a primeira etapa tiver resultado oficial.',
}

/** Etapas da área na temporada atual do BKS e a etapa pedida (pelo número) ou a última realizada. */
async function etapasDaArea(modalidade: Modalidade, numero?: string) {
  const bks = await lerBks()
  const etapas = (bks?.temporada ? await lerEtapas(bks.temporada.id) : []).filter((e) =>
    etapaNaModalidade(e, modalidade),
  )
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
export async function AreaResultados({
  modalidade,
  numero,
}: {
  modalidade: Modalidade
  numero?: string
}) {
  const { realizadas, atual } = await etapasDaArea(modalidade, numero)
  return (
    <section className="secao-compacta" aria-labelledby="resultados">
      <div className="conteiner">
        <SeletorModalidade atual={modalidade} secao="resultados" />
        <CabecalhoArea
          id="resultados"
          modalidade={modalidade}
          titulo="Resultados"
          introducao="Resultado oficial de cada etapa, por categoria."
        />
        {!realizadas.length && !atual ? (
          <EstadoVazio texto={VAZIO[modalidade]} />
        ) : (
          <>
            {realizadas.length > 0 && (
              <nav className={s.seletorEtapas} aria-label="Escolha a etapa">
                {realizadas.map((e) => (
                  <Link
                    key={e.id}
                    href={caminhoDaArea(modalidade, 'resultados', e.numero)}
                    aria-current={atual?.id === e.id ? 'page' : undefined}
                  >
                    {e.numero}ª etapa
                  </Link>
                ))}
              </nav>
            )}
            {atual && <ResultadoDaEtapaNaArea etapa={atual} modalidade={modalidade} />}
          </>
        )}
      </div>
    </section>
  )
}

/** Resultado de uma etapa numa modalidade: título da etapa, a matriz de cada categoria e o link da etapa. */
function ResultadoDaEtapaNaArea({ etapa, modalidade }: { etapa: Etapa; modalidade: Modalidade }) {
  return (
    <div className={s.resultadoEtapa}>
      <h3 className="h3">
        <TextoDemo texto={nomeDaEtapa(etapa)} />{' '}
        <span className="texto-2">· {dataPorExtenso(etapa)}</span>
      </h3>
      <MatrizesDaModalidade
        etapaId={etapa.id}
        modalidade={modalidade}
        nivelTitulo={4}
        vazio="O resultado desta etapa ainda não foi publicado."
      />
      <p>
        <Link className={s.linkSeta} href={`/etapas/${etapa.id}`}>
          Página da etapa (fotos e notícias) <span aria-hidden="true">→</span>
        </Link>
      </p>
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
  const daModalidade = comCorridas.filter(
    (c) => modalidadeDe(porId.get(String(c.categoria))) === modalidade,
  )
  if (!daModalidade.length) return vazio ? <EstadoVazio texto={vazio} /> : null
  const Titulo = `h${nivelTitulo}` as const
  return (
    <div className={s.pilhaCategorias}>
      {daModalidade.map((c) => {
        const cat = porId.get(String(c.categoria))
        const id = `resultado-${modalidade}-${c.categoria}`
        return (
          <section key={String(c.categoria)} className={s.categoria} aria-labelledby={id}>
            <Titulo id={id} className={`h3 ${s.tituloCategoria}`}>
              <span
                className={s.corCategoria}
                style={{ background: cat?.cor ?? 'var(--camp-p)' }}
                aria-hidden="true"
              />
              <TextoDemo texto={cat?.nome ?? c.categoriaNome} />
            </Titulo>
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
