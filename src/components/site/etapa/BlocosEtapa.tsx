/**
 * Blocos da etapa no site: comprar a etapa, treinos livres (link e grade), "Aberto ao público", o resumo
 * do calendário e o aviso de etapa já realizada. A transmissão da página da etapa (com o player do
 * YouTube) fica em TransmissaoEtapa.tsx, para o JavaScript do player só ir para a página da etapa.
 * A regra (o que aparece e quando) está em situacaoDaEtapa (src/lib/site.ts); aqui só a apresentação.
 * Sem link cadastrado, o site mostra a mensagem pedida pelo cliente (nunca um link inventado).
 */
import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  gradeTreinosPorDia,
  MENSAGENS_ETAPA,
  mensagemJaOcorreu,
  type CamposEtapaSite,
  type InfoEventoPublico,
  type ItemEventoPublico,
  type Modalidade,
  type SituacaoEtapa,
  type Transmissao,
} from '@/lib/site'
import type { Etapa, Midia } from '@/payload-types'
import { Botao } from '../Botao'
import { Foto } from '../Foto'
import { semDemo, TextoDemo } from '../TextoDemo'
import { Icone, iconeDoItem, type NomeIcone } from './Icones'
import s from './Etapa.module.css'

type EtapaSite = CamposEtapaSite & Pick<Etapa, 'id'> & Partial<Pick<Etapa, 'fim'>>

/* ───────────────────────────── peças ───────────────────────────── */

/** Link externo em forma de botão: abre em nova aba e avisa o leitor de tela. */
export function BotaoExterno({
  href,
  children,
  contexto,
  contorno = false,
  pequeno = false,
}: {
  href: string
  children: ReactNode
  /** Complemento lido só pelo leitor de tela (ex.: "transmissão — Karts indoor"). */
  contexto?: string
  contorno?: boolean
  pequeno?: boolean
}) {
  return (
    <Botao href={href} externo seta variante={contorno ? 'secundario' : 'primario'} pequeno={pequeno} className={s.botao}>
      {children}
      {contexto && <span className="visualmente-oculto"> ({contexto})</span>}
    </Botao>
  )
}

/** "… ainda não está disponível." (texto exato pedido pelo cliente). */
export function Indisponivel({ texto, rotulo, compacto = false }: { texto: string; rotulo?: string; compacto?: boolean }) {
  return (
    <p className={`${s.indisponivel} ${compacto ? s.compacto : ''}`}>
      {/* No resumo do calendário o ícone já vem ao lado do título: aqui só a mensagem */}
      {!compacto && <Icone nome="relogio" tamanho={18} className={s.indisponivelIcone} />}
      <span>
        {rotulo && <strong>{rotulo}: </strong>}
        {texto}
      </span>
    </p>
  )
}

/** Botão "Comprar esta etapa" (só o link da própria etapa) ou a mensagem de link ainda não disponível. */
export function CompraDaEtapa({ situacao, compacto = false }: { situacao: SituacaoEtapa; compacto?: boolean }) {
  if (situacao.linkCompra) {
    return (
      <BotaoExterno href={situacao.linkCompra} contexto="compra desta etapa" pequeno={compacto}>
        Comprar esta etapa
      </BotaoExterno>
    )
  }
  return <Indisponivel texto={MENSAGENS_ETAPA.semCompra} compacto={compacto} />
}

function LinkTreinosLivres({ situacao, compacto = false }: { situacao: SituacaoEtapa; compacto?: boolean }) {
  if (situacao.linkTreinosLivres) {
    return (
      <BotaoExterno href={situacao.linkTreinosLivres} contexto="treinos livres desta etapa" contorno pequeno={compacto}>
        Comprar treinos livres
      </BotaoExterno>
    )
  }
  return <Indisponivel texto={MENSAGENS_ETAPA.semLinkTreinos} compacto={compacto} />
}

/* ───────────────────────────── página da etapa ───────────────────────────── */

/**
 * "Ingressos e treinos livres", na ordem pedida pelo cliente: 1. comprar a etapa, 2. comprar os treinos
 * livres, 3. a grade horária dos treinos livres. Cada passo mostra o botão ou a mensagem exata.
 */
export function CompraETreinos({ etapa, situacao }: { etapa: EtapaSite; situacao: SituacaoEtapa }) {
  return (
    <ol className={s.passos}>
      <li className={s.passo}>
        <CabecaCartao icone="ingresso" titulo="Comprar esta etapa" numero={1} />
        <CompraDaEtapa situacao={situacao} />
      </li>
      <li className={s.passo}>
        <CabecaCartao icone="relogio" titulo="Comprar treinos livres" numero={2} />
        <LinkTreinosLivres situacao={situacao} />
      </li>
      <li id="grade-treinos" className={`${s.passo} ${s.passoLargo}`}>
        <CabecaCartao icone="calendario" titulo="Grade horária dos treinos livres" numero={3} />
        <GradeTreinosLivres etapa={etapa} />
      </li>
    </ol>
  )
}

