import { ItensEventoPublico } from '../etapa/BlocosEtapa'
import type { InfoEventoPublico } from '@/lib/site'
import s from './Bks.module.css'

/**
 * Bloco geral "Venha assistir" da aba BKS (vale para os karts profissionais e para os karts indoor):
 * texto e itens de Configurações › BKS: evento aberto ao público.
 */
export function VenhaAssistir({ info }: { info: InfoEventoPublico }) {
  return (
    <section className={s.venhaAssistir} aria-labelledby="venha-assistir">
      <div className="conteiner">
        <div className={s.cabecalhoSecao}>
          <h2 id="venha-assistir" className="titulo-marca h2">
            Venha assistir
          </h2>
          <p className={s.textoPublico}>{info.texto}</p>
        </div>
        <ItensEventoPublico itens={info.itens} />
      </div>
    </section>
  )
}
