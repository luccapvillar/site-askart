import type { Metadata } from 'next'
import s from '@/components/site/bks/Bks.module.css'
import { ClassificacaoCategoria } from '@/components/site/bks/Tabelas'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { lerBks, lerCategorias, lerClassificacoes, textosDaSecao } from '@/lib/publico'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'BKS — Classificação',
  description: 'Tabela de liderança de cada categoria do BKS — Brasília Kart Series: pilotos e pontos.',
}

/** Sub-aba Classificação: tabela de liderança de cada categoria (piloto e pontos). */
export default async function ClassificacaoBks() {
  const [bks, textos] = await Promise.all([lerBks(), textosDaSecao('classificacao')])
  const temporada = bks?.temporada
  const classificacoes = temporada ? await lerClassificacoes(temporada.id) : []
  const categorias = await lerCategorias(classificacoes.map((c) => Number(c.categoria)))
  const porId = new Map(categorias.map((c) => [String(c.id), c]))

  return (
    <section className="secao-compacta" aria-labelledby="classificacao">
      <div className="conteiner">
        <div className={s.cabecalhoSecao}>
          <h2 id="classificacao" className="titulo-marca h2">
            {textos?.titulo || `Classificação ${temporada?.ano ?? ''}`.trim()}
          </h2>
          <p className="texto-2">{textos?.introducao || 'Pontuação de cada piloto por categoria, atualizada a cada resultado oficial.'}</p>
        </div>

        {!classificacoes.length ? (
          <EstadoVazio texto={textos?.textoVazio || 'A classificação aparece depois da primeira etapa com resultado oficial.'} />
        ) : (
          <>
            {classificacoes.length > 1 && (
              <nav className={s.atalhosCategorias} aria-label="Categorias">
                {classificacoes.map((c) => {
                  const cat = porId.get(String(c.categoria))
                  return (
                    <a key={String(c.categoria)} href={`#cat-${c.categoria}`}>
                      {semDemo(cat?.nome) || 'Categoria'}
                    </a>
                  )
                })}
              </nav>
            )}
            <div className={s.pilhaCategorias}>
              {classificacoes.map((c) => {
                const cat = porId.get(String(c.categoria))
                const nome = semDemo(cat?.nome) || 'Categoria'
                return (
                  <section key={String(c.categoria)} id={`cat-${c.categoria}`} aria-labelledby={`titulo-cat-${c.categoria}`} className={s.categoria}>
                    <h3 id={`titulo-cat-${c.categoria}`} className={`h3 ${s.tituloCategoria}`}>
                      <span className={s.corCategoria} style={{ background: cat?.cor ?? 'var(--camp-primaria, var(--marca-primaria))' }} aria-hidden="true" />
                      <TextoDemo texto={cat?.nome} />
                      {c.lider && (
                        <span className={s.liderResumo}>
                          {c.lider.rotulo || 'Líder'}: <strong>{semDemo(c.lider.linha.nome)}</strong>
                        </span>
                      )}
                    </h3>
                    <ClassificacaoCategoria classificacao={c} nome={nome} cor={cat?.cor} />
                  </section>
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
