/**
 * Transmissão na página da etapa: um cartão para os karts profissionais e outro para os karts indoor.
 * Link do YouTube vira player "clique para carregar" (nada do YouTube é carregado antes do clique);
 * outro link, o botão "Assistir à transmissão"; sem link, a mensagem pedida pelo cliente. Fica fora de
 * BlocosEtapa.tsx para o JavaScript do player só ir para a página da etapa.
 */
import { enderecoDoPlayer, MENSAGENS_ETAPA, type SituacaoEtapa, type Transmissao } from '@/lib/site'
import { PlayerYoutube } from '../youtube/PlayerYoutube'
import { BotaoExterno, CabecaCartao, Indisponivel, transmissoesVisiveis } from './BlocosEtapa'
import s from './Etapa.module.css'

/** Botão do player: antes e durante a etapa, "Assistir ao vivo"; depois, a gravação. */
const chamadaDoPlayer = (situacao: SituacaoEtapa) => (situacao.jaOcorreu ? 'Assistir à transmissão' : 'Assistir ao vivo')

/** Uma transmissão: link do YouTube vira player (só carrega no clique); outro link, botão; sem link, a mensagem. */
function ConteudoTransmissao({ transmissao: t, situacao, nomeEtapa }: { transmissao: Transmissao; situacao: SituacaoEtapa; nomeEtapa?: string }) {
  if (t.href && t.video) {
    return (
      <PlayerYoutube
        endereco={enderecoDoPlayer(t.video)}
        link={t.href}
        titulo={`Transmissão${nomeEtapa ? ` da ${nomeEtapa}` : ''} — ${t.rotulo}`}
        chamada={chamadaDoPlayer(situacao)}
      />
    )
  }
  if (t.href) {
    return (
      <BotaoExterno href={t.href} contexto={`transmissão — ${t.rotulo}`}>
        Assistir à transmissão
      </BotaoExterno>
    )
  }
  return <Indisponivel texto={MENSAGENS_ETAPA.semTransmissao} />
}

/**
 * Transmissão: um cartão para os karts profissionais e outro para os karts indoor. Depois da etapa o
 * link continua (a gravação fica no mesmo link).
 */
export function Transmissoes({ situacao, nomeEtapa }: { situacao: SituacaoEtapa; nomeEtapa?: string }) {
  const lista = transmissoesVisiveis(situacao)
  if (!lista.length) return null
  return (
    <ul className={s.duas}>
      {lista.map((t) => (
        <li key={t.tipo} className={`${s.cartao} ${s.cartaoTransmissao}`}>
          <CabecaCartao icone="transmissao" titulo={t.rotulo} />
          <ConteudoTransmissao transmissao={t} situacao={situacao} nomeEtapa={nomeEtapa} />
        </li>
      ))}
    </ul>
  )
}
