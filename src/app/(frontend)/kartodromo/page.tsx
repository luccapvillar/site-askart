import type { Metadata } from 'next'
import { BotaoIzy, LinkMapa } from '@/components/site/bks/pecas'
import { Canais } from '@/components/site/Canais'
import { CartaoNoticia, GradeCartoes } from '@/components/site/Cartoes'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { Foto, imagemDoCartao } from '@/components/site/Foto'
import { Galeria } from '@/components/site/Galeria'
import { Perguntas } from '@/components/site/Perguntas'
import { Secao, Sumario, TopoPagina } from '@/components/site/paginas/TopoPagina'
import s from '@/components/site/paginas/Paginas.module.css'
import { Taxas } from '@/components/site/Taxas'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico } from '@/components/site/TextoRico'
import { formatarData } from '@/lib/datas'
import { fotosDaGaleria } from '@/lib/galeria'
import {
  comoDoc,
  lerAgenda,
  lerConfiguracoes,
  lerContato,
  lerGradeSemanal,
  lerKartodromo,
  lerNoticias,
  lerPerguntas,
  textosDaSecao,
} from '@/lib/publico'
import { canaisDoContato, NOMES_REDES } from '@/lib/site'
import { montarGrade } from '@/lib/grade'
import { GradeTreinos } from '@/components/site/treinos/GradeTreinos'
import type { CategoriasNoticia, Galeria as TipoGaleria, Midia } from '@/payload-types'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const [k, textos] = await Promise.all([lerKartodromo(), textosDaSecao('kartodromo')])
  return {
    title: textos?.seoTitulo || k.nome || 'Kartódromo',
    description: textos?.seoDescricao || k.resumo || 'Kartódromo Ayrton Senna do Guará: localização, taxas, horários de treino por categoria e como treinar.',
  }
}

