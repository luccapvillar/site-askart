import Link from 'next/link'
import type { InfoEventoPublico } from '@/lib/site'
import type { Midia } from '@/payload-types'
import { FaixaFoto } from '../base/FaixaFoto'
import { Foto } from '../Foto'
import { Icone, iconeDoItem } from '../etapa/Icones'
import s from './Bks.module.css'

/**
 * Bloco geral "Venha assistir" da aba BKS (vale para os karts profissionais e para os karts indoor):
 * faixa com foto grande, o texto e os itens de Configurações › BKS (evento aberto ao público).
 */
export function VenhaAssistir({ info, foto }: { info: InfoEventoPublico; foto?: Midia | null }) {
  return (
    <FaixaFoto id="venha-assistir" foto={foto} rotulo="Aberto ao público" titulo="Venha assistir" texto={<p>{info.texto}</p>}>
      <ul className={s.publicoItens}>
        {info.itens.map((item, i) => (
          <li key={i} className={s.publicoItem}>
            <span className={s.publicoIcone}>
              <Icone nome={iconeDoItem(`${item.titulo} ${item.descricao ?? ''}`)} tamanho={22} />
            </span>
            <span className={s.publicoTextos}>
              <strong>{item.titulo}</strong>
              {item.descricao && <span>{item.descricao}</span>}
            </span>
          </li>
        ))}
      </ul>
    </FaixaFoto>
  )
}

/**
 * Faixa de fotos do campeonato (mosaico de até 5 fotos, sem buracos) com o link para a sub-aba Fotos.
 * Sem fotos, não aparece.
 */
export function FaixaFotosBks({ fotos }: { fotos: Midia[] }) {
  const mostradas = fotos.slice(0, 5)
  if (!mostradas.length) return null
  const creditos = [...new Set(mostradas.map((f) => f.credito?.trim()).filter((c): c is string => Boolean(c)))]
  return (
    <section className={`secao-compacta fundo-branco ${s.fotosFaixa}`} aria-labelledby="fotos-do-campeonato">
      <div className="conteiner">
        <div className={s.subcabecalhoLinha}>
          <div className={s.subcabecalho}>
            <p className={`rotulo ${s.rotuloArea}`}>
              <span className={s.rotuloMarca} aria-hidden="true" />
              Brasília Kart Series
            </p>
            <h2 id="fotos-do-campeonato" className="titulo-marca h2">
              Fotos do campeonato
            </h2>
          </div>
          <Link href="/bks/fotos" className="link-seta">
            Ver todas as fotos
          </Link>
        </div>
        <ul className={`${s.mosaico} ${s[`mosaico${mostradas.length}`]}`}>
          {mostradas.map((f, i) => (
            <li key={f.id} className={s.mosaicoItem}>
              <Foto
                midia={f}
                ate={i === 0 ? 'destaque' : 'card'}
                sizes={i === 0 ? '(min-width: 1040px) 640px, 100vw' : '(min-width: 1040px) 320px, 50vw'}
              />
            </li>
          ))}
        </ul>
        {creditos.length > 0 && <p className={s.creditos}>Fotos: {creditos.join('; ')}.</p>}
      </div>
    </section>
  )
}
