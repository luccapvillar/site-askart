'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { alvoPrevia } from '@/lib/previa/alvos'
import { nomeDaRota, urlPrevia } from '../editor/paginas'
import { buscarPendentes, itemDe, mesmoItem, type ItemPrevia, type ResultadoItem } from '../editor/chamadas'
import { AlternarTela, QuadroPrevia, type Tela } from '../editor/Quadro'
import s from './Chat.module.css'

type Bloco = { type: string; text?: string; [k: string]: unknown }
type Mensagem = { role: 'user' | 'assistant'; content: string | Bloco[] }
type Operacao = { tipo: string; alvo: string; id?: number; dados?: Record<string, unknown>; descricao: string }
type Proposta = { resumo: string; operacoes: Operacao[] }
type Resultado = { descricao: string; ok: boolean; mensagem: string; rascunho?: boolean }

/** Alteração gravada só para pré-visualização (ainda não está no site). */
export type RascunhoPrevia = ItemPrevia & { rota: string | null; urlAdmin: string; titulo?: string }

/** Uma linha do que aconteceu com a proposta. */
type Registro = { ok: boolean; texto: string; situacao?: 'previa' | 'publicado' | 'descartado'; mensagem?: string }

type Linha = {
  id: number
  quem: 'voce' | 'ia' | 'sistema'
  texto: string
  proposta?: Proposta
  /** proposta: só a lista; previa: gravada para conferir; encerrada: publicada, descartada ou substituída. */
  fase?: 'proposta' | 'previa' | 'encerrada'
  registros?: Registro[]
  rascunhos?: RascunhoPrevia[]
  semPrevia?: Operacao[]
  jaPublicou?: boolean
  podeRetomar?: boolean
  refazendo?: boolean
  nota?: string
}

type Props = {
  /** completo: página do assistente (pré-visualização dentro da conversa); editor: ao lado do site em "Editar o site". */
  modo?: 'completo' | 'editor'
  /** Avisado a cada gravação, com tudo o que o chat deixou esperando publicação. */
  aoMudarRascunhos?: (rascunhos: RascunhoPrevia[]) => void
  /** Pede para mostrar uma página do site (modo editor). */
  aoIrPara?: (rota: string) => void
}

const EXEMPLOS = [
  'Publica uma notícia: a 5ª etapa do BKS foi confirmada para 8 de novembro.',
  'Sábado da semana que vem a pista fecha das 12h às 18h para manutenção.',
  'Resultado oficial da F400 na 4ª etapa: 33, 12, 7, 44, 5, 18.',
  'Muda a taxa de pista para R$ 40 por dia.',
]
const ROTULO: Record<string, string> = { criar: 'Criar', atualizar: 'Alterar', excluir: 'Excluir', atualizar_global: 'Alterar' }
const SITUACAO: Record<NonNullable<Registro['situacao']>, string> = { previa: 'na pré-visualização', publicado: 'publicado', descartado: 'descartado' }

async function chamar(url: string, corpo: BodyInit, json = true) {
  const r = await fetch(url, { method: 'POST', body: corpo, credentials: 'include', headers: json ? { 'Content-Type': 'application/json' } : undefined })
  const dados = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(dados.erro || dados.errors?.[0]?.message || 'Não deu certo. Tente de novo.')
  return dados
}

const ehSemPrevia = (r?: Resultado) => !!r && !r.ok && /sem pré-visualização/i.test(r.mensagem)
const itensDe = (rascunhos: RascunhoPrevia[]) => rascunhos.map(itemDe)
const nomeDoRascunho = (r: RascunhoPrevia) => r.titulo || alvoPrevia(r.tipo, r.slug)?.rotulo || r.slug
const rotasDe = (rascunhos: RascunhoPrevia[]) => [...new Set(rascunhos.map((r) => r.rota).filter((r): r is string => !!r))]

