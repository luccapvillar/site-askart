import type { CSSProperties } from 'react'
import { ClassificacaoCategoria } from '@/components/site/bks/Tabelas'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { lerBks, lerCategorias, lerClassificacoes, textosDaSecao } from '@/lib/publico'
import { modalidadeDe, type Modalidade } from '@/lib/site'
import { Subcategorias } from '../base/Subcategorias'
import { NavegacaoBks } from './AbasBks'
import { CabecalhoArea } from './Modalidades'
import s from './Bks.module.css'

const VAZIO: Record<Modalidade, string> = {
  profissional: 'A classificação dos karts profissionais aparece depois da primeira etapa com resultado oficial.',
  indoor: 'A classificação dos karts indoor aparece depois da primeira etapa com resultado oficial.',
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','))

/** Classificação de uma área do BKS: tabela de liderança de cada categoria da modalidade (piloto e pontos). */
export async function AreaClassificacao({ modalidade }: { modalidade: Modalidade }) {
  const [bks, textos] = await Promise.all([lerBks(), textosDaSecao('classificacao')])
  const temporada = bks?.temporada
  const todas = temporada ? await lerClassificacoes(temporada.id) : []
  const categorias = await lerCategorias(todas.map((c) => Number(c.categoria)))
  const porId = new Map(categorias.map((c) => [String(c.id), c]))
  const classificacoes = todas.filter((c) => modalidadeDe(porId.get(String(c.categoria))) === modalidade)
  // O texto "vazio" personalizado no painel vale para a área dos karts profissionais (a que existia antes)
  const textoVazio = modalidade === 'profissional' ? textos?.textoVazio || VAZIO.profissional : VAZIO.indoor

  return (
    <>
      <NavegacaoBks area={modalidade} secao="classificacao" />
      <section className={`secao-compacta ${s.secaoPrincipal}`} aria-labelledby="classificacao">
        <div className="conteiner">
          <CabecalhoArea
            id="classificacao"
            modalidade={modalidade}
            titulo={textos?.titulo || `Classificação ${temporada?.ano ?? ''}`.trim()}
            introducao={textos?.introducao || 'Pontuação de cada piloto por categoria, atualizada a cada resultado oficial.'}
          />

          {!classificacoes.length ? (
            <EstadoVazio texto={textoVazio} />
          ) : (
            <>
              {classificacoes.length > 1 && (
                <nav className={s.atalhos} aria-label="Ir para a categoria">
                  <ul>
                    {classificacoes.map((c) => (
                      <li key={String(c.categoria)}>
                        <a href={`#cat-${c.categoria}`}>{semDemo(porId.get(String(c.categoria))?.nome) || 'Categoria'}</a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
              <div className={s.pilhaCategorias}>
                {classificacoes.map((c) => {
                  const cat = porId.get(String(c.categoria))
                  const nome = semDemo(cat?.nome) || 'Categoria'
                  return (
                    <section
                      key={String(c.categoria)}
                      id={`cat-${c.categoria}`}
                      aria-labelledby={`titulo-cat-${c.categoria}`}
                      className={s.blocoCategoria}
                      style={{ '--cor-categoria': cat?.cor ?? 'var(--verde)' } as CSSProperties}
                    >
                      <header className={s.blocoCabeca}>
                        <div className={s.blocoTitulos}>
                          <h3 id={`titulo-cat-${c.categoria}`} className={`titulo-marca h3 ${s.tituloCategoria}`}>
                            <TextoDemo texto={cat?.nome} />
                          </h3>
                          <Subcategorias itens={cat?.subcategorias} rotulo={`Subcategorias de ${nome}`} />
                        </div>
                        {c.lider && (
                          <p className={s.lider}>
                            <span className={s.liderRotulo}>{c.lider.rotulo || 'Líder'}</span>
                            <strong>{semDemo(c.lider.linha.nome)}</strong>
                            <span className={s.liderPontos}>{fmt(c.lider.linha.pontos)} pts</span>
                          </p>
                        )}
                      </header>
                      <ClassificacaoCategoria classificacao={c} nome={nome} cor={cat?.cor} />
                    </section>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
