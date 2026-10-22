import type { Metadata } from 'next'
import { CartaoAtalho } from '@/components/site/base/CartaoAtalho'
import { Dados } from '@/components/site/base/Dados'
import { Botao } from '@/components/site/Botao'
import { Canais } from '@/components/site/Canais'
import i from '@/components/site/conteudo/Institucional.module.css'
import { Foto } from '@/components/site/Foto'
import { Perguntas } from '@/components/site/Perguntas'
import { Secao, Sumario, TopoPagina } from '@/components/site/paginas/TopoPagina'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TituloSecao } from '@/components/site/TituloSecao'
import { comoDoc, lerContato, lerKartodromo, lerPerguntas, textosDaSecao } from '@/lib/publico'
import { canaisDoContato, nomeDaRedeComPerfil, NOMES_REDES } from '@/lib/site'
import type { Midia } from '@/payload-types'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const textos = await textosDaSecao('contato')
  return {
    title: textos?.seoTitulo || 'Contato',
    description:
      textos?.seoDescricao ||
      'Telefone, WhatsApp, endereço do Kartódromo do Guará, redes sociais e dúvidas frequentes da ASKART.',
    alternates: { canonical: '/contato' },
  }
}

/** Ícone simples de cada rede (traço, sem cor de marca de terceiros). */
function IconeRede({ rede }: { rede: string }) {
  const caminhos: Record<string, React.ReactNode> = {
    instagram: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
      </>
    ),
    youtube: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="4" />
        <path d="m10 9 5 3-5 3z" fill="currentColor" />
      </>
    ),
    facebook: <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />,
  }
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {caminhos[rede] ?? <circle cx="12" cy="12" r="9" />}
    </svg>
  )
}

