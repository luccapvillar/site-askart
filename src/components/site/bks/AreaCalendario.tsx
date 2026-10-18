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
import type { Categoria } from '@/payload-types'
import { semDemo } from '../TextoDemo'
import { CabecalhoArea, CategoriasDaArea, SeletorModalidade } from './Modalidades'
import {
  DataEtapa,
  dataPorExtenso,
  LinkEtapa,
  LinkMapa,
  NomeEtapa,
  Programacao,
  SeloEtapa,
} from './pecas'
import { VenhaAssistir } from './VenhaAssistir'
import s from './Bks.module.css'

const VAZIO: Record<Modalidade, string> = {
  profissional: 'O calendário dos karts profissionais ainda não foi divulgado.',
  indoor: 'O calendário dos karts indoor ainda não foi divulgado.',
}

/**
 * Calendário de uma área do BKS (karts profissionais ou indoor): as etapas que têm categoria da
 * modalidade, cada uma abrindo os horários das categorias dela; depois, as categorias da área.
 * Embaixo, o bloco geral "Venha assistir" (vale para as duas áreas).
 */
export async function AreaCalendario({ modalidade }: { modalidade: Modalidade }) {
  const [bks, config, contato, textos, todasDaModalidade, idsDeTreino] = await Promise.all([
    lerBks(),
    lerConfiguracoes(),
    lerContato(),
    textosDaSecao('bks'),
    lerCategoriasDaModalidade(modalidade),
    lerIdsCategoriasDeTreino(),
  ])
  const temporada = bks?.temporada
  const todasAsEtapas = temporada ? await lerEtapas(temporada.id) : []
  const etapas = todasAsEtapas.filter((e) => etapaNaModalidade(e, modalidade))
  const corridas = (await lerProgramacao(etapas.map((e) => e.id))).filter((c) =>
    corridaNaModalidade(c, modalidade),
  )
  const proxima = proximaEtapa(etapas)
  const publico = eventoPublico(config)
  const categorias = categoriasDaArea(
    todasDaModalidade,
    modalidade,
    idsDasCategorias([...todasAsEtapas, ...corridas]),
    new Set(idsDeTreino),
  )
  // O texto "vazio" personalizado no painel vale para a área dos karts profissionais (a que existia antes)
  const textoVazio =
    modalidade === 'profissional' ? textos?.textoVazio || VAZIO.profissional : VAZIO.indoor

  return (
    <>
      <section className="secao-compacta" aria-labelledby="calendario">
        <div className="conteiner">
          <SeletorModalidade atual={modalidade} secao="calendario" />
          <CabecalhoArea
            id="calendario"
            modalidade={modalidade}
            titulo={textos?.titulo || `Calendário ${temporada?.ano ?? ''}`.trim()}
            introducao={
              textos?.introducao ||
              'Toque numa etapa para ver os horários de cada categoria, o link para comprar a etapa, os treinos livres, a transmissão ao vivo e o local.'
            }
          />

          {!etapas.length ? (
            <EstadoVazio texto={textoVazio} />
          ) : (
            <ol className={s.calendario}>
              {etapas.map((etapa) => {
                const programacao = corridas.filter((c) => idDe(c.etapa) === etapa.id)
                // Compra, treinos livres e grade somem sozinhos depois da etapa (página revalidada a cada minuto)
                const situacao = situacaoDaEtapa(etapa)
                const nomesCategorias = (etapa.categorias ?? [])
                  .filter(
                    (c): c is Categoria =>
                      typeof c === 'object' && c !== null && modalidadeDe(c) === modalidade,
                  )
                  .map((c) => semDemo(c.nome))
                return (
                  <li key={etapa.id}>
                    <details className={s.etapa} open={proxima?.id === etapa.id}>
                      <summary>
                        <DataEtapa etapa={etapa} />
                        <span className={s.etapaTextos}>
                          <span className={s.etapaNome}>
                            <NomeEtapa etapa={etapa} />
                            {proxima?.id === etapa.id && <span className={s.proxima}>Próxima</span>}
                          </span>
                          <span className={s.etapaMeta}>
                            <SeloEtapa status={etapa.status} jaOcorreu={situacao.jaOcorreu} />
                            <span>{dataPorExtenso(etapa)}</span>
                            {etapa.local && <span>{etapa.local}</span>}
                          </span>
                        </span>
                        <span className={s.abrir} aria-hidden="true" />
                      </summary>
                      <div className={s.etapaCorpo}>
                        <div>
                          <h3 className="rotulo">Horários por categoria</h3>
                          <Programacao corridas={programacao} />
                          {nomesCategorias.length > 0 && !programacao.length && (
                            <p className="texto-2">Categorias: {nomesCategorias.join(', ')}.</p>
                          )}
                        </div>
                        <div className={s.etapaAcoes}>
                          {/* "Aberto ao público" fica no bloco geral "Venha assistir", no fim da página */}
                          <ResumoEtapa
                            etapa={etapa}
                            situacao={situacao}
                            publico={null}
                            modalidade={modalidade}
                          />
                          <LinkMapa
                            href={mapaDaEtapa(etapa, contato)}
                            rotulo={`Como chegar: ${etapa.local || 'ver no mapa'}`}
                          />
                          {etapa.status === 'realizada' && (
                            <Link
                              className={s.linkSeta}
                              href={caminhoDaArea(modalidade, 'resultados', etapa.numero)}
                            >
                              Resultado da etapa <span aria-hidden="true">→</span>
                            </Link>
                          )}
                          <LinkEtapa etapa={etapa} />
                        </div>
                      </div>
                    </details>
                  </li>
                )
              })}
            </ol>
          )}
          <CategoriasDaArea categorias={categorias} modalidade={modalidade} />
        </div>
      </section>
      {publico && <VenhaAssistir info={publico} />}
    </>
  )
}
