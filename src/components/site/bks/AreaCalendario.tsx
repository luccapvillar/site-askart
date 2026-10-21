import Link from 'next/link'
import { ResumoEtapa } from '@/components/site/etapa/BlocosEtapa'
import { EstadoVazio } from '@/components/site/EstadoVazio'
import {
  idDe,
  lerBks,
  lerCategoriasDaModalidade,
  lerConfiguracoes,
  lerContato,
  lerEtapas,
  lerIdsCategoriasDeTreino,
  lerProgramacao,
  textosDaSecao,
} from '@/lib/publico'
import {
  caminhoDaArea,
  categoriasDaArea,
  corridaNaModalidade,
  etapaNaModalidade,
  eventoPublico,
  idsDasCategorias,
  mapaDaEtapa,
  modalidadeDe,
  proximaEtapa,
  situacaoDaEtapa,
  type Modalidade,
} from '@/lib/site'
import { nomesCadastrados } from '@/lib/subcategorias'
import type { Categoria } from '@/payload-types'
import { semDemo } from '../TextoDemo'
import { NavegacaoBks } from './AbasBks'
import { fotosDoBks } from './fotos'
import { CabecalhoArea, CategoriasDaArea } from './Modalidades'
import {
  chaveDaCategoria,
  DataEtapa,
  dataPorExtenso,
  LinkEtapa,
  LinkMapa,
  mapaDeSubcategorias,
  NomeEtapa,
  opcoesDeSubcategoria,
  Programacao,
  SeloEtapa,
} from './pecas'
import { SeletorSubcategoria } from './SeletorSubcategoria'
import { FaixaFotosBks, VenhaAssistir } from './VenhaAssistir'
import s from './Bks.module.css'

const VAZIO: Record<Modalidade, string> = {
  profissional: 'O calendário dos karts profissionais ainda não foi divulgado.',
  indoor: 'O calendário dos karts indoor ainda não foi divulgado.',
}

/**
 * Calendário de uma área do BKS (karts profissionais ou indoor): as etapas que têm categoria da
 * modalidade, em cartões; tocar no cartão abre os horários de cada categoria, a compra, os treinos livres,
 * a transmissão e o local (sem JavaScript: <details>). No topo, o seletor "Escolha a subcategoria": todos os
 * cartões passam a mostrar só os horários da subcategoria escolhida (Warm-up, Classificação, Corrida 1,
 * Corrida 2…). Depois, as categorias da área com as subcategorias, as fotos do campeonato e o bloco geral
 * "Venha assistir".
 */