/** Nomes dos itens gravados (best effort: a lista de pendentes traz o título de cada um). */
async function comTitulos(rascunhos: RascunhoPrevia[]) {
  if (!rascunhos.length) return rascunhos
  try {
    const pendentes = await buscarPendentes()
    return rascunhos.map((x) => ({ ...x, titulo: pendentes.find((p) => p.tipo === x.tipo && mesmoItem(p, x))?.titulo }))
  } catch {
    return rascunhos
  }
}

/** Chat do assistente: o moderador pede, a IA propõe, ele vê como fica e decide publicar, descartar ou ajustar. */
export function Chat({ modo = 'completo', aoMudarRascunhos, aoIrPara }: Props) {
  const base = useId()
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [texto, setTexto] = useState('')
  const [anexo, setAnexo] = useState<{ id: string; tipo: string; nome: string } | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [alteracoes, setAlteracoes] = useState(0)
  const mensagens = useRef<Mensagem[]>([])
  const proximoId = useRef(1)
  const focar = useRef<number | null>(null)
  const fim = useRef<HTMLDivElement>(null)
  const avisos = useRef({ aoMudarRascunhos, aoIrPara })
  useEffect(() => {
    avisos.current = { aoMudarRascunhos, aoIrPara }
  })

  const rolar = () =>
    requestAnimationFrame(() =>
      fim.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }),
    )
  const adicionar = (l: Omit<Linha, 'id'>) => {
    const linha = { ...l, id: proximoId.current++ }
    setLinhas((x) => [...x, linha])
    return linha
  }
  const mudarLinha = (id: number, mudanca: Partial<Linha> | ((l: Linha) => Partial<Linha>)) =>
    setLinhas((x) => x.map((l) => (l.id === id ? { ...l, ...(typeof mudanca === 'function' ? mudanca(l) : mudanca) } : l)))
  const aviso = (t: string) => adicionar({ quem: 'sistema', texto: t })
  // A IA fica sabendo o que aconteceu, para o próximo pedido partir do estado certo
  const contarParaIA = (texto: string, resposta = 'Entendido.') => {
    mensagens.current = [...mensagens.current, { role: 'user', content: [{ type: 'text', text: texto }] }, { role: 'assistant', content: [{ type: 'text', text: resposta }] }]
  }

  // Avisa a página (editor) depois de cada gravação, com o que o chat ainda deixa esperando publicação
  useEffect(() => {
    if (!alteracoes) return
    avisos.current.aoMudarRascunhos?.(linhas.flatMap((l) => (l.fase === 'previa' ? (l.rascunhos ?? []) : [])))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só depois de gravar, não a cada digitação
  }, [alteracoes])

  // Depois de uma ação, o foco vai para os botões seguintes (o botão clicado some)
  useEffect(() => {
    if (focar.current === null) return
    document.getElementById(`${base}-acoes-${focar.current}`)?.focus()
    focar.current = null
  })

  async function executar(rotulo: string, acao: () => Promise<void>) {
    setOcupado(rotulo)
    try {
      await acao()
    } catch (e) {
      aviso((e as Error).message)
    } finally {
      setOcupado(null)
      rolar()
    }
  }

  async function enviarArquivo(arquivo: File) {
    await executar('Enviando arquivo…', async () => {
      const form = new FormData()
      form.append('arquivo', arquivo)
      setAnexo(await chamar('/api/assistente/arquivo', form, false))
    })
  }

  /** Manda uma mensagem à IA. Com `anterior`, a nova proposta substitui a anterior e já vai para a pré-visualização. */
  async function perguntar(conteudo: Bloco[], visivel: string, anterior?: Linha) {
    adicionar({ quem: 'voce', texto: visivel })
    rolar()
    const dados = (await chamar('/api/assistente', JSON.stringify({ mensagens: [...mensagens.current, { role: 'user', content: conteudo }] }))) as {
      mensagens: Mensagem[]
      resposta: string
      proposta: Proposta | null
    }
    mensagens.current = dados.mensagens
    const linha = adicionar({ quem: 'ia', texto: dados.resposta, ...(dados.proposta ? { proposta: dados.proposta, fase: 'proposta' as const } : {}) })
    if (!anterior) return
    if (!dados.proposta) return mudarLinha(anterior.id, { refazendo: false })
    // Antes de aplicar a nova, volta o que a anterior gravou
    await descartarLinha(anterior, 'Substituída pela nova proposta abaixo.', false)
    await gravarPrevia(linha.id, dados.proposta)
  }

  function enviar(pedido: string) {
    if (!pedido.trim() && !anexo) return
    const conteudo: Bloco[] = []
    if (anexo) conteudo.push({ type: anexo.tipo, source: { type: 'file', file_id: anexo.id } })
    conteudo.push({ type: 'text', text: pedido.trim() || 'Veja o arquivo anexado.' })
    const visivel = `${anexo ? `📎 ${anexo.nome}\n` : ''}${pedido.trim()}`
    setTexto('')
    setAnexo(null)
    void executar('Pensando…', () => perguntar(conteudo, visivel))
  }

  function refazer(linha: Linha, ajuste: string) {
    if (!ajuste.trim()) return
    const pedido = `Refaça a proposta anterior ("${linha.proposta?.resumo ?? ''}") com este ajuste: ${ajuste.trim()}\nA pré-visualização anterior será descartada antes de aplicar a nova, então não use ids de itens criados por ela. Mande a proposta completa de novo.`
    void executar('Refazendo a proposta…', () => perguntar([{ type: 'text', text: pedido }], `Refazer com IA: ${ajuste.trim()}`, linha))
  }

  /** Grava a proposta só para conferir: o site público não muda. */
  async function gravarPrevia(id: number, proposta: Proposta) {
    const dados = (await chamar('/api/assistente/aplicar', JSON.stringify({ operacoes: proposta.operacoes, rascunho: true }))) as {
      resultados?: Resultado[]
      rascunhos?: RascunhoPrevia[]
    }
    const resultados = dados.resultados ?? []
    if (!Array.isArray(dados.rascunhos)) {
      // Servidor sem pré-visualização: as mudanças já foram gravadas direto no site
      mudarLinha(id, {
        fase: 'encerrada',
        registros: resultados.map((r) => ({ ok: r.ok, texto: r.descricao, situacao: r.ok ? 'publicado' : undefined, mensagem: r.ok ? undefined : r.mensagem })),
        jaPublicou: resultados.some((r) => r.ok),
        nota: 'A pré-visualização não está disponível: as mudanças foram direto para o site.',
      })
      setAlteracoes((n) => n + 1)
      contarParaIA(`Apliquei direto no site. ${resultados.filter((r) => !r.ok).map((f) => `Falhou: ${f.descricao} → ${f.mensagem}`).join('; ')}`)
      focar.current = id
      return
    }
    const doResultado = (op: Operacao, k: number) => (resultados.length === proposta.operacoes.length ? resultados[k] : resultados.find((r) => r.descricao === op.descricao))
    const semPrevia = proposta.operacoes.filter((op, k) => ehSemPrevia(doResultado(op, k)))
    const registros: Registro[] = resultados
      .filter((r) => !ehSemPrevia(r))
      .map((r) => ({ ok: r.ok, texto: r.descricao, situacao: r.ok ? (r.rascunho === false ? 'publicado' : 'previa') : undefined, mensagem: r.ok ? undefined : r.mensagem }))
    const rascunhos = await comTitulos(dados.rascunhos)
    const aberta = rascunhos.length > 0 || semPrevia.length > 0
    mudarLinha(id, {
      fase: aberta ? 'previa' : 'encerrada',
      registros,
      rascunhos,
      semPrevia,
      refazendo: false,
      podeRetomar: false,
      nota: aberta ? undefined : 'Nada foi gravado.',
    })
    setAlteracoes((n) => n + 1)
    const falhas = registros.filter((r) => !r.ok)
    contarParaIA(
      `Gravei a proposta só como pré-visualização (o site público não mudou).${falhas.length ? ` Falhas: ${falhas.map((f) => `${f.texto} → ${f.mensagem}`).join('; ')}.` : ''}${semPrevia.length ? ` Aguardando confirmação direta: ${semPrevia.map((o) => o.descricao).join('; ')}.` : ''}`,
    )
    focar.current = id
    const rota = rotasDe(rascunhos)[0]
    if (modo === 'editor' && rota) avisos.current.aoIrPara?.(rota)
  }

  async function publicar(linha: Linha) {
    const rascunhos = linha.rascunhos ?? []
    const { resultados } = (await chamar('/api/previa/publicar', JSON.stringify({ itens: itensDe(rascunhos) }))) as { resultados?: ResultadoItem[] }
    const falhas = rascunhos.flatMap((r) => {
      const res = resultados?.find((x) => mesmoItem(x, r))
      return res && !res.ok ? [{ r, mensagem: res.mensagem }] : []
    })
    setAlteracoes((n) => n + 1)
    mudarLinha(linha.id, (l) => {
      const resta = (l.semPrevia ?? []).length > 0
      return {
        rascunhos: falhas.map((f) => f.r),
        fase: falhas.length || resta ? 'previa' : 'encerrada',
        jaPublicou: true,
        registros: [
          ...(l.registros ?? []).map((x) => (x.situacao === 'previa' && !falhas.length ? { ...x, situacao: 'publicado' as const } : x)),
          ...falhas.map((f) => ({ ok: false, texto: `${nomeDoRascunho(f.r)}: não foi publicado`, mensagem: f.mensagem })),
        ],
        nota: falhas.length ? undefined : resta ? 'Publicado. Faltam as mudanças sem pré-visualização abaixo.' : 'Publicado no site.',
      }
    })
    contarParaIA(falhas.length ? `Publiquei, mas falhou: ${falhas.map((f) => `${nomeDoRascunho(f.r)} → ${f.mensagem}`).join('; ')}` : 'Publiquei a pré-visualização no site, deu certo.')
    focar.current = linha.id
  }

  /** Volta tudo o que a proposta gravou para a versão publicada (item novo, nunca publicado, é apagado). */
  async function descartarLinha(linha: Linha, nota?: string, retomar = true) {
    const rascunhos = linha.rascunhos ?? []
    let falhas: { r: RascunhoPrevia; mensagem: string }[] = []
    if (rascunhos.length) {
      const { resultados } = (await chamar('/api/previa/descartar', JSON.stringify({ itens: itensDe(rascunhos) }))) as { resultados?: ResultadoItem[] }
      falhas = rascunhos.flatMap((r) => {
        const res = resultados?.find((x) => mesmoItem(x, r))
        return res && !res.ok ? [{ r, mensagem: res.mensagem }] : []
      })
      setAlteracoes((n) => n + 1)
    }
    mudarLinha(linha.id, (l) => ({
      rascunhos: falhas.map((f) => f.r),
      semPrevia: falhas.length ? l.semPrevia : [],
      fase: falhas.length ? 'previa' : 'encerrada',
      refazendo: false,
      podeRetomar: retomar && !falhas.length && !!l.proposta && !l.jaPublicou,
      registros: [
        ...(l.registros ?? []).map((x) => (x.situacao === 'previa' && !falhas.length ? { ...x, situacao: 'descartado' as const } : x)),
        ...falhas.map((f) => ({ ok: false, texto: `${nomeDoRascunho(f.r)}: não foi descartado`, mensagem: f.mensagem })),
      ],
      nota: falhas.length ? undefined : (nota ?? (l.jaPublicou ? 'O restante foi descartado.' : 'Descartado: nada desta proposta foi para o site.')),
    }))
    contarParaIA(falhas.length ? 'Tentei descartar a pré-visualização, mas parte falhou.' : 'Descartei a pré-visualização; nada dela foi publicado.')
    focar.current = linha.id
  }

  /** Mudanças sem pré-visualização: vão direto para o site (fluxo antigo). */
  async function confirmarDireto(linha: Linha) {
    const operacoes = linha.semPrevia ?? []
    const { resultados } = (await chamar('/api/assistente/aplicar', JSON.stringify({ operacoes }))) as { resultados: Resultado[] }
    setAlteracoes((n) => n + 1)
    mudarLinha(linha.id, (l) => {
      const resta = (l.rascunhos ?? []).length > 0
      return {
        semPrevia: [],
        fase: resta ? 'previa' : 'encerrada',
        jaPublicou: l.jaPublicou || resultados.some((r) => r.ok),
        registros: [...(l.registros ?? []), ...resultados.map((r) => ({ ok: r.ok, texto: r.descricao, situacao: r.ok ? ('publicado' as const) : undefined, mensagem: r.ok ? undefined : r.mensagem }))],
        nota: resta ? l.nota : 'Publicado no site.',
      }
    })
    const falhas = resultados.filter((r) => !r.ok)
    contarParaIA(falhas.length ? `Publiquei direto. Falhas: ${falhas.map((f) => `${f.descricao} → ${f.mensagem}`).join('; ')}` : 'Publiquei direto as mudanças sem pré-visualização, deu certo.')
    focar.current = linha.id
  }

  const livre = !ocupado

  return (
    <div className={`${s.chat} ${modo === 'editor' ? s.noEditor : ''}`}>
      {modo === 'completo' ? (
        <header className={s.cabeca}>
          <h1>Assistente</h1>
          <p>
            Diga o que quer mudar no site — resultados, treinos, notícias, avisos, taxas. Pode anexar a foto ou o PDF do resultado. Antes de ir para o site, você vê como fica e decide:
            publicar, descartar ou pedir um ajuste.
          </p>
        </header>
      ) : (
        <p className={s.dica}>Peça a mudança em texto (ou anexe foto/PDF). Ela aparece no site ao lado antes de ser publicada.</p>
      )}

      <div className={s.conversa} aria-live="polite">
        {!linhas.length && (
          <ul className={s.exemplos} aria-label="Exemplos de pedido">
            {EXEMPLOS.map((e) => (
              <li key={e}>
                <button type="button" onClick={() => setTexto(e)}>
                  {e}
                </button>
              </li>
            ))}
          </ul>
        )}
        {linhas.map((l) => (
          <div key={l.id} className={`${s.linha} ${s[l.quem]} ${l.proposta ? s.comProposta : ''}`}>
            {l.texto && <p className={s.texto}>{l.texto}</p>}
            {l.proposta && (
              <CartaoProposta
                linha={l}
                idAcoes={`${base}-acoes-${l.id}`}
                modo={modo}
                livre={livre}
                aoPrevisualizar={() => executar('Preparando a pré-visualização…', () => gravarPrevia(l.id, l.proposta!))}
                aoDescartarProposta={() => mudarLinha(l.id, { fase: 'encerrada', podeRetomar: true, nota: 'Proposta descartada: nada foi gravado.' })}
                aoPublicar={() => executar('Publicando…', () => publicar(l))}
                aoDescartar={() => executar('Descartando…', () => descartarLinha(l))}
                aoConfirmarDireto={() => executar('Publicando…', () => confirmarDireto(l))}
                aoAbrirRefazer={(aberto) => mudarLinha(l.id, { refazendo: aberto })}
                aoRefazer={(ajuste) => refazer(l, ajuste)}
                aoIrPara={(rota) => avisos.current.aoIrPara?.(rota)}
              />
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
          enviar(texto)
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
              enviar(texto)
            }
          }}
          rows={3}
          placeholder="Ex.: Resultado oficial da 125cc na 4ª etapa: 21, 7, 33…"
          aria-label="Pedido para o assistente"
          disabled={!livre}
        />
        <div className={s.botoes}>
          <label className={s.anexar}>
            Anexar foto ou PDF
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className={s.sr}
              disabled={!livre}
              onChange={(e) => {
                const arquivo = e.target.files?.[0]
                e.target.value = ''
                if (arquivo) void enviarArquivo(arquivo)
              }}
            />
          </label>
          <button type="submit" className={s.confirmar} disabled={!livre || (!texto.trim() && !anexo)}>
            Enviar
          </button>
        </div>
      </form>
    </div>
  )
}

type PropsCartao = {
  linha: Linha
  idAcoes: string
  modo: 'completo' | 'editor'
  livre: boolean
  aoPrevisualizar: () => void
  aoDescartarProposta: () => void
  aoPublicar: () => void
  aoDescartar: () => void
  aoConfirmarDireto: () => void
  aoAbrirRefazer: (aberto: boolean) => void
  aoRefazer: (ajuste: string) => void
  aoIrPara: (rota: string) => void
}

/** A proposta da IA e o que fazer com ela em cada fase. */
function CartaoProposta(p: PropsCartao) {
  const { linha: l, livre } = p
  const proposta = l.proposta!
  const rascunhos = l.rascunhos ?? []
  const semPrevia = l.semPrevia ?? []
  const registros = l.registros ?? []
  const rotas = rotasDe(rascunhos)

  return (
    <div className={`${s.proposta} ${l.fase === 'encerrada' ? s.encerrada : ''}`}>
      <strong>{proposta.resumo}</strong>
      <ol>
        {proposta.operacoes.map((o, j) => (
          <li key={j}>
            <span className={s.etiqueta}>{ROTULO[o.tipo] ?? o.tipo}</span> {o.descricao}
          </li>
        ))}
      </ol>

      {l.fase === 'proposta' && (
        <div className={s.acoes} id={p.idAcoes} tabIndex={-1} role="group" aria-label="O que fazer com a proposta">
          <button type="button" className={s.confirmar} disabled={!livre} onClick={p.aoPrevisualizar}>
            Pré-visualizar
          </button>
          <button type="button" disabled={!livre} onClick={p.aoDescartarProposta}>
            Descartar
          </button>
        </div>
      )}

      {registros.length > 0 && (
        <ul className={s.resultados}>
          {registros.map((r, j) => (
            <li key={j} className={r.ok ? s.ok : s.falha}>
              <span aria-hidden="true">{r.ok ? '✓' : '✗'}</span> <span className={s.sr}>{r.ok ? 'Certo:' : 'Falhou:'}</span> {r.texto}
              {r.situacao && <small> — {SITUACAO[r.situacao]}</small>}
              {r.mensagem && <small> — {r.mensagem}</small>}
            </li>
          ))}
        </ul>
      )}

      {l.fase === 'previa' && rascunhos.length > 0 && p.modo === 'completo' && <PreviaNaConversa rotas={rotas} />}
      {l.fase === 'previa' && rascunhos.length > 0 && p.modo === 'editor' && rotas.length > 0 && (
        <p className={s.verAoLado}>
          Ver no site ao lado:{' '}
          {rotas.map((r) => (
            <button key={r} type="button" className={s.link} onClick={() => p.aoIrPara(r)}>
              {nomeDaRota(r)}
            </button>
          ))}
        </p>
      )}

      {l.fase === 'previa' && (
        <div className={s.barra} id={p.idAcoes} tabIndex={-1} role="group" aria-label="O que fazer com a pré-visualização">
          {rascunhos.length > 0 && (
            <button type="button" className={s.confirmar} disabled={!livre} onClick={p.aoPublicar}>
              Salvar e publicar
            </button>
          )}
          <button type="button" disabled={!livre} onClick={p.aoDescartar}>
            Descartar
          </button>
          <button type="button" disabled={!livre} aria-expanded={!!l.refazendo} onClick={() => p.aoAbrirRefazer(!l.refazendo)}>
            Refazer com IA
          </button>
          {rascunhos.length === 1 && (
            <a className={s.botaoLink} href={rascunhos[0].urlAdmin} target="_blank" rel="noopener noreferrer">
              Editar à mão <span aria-hidden="true">↗</span>
              <span className={s.sr}> (abre em outra aba)</span>
            </a>
          )}
          {rascunhos.length > 1 && (
            <span className={s.editarVarios}>
              Editar à mão:{' '}
              {rascunhos.map((r) => (
                <a key={`${r.slug}-${r.id ?? ''}`} href={r.urlAdmin} target="_blank" rel="noopener noreferrer">
                  {nomeDoRascunho(r)} <span aria-hidden="true">↗</span>
                  <span className={s.sr}> (abre em outra aba)</span>
                </a>
              ))}
            </span>
          )}
        </div>
      )}

      {l.fase === 'previa' && l.refazendo && <FormRefazer livre={livre} aoEnviar={p.aoRefazer} aoCancelar={() => p.aoAbrirRefazer(false)} />}

      {l.fase === 'previa' && semPrevia.length > 0 && (
        <div className={s.semPrevia}>
          <p>
            <strong>Sem pré-visualização:</strong> estas mudanças vão direto para o site quando você confirmar.
          </p>
          <ul>
            {semPrevia.map((o, j) => (
              <li key={j}>
                <span className={s.etiqueta}>{ROTULO[o.tipo] ?? o.tipo}</span> {o.descricao}
              </li>
            ))}
          </ul>
          <button type="button" className={s.confirmar} disabled={!livre} onClick={p.aoConfirmarDireto}>
            Confirmar e publicar
          </button>
        </div>
      )}

      {l.nota && (
        <p className={s.nota} id={l.fase === 'encerrada' ? p.idAcoes : undefined} tabIndex={l.fase === 'encerrada' ? -1 : undefined}>
          {l.nota}
        </p>
      )}
      {l.fase === 'encerrada' && l.podeRetomar && (
        <div className={s.acoes}>
          <button type="button" disabled={!livre} onClick={p.aoPrevisualizar}>
            {registros.length ? 'Pré-visualizar de novo' : 'Pré-visualizar'}
          </button>
        </div>
      )}
    </div>
  )
}

/** Campo "O que mudar?" do Refazer com IA. */
function FormRefazer({ livre, aoEnviar, aoCancelar }: { livre: boolean; aoEnviar: (ajuste: string) => void; aoCancelar: () => void }) {
  const [ajuste, setAjuste] = useState('')
  const id = useId()
  return (
    <form
      className={s.refazer}
      onSubmit={(e) => {
        e.preventDefault()
        aoEnviar(ajuste)
      }}
    >
      <label htmlFor={id}>O que mudar?</label>
      <textarea
        id={id}
        rows={2}
        value={ajuste}
        autoFocus
        onChange={(e) => setAjuste(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') aoCancelar()
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            aoEnviar(ajuste)
          }
        }}
        placeholder="Ex.: troque o título para “Etapa confirmada” e tire a última frase."
        disabled={!livre}
      />
      <div className={s.acoes}>
        <button type="submit" className={s.confirmar} disabled={!livre || !ajuste.trim()}>
          Refazer
        </button>
        <button type="button" onClick={aoCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

/** Página /admin/assistente: o site com a mudança, dentro da própria conversa. */
function PreviaNaConversa({ rotas }: { rotas: string[] }) {
  const [tela, setTela] = useState<Tela>('celular')
  const [escolhida, setEscolhida] = useState(0)
  const [versao, setVersao] = useState(0)
  const rota = rotas[Math.min(escolhida, rotas.length - 1)] ?? '/'
  return (
    <div className={s.previa}>
      <div className={s.previaBarra}>
        <AlternarTela valor={tela} aoMudar={setTela} />
        {rotas.length > 1 && (
          <label className={s.previaPagina}>
            Página{' '}
            <select value={Math.min(escolhida, rotas.length - 1)} onChange={(e) => setEscolhida(Number(e.target.value))}>
              {rotas.map((r, k) => (
                <option key={r} value={k}>
                  {nomeDaRota(r)}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" onClick={() => setVersao((v) => v + 1)}>
          Atualizar
        </button>
        <a href={urlPrevia(rota)} target="_blank" rel="noopener noreferrer">
          Abrir em nova aba <span aria-hidden="true">↗</span>
        </a>
      </div>
      {!rotas.length && <p className={s.nota}>Esta mudança não aparece numa página específica; abaixo, a página inicial.</p>}
      <QuadroPrevia rota={rota} versao={versao} tela={tela} altura="520px" titulo={`Pré-visualização: ${nomeDaRota(rota)}`} />
    </div>
  )
}
