'use client'

import { useState } from 'react'
import { formatarDataHora } from '@/lib/datas'
import { agirEmPendentes, itemDe, mesmoItem, type Pendente } from './chamadas'
import e from './Editor.module.css'

type Props = {
  pendentes: Pendente[] | null
  erro: boolean
  aoTentarDeNovo: () => void
  /** Depois de publicar ou descartar: atualiza a lista e a cópia do site. */
  aoAlterar: () => void
  aoVer: (rota: string) => void
}

const chaveDe = (p: Pendente) => `${p.tipo}:${p.slug}:${p.id ?? ''}`
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

function Confirmacao({ texto, sim, perigo, aoSim, aoNao }: { texto: string; sim: string; perigo?: boolean; aoSim: () => void; aoNao: () => void }) {
  return (
    <div
      className={e.confirmacao}
      role="group"
      aria-label="Confirmação"
      onKeyDown={(ev) => {
        if (ev.key === 'Escape') aoNao()
      }}
    >
      <p>{texto}</p>
      <span className={e.acoesItem}>
        <button type="button" className={`${e.botao} ${perigo ? e.perigo : e.primario}`} onClick={aoSim}>
          {sim}
        </button>
        <button type="button" className={e.botao} onClick={aoNao} autoFocus>
          Cancelar
        </button>
      </span>
    </div>
  )
}

/** Aba "Pendentes": o que foi salvo e ainda não está no site. */
export function ListaPendentes({ pendentes, erro, aoTentarDeNovo, aoAlterar, aoVer }: Props) {
  const [ocupado, setOcupado] = useState(false)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  async function agir(acao: 'publicar' | 'descartar', itens?: Pendente[]) {
    setOcupado(true)
    setConfirmando(null)
    setStatus(acao === 'publicar' ? 'Publicando…' : 'Descartando…')
    try {
      const resultados = await agirEmPendentes(acao, itens?.map(itemDe))
      const certos = resultados.filter((r) => r.ok).length
      const falhas = resultados.filter((r) => !r.ok)
      const nome = (r: { slug: string; id?: number }) => pendentes?.find((p) => mesmoItem(p, r))?.titulo ?? r.slug
      setStatus(
        [
          certos ? `${acao === 'publicar' ? 'Publicado no site' : 'Descartado'}: ${plural(certos, 'alteração', 'alterações')}.` : '',
          falhas.length ? `Não deu certo: ${falhas.map((f) => `${nome(f)} (${f.mensagem})`).join('; ')}.` : '',
        ]
          .filter(Boolean)
          .join(' ') || 'Nada mudou.',
      )
    } catch (err) {
      setStatus((err as Error).message)
    } finally {
      setOcupado(false)
      aoAlterar()
    }
  }

  const total = pendentes?.length ?? 0

  return (
    <div className={e.pendentes}>
      <p role="status" className={e.status}>
        {status}
      </p>

      {erro && (
        <p className={e.vazio}>
          Não foi possível carregar a lista agora.{' '}
          <button type="button" className={e.botao} onClick={aoTentarDeNovo}>
            Tentar de novo
          </button>
        </p>
      )}
      {!erro && pendentes === null && <p className={e.vazio}>Carregando…</p>}
      {!erro && pendentes?.length === 0 && <p className={e.vazio}>Nenhuma alteração esperando publicação. O site já mostra tudo o que foi publicado.</p>}

      {total > 0 && (
        <>
          <p className={e.dica}>Alterações salvas que ainda não estão no site. “Ver” mostra a página na cópia ao lado.</p>
          {confirmando === 'tudo:publicar' ? (
            <Confirmacao
              texto={total === 1 ? 'Publicar a alteração no site agora?' : `Publicar as ${total} alterações no site agora?`}
              sim="Sim, publicar tudo"
              aoSim={() => agir('publicar')}
              aoNao={() => setConfirmando(null)}
            />
          ) : confirmando === 'tudo:descartar' ? (
            <Confirmacao
              texto={`Descartar ${total === 1 ? 'a alteração' : `as ${total} alterações`}? O site continua como está e o que não foi publicado se perde.`}
              sim="Sim, descartar tudo"
              perigo
              aoSim={() => agir('descartar')}
              aoNao={() => setConfirmando(null)}
            />
          ) : (
            <div className={e.acoesItem}>
              <button type="button" className={`${e.botao} ${e.primario}`} disabled={ocupado} onClick={() => setConfirmando('tudo:publicar')}>
                Publicar tudo
              </button>
              <button type="button" className={`${e.botao} ${e.perigo}`} disabled={ocupado} onClick={() => setConfirmando('tudo:descartar')}>
                Descartar tudo
              </button>
            </div>
          )}

          <ul className={e.lista}>
            {pendentes!.map((p) => {
              const chave = chaveDe(p)
              return (
                <li key={chave} className={`${e.item} ${e.pendente}`}>
                  <span className={e.cabecaItem}>
                    <strong>{p.titulo}</strong>
                    <span className={e.etiqueta}>{p.rotuloColecao}</span>
                    {p.novo && <span className={`${e.etiqueta} ${e.novo}`}>Novo, nunca publicado</span>}
                  </span>
                  {p.atualizadoEm && <small className={e.quando}>Salvo em {formatarDataHora(p.atualizadoEm)}</small>}
                  {confirmando === `descartar:${chave}` ? (
                    <Confirmacao
                      texto={p.novo ? 'Descartar? Este item nunca foi publicado e será apagado.' : 'Descartar? Volta a valer o que está publicado no site.'}
                      sim="Sim, descartar"
                      perigo
                      aoSim={() => agir('descartar', [p])}
                      aoNao={() => setConfirmando(null)}
                    />
                  ) : (
                    <span className={e.acoesItem}>
                      {p.rota && (
                        <button type="button" className={e.botao} onClick={() => aoVer(p.rota!)}>
                          Ver<span className={e.sr}> {p.titulo} na cópia do site</span>
                        </button>
                      )}
                      <button type="button" className={`${e.botao} ${e.primario}`} disabled={ocupado} onClick={() => agir('publicar', [p])}>
                        Publicar<span className={e.sr}> {p.titulo}</span>
                      </button>
                      <button type="button" className={e.botao} disabled={ocupado} onClick={() => setConfirmando(`descartar:${chave}`)}>
                        Descartar<span className={e.sr}> {p.titulo}</span>
                      </button>
                      <a className={e.botao} href={p.urlAdmin} target="_blank" rel="noopener noreferrer">
                        Editar <span aria-hidden="true">↗</span>
                        <span className={e.sr}> {p.titulo} (abre em outra aba)</span>
                      </a>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
