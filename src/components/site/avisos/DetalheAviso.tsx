import { Artigo, DocumentoParaBaixar, Relacionados, tituloCurto } from '@/components/site/conteudo/Artigo'
import { semDemo, TextoDemo } from '@/components/site/TextoDemo'
import { TextoRico } from '@/components/site/TextoRico'
import { formatarDataExtenso, formatarHora } from '@/lib/datas'
import { comoDoc } from '@/lib/publico'
import type { Aviso, Documento } from '@/payload-types'
import { dataDoAviso, nivelSeguro, relacionadosDoAviso, rotuloTipo } from './comum'
import { SeloNivel } from './SeloNivel'
import s from './Avisos.module.css'

/**
 * Página de um aviso (usada por /avisos/[id] e pelo endereço antigo /comunicados/[id]): leitura confortável,
 * nível em texto + ícone (nunca só cor), faixa de cor no alto para "Atenção" e "Urgente", documento e
 * etapa/treino relacionados.
 */
export function DetalheAviso({ aviso: a }: { aviso: Aviso }) {
  const tipo = rotuloTipo(a.tipo)
  const nivel = nivelSeguro(a.nivel)
  const data = dataDoAviso(a)
  const anexo = comoDoc<Documento>(a.anexo)
  const relacionados = relacionadosDoAviso(a)

  return (
    <Artigo
      trilha={[{ rotulo: 'Avisos', href: '/avisos' }, { rotulo: tituloCurto(semDemo(a.titulo)) }]}
      tom={nivel === 'informativo' ? undefined : nivel}
      meta={
        <>
          <SeloNivel nivel={nivel} />
          {tipo && <span className={s.tipo}>{tipo}</span>}
        </>
      }
      titulo={<TextoDemo texto={a.titulo} />}
      assinatura={
        data ? (
          <span>
            Publicado em{' '}
            <time dateTime={data}>
              <strong>{formatarDataExtenso(data)}</strong>, às {formatarHora(data)}
            </time>
          </span>
        ) : null
      }
      depois={
        <>
          {anexo?.slug && (
            <DocumentoParaBaixar href={`/documentos/${anexo.slug}/arquivo`} titulo={<TextoDemo texto={anexo.titulo} />} />
          )}
          <Relacionados titulo="Este aviso é sobre" itens={relacionados.map((r) => ({ href: r.href, rotulo: r.rotulo }))} />
        </>
      }
      voltar={{ href: '/avisos', rotulo: 'Todos os avisos' }}
    >
      <TextoRico dados={a.texto} />
    </Artigo>
  )
}
