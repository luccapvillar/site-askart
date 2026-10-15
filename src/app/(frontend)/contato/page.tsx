import type { Metadata } from 'next'
import { LinkMapa } from '@/components/site/bks/pecas'
import { Canais } from '@/components/site/Canais'
import { Foto } from '@/components/site/Foto'
import { Perguntas } from '@/components/site/Perguntas'
import { Secao, TopoPagina } from '@/components/site/paginas/TopoPagina'
import s from '@/components/site/paginas/Paginas.module.css'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { comoDoc, lerContato, lerKartodromo, lerPerguntas, textosDaSecao } from '@/lib/publico'
import { canaisDoContato, NOMES_REDES } from '@/lib/site'
import type { Midia } from '@/payload-types'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const textos = await textosDaSecao('contato')
  return { title: textos?.seoTitulo || 'Contato', description: textos?.seoDescricao || 'Telefones, WhatsApp, e-mail, endereço e redes sociais da ASKART e do kartódromo.' }
}

export default async function Contato() {
  const [contato, kartodromo, perguntas, textos] = await Promise.all([lerContato(), lerKartodromo(), lerPerguntas(['geral', 'kartodromo', 'bks']), textosDaSecao('contato')])
  const canais = canaisDoContato(contato, 'contato')
  const redes = contato.redes ?? []
  return (
    <>
      <TopoPagina rotulo="Fale com a ASKART" titulo={textos?.titulo || 'Contato'} intro={textos?.introducao || 'Telefones, WhatsApp, e-mail, endereço do kartódromo e redes sociais.'} foto={comoDoc<Midia>(textos?.imagem)} />
      <Secao id="canais" titulo="Telefones, WhatsApp e e-mail" branca>
        <div className={s.duas}>
          <Canais canais={canais} />
          <div className={s.endereco}>
            <h3 className="rotulo texto-2">{kartodromo.nome || 'Kartódromo'}</h3>
            {contato.endereco?.texto ? (
              <address>
                <TextoDemo texto={contato.endereco.texto} />
              </address>
            ) : (
              <p className="texto-2">Endereço a ser publicado.</p>
            )}
            <LinkMapa href={contato.endereco?.linkMapa ?? null} rotulo="Abrir no Google Maps" />
            <Foto midia={comoDoc<Midia>(contato.endereco?.imagemMapa)} className={s.fotoArredondada} ate="card" sizes="(min-width: 900px) 40vw, 100vw" credito />
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
        </div>
      </Secao>
      {redes.length > 0 && (
        <Secao id="redes" titulo="Redes sociais">
          <div className={s.redes}>
            {redes.map((r) => (
              <a key={r.url} className={s.rede} href={r.url} target="_blank" rel="noopener noreferrer">
                {NOMES_REDES[r.rede] ?? r.rede}
                {r.usuario && (
                  <span className="texto-2">
                    <TextoDemo texto={r.usuario} />
                  </span>
                )}
                <span className="visualmente-oculto"> (abre em nova aba)</span>
              </a>
            ))}
          </div>
        </Secao>
      )}
      {perguntas.length > 0 && (
        <Secao id="duvidas" rotulo="Antes de entrar em contato" titulo="Dúvidas recorrentes" branca>
          <Perguntas perguntas={perguntas} />
        </Secao>
      )}
    </>
  )
}