export default async function PaginaKartodromo() {
  const [k, contato, config, grade, agenda, perguntas, textos] = await Promise.all([
    lerKartodromo(),
    lerContato(),
    lerConfiguracoes(),
    lerGradeSemanal(),
    lerAgenda(7),
    lerPerguntas(['kartodromo']),
    textosDaSecao('kartodromo'),
  ])
  const noticias = (await lerNoticias(3, 1, { 'categoria.slug': { like: 'kartodromo' } })).docs
  const nome = k.nome || 'Kartódromo Ayrton Senna do Guará'
  const canais = canaisDoContato(contato, 'kartodromo')
  const redes = contato.redes ?? []
  const quadro = montarGrade(grade)
  // Mudanças da semana (pista fechada, horário extra, lotação, cancelamento) — exceções à grade
  const mudancas = agenda.flatMap((d) => d.horarios.filter((h) => h.status !== 'liberado').map((h) => ({ ...h, dia: d.nome, data: d.data })))
  const galerias = (k.galerias ?? []).map((g) => comoDoc<TipoGaleria>(g)).filter((g): g is TipoGaleria => g !== null)
  const temHistoria = Boolean((k.historia as { root?: { children?: unknown[] } } | null)?.root?.children?.length)

  const itens = [
    { id: 'onde-fica', rotulo: 'Onde fica' },
    { id: 'taxas', rotulo: 'Taxas' },
    { id: 'treinos', rotulo: 'Treinos' },
    { id: 'como-treinar', rotulo: 'Como treinar' },
    ...(temHistoria ? [{ id: 'historia', rotulo: 'História' }] : []),
    ...(noticias.length ? [{ id: 'noticias', rotulo: 'Notícias' }] : []),
    ...(perguntas.length ? [{ id: 'duvidas', rotulo: 'Dúvidas' }] : []),
    { id: 'contatos', rotulo: 'Contatos' },
  ]

  return (
    <>
      <TopoPagina
        rotulo={`Administrado pela ${config.sigla || 'ASKART'}`}
        titulo={textos?.titulo || nome}
        intro={textos?.introducao || k.resumo}
        foto={comoDoc<Midia>(textos?.imagem) ?? comoDoc<Midia>(k.imagemTopo)}
        acoes={<LinkMapa href={contato.endereco?.linkMapa ?? null} rotulo="Como chegar" />}
      />
      <Sumario itens={itens} />

      <Secao id="onde-fica" rotulo="Localização" titulo="Onde fica" branca>
        <div className={`${s.duas} ${s.duasLargo}`}>
          <div className={s.endereco}>
            {contato.endereco?.texto ? (
              <address>
                <TextoDemo texto={contato.endereco.texto} />
              </address>
            ) : (
              <p className="texto-2">Endereço a ser publicado.</p>
            )}
            <LinkMapa href={contato.endereco?.linkMapa ?? null} rotulo="Abrir no Google Maps" />
            {(contato.horarios?.length ?? 0) > 0 && (
              <>
                <h3 className="rotulo texto-2">Horário de atendimento</h3>
                <ul className={s.lista} style={{ width: '100%' }}>
                  {contato.horarios!.map((h, i) => (
                    <li key={i}>
                      <span>{semDemo(h.dias)}</span>
                      <strong>{semDemo(h.horario)}</strong>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <Foto midia={comoDoc<Midia>(contato.endereco?.imagemMapa) ?? comoDoc<Midia>(k.imagemTopo)} className={s.fotoArredondada} ate="card" sizes="(min-width: 900px) 40vw, 100vw" credito />
        </div>
      </Secao>

      <Secao id="taxas" rotulo="Para correr" titulo="Taxas e valores">
        <div className={s.duas}>
          {(k.taxas?.length ?? 0) > 0 ? <Taxas taxas={k.taxas ?? []} introducao={k.taxasIntroducao} /> : <EstadoVazio texto="Os valores serão publicados em breve." />}
          <div className={s.cartao}>
            <h3 className="h3">Treinos livres e corridas do BKS</h3>
            <p className="texto-2" style={{ margin: '8px 0 16px' }}>
              A compra dos treinos livres e das corridas de cada etapa é feita pela IZY Pass.
            </p>
            <BotaoIzy href={config.izyPass || null} texto={semDemo(config.izyPassTexto)} />
          </div>
        </div>
      </Secao>

      <Secao id="treinos" rotulo="Treino quase todos os dias" titulo="Grade de treinos" branca>
        <p className="texto-2" style={{ maxWidth: '70ch', marginBottom: 20 }}>
          Cronograma oficial de pista do Kartódromo do Guará. Os horários são definidos pela Administração do Kartódromo e não há tolerância para
          antecipar ou atrasar o início ou o fim de cada treino.
        </p>
        {mudancas.length > 0 && (
          <div className={s.cartao} style={{ marginBottom: 20 }} role="status">
            <h3 className="h3" style={{ marginBottom: 8 }}>
              Mudanças nos próximos dias
            </h3>
            <ul className={s.lista}>
              {mudancas.map((m) => (
                <li key={m.id}>
                  <span>
                    <strong>
                      {m.dia}, {m.data}
                    </strong>{' '}
                    · {m.inicio}–{m.fim} · {semDemo(m.tipo)}
                    {m.observacao ? ` — ${semDemo(m.observacao)}` : ''}
                  </span>
                  <strong>{{ bloqueado: 'Pista fechada', cancelado: 'Cancelado', lotado: 'Lotado', extra: 'Horário extra' }[m.status as string] ?? m.status}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
        {quadro.dias.some((d) => d.horarios.length) ? (
          <GradeTreinos dias={quadro.dias} categorias={quadro.categorias} legenda={quadro.legenda} />
        ) : (
          <EstadoVazio texto="A grade de treinos será publicada em breve." />
        )}
      </Secao>

      <Secao id="como-treinar" rotulo="Passo a passo" titulo="Como treinar no kartódromo">
        <div className={s.duas}>
          <div>
            <TextoRico dados={k.comoTreinarIntroducao} />
          </div>
          {(k.comoTreinar?.length ?? 0) > 0 ? (
            <ol className={s.passos}>
              {k.comoTreinar!.map((p, i) => (
                <li key={p.id ?? i} className={s.passo}>
                  <h3 className="h3">{semDemo(p.titulo)}</h3>
                  {p.texto && <p>{semDemo(p.texto)}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <EstadoVazio texto="O passo a passo será publicado em breve." />
          )}
        </div>
        {(k.dadosPista?.length ?? 0) > 0 && (
          <>
            <h3 className="h3" style={{ margin: '40px 0 16px' }}>
              A pista
            </h3>
            <dl className={s.dados}>
              {k.dadosPista!.map((d, i) => (
                <div key={d.id ?? i}>
                  <dt>{d.rotulo}</dt>
                  <dd>{d.valor}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
        {(k.estrutura?.length ?? 0) > 0 && (
          <>
            <h3 className="h3" style={{ margin: '40px 0 16px' }}>
              Estrutura
            </h3>
            <div className={s.estrutura}>
              {k.estrutura!.map((e, i) => (
                <article key={e.id ?? i}>
                  <Foto midia={comoDoc<Midia>(e.imagem)} ate="card" sizes="(min-width: 900px) 33vw, 100vw" />
                  <h4 className="h3">{e.titulo}</h4>
                  {e.texto && <p className="texto-2">{e.texto}</p>}
                </article>
              ))}
            </div>
          </>
        )}
        {(k.infoPilotos || k.infoVisitantes) && (
          <div className={s.duas} style={{ marginTop: 40 }}>
            {k.infoPilotos && (
              <div className={s.cartao}>
                <h3 className="h3">Para pilotos</h3>
                <TextoRico dados={k.infoPilotos} />
              </div>
            )}
            {k.infoVisitantes && (
              <div className={s.cartao}>
                <h3 className="h3">Para visitantes</h3>
                <TextoRico dados={k.infoVisitantes} />
              </div>
            )}
          </div>
        )}
      </Secao>

      {temHistoria && (
        <Secao id="historia" rotulo="Desde o começo" titulo="História" branca>
          <TextoRico dados={k.historia} />
        </Secao>
      )}

      {galerias.map((g) => (
        <Secao key={g.id} id={`galeria-${g.id}`} rotulo="Fotos" titulo={<TextoDemo texto={g.titulo} />}>
          <Galeria fotos={fotosDaGaleria(g)} exibicao={g.exibicao ?? 'grade'} />
        </Secao>
      ))}

      {noticias.length > 0 && (
        <Secao id="noticias" rotulo="Avisos e novidades" titulo="Notícias do kartódromo" branca>
          <GradeCartoes>
            {noticias.map((n) => (
              <CartaoNoticia
                key={n.id}
                href={`/noticias/${n.slug}`}
                titulo={semDemo(n.titulo)}
                resumo={n.subtitulo}
                data={n.publicarEm ? formatarData(n.publicarEm) : ''}
                categoria={semDemo(comoDoc<CategoriasNoticia>(n.categoria)?.nome) || null}
                imagem={imagemDoCartao(n.capa)}
              />
            ))}
          </GradeCartoes>
        </Secao>
      )}

      {perguntas.length > 0 && (
        <Secao id="duvidas" rotulo="Dúvidas recorrentes" titulo="Perguntas frequentes">
          <Perguntas perguntas={perguntas} />
        </Secao>
      )}

      <Secao id="contatos" rotulo="Fale com a ASKART" titulo="Contatos importantes" branca>
        <div className={s.duas}>
          <Canais canais={canais} />
          {redes.length > 0 && (
            <div>
              <h3 className="rotulo texto-2" style={{ marginBottom: 12 }}>
                Redes sociais
              </h3>
              <div className={s.redes}>
                {redes.map((r) => (
                  <a key={r.url} className={s.rede} href={r.url} target="_blank" rel="noopener noreferrer">
                    {NOMES_REDES[r.rede] ?? r.rede}
                    {r.usuario && (
                      <span className="texto-2">
                        <TextoDemo texto={r.usuario} />
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </Secao>
    </>
  )
}