export function CabecaCartao({ icone, titulo, numero }: { icone: NomeIcone; titulo: string; numero?: number }) {
  return (
    <div className={s.cartaoCabeca}>
      <span className={s.cartaoIcone}>
        <Icone nome={icone} />
      </span>
      <h3 className={s.cartaoTitulo}>
        {numero !== undefined && <span className={s.cartaoNumero}>{numero}. </span>}
        {titulo}
      </h3>
    </div>
  )
}

/** Grade dos treinos livres: uma tabela por dia, a imagem (se houver) ou a mensagem. */
export function GradeTreinosLivres({ etapa }: { etapa: EtapaSite }) {
  const dias = gradeTreinosPorDia(etapa.gradeTreinosLivres)
  const imagem = etapa.imagemGradeTreinosLivres && typeof etapa.imagemGradeTreinosLivres === 'object' ? (etapa.imagemGradeTreinosLivres as Midia) : null
  if (!dias.length && !imagem?.url) return <Indisponivel texto={MENSAGENS_ETAPA.semGradeTreinos} />
  return (
    <div className={s.grade}>
      {dias.length > 0 && (
        <div className={s.dias}>
          {dias.map((d) => (
            <div key={d.chave} className={`rolagem-x ${s.rolagemTreinos}`}>
              <table className={s.tabelaTreinos}>
                <caption>{d.titulo}</caption>
                <thead>
                  <tr>
                    <th scope="col">Horário</th>
                    <th scope="col">Categorias e observações</th>
                  </tr>
                </thead>
                <tbody>
                  {d.horarios.map((h, i) => (
                    <tr key={i}>
                      <th scope="row" className={s.horario}>
                        {h.inicio}
                        {h.fim && (
                          <>
                            <span aria-hidden="true"> – </span>
                            <span className="visualmente-oculto"> às </span>
                            {h.fim}
                          </>
                        )}
                      </th>
                      <td>
                        {h.categorias.length > 0 && (
                          <span className={s.categorias}>
                            {h.categorias.map((c, j) => (
                              <span key={j} className={s.categoria}>
                                <span className={s.corCategoria} style={{ background: c.cor ?? 'var(--verde)' }} aria-hidden="true" />
                                <TextoDemo texto={c.nome} />
                              </span>
                            ))}
                          </span>
                        )}
                        {h.observacao && <span className={s.observacao}>{semDemo(h.observacao)}</span>}
                        {!h.categorias.length && !h.observacao && <span className="texto-2">Treino livre</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
      {imagem?.url && (
        <figure className={s.imagemGrade}>
          <Foto midia={imagem} ate="destaque" sizes="(min-width: 840px) 760px, 100vw" alt={semDemo(imagem.alt) || 'Grade dos treinos livres (imagem)'} />
          <figcaption>
            <a href={imagem.url} target="_blank" rel="noopener noreferrer" className="link-seta">
              Abrir a imagem da grade em tamanho real
              <span className="visualmente-oculto"> (abre em nova aba)</span>
            </a>
          </figcaption>
        </figure>
      )}
    </div>
  )
}

/** Transmissões que aparecem: antes da etapa, as duas (com a mensagem quando falta link); depois, só as que têm link. */
export const transmissoesVisiveis = (situacao: SituacaoEtapa, modalidade?: Modalidade): Transmissao[] =>
  (situacao.antes ? situacao.transmissoes : situacao.transmissoes.filter((t) => t.href)).filter((t) => !modalidade || t.tipo === modalidade)

/** O que o público encontra (food trucks, telão…): ícone na placa amarela, nome e a explicação. */
export function ItensEventoPublico({ itens }: { itens: ItemEventoPublico[] }) {
  return (
    <ul className={s.itensPublico}>
      {itens.map((item, i) => (
        <li key={i} className={s.itemPublico}>
          <span className={s.chipIcone}>
            <Icone nome={iconeDoItem(`${item.titulo} ${item.descricao ?? ''}`)} tamanho={22} />
          </span>
          <span className={s.itemPublicoTexto}>
            <strong>{item.titulo}</strong>
            {item.descricao && <span>{item.descricao}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Bloco "Aberto ao público" (página da etapa): o texto e os itens. */
export function EventoPublico({ info }: { info: InfoEventoPublico }) {
  return (
    <div className={s.publico}>
      <p className={s.publicoTexto}>{info.texto}</p>
      <ItensEventoPublico itens={info.itens} />
    </div>
  )
}

/** "Esta etapa já ocorreu em …" (no lugar da compra e dos treinos livres, depois da etapa). */
export function AvisoJaOcorreu({ etapa, children, compacto = false }: { etapa: Pick<Etapa, 'inicio'> & Partial<Pick<Etapa, 'fim'>>; children?: ReactNode; compacto?: boolean }) {
  return (
    <div className={`${s.aviso} ${compacto ? s.avisoCompacto : ''}`}>
      <Icone nome="feito" tamanho={compacto ? 18 : 22} className={s.avisoIcone} />
      <div className={s.avisoTexto}>
        <p>{mensagemJaOcorreu(etapa)}</p>
        {children}
      </div>
    </div>
  )
}

/** Faixa com o aviso, na página da etapa. */
export function FaixaJaOcorreu({ etapa, children }: { etapa: Pick<Etapa, 'inicio'> & Partial<Pick<Etapa, 'fim'>>; children?: ReactNode }) {
  return (
    <div className={s.faixaAviso}>
      <div className="conteiner">
        <AvisoJaOcorreu etapa={etapa}>{children}</AvisoJaOcorreu>
      </div>
    </div>
  )
}

/* ───────────────────────────── versão compacta (calendário) ───────────────────────────── */

/** Uma linha do resumo: ícone + título e, embaixo, o botão ou a mensagem. */
function ItemResumo({ icone, titulo, children, mostrarTitulo = true }: { icone: NomeIcone; titulo: string; children: ReactNode; mostrarTitulo?: boolean }) {
  return (
    <li className={s.itemResumo}>
      <span className={s.itemResumoIcone}>
        <Icone nome={icone} tamanho={18} />
      </span>
      <div className={s.itemResumoCorpo}>
        <p className={mostrarTitulo ? s.itemResumoTitulo : 'visualmente-oculto'}>{titulo}</p>
        {children}
      </div>
    </li>
  )
}

/**
 * Resumo da etapa no cartão do calendário do BKS: a mesma lógica da página da etapa, em pouco espaço.
 * Antes: comprar, treinos livres, grade e a transmissão. Depois: o aviso e a transmissão (se tiver link).
 * Na área de uma modalidade (karts profissionais ou indoor), só a transmissão dela.
 */
export function ResumoEtapa({
  etapa,
  situacao,
  publico,
  modalidade,
}: {
  etapa: EtapaSite
  situacao: SituacaoEtapa
  publico: InfoEventoPublico | null
  modalidade?: Modalidade
}) {
  const transmissoes = transmissoesVisiveis(situacao, modalidade)
  const nenhumaTransmissao = situacao.antes && !transmissoes.some((t) => t.href)
  return (
    <div className={s.resumo}>
      {situacao.jaOcorreu && <AvisoJaOcorreu etapa={etapa} compacto />}

      {situacao.antes && (
        <div className={s.resumoGrupo}>
          <h3 className={`rotulo ${s.resumoRotulo}`}>Ingressos e treinos livres</h3>
          <ul className={s.listaResumo}>
            <ItemResumo icone="ingresso" titulo="Comprar esta etapa" mostrarTitulo={!situacao.linkCompra}>
              <CompraDaEtapa situacao={situacao} compacto />
            </ItemResumo>
            <ItemResumo icone="relogio" titulo="Comprar treinos livres" mostrarTitulo={!situacao.linkTreinosLivres}>
              <LinkTreinosLivres situacao={situacao} compacto />
            </ItemResumo>
            <ItemResumo icone="calendario" titulo="Grade horária dos treinos livres">
              {situacao.temGradeTreinos ? (
                <Link className="link-seta" href={`/etapas/${etapa.id}#grade-treinos`}>
                  Ver a grade dos treinos livres
                </Link>
              ) : (
                <Indisponivel texto={MENSAGENS_ETAPA.semGradeTreinos} compacto />
              )}
            </ItemResumo>
          </ul>
        </div>
      )}

      {transmissoes.length > 0 && (
        <div className={s.resumoGrupo}>
          <h3 className={`rotulo ${s.resumoRotulo}`}>{situacao.jaOcorreu ? 'Transmissão' : 'Transmissão ao vivo'}</h3>
          <ul className={s.listaResumo}>
            {nenhumaTransmissao ? (
              <ItemResumo icone="transmissao" titulo={modalidade ? `Transmissão — ${transmissoes[0]?.rotulo ?? ''}` : 'Transmissão'}>
                <Indisponivel texto={MENSAGENS_ETAPA.semTransmissao} compacto />
              </ItemResumo>
            ) : (
              transmissoes.map((t) => (
                <ItemResumo key={t.tipo} icone="transmissao" titulo={`Transmissão — ${t.rotulo}`} mostrarTitulo={!t.href}>
                  {t.href ? (
                    <BotaoExterno href={t.href} contexto={`transmissão — ${t.rotulo}`} contorno pequeno>
                      {modalidade ? 'Assistir à transmissão' : `Assistir: ${t.rotulo}`}
                    </BotaoExterno>
                  ) : (
                    <Indisponivel texto={MENSAGENS_ETAPA.semTransmissao} compacto />
                  )}
                </ItemResumo>
              ))
            )}
          </ul>
        </div>
      )}

      {situacao.antes && publico && (
        <div className={s.resumoGrupo}>
          <h3 className={`rotulo ${s.resumoRotulo}`}>Aberto ao público</h3>
          <p className={s.publicoCompacto}>{publico.texto}</p>
        </div>
      )}
    </div>
  )
}