export default async function Contato() {
  const [contato, kartodromo, perguntas, textos] = await Promise.all([
    lerContato(),
    lerKartodromo(),
    lerPerguntas(['geral', 'kartodromo', 'bks']),
    textosDaSecao('contato'),
  ])
  const canais = canaisDoContato(contato, 'contato')
  const redes = contato.redes ?? []
  const horarios = (contato.horarios ?? []).filter((h) => h.dias || h.horario)
  const nomeKartodromo = kartodromo.nome || 'Kartódromo Ayrton Senna do Guará'
  const endereco = contato.endereco?.texto ? semDemo(contato.endereco.texto) : null
  const mapa = contato.endereco?.linkMapa || null
  const fotoLocal = comoDoc<Midia>(contato.endereco?.imagemMapa)

  const sumario = [
    { id: 'canais', rotulo: 'Atendimento' },
    { id: 'endereco', rotulo: 'Endereço' },
    ...(redes.length ? [{ id: 'redes', rotulo: 'Redes sociais' }] : []),
    ...(perguntas.length ? [{ id: 'duvidas', rotulo: 'Dúvidas frequentes' }] : []),
  ]

  return (
    <>
      <TopoPagina
        trilha={[{ rotulo: 'Contato' }]}
        rotulo="Fale com a ASKART"
        titulo={textos?.titulo || 'Contato'}
        intro={
          textos?.introducao ||
          'Telefone, WhatsApp, endereço do kartódromo, redes sociais e respostas para as dúvidas mais comuns.'
        }
        foto={comoDoc<Midia>(textos?.imagem)}
        acoes={
          mapa ? (
            <Botao href={mapa} variante="destaque" externo seta>
              Como chegar
            </Botao>
          ) : undefined
        }
      />
      <Sumario itens={sumario} />

      <Secao id="canais" rotulo="Atendimento" titulo="Canais de atendimento" fundo="branco" ampla>
        <div className={i.duas}>
          <Canais canais={canais} />
          <div className={i.cartao}>
            <h3 className={i.cartaoTitulo}>Horário de atendimento</h3>
            {horarios.length ? (
              <Dados
                colunas={1}
                itens={horarios.map((h) => ({
                  termo: <TextoDemo texto={h.dias} />,
                  valor: <TextoDemo texto={h.horario} />,
                }))}
              />
            ) : (
              <p className="texto-2">O horário de atendimento ainda não foi divulgado.</p>
            )}
          </div>
        </div>
      </Secao>

      <Secao id="endereco" rotulo="Localização" titulo="Onde fica o kartódromo" fundo="papel" ampla>
        <div className={i.local}>
          <div className={i.pilha}>
            <Dados
              colunas={1}
              itens={[
                { termo: 'Local', valor: nomeKartodromo },
                {
                  termo: 'Endereço',
                  valor: endereco ? (
                    <address className={i.endereco}>
                      {endereco.split('\n').map((linha, n) => (
                        <span key={n}>{linha}</span>
                      ))}
                    </address>
                  ) : (
                    'Endereço ainda não divulgado.'
                  ),
                },
              ]}
            />
            {mapa && (
              <div className="botoes">
                <Botao href={mapa} externo seta>
                  Abrir no mapa
                </Botao>
              </div>
            )}
          </div>
          {fotoLocal?.url && (
            <figure className={i.fotoLocal}>
              <Foto midia={fotoLocal} ate="card" sizes="(min-width: 900px) 360px, 90vw" />
              <figcaption className="texto-2 texto-pequeno">
                {semDemo(fotoLocal.alt) || nomeKartodromo}
                {fotoLocal.credito ? ` · Foto: ${fotoLocal.credito}` : ''}
              </figcaption>
            </figure>
          )}
        </div>
      </Secao>

      {redes.length > 0 && (
        <Secao id="redes" rotulo="Acompanhe" titulo="Redes sociais" fundo="branco" ampla>
          <ul className={i.redes}>
            {redes.map((r) => (
              <li key={r.url}>
                <a className={i.rede} href={r.url} target="_blank" rel="noopener noreferrer">
                  <span className={i.redeIcone}>
                    <IconeRede rede={r.rede} />
                  </span>
                  <span className={i.redeTextos}>
                    <strong>
                      {nomeDaRedeComPerfil(NOMES_REDES[r.rede] ?? r.rede, r.referente)}
                    </strong>
                    {r.usuario && (
                      <span className="texto-2">
                        <TextoDemo texto={r.usuario} />
                      </span>
                    )}
                  </span>
                  <span className={i.redeSeta} aria-hidden="true">
                    ↗
                  </span>
                  <span className="visualmente-oculto"> (abre em nova aba)</span>
                </a>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {perguntas.length > 0 && (
        <section id="duvidas" className="secao fundo-papel" aria-labelledby="duvidas-titulo">
          <div className={`conteiner ${i.perguntas}`}>
            <TituloSecao
              id="duvidas-titulo"
              rotulo="Antes de entrar em contato"
              titulo="Dúvidas frequentes"
              subtitulo="Treinos, taxas, compra das etapas e o campeonato: as respostas mais procuradas."
            />
            <Perguntas perguntas={perguntas} />
          </div>
        </section>
      )}

      <section className="secao-compacta fundo-branco" aria-labelledby="atalhos-contato">
        <div className="conteiner">
          <TituloSecao
            id="atalhos-contato"
            rotulo="Atalhos"
            titulo="Procurando outra informação?"
          />
          <div className={i.atalhos}>
            <CartaoAtalho
              href="/kartodromo#grade"
              rotulo="Kartódromo"
              titulo="Grade de treinos"
              texto="Dias e horários de treino de cada categoria."
              acao="Ver a grade"
            />
            <CartaoAtalho
              href="/kartodromo"
              rotulo="Kartódromo"
              titulo="Taxas e como treinar"
              texto="Taxa de ambulância, taxa de pista e o passo a passo."
              acao="Ver o kartódromo"
            />
            <CartaoAtalho
              href="/bks"
              rotulo="BKS"
              titulo="Calendário das etapas"
              texto="Datas, horários por categoria, compra e transmissão."
              acao="Ver o calendário"
            />
            <CartaoAtalho
              href="/avisos"
              rotulo="Oficial"
              titulo="Avisos"
              texto="Mudanças de treino, de etapa e comunicados."
              acao="Ver os avisos"
            />
          </div>
        </div>
      </section>
    </>
  )
}
