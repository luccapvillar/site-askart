import Link from 'next/link'
import type { Midia } from '@/payload-types'
import { Foto } from '../Foto'
import s from './Areas.module.css'

type Area = { href: string; titulo: string; texto: string; botao: string; cor: string; foto: Midia | null }

/** As três áreas do site em cartões com foto (BKS · Kartódromo · Notícias), logo abaixo do topo. */
export function Areas({ areas }: { areas: Area[] }) {
  return (
    <section className={s.areas} aria-label="Áreas do site">
      <ul className="conteiner">
        {areas.map((a) => (
          <li key={a.href}>
            <Link href={a.href} className={s.area}>
              <Foto midia={a.foto} ate="card" sizes="(min-width: 900px) 33vw, 100vw" className={s.foto} alt="" />
              <span className={s.conteudo}>
                <span className={s.barra} style={{ background: a.cor }} aria-hidden="true" />
                <span className={`titulo-marca ${s.titulo}`}>{a.titulo}</span>
                <span className={s.texto}>{a.texto}</span>
                <span className={s.botao} style={{ background: a.cor }}>
                  {a.botao}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
