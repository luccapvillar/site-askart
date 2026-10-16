'use client'

import { useState } from 'react'
import type { Operacao } from '@/lib/assistente/ferramentas'
import { pedidoDaGrade, referenciasDasLinhas } from '@/lib/assistente/grade'
import type { LinhaGrade, OpcaoCategoria, OpcaoTipo } from './modelo'
import s from './EditorGrade.module.css'

type Mensagem = { role: 'user' | 'assistant'; content: unknown }
type Resultado = { resposta: string; resumo?: string; aplicadas: string[]; ignoradas: string[] }

type Props = {
  linhas: LinhaGrade[]
  tipos: OpcaoTipo[]
  categorias: OpcaoCategoria[]
  desligado: boolean
  /** Aplica a proposta no editor (sem gravar) e diz o que entrou e o que ficou de fora. */
  aplicarProposta: (operacoes: Operacao[], refs: Map<string, string>) => { aplicadas: string[]; ignoradas: string[] }
  onDesfazer: () => void
}

/** Mais que isto e a conversa recomeça (cada pedido já leva a grade inteira). */
const MAX_MENSAGENS = 24

/**
 * "Refazer com IA": o pedido vai ao assistente com a grade do editor; a proposta volta como mudança no
 * editor, para conferir na pré-visualização antes de salvar.
 */
export function RefazerComIA({ linhas, tipos, categorias, desligado, aplicarProposta, onDesfazer }: Props) {
  const [texto, setTexto] = useState('')
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  async function pedir(pedido: string) {
    if (!pedido.trim() || ocupado) return
    setOcupado(true)
    setErro(null)
    setResultado(null)
    const refs = referenciasDasLinhas(linhas)
    const ultima = mensagens[mensagens.length - 1]
    const anteriores = ultima?.role === 'assistant' && mensagens.length < MAX_MENSAGENS ? mensagens : []
    const novas: Mensagem[] = [
      ...anteriores,
      { role: 'user', content: [{ type: 'text', text: pedidoDaGrade(pedido, linhas, refs, tipos, categorias) }] },
    ]
    try {
      const r = await fetch('/api/assistente', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: novas }),
      })
      const dados = (await r.json().catch(() => ({}))) as {
        erro?: string
        mensagens?: Mensagem[]
        resposta?: string
        proposta?: { resumo?: string; operacoes?: Operacao[] } | null
      }
      if (!r.ok) throw new Error(dados.erro || 'O assistente não respondeu. Tente de novo.')
      setMensagens(Array.isArray(dados.mensagens) ? dados.mensagens : [])
      const operacoes = dados.proposta?.operacoes ?? []
      if (operacoes.length) {
        const { aplicadas, ignoradas } = aplicarProposta(operacoes, refs)
        setResultado({ resposta: dados.resposta ?? '', resumo: dados.proposta?.resumo, aplicadas, ignoradas })
      } else {
        setResultado({ resposta: dados.resposta || 'A IA não propôs mudanças na grade.', aplicadas: [], ignoradas: [] })
      }
      setTexto('')
    } catch (e) {
      setErro(e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'Sem conexão com o servidor. Confira a internet e tente de novo.')
    } finally {
      setOcupado(false)
    }
  }

  function novaConversa() {
    setMensagens([])
    setResultado(null)
    setErro(null)
  }

  return (
    <section className={s.ia} aria-labelledby="ia-titulo">
      <div className={s.iaCabeca}>
        <h2 id="ia-titulo" className={s.subtitulo}>
          Refazer com IA
        </h2>
        {mensagens.length > 0 && (
          <button type="button" className={s.botaoLink} onClick={novaConversa} disabled={ocupado}>
            Começar conversa nova
          </button>
        )}
      </div>
      <p className={s.dica}>
        Escreva o que mudar. A IA monta a grade nova aqui no editor; nada vai para o site antes de você clicar em “Salvar e publicar”.
      </p>
      <form
        className={s.iaForm}
        onSubmit={(e) => {
          e.preventDefault()
          void pedir(texto)
        }}
      >
        <label htmlFor="ia-pedido" className={s.visualmenteOculto}>
          O que mudar na grade
        </label>
        <textarea
          id="ia-pedido"
          rows={2}
          value={texto}
          placeholder="Ex.: sábado das 8h às 12h só para a F400"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void pedir(texto)
            }
          }}
          disabled={ocupado || desligado}
        />
        <button type="submit" className={s.botaoPrincipal} disabled={ocupado || desligado || !texto.trim()}>
          {ocupado ? 'Preparando…' : 'Pedir à IA'}
        </button>
      </form>

      <div aria-live="polite" className={s.iaSaida}>
        {ocupado && <p className={s.dica}>A IA está preparando a grade… isso pode levar alguns segundos.</p>}
        {erro && <p className={`${s.aviso} ${s.avisoErro}`}>{erro}</p>}
        {resultado && (
          <div className={s.iaResultado}>
            {resultado.resposta && <p className={s.iaResposta}>{resultado.resposta}</p>}
            {resultado.aplicadas.length > 0 && (
              <>
                <p>
                  <strong>{resultado.resumo || 'Mudanças preparadas no editor'}</strong> — confira na pré-visualização. Depois é só
                  salvar, descartar, pedir de novo ou ajustar à mão.
                </p>
                <ul className={s.listaIA}>
                  {resultado.aplicadas.map((a, i) => (
                    <li key={i}>✓ {a}</li>
                  ))}
                </ul>
              </>
            )}
            {resultado.ignoradas.length > 0 && (
              <>
                <p>Ficou de fora:</p>
                <ul className={s.listaIA}>
                  {resultado.ignoradas.map((a, i) => (
                    <li key={i}>✗ {a}</li>
                  ))}
                </ul>
              </>
            )}
            {resultado.aplicadas.length > 0 && (
              <button type="button" className={s.botaoMiudo} onClick={onDesfazer}>
                Desfazer o que a IA mudou
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
