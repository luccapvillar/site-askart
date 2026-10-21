import type { Metadata } from 'next'
import { Botao } from '@/components/site/Botao'
import { Canais } from '@/components/site/Canais'
import { CartaoNoticia, GradeCartoes } from '@/components/site/Cartoes'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import { Foto, imagemDoCartao } from '@/components/site/Foto'
import { Perguntas } from '@/components/site/Perguntas'
import { Taxas } from '@/components/site/Taxas'
import { separarDemo, semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico } from '@/components/site/TextoRico'
import { TituloSecao } from '@/components/site/TituloSecao'
import { Dados, type ItemDado } from '@/components/site/base/Dados'
import { FaixaFoto } from '@/components/site/base/FaixaFoto'
import { Nota } from '@/components/site/base/Nota'
import { Secao, Sumario, TopoPagina } from '@/components/site/paginas/TopoPagina'
import { GradeTreinos } from '@/components/site/treinos/GradeTreinos'
import { MudancasGrade } from '@/components/site/treinos/MudancasGrade'
import { diaSemanaDaChave } from '@/lib/agenda'
import { chaveDia, formatarData } from '@/lib/datas'
import { montarGrade } from '@/lib/grade'
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
import type { CategoriasNoticia, Galeria as TipoGaleria, Midia } from '@/payload-types'
import { MapaSobDemanda } from './MapaSobDemanda'
import k from './Kartodromo.module.css'

export const revalidate = 60

const NOME_PADRAO = 'Kartódromo Ayrton Senna do Guará'

export async function generateMetadata(): Promise<Metadata> {
  const [kartodromo, textos] = await Promise.all([lerKartodromo(), textosDaSecao('kartodromo')])
  return {
    title: textos?.seoTitulo || kartodromo.nome || 'Kartódromo',
    description:
      textos?.seoDescricao ||
      semDemo(kartodromo.resumo) ||
      'Kartódromo Ayrton Senna do Guará: onde fica, grade semanal de treinos por categoria, taxas, como treinar e contatos.',
  }
}

/* ───────────────────────────── fotos ───────────────────────────── */

const ehFoto = (m: unknown): m is Midia =>
  Boolean(m && typeof m === 'object' && (m as Midia).url && !String((m as Midia).mimeType ?? '').startsWith('video/'))

/** Foto boa para ocupar a largura toda (topo): deitada e com resolução suficiente. */
const fotoLarga = (m: unknown): Midia | null => (ehFoto(m) && (m.width ?? 0) >= 1200 && (m.width ?? 0) > (m.height ?? 0) ? m : null)

const deitada = (m: Midia) => (m.width ?? 0) >= (m.height ?? 0)

/** Fotos das galerias do kartódromo (capa primeiro), sem repetir. */
function fotosDasGalerias(galerias: TipoGaleria[]): Midia[] {
  const vistas = new Set<number>()
  return galerias
    .flatMap((g) => [g.capa, ...(g.fotos ?? [])])
    .filter(ehFoto)
    .filter((f) => (vistas.has(f.id) ? false : (vistas.add(f.id), true)))
}

/* ───────────────────────────── mapa ───────────────────────────── */

/**
 * Endereço do mapa interativo (carregado só no toque). Usa a busca do link "Como chegar" cadastrado no
 * painel; sem ela, o endereço. Endereço de demonstração não vira mapa (seria um lugar errado).
 */
function mapaEmbutido(linkMapa: string | null | undefined, endereco: string | null | undefined, nome: string): string | null {
  let busca: string | null = null
  if (linkMapa) {
    try {
      const u = new URL(linkMapa)
      if (/(^|\.)google\.[a-z.]+$/.test(u.hostname)) busca = u.searchParams.get('query') || u.searchParams.get('q')
    } catch {
      busca = null
    }
  }
  const { texto, demo } = separarDemo(endereco)
  if (!busca && texto && !demo) busca = `${nome}, ${texto.split('\n')[0]}`
  if (!busca) return null
  return `https://maps.google.com/maps?q=${encodeURIComponent(busca)}&hl=pt-BR&z=16&output=embed`
}

/* ───────────────────────────── contatos ───────────────────────────── */

const NOME_DO_CANAL: Record<string, string> = { whatsapp: 'WhatsApp', telefone: 'telefone', email: 'e-mail' }

