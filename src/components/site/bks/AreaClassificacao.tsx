import { ClassificacaoCategoria } from '@/components/site/bks/Tabelas'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { lerBks, lerCategorias, lerClassificacoes, textosDaSecao } from '@/lib/publico'
import { modalidadeDe, type Modalidade } from '@/lib/site'
import { CabecalhoArea, SeletorModalidade } from './Modalidades'
import s from './Bks.module.css'

const VAZIO: Record<Modalidade, string> = {
  profissional:
    'A classificação dos karts profissionais aparece depois da primeira etapa com resultado oficial.',
  indoor:
    'A classificação dos karts indoor aparece depois da primeira etapa com resultado oficial.',
}

/** Classificação de uma área do BKS: tabela de liderança de cada categoria da modalidade (piloto e pontos). */
export async function AreaClassificacao({ modalidade }: { modalidade: Modalidade }) {
  const [bks, textos] = await Promise.all([lerBks(), textosDaSecao('classificacao')])
  const temporada = bks?.temporada
  const todas = temporada ? await lerClassificacoes(temporada.id) : []
  const categorias = await lerCategorias(todas.map((c) => Number(c.categoria)))
  const porId = new Map(categorias.map((c) => [String(c.id), c]))
  const classificacoes = todas.filter(
    (c) => modalidadeDe(porId.get(String(c.categoria))) === modalidade,
  )
  // O texto "vazio" personalizado no painel vale para a área dos karts profissionais (a que existia antes)
  const textoVazio =
    modalidade === 'profissional' ? textos?.textoVazio || VAZIO.profissional : VAZIO.indoor

  return (
    <section className="secao-compacta" aria-labelledby="classificacao">
      <div className="conteiner">
        <SeletorModalidade atual={modalidade} secao="classificacao" />
        <CabecalhoArea
          id="classificacao"
          modalidade={modalidade}
          titulo={textos?.titulo || `Classificação ${temporada?.ano ?? ''}`.trim()}
          introducao={
            textos?.introducao ||
            'Pontuação de cada piloto por categoria, atualizada a cada resultado oficial.'
          }
        />

        {!classificacoes.length ? (
          <EstadoVazio texto={textoVazio} />
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
                  <section
                    key={String(c.categoria)}
                    id={`cat-${c.categoria}`}
                    aria-labelledby={`titulo-cat-${c.categoria}`}
                    className={s.categoria}
                  >
                    <h3 id={`titulo-cat-${c.categoria}`} className={`h3 ${s.tituloCategoria}`}>
                      <span
                        className={s.corCategoria}
                        style={{
                          background: cat?.cor ?? 'var(--camp-primaria, var(--marca-primaria))',
                        }}
                        aria-hidden="true"
                      />
                      <TextoDemo texto={cat?.nome} />
                      {c.lider && (
                        <span className={s.liderResumo}>
                          {c.lider.rotulo || 'Líder'}:{' '}
                          <strong>{semDemo(c.lider.linha.nome)}</strong>
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
