'use client'

import { useRef, useState } from 'react'
import s from './Chat.module.css'

type Bloco = { type: string; text?: string; [k: string]: unknown }
type Mensagem = { role: 'user' | 'assistant'; content: string | Bloco[] }
type Operacao = { tipo: string; alvo: string; id?: number; dados?: Record<string, unknown>; descricao: string }
type Proposta = { resumo: string; operacoes: Operacao[] }
type Resultado = { descricao: string; ok: boolean; mensagem: string }
type Linha = { quem: 'voce' | 'ia' | 'sistema'; texto: string; proposta?: Proposta; resultados?: Resultado[] }

const EXEMPLOS = [
  'Publica uma notícia: a 5ª etapa do BKS foi confirmada para 8 de novembro.',
  'Sábado da semana que vem a pista fecha das 12h às 18h para manutenção.',
  'Resultado oficial da F400 na 4ª etapa: 33, 12, 7, 44, 5, 18.',
  'Muda a taxa de pista para R$ 40 por dia.',
]
const ROTULO: Record<string, string> = { criar: 'Criar', atualizar: 'Alterar', excluir: 'Excluir', atualizar_global: 'Alterar' }

async function chamar(url: string, corpo: BodyInit, json = true) {
  const r = await fetch(url, { method: 'POST', body: corpo, credentials: 'include', headers: json ? { 'Content-Type': 'application/json' } : undefined })
  const dados = await r.json()
  if (!r.ok) throw new Error(dados.erro || 'Falhou.')
  return dados
}

/** Chat do assistente: o moderador pede, a IA propõe, ele confere e confirma. */
export function Chat() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [texto, setTexto] = useState('')
  const [anexo, setAnexo] = useState<{ id: string; tipo: string; nome: string } | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const fim = useRef<HTMLDivElement>(null)
  const rolar = () => requestAnimationFrame(() => fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
  const aviso = (t: string) => setLinhas((l) => [...l, { quem: 'sistema', texto: t }])

  async function enviarArquivo(arquivo: File) {
    setOcupado('Enviando arquivo…')
    try {
      const form = new FormData()
      form.append('arquivo', arquivo)
      setAnexo(await chamar('/api/assistente/arquivo', form, false))
    } catch (e) {
      aviso((e as Error).message)
    } finally {
      setOcupado(null)
    }
  }

  async function enviar(pedido: string) {
    if (!pedido.trim() && !anexo) return
    const conteudo: Bloco[] = []
    if (anexo) conteudo.push({ type: anexo.tipo, source: { type: 'file', file_id: anexo.id } })
    conteudo.push({ type: 'text', text: pedido.trim() || 'Veja o arquivo anexado.' })
    const novas: Mensagem[] = [...mensagens, { role: 'user', content: conteudo }]
    setLinhas((l) => [...l, { quem: 'voce', texto: `${anexo ? `📎 ${anexo.nome}\n` : ''}${pedido.trim()}` }])
    setTexto('')
    setAnexo(null)
    setOcupado('Pensando…')
    rolar()
    try {
      const dados = await chamar('/api/assistente', JSON.stringify({ mensagens: novas }))
      setMensagens(dados.mensagens)
      setLinhas((l) => [...l, { quem: 'ia', texto: dados.resposta, proposta: dados.proposta ?? undefined }])
    } catch (e) {
      aviso((e as Error).message)
    } finally {
      setOcupado(null)
      rolar()
    }
  }

  async function confirmar(indice: number, proposta: Proposta) {
    setOcupado('Aplicando no site…')
    try {
      const { resultados } = (await chamar('/api/assistente/aplicar', JSON.stringify({ operacoes: proposta.operacoes }))) as { resultados: Resultado[] }
      setLinhas((l) => l.map((x, i) => (i === indice ? { ...x, proposta: undefined, resultados } : x)))
      const falhas = resultados.filter((x) => !x.ok)
      // A IA fica sabendo o que deu certo, para corrigir as falhas no próximo pedido
      setMensagens((m) => [
        ...m,
        { role: 'user', content: [{ type: 'text', text: falhas.length ? `Apliquei. Falhas: ${falhas.map((f) => `${f.descricao} → ${f.mensagem}`).join('; ')}` : 'Apliquei tudo, deu certo.' }] },
        { role: 'assistant', content: [{ type: 'text', text: falhas.length ? 'Entendido, vou considerar as falhas.' : 'Ótimo.' }] },
      ])
    } catch (e) {
      aviso((e as Error).message)
    } finally {
      setOcupado(null)
      rolar()
    }
  }

  return (
    <div className={s.chat}>
      <header className={s.cabeca}>
        <h1>Assistente</h1>
        <p>Diga o que quer mudar no site — resultados, treinos, notícias, avisos, taxas. Pode anexar a foto ou o PDF do resultado. Nada é gravado antes de você conferir e confirmar.</p>
      </header>

      <div className={s.conversa} aria-live="polite">
        {!linhas.length && (
          <ul className={s.exemplos}>
            {EXEMPLOS.map((e) => (
              <li key={e}>
                <button type="button" onClick={() => setTexto(e)}>
                  {e}
                </button>
              </li>
            ))}
          </ul>
        )}
        {linhas.map((l, i) => (
          <div key={i} className={`${s.linha} ${s[l.quem]}`}>
            {l.texto && <p className={s.texto}>{l.texto}</p>}
            {l.proposta && (
              <div className={s.proposta}>
                <strong>{l.proposta.resumo}</strong>
                <ol>
                  {l.proposta.operacoes.map((o, j) => (
                    <li key={j}>
                      <span className={s.etiqueta}>{ROTULO[o.tipo] ?? o.tipo}</span> {o.descricao}
                    </li>
                  ))}
                </ol>
                <div className={s.acoes}>
                  <button type="button" className={s.confirmar} disabled={!!ocupado} onClick={() => confirmar(i, l.proposta!)}>
                    Confirmar e publicar
                  </button>
                  <button type="button" disabled={!!ocupado} onClick={() => setLinhas((x) => x.map((y, k) => (k === i ? { ...y, proposta: undefined, texto: `${y.texto}\n(Proposta descartada.)` } : y)))}>
                    Descartar
                  </button>
                </div>
              </div>
            )}
            {l.resultados && (
              <ul className={s.resultados}>
                {l.resultados.map((r, j) => (
                  <li key={j} className={r.ok ? s.ok : s.falha}>
                    {r.ok ? '✓' : '✗'} {r.descricao}
                    {!r.ok && <small> — {r.mensagem}</small>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {ocupado && <p className={s.ocupado}>{ocupado}</p>}
        <div ref={fim} />
      </div>

      <form
        className={s.entrada}
        onSubmit={(e) => {
          e.preventDefault()
          void enviar(texto)
        }}
      >
        {anexo && (
          <p className={s.anexo}>
            📎 {anexo.nome}{' '}
            <button type="button" onClick={() => setAnexo(null)}>
              remover
            </button>
          </p>
        )}
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void enviar(texto)
            }
          }}
          rows={3}
          placeholder="Ex.: Resultado oficial da 125cc na 4ª etapa: 21, 7, 33…"
          aria-label="Pedido para o assistente"
          disabled={!!ocupado}
        />
        <div className={s.botoes}>
          <label className={s.anexar}>
            Anexar foto ou PDF
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={(e) => e.target.files?.[0] && enviarArquivo(e.target.files[0])} />
          </label>
          <button type="submit" className={s.confirmar} disabled={!!ocupado || (!texto.trim() && !anexo)}>
            Enviar
          </button>
        </div>
      </form>
    </div>
  )
}