export async function AreaCalendario({ modalidade }: { modalidade: Modalidade }) {
  const [bks, config, contato, textos, todasDaModalidade, idsDeTreino, fotos] = await Promise.all([
    lerBks(),
    lerConfiguracoes(),
    lerContato(),
    textosDaSecao('bks'),
    lerCategoriasDaModalidade(modalidade),
    lerIdsCategoriasDeTreino(),
    fotosDoBks(),
  ])
  const temporada = bks?.temporada
  const todasAsEtapas = temporada ? await lerEtapas(temporada.id) : []
  const etapas = todasAsEtapas.filter((e) => etapaNaModalidade(e, modalidade))
  const corridas = (await lerProgramacao(etapas.map((e) => e.id))).filter((c) => corridaNaModalidade(c, modalidade))
  const proxima = proximaEtapa(etapas)
  const publico = eventoPublico(config)
  const categorias = categoriasDaArea(todasDaModalidade, modalidade, idsDasCategorias([...todasAsEtapas, ...corridas]), new Set(idsDeTreino))
  const subcategorias = mapaDeSubcategorias(todasDaModalidade)
  // Seletor "Escolha a subcategoria": as categorias da área, cada uma com as suas subcategorias
  const opcoesSeletor = opcoesDeSubcategoria(categorias)
  // Só com alguma sessão publicada (sem programação nenhuma, o seletor só mostraria avisos)
  const comSeletor = corridas.length > 0 && opcoesSeletor.flatMap((g) => g.opcoes).length > 1
  const idEtapas = `etapas-${modalidade}`
  // O texto "vazio" personalizado no painel vale para a área dos karts profissionais (a que existia antes)
  const textoVazio = modalidade === 'profissional' ? textos?.textoVazio || VAZIO.profissional : VAZIO.indoor
  const realizadas = etapas.filter((e) => situacaoDaEtapa(e).jaOcorreu).length
  // Fotos: o topo usa a primeira (o banner do campeonato); "Venha assistir" e a faixa de fotos usam as
  // seguintes, sem repetir a do topo quando houver fotos suficientes
  const fotoPublico = fotos[1] ?? fotos[0] ?? null
  const semRepetir = fotos.slice(1).filter((f) => f.id !== fotoPublico?.id)
  const fotosFaixa = semRepetir.length >= 3 ? semRepetir : fotos.filter((f) => f.id !== fotoPublico?.id)

  return (
    <>
      <NavegacaoBks area={modalidade} secao="calendario" />
      <section className={`secao-compacta ${s.secaoPrincipal}`} aria-labelledby="calendario">
        <div className="conteiner">
          <CabecalhoArea
            id="calendario"
            modalidade={modalidade}
            titulo={textos?.titulo || `Calendário ${temporada?.ano ?? ''}`.trim()}
            introducao={
              etapas.length
                ? textos?.introducao ||
                  'Toque numa etapa para ver os horários de cada categoria, a compra da etapa, os treinos livres, a transmissão ao vivo e o local.'
                : null
            }
          />

          {!etapas.length ? (
            <EstadoVazio texto={textoVazio} />
          ) : (
            <>
              <p className={s.resumoCalendario}>
                {etapas.length} {etapas.length === 1 ? 'etapa' : 'etapas'} na temporada
                {realizadas > 0 && ` · ${realizadas} ${realizadas === 1 ? 'já realizada' : 'já realizadas'}`}
                {proxima && (
                  <>
                    {' · '}próxima: <strong><NomeEtapa etapa={proxima} /></strong>, {dataPorExtenso(proxima)}
                  </>
                )}
              </p>
              {comSeletor && (
                <SeletorSubcategoria
                  alvo={idEtapas}
                  grupos={opcoesSeletor}
                  ajuda="Os horários de todas as etapas abaixo passam a mostrar só a subcategoria escolhida."
                />
              )}
              <ol className={s.calendario} id={idEtapas}>
                {etapas.map((etapa) => {
                  const programacao = corridas.filter((c) => idDe(c.etapa) === etapa.id)
                  // Compra, treinos livres e grade somem sozinhos depois da etapa (página revalidada a cada minuto)
                  const situacao = situacaoDaEtapa(etapa, undefined, config.izyPass)
                  const ehProxima = proxima?.id === etapa.id
                  const categoriasDaEtapa = (etapa.categorias ?? []).filter(
                    (c): c is Categoria => typeof c === 'object' && c !== null && modalidadeDe(c) === modalidade,
                  )
                  const nomesCategorias = categoriasDaEtapa.map((c) => semDemo(c.nome))
                  // Sem horários publicados: as categorias com as subcategorias ("F400 (Novatos, Junior…)")
                  const categoriasPorExtenso = categoriasDaEtapa.map((c) => {
                    const subs = nomesCadastrados(c.subcategorias).map((n) => semDemo(n))
                    return subs.length ? `${semDemo(c.nome)} (${subs.join(', ')})` : semDemo(c.nome)
                  })
                  const classes = [s.etapa, ehProxima && s.etapaProxima, situacao.jaOcorreu && s.etapaPassada, situacao.cancelada && s.etapaCancelada]
                  return (
                    <li key={etapa.id}>
                      <details className={classes.filter(Boolean).join(' ')} open={ehProxima}>
                        <summary className={s.etapaResumo}>
                          <DataEtapa etapa={etapa} apagada={situacao.jaOcorreu || situacao.cancelada} />
                          <span className={s.etapaTextos}>
                            <span className={s.etapaSelos}>
                              {ehProxima && <span className={s.proxima}>Próxima etapa</span>}
                              <SeloEtapa status={etapa.status} jaOcorreu={situacao.jaOcorreu} />
                            </span>
                            <span className={s.etapaNome}>
                              <NomeEtapa etapa={etapa} />
                            </span>
                            <span className={s.etapaMeta}>
                              <span>{dataPorExtenso(etapa)}</span>
                              {etapa.local && <span>{semDemo(etapa.local)}</span>}
                            </span>
                            {nomesCategorias.length > 0 && <span className={s.etapaCategorias}>{nomesCategorias.join(' · ')}</span>}
                          </span>
                          <span className={s.abrir} aria-hidden="true">
                            <span className={s.abrirTexto}>Ver horários</span>
                            <span className={s.fecharTexto}>Fechar</span>
                            <span className={s.chevron} />
                          </span>
                        </summary>
                        <div className={s.etapaCorpo}>
                          <div className={s.etapaHorarios}>
                            <h3 className={`rotulo ${s.corpoRotulo}`}>Horários por categoria</h3>
                            <Programacao
                              corridas={programacao}
                              subcategorias={subcategorias}
                              // Etapa sem categorias escolhidas = todas as da temporada: não dá para dizer "não corre"
                              categoriasDaEtapa={etapa.categorias?.length ? categoriasDaEtapa.map(chaveDaCategoria) : null}
                            />
                            {categoriasPorExtenso.length > 0 && !programacao.length && <p className="texto-2">Categorias: {categoriasPorExtenso.join('; ')}.</p>}
                          </div>
                          <div className={s.etapaLado}>
                            {/* "Aberto ao público" fica no bloco geral "Venha assistir", no fim da página */}
                            <ResumoEtapa etapa={etapa} situacao={situacao} publico={null} modalidade={modalidade} />
                            <div className={s.resumoLocal}>
                              <h3 className={`rotulo ${s.corpoRotulo}`}>Local</h3>
                              <p>{semDemo(etapa.local) || 'Local a definir'}</p>
                              <LinkMapa href={mapaDaEtapa(etapa, contato)} rotulo="Como chegar" />
                            </div>
                            <p className={s.etapaLinks}>
                              {etapa.status === 'realizada' && (
                                <Link className="link-seta" href={caminhoDaArea(modalidade, 'resultados', etapa.numero)}>
                                  Resultado da etapa
                                </Link>
                              )}
                              <LinkEtapa etapa={etapa}>Página da etapa</LinkEtapa>
                            </p>
                          </div>
                        </div>
                      </details>
                    </li>
                  )
                })}
              </ol>
            </>
          )}
          <CategoriasDaArea categorias={categorias} modalidade={modalidade} />
        </div>
      </section>
      <FaixaFotosBks fotos={fotosFaixa} />
      {publico && <VenhaAssistir info={publico} foto={fotoPublico} />}
    </>
  )
}
