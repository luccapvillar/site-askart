/**
 * Blocos da etapa no site: comprar a etapa, treinos livres (link e grade), transmissão ao vivo,
 * "Aberto ao público" e o aviso de etapa já realizada. A regra (o que aparece e quando) está em
 * situacaoDaEtapa (src/lib/site.ts); aqui só a apresentação. Sem link cadastrado, o site mostra a
 * mensagem pedida pelo cliente (nunca um link inventado).
 */
import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  gradeTreinosPorDia,
  MENSAGENS_ETAPA,
  mensagemJaOcorreu,
  type CamposEtapaSite,
  type SituacaoEtapa,
  type Transmissao,
} from '@/lib/site'
import type { Etapa, Midia } from '@/payload-types'
import { Foto } from '../Foto'
import { semDemo, TextoDemo } from '../TextoDemo'
import { Icone, iconeDoItem, type NomeIcone } from './Icones'
import s from './Etapa.module.css'

type EtapaSite = CamposEtapaSite & Pick<Etapa, 'id'> & Partial<Pick<Etapa, 'fim'>>
type InfoPublico = { texto: string; itens: string[] }

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
  /** Complemento lido só pelo leitor de tela (ex.: "transmissão Profissional"). */
  contexto?: string
  contorno?: boolean
  pequeno?: boolean
}) {
  return (
    <a
      className={[s.botao, contorno && s.botaoContorno, pequeno && s.botaoPequeno].filter(Boolean).join(' ')}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children} <span aria-hidden="true">↗</span>
      <span className="visualmente-oculto">{contexto ? ` (${contexto}; abre em nova aba)` : ' (abre em nova aba)'}</span>
    </a>
  )
}

/** "… ainda não está disponível." (texto exato pedido pelo cliente). */
export function Indisponivel({ texto, rotulo, compacto = false }: { texto: string; rotulo?: string; compacto?: boolean }) {
  return (
    <p className={`${s.indisponivel} ${compacto ? s.compacto : ''}`}>
      <Icone nome="relogio" tamanho={18} className={s.indisponivelIcone} />
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
        Acessar os treinos livres
      </BotaoExterno>
    )
  }
  return <Indisponivel texto={MENSAGENS_ETAPA.semLinkTreinos} compacto={compacto} />
}

/* ───────────────────────────── página da etapa ───────────────────────────── */

/** Seção "Ingressos e treinos livres", nesta ordem: comprar a etapa, treinos livres (link) e a grade. */
export function CompraETreinos({ etapa, situacao }: { etapa: EtapaSite; situacao: SituacaoEtapa }) {
  return (
    <>
      <ol className={s.duas}>
        <li className={s.cartao}>
          <CabecaCartao icone="ingresso" titulo="Comprar esta etapa" />
          <CompraDaEtapa situacao={situacao} />
        </li>
        <li className={s.cartao}>
          <CabecaCartao icone="relogio" titulo="Treinos livres" />
          <LinkTreinosLivres situacao={situacao} />
        </li>
      </ol>
      <div id="grade-treinos" className={s.blocoGrade}>
        <div className={s.cabecaGrade}>
          <span className={s.cartaoIcone}>
            <Icone nome="calendario" />
          </span>
          <h3 className="h3">Grade dos treinos livres</h3>
        </div>
        <GradeTreinosLivres etapa={etapa} />
      </div>
    </>
  )
}

function CabecaCartao({ icone, titulo }: { icone: NomeIcone; titulo: string }) {
  return (
    <div className={s.cartaoCabeca}>
      <span className={s.cartaoIcone}>
        <Icone nome={icone} />
      </span>
      <h3 className={s.cartaoTitulo}>{titulo}</h3>
    </div>
  )
}