/** "WhatsApp e telefone", "Telefone, WhatsApp e e-mail"… conforme os canais cadastrados. */
function tituloDosCanais(tipos: string[]): string {
  const nomes = [...new Set(tipos.map((t) => NOME_DO_CANAL[t]).filter(Boolean))]
  if (!nomes.length) return 'Atendimento'
  const texto = nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/* ───────────────────────────── página ───────────────────────────── */

/**
 * Página do Kartódromo, com identidade própria tirada da pista (tema em Kartodromo.module.css: asfalto,
 * verde do gramado, amarelo de sinalização e a faixa tracejada de pista). Cabeçalho, menu e rodapé continuam
 * com a identidade da ASKART; as cores das turmas da grade de treinos são as oficiais.
 */
export default async function PaginaKartodromo() {
  const [kartodromo, contato, config, grade, agenda, perguntas, textos, noticiasLidas] = await Promise.all([
    lerKartodromo(),
    lerContato(),
    lerConfiguracoes(),
    lerGradeSemanal(),
    lerAgenda(7),
    lerPerguntas(['kartodromo']),
    textosDaSecao('kartodromo'),
    lerNoticias(3, 1, { 'categoria.slug': { like: 'kartodromo' } }),
  ])
  const noticias = noticiasLidas.docs
  const nome = kartodromo.nome || NOME_PADRAO
  const sigla = config.sigla || 'ASKART'
  const linkMapa = contato.endereco?.linkMapa || null
  const enderecoTexto = contato.endereco?.texto || null
  const canais = canaisDoContato(contato, 'kartodromo')
  const redes = contato.redes ?? []
  const redesDoKartodromo = redes.filter((r) => r.referente !== 'bks')
  const instagram = redesDoKartodromo.find((r) => r.rede === 'instagram') ?? null
  const outrasRedes = redesDoKartodromo.filter((r) => r !== instagram)

  // Grade semanal oficial + o que foge dela nos próximos dias
  const quadro = montarGrade(grade)
  const temGrade = quadro.dias.some((d) => d.horarios.length)
  const hoje = diaSemanaDaChave(chaveDia(new Date()))

  // Fotos: topo largo, foto do local no mapa e as demais distribuídas pela página, sem repetir
  const galerias = (kartodromo.galerias ?? []).map((g) => comoDoc<TipoGaleria>(g)).filter((g): g is TipoGaleria => g !== null)
  const fotos = fotosDasGalerias(galerias)
  const fotoTopo = fotoLarga(comoDoc(textos?.imagem)) ?? fotoLarga(comoDoc(kartodromo.imagemTopo)) ?? fotos.map(fotoLarga).find(Boolean) ?? null
  const fotoLocal = [comoDoc<Midia>(contato.endereco?.imagemMapa), comoDoc<Midia>(kartodromo.imagemTopo)].find(ehFoto) ?? null
  const usadas = new Set([fotoTopo?.id, fotoLocal?.id])
  const restantes = fotos.filter((f) => !usadas.has(f.id) && deitada(f))
  const fotoBks = restantes[0] ?? null
  const fotoTreino = restantes[1] ?? null
  const mosaico = restantes.slice(2, 7)
  // Link para a galeria completa só quando sobrar foto que não aparece nesta página
  const mostradas = new Set([fotoTopo, fotoLocal, fotoBks, fotoTreino, ...mosaico].map((f) => f?.id))
  const galeriaComMais = galerias.find((g) => g.slug && (g.fotos ?? []).some((f) => ehFoto(f) && !mostradas.has(f.id))) ?? null

  const enderecoMapa = mapaEmbutido(linkMapa, enderecoTexto, nome)
  const temHistoria = Boolean((kartodromo.historia as { root?: { children?: unknown[] } } | null)?.root?.children?.length)
  const temPista =
    (kartodromo.dadosPista?.length ?? 0) > 0 || ehFoto(kartodromo.tracado) || (kartodromo.estrutura?.length ?? 0) > 0 || Boolean(kartodromo.infoPilotos || kartodromo.infoVisitantes)

  const itens = [
    { id: 'onde-fica', rotulo: 'Onde fica' },
    { id: 'treinos', rotulo: 'Grade de treinos' },
    { id: 'taxas', rotulo: 'Taxas' },
    { id: 'como-treinar', rotulo: 'Como treinar' },
    ...(temHistoria ? [{ id: 'historia', rotulo: 'História' }] : []),
    ...(mosaico.length ? [{ id: 'fotos', rotulo: 'Fotos' }] : []),
    ...(noticias.length ? [{ id: 'noticias', rotulo: 'Notícias' }] : []),
    ...(perguntas.length ? [{ id: 'duvidas', rotulo: 'Dúvidas' }] : []),
    { id: 'contatos', rotulo: 'Contatos' },
  ]

  const essenciais: ItemDado[] = [
    { termo: 'Uso da pista', valor: 'Treinos e corridas', nota: 'Não há aluguel de kart.' },
    { termo: 'Treinos', valor: 'Quase todos os dias', nota: temGrade ? 'Dias e horários de cada categoria na grade semanal.' : 'A grade semanal ainda não foi publicada.' },
    ...(contato.horarios ?? []).map((h) => ({ termo: 'Atendimento', valor: <TextoDemo texto={h.horario} />, nota: <TextoDemo texto={h.dias} /> })),
  ]

  return (
    <div className={k.tema}>
      <TopoPagina
        trilha={[{ rotulo: 'Kartódromo' }]}
        rotulo={`Administrado pela ${sigla}`}
        titulo={textos?.titulo || nome}
        intro={textos?.introducao || semDemo(kartodromo.resumo) || null}
        foto={fotoTopo}
        acoes={
          <>
            <Botao href="#treinos" variante="destaque" grande>
              Ver a grade de treinos
            </Botao>
            {linkMapa && (
              <Botao href={linkMapa} variante="contorno" grande seta>
                Como chegar
              </Botao>
            )}
          </>
        }
      />
      <Sumario itens={itens} />

      {/* ───────── Onde fica ───────── */}
      <Secao id="onde-fica" rotulo="Localização" titulo="Onde fica" fundo="branco">
        <div className={k.local}>
          <div className={k.localTextos}>
            <p className={k.localNome}>{nome}</p>
            {enderecoTexto ? (
              <address className={k.endereco}>
                <TextoDemo texto={enderecoTexto} />
              </address>
            ) : (
              <p className="texto-2">O endereço ainda não foi publicado.</p>
            )}
            {linkMapa && (
              <div className="botoes">
                <Botao href={linkMapa} seta>
                  Como chegar pelo Google Maps
                </Botao>
              </div>
            )}
            <Dados itens={essenciais} colunas={1} />
          </div>
          {enderecoMapa ? (
            <MapaSobDemanda endereco={enderecoMapa} titulo={`Mapa: ${nome}`}>
              {fotoLocal && <Foto midia={fotoLocal} className={k.mapaFoto} ate="card" sizes="(min-width: 900px) 40vw, 100vw" credito />}
            </MapaSobDemanda>
          ) : (
            fotoLocal && <Foto midia={fotoLocal} className={k.fotoLocal} ate="card" sizes="(min-width: 900px) 40vw, 100vw" credito />
          )}
        </div>
      </Secao>

      {/* ───────── Grade semanal ───────── */}
      <Secao
        id="treinos"
        rotulo="Treino quase todos os dias"
        titulo="Grade semanal de treinos"
        intro="Grade oficial da Administração do Kartódromo. Cada horário é de uma turma: escolha a sua categoria para ver só os horários dela."
        ampla
      >
        <div className={k.pilhaTreinos}>
          <MudancasGrade dias={agenda} grade={quadro.dias} />
          {temGrade ? (
            <GradeTreinos dias={quadro.dias} categorias={quadro.categorias} legenda={quadro.legenda} hoje={hoje} />
          ) : (
            <EstadoVazio texto="A grade semanal de treinos ainda não foi publicada." />
          )}
          {temGrade && (
            <Nota tom="atencao" titulo="Respeite o horário da turma">
              Os horários são definidos pela Administração do Kartódromo. Não há tolerância para antecipar ou atrasar o início ou o fim de cada treino.
            </Nota>
          )}
        </div>
      </Secao>

      {/* ───────── Taxas ───────── */}
      <Secao id="taxas" rotulo="Para andar na pista" titulo="Taxas" fundo="branco">
        <div className={k.taxas}>
          {(kartodromo.taxas?.length ?? 0) > 0 ? (
            <Taxas taxas={kartodromo.taxas ?? []} introducao={kartodromo.taxasIntroducao} />
          ) : (
            <EstadoVazio texto="Os valores das taxas ainda não foram publicados." />
          )}
          <aside className={k.lado} aria-labelledby="izy-titulo">
            <p className="rotulo texto-2">Etapas do BKS</p>
            <h3 id="izy-titulo" className="h3">
              Treinos livres e corridas
            </h3>
            <p className="texto-2">
              Nas etapas do BKS, os treinos livres e as corridas são comprados pela IZY Pass. O link de cada compra fica na página da etapa, no
              calendário do BKS.
            </p>
            <div className="botoes">
              <Botao href="/bks" variante="secundario" seta>
                Calendário do BKS
              </Botao>
              {config.izyPass && (
                <Botao href={config.izyPass} variante="texto" seta>
                  {semDemo(config.izyPassTexto) || 'IZY Pass'}
                </Botao>
              )}
            </div>
          </aside>
        </div>
      </Secao>

      {/* ───────── Como treinar ───────── */}
      <Secao id="como-treinar" rotulo="Passo a passo" titulo="Como treinar no kartódromo" ampla>
        <div className={k.comoTreinar}>
          <div className={k.comoTreinarLado}>
            <TextoRico dados={kartodromo.comoTreinarIntroducao} />
            {fotoTreino && (
              <Foto midia={fotoTreino} className={k.fotoTreino} ate="card" sizes="(min-width: 960px) 40vw, 100vw" credito />
            )}
          </div>
          {(kartodromo.comoTreinar?.length ?? 0) > 0 ? (
            <ol className={k.passos}>
              {kartodromo.comoTreinar!.map((p, i) => (
                <li key={p.id ?? i} className={k.passo}>
                  <span className={k.passoNumero} aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className={k.passoTextos}>
                    <h3 className="h3">
                      <span className="visualmente-oculto">Passo {i + 1}: </span>
                      <TextoDemo texto={p.titulo} />
                    </h3>
                    {p.texto && <p>{semDemo(p.texto)}</p>}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EstadoVazio texto="O passo a passo para treinar ainda não foi publicado." />
          )}
        </div>

        {temPista && (
          <div className={k.pista}>
            <div className={k.divisorPista} aria-hidden="true" />
            <h3 className="titulo-marca h3">A pista e a estrutura</h3>
            {(kartodromo.dadosPista?.length ?? 0) > 0 && (
              <Dados
                itens={kartodromo.dadosPista!.map((d) => ({ termo: semDemo(d.rotulo), valor: <TextoDemo texto={d.valor} /> }))}
                colunas={3}
              />
            )}
            {ehFoto(kartodromo.tracado) && (
              <Foto midia={kartodromo.tracado} className={k.tracado} ate="destaque" sizes="(min-width: 1280px) 1184px, 100vw" credito />
            )}
            {(kartodromo.estrutura?.length ?? 0) > 0 && (
              <ul className={k.estrutura}>
                {kartodromo.estrutura!.map((e, i) => (
                  <li key={e.id ?? i} className="cartao-base">
                    {ehFoto(e.imagem) && <Foto midia={e.imagem} ate="card" sizes="(min-width: 900px) 33vw, 100vw" />}
                    <div className={k.estruturaTextos}>
                      <h4 className="h4">
                        <TextoDemo texto={e.titulo} />
                      </h4>
                      {e.texto && <p className="texto-2">{semDemo(e.texto)}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {(kartodromo.infoPilotos || kartodromo.infoVisitantes) && (
              <div className="grade-2">
                {kartodromo.infoPilotos && (
                  <div className="cartao-base cartao-pad">
                    <h4 className="h3">Para pilotos</h4>
                    <TextoRico dados={kartodromo.infoPilotos} />
                  </div>
                )}
                {kartodromo.infoVisitantes && (
                  <div className="cartao-base cartao-pad">
                    <h4 className="h3">Para visitantes</h4>
                    <TextoRico dados={kartodromo.infoVisitantes} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Secao>

      {/* ───────── Chamada do BKS (foto grande) ───────── */}
      <FaixaFoto
        id="faixa-bks"
        foto={fotoBks}
        rotulo="Brasília Kart Series"
        titulo="A pista das etapas do BKS"
        texto={
          <p>
            Além dos treinos da semana, o {nome} recebe as etapas do BKS.
            {config.exibirEventoPublico && config.textoEventoPublico ? ` ${semDemo(config.textoEventoPublico)}` : ''}
          </p>
        }
        acoes={
          <Botao href="/bks" variante="destaque" seta>
            Conhecer o BKS
          </Botao>
        }
      />

      {/* ───────── História ───────── */}
      {temHistoria && (
        <Secao id="historia" rotulo="Desde o começo" titulo="História" fundo="branco">
          <TextoRico dados={kartodromo.historia} className={k.historia} />
        </Secao>
      )}

      {/* ───────── Fotos ───────── */}
      {mosaico.length > 0 && (
        <Secao
          id="fotos"
          rotulo="Imagens"
          titulo="O kartódromo em fotos"
          acao={
            galeriaComMais ? (
              <a className="link-seta" href={`/galeria/${galeriaComMais.slug}`}>
                Ver todas as fotos
              </a>
            ) : undefined
          }
        >
          <ul className={k.mosaico} data-quantidade={mosaico.length}>
            {mosaico.map((f, i) => (
              <li key={f.id} className={k.mosaicoItem}>
                <Foto
                  midia={f}
                  ate={i === 0 ? 'destaque' : 'card'}
                  sizes={i === 0 ? '(min-width: 900px) 60vw, 100vw' : '(min-width: 900px) 30vw, (min-width: 560px) 50vw, 100vw'}
                  credito
                />
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {/* ───────── Notícias ───────── */}
      {noticias.length > 0 && (
        <Secao
          id="noticias"
          rotulo="Avisos e novidades"
          titulo="Notícias do kartódromo"
          fundo="branco"
          acao={
            <a className="link-seta" href="/noticias">
              Todas as notícias
            </a>
          }
        >
          <GradeCartoes>
            {noticias.map((n) => (
              <CartaoNoticia
                key={n.id}
                href={`/noticias/${n.slug}`}
                titulo={semDemo(n.titulo)}
                resumo={semDemo(n.subtitulo) || null}
                data={n.publicarEm ? formatarData(n.publicarEm) : ''}
                categoria={semDemo(comoDoc<CategoriasNoticia>(n.categoria)?.nome) || null}
                imagem={imagemDoCartao(n.capa)}
              />
            ))}
          </GradeCartoes>
        </Secao>
      )}

      {/* ───────── Dúvidas ───────── */}
      {perguntas.length > 0 && (
        <section id="duvidas" className={`secao-compacta fundo-papel ${k.secao}`} aria-labelledby="duvidas-titulo">
          <div className={`conteiner ${k.duvidas}`}>
            <div className={k.duvidasCabeca}>
              <TituloSecao id="duvidas-titulo" rotulo="Dúvidas recorrentes" titulo="Perguntas frequentes" />
              <p className="texto-2">
                Não encontrou a resposta? <a href="#contatos">Fale com a {sigla}</a>.
              </p>
            </div>
            <Perguntas perguntas={perguntas} />
          </div>
        </section>
      )}

      {/* ───────── Contatos e Instagram ───────── */}
      <Secao id="contatos" rotulo={`Fale com a ${sigla}`} titulo="Contatos e Instagram" fundo="branco">
        <div className={k.contatos}>
          <div className={k.contatosCanais}>
            <h3 className="h4">{tituloDosCanais(canais.map((c) => c.tipo))}</h3>
            <Canais canais={canais} />
            <a className="link-seta" href="/contato">
              Todos os contatos da {sigla}
            </a>
          </div>

          <div className={`escuro ${k.instagram}`}>
            <svg className={k.instagramIcone} aria-hidden="true" focusable="false" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.4" cy="6.6" r="0.6" fill="currentColor" />
            </svg>
            <h3 className="h4">Instagram</h3>
            {instagram ? (
              <>
                <p className={k.instagramPerfil}>{instagram.usuario ? <TextoDemo texto={instagram.usuario} /> : `Perfil da ${sigla}`}</p>
                <Botao href={instagram.url} variante="destaque" seta>
                  Abrir o Instagram
                </Botao>
              </>
            ) : (
              <p className="texto-2">O Instagram oficial do kartódromo ainda não foi divulgado.</p>
            )}
            {outrasRedes.length > 0 && (
              <ul className={k.redes} aria-label="Outras redes sociais">
                {outrasRedes.map((r) => (
                  <li key={r.id ?? r.url}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      {NOMES_REDES[r.rede] ?? r.rede}
                      {r.usuario && (
                        <span className="texto-2">
                          {' '}
                          <TextoDemo texto={r.usuario} />
                        </span>
                      )}
                      <span className="visualmente-oculto"> (abre em nova aba)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Secao>
    </div>
  )
}
