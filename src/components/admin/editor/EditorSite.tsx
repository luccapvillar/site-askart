'use client'

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Chat } from '../assistente/Chat'
import { AMao } from './AMao'
import { limparCaminho, nomeDaRota, PAGINAS, semBusca, urlPrevia } from './paginas'
import { buscarPendentes, type Pendente } from './chamadas'
import { ListaPendentes } from './Pendentes'
import { AlternarTela, QuadroPrevia, recarregarQuadro, type Tela } from './Quadro'
import e from './Editor.module.css'

export type Aba = 'ia' | 'mao' | 'pendentes'
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'ia', rotulo: 'Com IA' },
  { id: 'mao', rotulo: 'À mão' },
  { id: 'pendentes', rotulo: 'Pendentes' },
]
const OUTRA = '__outra__'

/** "Editar o site": a cópia do site (com o que ainda não foi publicado) e, ao lado, as formas de editar. */
export function EditorSite({ rotaInicial = '/', abaInicial = 'ia' }: { rotaInicial?: string; abaInicial?: Aba }) {
  const base = useId()
  const [destino, setDestino] = useState({ rota: rotaInicial, versao: 0 })
  const [rotaAtual, setRotaAtual] = useState(rotaInicial)
  const [tela, setTela] = useState<Tela>('computador')
  const [aba, setAba] = useState<Aba>(abaInicial)
  const [digitando, setDigitando] = useState(false)
  const [caminho, setCaminho] = useState('')
  const [erroCaminho, setErroCaminho] = useState('')
  const [pendentes, setPendentes] = useState<Pendente[] | null>(null)
  const [erroPendentes, setErroPendentes] = useState(false)
  const quadro = useRef<HTMLIFrameElement>(null)
  const botoesAba = useRef<(HTMLButtonElement | null)[]>([])
  const campoCaminho = useRef<HTMLInputElement>(null)

  const carregarPendentes = useCallback(
    () =>
      buscarPendentes().then(
        (lista) => {
          setPendentes(lista)
          setErroPendentes(false)
        },
        () => setErroPendentes(true),
      ),
    [],
  )

  useEffect(() => {
    let vivo = true
    const carregar = () =>
      buscarPendentes().then(
        (lista) => {
          if (!vivo) return
          setPendentes(lista)
          setErroPendentes(false)
        },
        () => vivo && setErroPendentes(true),
      )
    void carregar()
    // Voltou de outra aba (editou à mão): a lista pode ter mudado
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void carregar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [])

  useEffect(() => {
    if (digitando) campoCaminho.current?.focus()
  }, [digitando])

  const irPara = useCallback((rota: string) => {
    setDestino((d) => ({ rota, versao: d.versao + 1 }))
    setRotaAtual(rota)
  }, [])

  // Algo foi gravado, publicado ou descartado: a cópia busca de novo e a lista se atualiza
  const aoAlterar = useCallback(() => {
    recarregarQuadro(quadro.current)
    void carregarPendentes()
  }, [carregarPendentes])

  function teclaAba(ev: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const proximo = { ArrowRight: indice + 1, ArrowLeft: indice - 1, Home: 0, End: ABAS.length - 1 }[ev.key]
    if (proximo === undefined) return
    ev.preventDefault()
    const k = (proximo + ABAS.length) % ABAS.length
    setAba(ABAS[k].id)
    botoesAba.current[k]?.focus()
  }

  const limpo = semBusca(rotaAtual)
  const conhecida = PAGINAS.some((p) => p.rota === limpo)
  const total = pendentes?.length

  return (
    <div className={e.editor}>
      <header className={e.topo}>
        <h1 className={e.titulo}>Editar o site</h1>
        <p className={e.sub}>
          Esta é uma cópia do site que já mostra o que foi salvo e ainda não publicado. Mude com a IA ou à mão, confira aqui e publique quando estiver tudo certo.
        </p>
      </header>

      <div className={e.barra}>
        <label className={e.campo} htmlFor={`${base}-pagina`}>
          Página
          <select
            id={`${base}-pagina`}
            value={digitando ? OUTRA : limpo}
            onChange={(ev) => {
              const v = ev.target.value
              if (v === OUTRA) {
                setCaminho(rotaAtual)
                setErroCaminho('')
                setDigitando(true)
              } else {
                setDigitando(false)
                if (v !== limpo) irPara(v)
              }
            }}
          >
            {PAGINAS.map((p) => (
              <option key={p.rota} value={p.rota}>
                {p.rotulo}
              </option>
            ))}
            {!conhecida && <option value={limpo}>Aberta agora: {limpo}</option>}
            <option value={OUTRA}>Outra página (digitar o endereço)…</option>
          </select>
        </label>

        {digitando && (
          <form
            className={e.outraPagina}
            onSubmit={(ev) => {
              ev.preventDefault()
              const c = limparCaminho(caminho, window.location.origin)
              if (!c) return setErroCaminho('Use um endereço do site, começando com /. Ex.: /noticias')
              setErroCaminho('')
              setDigitando(false)
              irPara(c)
            }}
          >
            <label className={e.sr} htmlFor={`${base}-caminho`}>
              Endereço da página
            </label>
            <input
              ref={campoCaminho}
              id={`${base}-caminho`}
              value={caminho}
              onChange={(ev) => setCaminho(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === 'Escape') setDigitando(false)
              }}
              placeholder="/noticias/nome-da-noticia"
              aria-invalid={!!erroCaminho}
              aria-describedby={erroCaminho ? `${base}-erro-caminho` : undefined}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className={e.botao}>
              Ir
            </button>
            {erroCaminho && (
              <span id={`${base}-erro-caminho`} className={e.erro} role="alert">
                {erroCaminho}
              </span>
            )}
          </form>
        )}

        <AlternarTela valor={tela} aoMudar={setTela} />
        <span className={e.acoesItem}>
          <button type="button" className={e.botao} onClick={() => irPara(rotaAtual)}>
            Atualizar
          </button>
          <a className={e.botao} href={urlPrevia(rotaAtual)} target="_blank" rel="noopener noreferrer">
            Abrir em nova aba <span aria-hidden="true">↗</span>
          </a>
        </span>
        <p className={e.local} aria-live="polite">
          Mostrando: <strong>{nomeDaRota(rotaAtual)}</strong>
        </p>
      </div>

      <div className={e.corpo}>
        <section className={e.palco} aria-label="Cópia do site">
          <QuadroPrevia
            rota={destino.rota}
            versao={destino.versao}
            tela={tela}
            titulo={`Cópia do site: ${nomeDaRota(rotaAtual)}`}
            quadroRef={quadro}
            aoMudarRota={setRotaAtual}
          />
        </section>

        <aside className={e.lateral} aria-label="Formas de editar">
          <div className={e.abas} role="tablist" aria-label="Formas de editar">
            {ABAS.map((a, k) => (
              <button
                key={a.id}
                ref={(el) => {
                  botoesAba.current[k] = el
                }}
                type="button"
                role="tab"
                id={`${base}-aba-${a.id}`}
                aria-selected={aba === a.id}
                aria-controls={`${base}-painel-${a.id}`}
                tabIndex={aba === a.id ? 0 : -1}
                onClick={() => setAba(a.id)}
                onKeyDown={(ev) => teclaAba(ev, k)}
              >
                {a.rotulo}
                {a.id === 'pendentes' && total !== undefined && (
                  <span className={total ? e.contador : `${e.contador} ${e.zerado}`}>
                    {' '}
                    ({total})
                  </span>
                )}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`${base}-painel-ia`} aria-labelledby={`${base}-aba-ia`} hidden={aba !== 'ia'} className={e.painel}>
            <Chat modo="editor" aoIrPara={irPara} aoMudarRascunhos={aoAlterar} />
          </div>
          <div role="tabpanel" id={`${base}-painel-mao`} aria-labelledby={`${base}-aba-mao`} hidden={aba !== 'mao'} className={e.painel}>
            <AMao rota={rotaAtual} aoIrPara={irPara} />
          </div>
          <div role="tabpanel" id={`${base}-painel-pendentes`} aria-labelledby={`${base}-aba-pendentes`} hidden={aba !== 'pendentes'} className={e.painel}>
            <ListaPendentes pendentes={pendentes} erro={erroPendentes} aoTentarDeNovo={carregarPendentes} aoAlterar={aoAlterar} aoVer={irPara} />
          </div>
        </aside>
      </div>
    </div>
  )
}