/** Grade dos treinos livres: uma tabela por dia, a imagem (se houver) ou a mensagem. */
export function GradeTreinosLivres({ etapa }: { etapa: EtapaSite }) {
  const dias = gradeTreinosPorDia(etapa.gradeTreinosLivres)
  const imagem = etapa.imagemGradeTreinosLivres && typeof etapa.imagemGradeTreinosLivres === 'object' ? (etapa.imagemGradeTreinosLivres as Midia) : null
  if (!dias.length && !imagem?.url) return <Indisponivel texto={MENSAGENS_ETAPA.semGradeTreinos} />
  return (
    <>
      {dias.length > 0 && (
        <div className={s.dias}>
          {dias.map((d) => (
            <table key={d.chave} className={s.tabelaTreinos}>
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
                    <th scope="row" className="mono">
                      {h.inicio}
                      {h.fim && (
                        <>
                          <span aria-hidden="true">–</span>
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
                              <span className={s.corCategoria} style={{ background: c.cor ?? 'var(--camp-p, var(--marca-primaria))' }} aria-hidden="true" />
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
          ))}
        </div>
      )}
      {imagem?.url && (
        <figure className={s.imagemGrade}>
          <Foto midia={imagem} ate="destaque" sizes="(min-width: 840px) 760px, 100vw" alt={semDemo(imagem.alt) || 'Grade dos treinos livres (imagem)'} />
          <figcaption>
            <a href={imagem.url} target="_blank" rel="noopener noreferrer">
              Abrir a imagem da grade em tamanho real <span aria-hidden="true">↗</span>
              <span className="visualmente-oculto"> (abre em nova aba)</span>
            </a>
          </figcaption>
        </figure>
      )}
    </>
  )
}

const textoBotaoTransmissao = (situacao: SituacaoEtapa) => (situacao.jaOcorreu ? 'Assistir à transmissão' : 'Assistir ao vivo')

/** Transmissões que aparecem: antes da etapa, as duas (com a mensagem quando falta link); depois, só as que têm link. */
export const transmissoesVisiveis = (situacao: SituacaoEtapa): Transmissao[] =>
  situacao.antes ? situacao.transmissoes : situacao.transmissoes.filter((t) => t.href)

/** Transmissão ao vivo: Profissional e Indoor lado a lado. Depois da etapa o link continua (para rever). */
export function Transmissoes({ situacao }: { situacao: SituacaoEtapa }) {
  const lista = transmissoesVisiveis(situacao)
  if (!lista.length) return null
  return (
    <ul className={s.duas}>
      {lista.map((t) => (
        <li key={t.tipo} className={s.cartao}>
          <CabecaCartao icone="transmissao" titulo={t.rotulo} />
          {t.href ? (
            <BotaoExterno href={t.href} contexto={`transmissão ${t.rotulo}`}>
              {textoBotaoTransmissao(situacao)}
            </BotaoExterno>
          ) : (
            <Indisponivel texto={MENSAGENS_ETAPA.semTransmissao} />
          )}
        </li>
      ))}
    </ul>
  )
}

/** Bloco "Aberto ao público": o texto e os itens (food trucks, telão…) com ícones simples. */
export function EventoPublico({ info }: { info: InfoPublico }) {
  return (
    <div className={s.publico}>
      <p className={s.publicoTexto}>{info.texto}</p>
      <ul className={s.chips}>
        {info.itens.map((item, i) => (
          <li key={i} className={s.chip}>
            <span className={s.chipIcone}>
              <Icone nome={iconeDoItem(item)} tamanho={18} />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** "Esta etapa já aconteceu em …" (no lugar da compra e dos treinos livres, depois da etapa). */
export function AvisoJaOcorreu({ etapa, children }: { etapa: Pick<Etapa, 'inicio'> & Partial<Pick<Etapa, 'fim'>>; children?: ReactNode }) {
  return (
    <div className={s.aviso}>
      <Icone nome="feito" />
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
    <div className={`conteiner ${s.faixaAviso}`}>
      <AvisoJaOcorreu etapa={etapa}>{children}</AvisoJaOcorreu>
    </div>
  )
}

/* ───────────────────────────── versão compacta (calendário) ───────────────────────────── */

/**
 * Resumo da etapa no cartão do calendário do BKS: a mesma lógica da página da etapa, em pouco espaço.
 * Antes: comprar, treinos livres, grade, transmissões e "Aberto ao público". Depois: o aviso e a transmissão.
 */
export function ResumoEtapa({ etapa, situacao, publico }: { etapa: EtapaSite; situacao: SituacaoEtapa; publico: InfoPublico | null }) {
  const transmissoes = transmissoesVisiveis(situacao)
  const nenhumaTransmissao = situacao.antes && !situacao.temTransmissao
  return (
    <div className={s.resumo}>
      {situacao.jaOcorreu && <AvisoJaOcorreu etapa={etapa} />}

      {situacao.antes && (
        <div className={s.resumoGrupo}>
          <h3 className="rotulo">Ingressos e treinos livres</h3>
          <CompraDaEtapa situacao={situacao} compacto />
          <LinkTreinosLivres situacao={situacao} compacto />
          {situacao.temGradeTreinos ? (
            <Link className={s.linkInterno} href={`/etapas/${etapa.id}#grade-treinos`}>
              Ver a grade dos treinos livres <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <Indisponivel texto={MENSAGENS_ETAPA.semGradeTreinos} compacto />
          )}
        </div>
      )}

      {transmissoes.length > 0 && (
        <div className={s.resumoGrupo}>
          <h3 className="rotulo">{situacao.jaOcorreu ? 'Transmissão' : 'Transmissão ao vivo'}</h3>
          {nenhumaTransmissao ? (
            <Indisponivel texto={MENSAGENS_ETAPA.semTransmissao} compacto />
          ) : (
            transmissoes.map((t) =>
              t.href ? (
                <BotaoExterno key={t.tipo} href={t.href} contexto={`transmissão ${t.rotulo}`} contorno pequeno>
                  {textoBotaoTransmissao(situacao)}: {t.rotulo}
                </BotaoExterno>
              ) : (
                <Indisponivel key={t.tipo} rotulo={t.rotulo} texto={MENSAGENS_ETAPA.semTransmissao} compacto />
              ),
            )
          )}
        </div>
      )}

      {situacao.antes && publico && (
        <div className={s.resumoGrupo}>
          <h3 className="rotulo">Aberto ao público</h3>
          <div className={s.publicoCompacto}>
            <p>{publico.texto}</p>
            <ul className={s.itensCompactos}>
              {publico.itens.map((item, i) => (
                <li key={i}>
                  <Icone nome={iconeDoItem(item)} tamanho={16} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
