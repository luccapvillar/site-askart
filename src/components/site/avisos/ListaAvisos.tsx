import Link from 'next/link'
import { TextoDemo } from '@/components/site/TextoDemo'
import { formatarData } from '@/lib/datas'
import { comoDoc } from '@/lib/publico'
import type { Aviso, Documento } from '@/payload-types'
import { dataDoAviso, nivelSeguro, relacionadosDoAviso, resumoDoAviso, rotuloTipo } from './comum'
import { SeloNivel } from './SeloNivel'
import s from './Avisos.module.css'

/**
 * Lista de avisos em cartões. O nível aparece em texto + ícone + cor (nunca só cor);
 * o cartão inteiro leva ao aviso (o link é o título, que dá nome ao cartão para o leitor de tela).
 */
export function ListaAvisos({ avisos }: { avisos: Aviso[] }) {
  return (
    <ul className={s.lista}>
      {avisos.map((a) => {
        const nivel = nivelSeguro(a.nivel)
        const tipo = rotuloTipo(a.tipo)
        const data = dataDoAviso(a)
        const resumo = resumoDoAviso(a.texto)
        const relacionados = relacionadosDoAviso(a)
        const anexo = comoDoc<Documento>(a.anexo)
        return (
          <li key={a.id} className={`${s.cartao} ${s[`cartao-${nivel}`]}`}>
            <article className={s.conteudo} aria-labelledby={`aviso-${a.id}`}>
              <p className={s.meta}>
                <SeloNivel nivel={nivel} />
                {tipo && <span className={s.tipo}>{tipo}</span>}
                {data && (
                  <time className={s.data} dateTime={data}>
                    {formatarData(data)}
                  </time>
                )}
              </p>
              <h2 id={`aviso-${a.id}`} className={s.titulo}>
                <Link className={s.link} href={`/avisos/${a.id}`}>
                  <TextoDemo texto={a.titulo} />
                </Link>
              </h2>
              {resumo && <p className={s.resumo}>{resumo}</p>}
              {(relacionados.length > 0 || anexo) && (
                <ul className={s.extras} aria-label="Detalhes">
                  {relacionados.map((r) => (
                    <li key={r.href + r.rotulo}>Sobre: {r.rotulo}</li>
                  ))}
                  {anexo && <li>Com documento para baixar</li>}
                </ul>
              )}
              <span className={s.ler} aria-hidden="true">
                Ler o aviso <span className={s.seta}>→</span>
              </span>
            </article>
          </li>
        )
      })}
    </ul>
  )
}
