'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { GradeTreinos } from '@/components/site/treinos/GradeTreinos'
import type { DiaSemana } from '@/lib/agenda'
import type { Operacao } from '@/lib/assistente/ferramentas'
import { aplicarPropostaNaGrade } from '@/lib/assistente/grade'
import { LinhaHorario } from './LinhaHorario'
import {
  calcularAlteracoes,
  copiaDaLinha,
  copiarDia,
  DIAS_EDITOR,
  foraDeOrdem,
  linhaNova,
  nomeDoDia,
  ordenarLinhas,
  validarGrade,
  type ErroDeLinha,
  type EstadoGrade,
  type LinhaGrade,
} from './modelo'
import { quadroDaPrevia } from './previa'
import { RefazerComIA } from './RefazerComIA'
import s from './EditorGrade.module.css'
import p from './Previa.module.css'

type Aviso = { tipo: 'ok' | 'erro' | 'info'; texto: string }

const SAIR_SEM_SALVAR = 'Há alterações na grade de treinos que ainda não foram salvas. Sair mesmo assim?'
/** Mudanças seguidas no mesmo campo (digitar a observação, por exemplo) viram um passo só do "Desfazer". */
const JUNTAR_MS = 1500

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/**
 * Editor da grade semanal de treinos (/admin/grade-treinos): edição por dia, pré-visualização igual ao site,
 * "Refazer com IA" e gravação de tudo de uma vez (POST /api/horarios-treino/salvar-grade).
 */
export function EditorGrade({ inicial, marca }: { inicial: EstadoGrade; marca: Record<string, string> }) {
  const [dados, setDados] = useState<EstadoGrade>(inicial)
  const [base, setBase] = useState<LinhaGrade[]>(() => ordenarLinhas(inicial.linhas))
  const [linhas, setLinhasNoEstado] = useState<LinhaGrade[]>(base)
  const linhasRef = useRef(linhas)
  const [historico, setHistorico] = useState<LinhaGrade[][]>([])
  const ultimaMudanca = useRef<{ grupo: string | null; quando: number }>({ grupo: null, quando: 0 })
  const [dia, setDia] = useState<DiaSemana>('segunda')
  const [errosServidor, setErrosServidor] = useState<ErroDeLinha[]>([])
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [copiaPara, setCopiaPara] = useState<DiaSemana | ''>('')
  const [substituir, setSubstituir] = useState(false)
  const focoPendente = useRef<string | null>(null)

  const tipoPadrao = dados.tipos[0]?.id ?? null
  const alteracoes = useMemo(() => calcularAlteracoes(base, linhas), [base, linhas])
  const errosLocais = useMemo(
    () =>
      validarGrade(linhas, base, {
        tipos: dados.tipos,
        categorias: dados.categorias,
        foraDoEditor: dados.foraDoEditor.visiveis,
      }),
    [linhas, base, dados],
  )
  const chavesAtuais = useMemo(() => new Set(linhas.map((l) => l.chave)), [linhas])
  const erros = useMemo(() => {
    const todos = new Map(errosLocais)
    for (const e of errosServidor) {
      if (!e.chave || !chavesAtuais.has(e.chave)) continue
      const lista = todos.get(e.chave) ?? []
      if (!lista.includes(e.mensagem)) todos.set(e.chave, [...lista, e.mensagem])
    }
    return todos
  }, [errosLocais, errosServidor, chavesAtuais])
  const errosGerais = errosServidor.filter((e) => !e.chave || !chavesAtuais.has(e.chave))
  const quadro = useMemo(() => quadroDaPrevia(linhas, dados), [linhas, dados])
  const pendente = alteracoes.total > 0

  /* ------------------------------ mudanças (com "Desfazer") ------------------------------ */

  const trocarLinhas = useCallback((nova: LinhaGrade[], grupo: string | null = null) => {
    const atual = linhasRef.current
    if (nova === atual) return
    const agora = Date.now()
    const juntar = grupo !== null && ultimaMudanca.current.grupo === grupo && agora - ultimaMudanca.current.quando < JUNTAR_MS
    if (!juntar) setHistorico((h) => [...h.slice(-49), atual])
    ultimaMudanca.current = { grupo, quando: agora }
    linhasRef.current = nova
    setLinhasNoEstado(nova)
  }, [])

  const recomecar = useCallback((dadosNovos: EstadoGrade) => {
    const ordenadas = ordenarLinhas(dadosNovos.linhas)
    setDados(dadosNovos)
    setBase(ordenadas)
    linhasRef.current = ordenadas
    setLinhasNoEstado(ordenadas)
    setHistorico([])
    setErrosServidor([])
    ultimaMudanca.current = { grupo: null, quando: 0 }
  }, [])

  const mudarLinha = useCallback(
    (chave: string, mudanca: Partial<LinhaGrade>, campo: string) => {
      trocarLinhas(
        linhasRef.current.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)),
        `${chave}:${campo}`,
      )
      setErrosServidor((e) => (e.some((x) => x.chave === chave) ? e.filter((x) => x.chave !== chave) : e))
    },
    [trocarLinhas],
  )

  const duplicar = useCallback(
    (chave: string) => {
      const atual = linhasRef.current
      const i = atual.findIndex((l) => l.chave === chave)
      if (i < 0) return
      const copia = copiaDaLinha(atual[i])
      trocarLinhas([...atual.slice(0, i + 1), copia, ...atual.slice(i + 1)])
      focoPendente.current = `${copia.chave}-inicio`
      setAviso({ tipo: 'info', texto: 'Horário duplicado logo abaixo. Ajuste o que for preciso.' })
    },
    [trocarLinhas],
  )

  const apagar = useCallback(
    (chave: string) => {
      const atual = linhasRef.current
      const alvo = atual.find((l) => l.chave === chave)
      if (!alvo) return
      const doDia = atual.filter((l) => l.diaSemana === alvo.diaSemana)
      const i = doDia.findIndex((l) => l.chave === chave)
      const vizinho = doDia[i + 1] ?? doDia[i - 1]
      trocarLinhas(atual.filter((l) => l.chave !== chave))
      focoPendente.current = vizinho ? `${vizinho.chave}-inicio` : `adicionar-${alvo.diaSemana}`
      setAviso({ tipo: 'info', texto: 'Horário apagado do editor. Se foi sem querer, use “Desfazer”.' })
    },
    [trocarLinhas],
  )

  function adicionar(d: DiaSemana) {
    const atual = linhasRef.current
    const nova = linhaNova(
      d,
      atual.filter((l) => l.diaSemana === d),
      tipoPadrao,
    )
    trocarLinhas([...atual, nova])
    focoPendente.current = `${nova.chave}-inicio`
    setAviso(null)
  }

  function copiar() {
    if (!copiaPara) return
    const r = copiarDia(linhasRef.current, dia, copiaPara, substituir)
    if (!r.copiados) {
      setAviso({ tipo: 'info', texto: `${nomeDoDia(dia)} não tem horários para copiar.` })
      return
    }
    trocarLinhas(r.linhas)
    setAviso({
      tipo: 'info',
      texto:
        `${plural(r.copiados, 'horário copiado', 'horários copiados')} para ${nomeDoDia(copiaPara)}.` +
        (r.tiradosDoSite
          ? ` ${plural(r.tiradosDoSite, 'horário que já estava lá tem', 'horários que já estavam lá têm')} alterações em “Treinos e exceções” e saíram do site em vez de serem apagados.`
          : ''),
    })
    setCopiaPara('')
  }

  function desfazer() {
    if (!historico.length) return
    const anterior = historico[historico.length - 1]
    setHistorico(historico.slice(0, -1))
    ultimaMudanca.current = { grupo: null, quando: 0 }
    linhasRef.current = anterior
    setLinhasNoEstado(anterior)
    setAviso({ tipo: 'info', texto: 'Última mudança desfeita.' })
  }

  function descartar() {
    if (!pendente) return
    trocarLinhas(base)
    setErrosServidor([])
    setAviso({ tipo: 'info', texto: 'Alterações descartadas: o editor voltou à grade que está no site. Para recuperá-las, use “Desfazer”.' })
  }

  const aplicarProposta = useCallback(
    (operacoes: Operacao[], refs: Map<string, string>) => {
      const r = aplicarPropostaNaGrade(linhasRef.current, operacoes, refs, {
        tipos: dados.tipos,
        categorias: dados.categorias,
        tipoPadrao,
      })
      if (r.aplicadas.length) {
        trocarLinhas(r.linhas)
        setAviso({ tipo: 'info', texto: 'A IA preparou mudanças no editor. Confira na pré-visualização antes de salvar.' })
      }
      return { aplicadas: r.aplicadas, ignoradas: r.ignoradas }
    },
    [dados.tipos, dados.categorias, tipoPadrao, trocarLinhas],
  )

  function irParaProblema() {
    const primeira = ordenarLinhas(linhas).find((l) => erros.has(l.chave))
    if (!primeira) return
    setDia(primeira.diaSemana)
    focoPendente.current = `${primeira.chave}-inicio`
  }

  /* ------------------------------------ gravação ------------------------------------ */

  async function salvar() {
    if (!pendente || salvando) return
    if (erros.size) {
      irParaProblema()
      return
    }
    setSalvando(true)
    setAviso({ tipo: 'info', texto: 'Salvando a grade…' })
    try {
      const r = await fetch('/api/horarios-treino/salvar-grade', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linhas: linhasRef.current, base: base.map((l) => l.id).filter((id) => id !== null) }),
      })
      const resposta = (await r.json().catch(() => ({}))) as {
        mensagem?: string
        dados?: EstadoGrade
        erro?: string
        erros?: ErroDeLinha[]
        errors?: { message?: string }[]
      }
      if (r.ok && resposta.dados) {
        recomecar(resposta.dados)
        setAviso({ tipo: 'ok', texto: resposta.mensagem || 'Grade salva e publicada no site.' })
      } else if (Array.isArray(resposta.erros) && resposta.erros.length) {
        setErrosServidor(resposta.erros)
        setAviso({ tipo: 'erro', texto: resposta.erro || 'Nada foi gravado. Corrija os pontos indicados e salve de novo.' })
        const primeira = linhasRef.current.find((l) => resposta.erros?.some((e) => e.chave === l.chave))
        if (primeira) {
          setDia(primeira.diaSemana)
          focoPendente.current = `${primeira.chave}-inicio`
        }
      } else {
        setAviso({
          tipo: 'erro',
          texto: resposta.erro || resposta.errors?.[0]?.message || 'Não foi possível salvar. Nada foi gravado; tente de novo.',
        })
      }
    } catch {
      setAviso({ tipo: 'erro', texto: 'Sem conexão com o servidor. Nada foi gravado; confira a internet e tente de novo.' })
    } finally {
      setSalvando(false)
    }
  }

  /* --------------------------------- efeitos da página --------------------------------- */

  // Foco depois de adicionar, duplicar, apagar ou ir para um problema
  useEffect(() => {
    if (!focoPendente.current) return
    const alvo = document.getElementById(focoPendente.current)
    focoPendente.current = null
    alvo?.focus()
  })

  // Aviso ao sair (recarregar, fechar a aba ou clicar num link do painel) com alterações não salvas
  useEffect(() => {
    if (!pendente) return
    const antesDeSair = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = SAIR_SEM_SALVAR
    }
    const aoClicar = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a')
      if (!link?.href || link.target === '_blank' || link.hasAttribute('download')) return
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const destino = new URL(link.href, window.location.href)
      const aqui = window.location
      if (destino.origin === aqui.origin && destino.pathname === aqui.pathname && destino.search === aqui.search) return
      if (!window.confirm(SAIR_SEM_SALVAR)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', antesDeSair)
    document.addEventListener('click', aoClicar, true)
    return () => {
      window.removeEventListener('beforeunload', antesDeSair)
      document.removeEventListener('click', aoClicar, true)
    }
  }, [pendente])

  function teclaNasAbas(e: KeyboardEvent<HTMLDivElement>) {
    const i = DIAS_EDITOR.findIndex((d) => d.chave === dia)
    const j =
      e.key === 'ArrowRight' ? (i + 1) % 7 : e.key === 'ArrowLeft' ? (i + 6) % 7 : e.key === 'Home' ? 0 : e.key === 'End' ? 6 : -1
    if (j < 0) return
    e.preventDefault()
    setDia(DIAS_EDITOR[j].chave)
    focoPendente.current = `aba-${DIAS_EDITOR[j].chave}`
  }

  /* -------------------------------------- tela -------------------------------------- */

  const doDia = linhas.filter((l) => l.diaSemana === dia)
  const nomeDia = nomeDoDia(dia)
  const temHorarios = quadro.dias.some((d) => d.horarios.length)

  return (
    <div className={s.editor}>
      <header className={s.cabeca}>
        <h1>Grade de treinos</h1>
        <p>
          Horários que se repetem toda semana no kartódromo. Mude à mão ou peça à IA, confira na pré-visualização (é exatamente como
          fica no site) e clique em “Salvar e publicar”. Para mudar só um dia específico (pista fechada, treino extra, cancelamento),
          use <a href="/admin/collections/treinos">Treinos e exceções</a>.
        </p>
        {dados.foraDoEditor.total > 0 && (
          <p className={s.dica}>
            {plural(dados.foraDoEditor.total, 'horário arquivado ou vencido não aparece', 'horários arquivados ou vencidos não aparecem')}{' '}
            aqui; {dados.foraDoEditor.total === 1 ? 'ele continua' : 'eles continuam'} em{' '}
            <a href="/admin/collections/horarios-treino">Grade semanal de treinos</a>.
          </p>
        )}
      </header>

      <div className={s.colunas}>
        <div className={s.colunaEditor}>
          <RefazerComIA
            linhas={linhas}
            tipos={dados.tipos}
            categorias={dados.categorias}
            desligado={salvando}
            aplicarProposta={aplicarProposta}
            onDesfazer={desfazer}
          />

          <section className={s.semana} aria-labelledby="editar-titulo">
            <h2 id="editar-titulo" className={s.subtitulo}>
              Editar à mão
            </h2>
            {!dados.tipos.length && (
              <p className={`${s.aviso} ${s.avisoErro}`}>
                Nenhuma turma cadastrada. Cadastre pelo menos uma em <a href="/admin/collections/tipos-treino">Tipos de treino</a> antes de
                montar a grade.
              </p>
            )}
            <div className={s.abas} role="tablist" aria-label="Dia da semana" onKeyDown={teclaNasAbas}>
              {DIAS_EDITOR.map((d) => {
                const doDiaAba = linhas.filter((l) => l.diaSemana === d.chave)
                const comProblema = doDiaAba.some((l) => erros.has(l.chave))
                const mudou = doDiaAba.some((l) => alteracoes.mudaram.has(l.chave)) || alteracoes.excluir.some((l) => l.diaSemana === d.chave)
                const ativo = d.chave === dia
                return (
                  <button
                    key={d.chave}
                    id={`aba-${d.chave}`}
                    type="button"
                    role="tab"
                    aria-selected={ativo}
                    aria-controls="painel-dia"
                    tabIndex={ativo ? 0 : -1}
                    className={s.aba}
                    data-problema={comProblema ? 'sim' : undefined}
                    onClick={() => setDia(d.chave)}
                  >
                    <span aria-hidden="true">{d.curto}</span>
                    <span className={s.visualmenteOculto}>{d.nome}</span>
                    <span className={s.contagem}>
                      {doDiaAba.length}
                      <span className={s.visualmenteOculto}> {doDiaAba.length === 1 ? 'horário' : 'horários'}</span>
                    </span>
                    {mudou && (
                      <span className={s.pontoMudou} title="Com alterações não salvas">
                        <span className={s.visualmenteOculto}>, com alterações não salvas</span>
                      </span>
                    )}
                    {comProblema && (
                      <span className={s.marcaProblema} aria-hidden="true">
                        !
                      </span>
                    )}
                    {comProblema && <span className={s.visualmenteOculto}>, com problema para corrigir</span>}
                  </button>
                )
              })}
            </div>

            <div id="painel-dia" role="tabpanel" aria-labelledby={`aba-${dia}`} className={s.painelDia}>
              <div className={s.painelCabeca}>
                <h3 className={s.nomeDia}>{nomeDia}</h3>
                {foraDeOrdem(doDia) && (
                  <button type="button" className={s.botaoMiudo} onClick={() => trocarLinhas(ordenarLinhas(linhasRef.current))}>
                    Pôr em ordem de horário
                  </button>
                )}
              </div>

              {doDia.length ? (
                <ol className={s.lista}>
                  {doDia.map((l, i) => (
                    <LinhaHorario
                      key={l.chave}
                      linha={l}
                      numero={i + 1}
                      tipos={dados.tipos}
                      categorias={dados.categorias}
                      erros={erros.get(l.chave)}
                      estado={alteracoes.criar.includes(l) ? 'novo' : alteracoes.mudaram.has(l.chave) ? 'alterado' : null}
                      onMudar={mudarLinha}
                      onDuplicar={duplicar}
                      onApagar={apagar}
                    />
                  ))}
                </ol>
              ) : (
                <p className={s.vazio}>Sem treino na {nomeDia.toLowerCase()}. Adicione um horário ou copie outro dia para cá.</p>
              )}

              <div className={s.acoesDia}>
                <button
                  id={`adicionar-${dia}`}
                  type="button"
                  className={s.botaoSecundario}
                  onClick={() => adicionar(dia)}
                  disabled={!dados.tipos.length}
                >
                  + Adicionar horário em {nomeDia}
                </button>
                <details className={s.copiar}>
                  <summary>Copiar {nomeDia.toLowerCase()} para outro dia</summary>
                  <div className={s.caixaCopiar}>
                    <div className={s.campo}>
                      <label htmlFor="copiar-para">Copiar para</label>
                      <select id="copiar-para" value={copiaPara} onChange={(e) => setCopiaPara(e.target.value as DiaSemana | '')}>
                        <option value="">Escolha o dia…</option>
                        {DIAS_EDITOR.filter((d) => d.chave !== dia).map((d) => (
                          <option key={d.chave} value={d.chave}>
                            {d.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className={s.marcar}>
                      <input type="checkbox" checked={substituir} onChange={(e) => setSubstituir(e.target.checked)} />
                      Trocar os horários que já existem no outro dia (sem marcar, os copiados são somados)
                    </label>
                    <button type="button" className={s.botaoSecundario} onClick={copiar} disabled={!copiaPara || !doDia.length}>
                      Copiar {plural(doDia.length, 'horário', 'horários')}
                    </button>
                  </div>
                </details>
              </div>
            </div>
          </section>
        </div>

        <section id="previa-grade" className={s.previa} aria-labelledby="previa-titulo" tabIndex={-1}>
          <h2 id="previa-titulo" className={s.subtitulo}>
            Pré-visualização
          </h2>
          <p className={s.dica}>
            Como a grade aparece no site (aba Kartódromo){pendente ? ', já com as alterações ainda não salvas' : ''}. Só entram os horários
            marcados “Aparece no site”.
          </p>
          <div className={p.palco} style={marca as CSSProperties}>
            {temHorarios ? (
              <GradeTreinos dias={quadro.dias} categorias={quadro.categorias} legenda={quadro.legenda} />
            ) : (
              <p className={p.vazio}>A grade de treinos será publicada em breve.</p>
            )}
          </div>
        </section>
      </div>

      <div className={s.barra} role="region" aria-label="Salvar a grade">
        <div className={s.barraTexto}>
          <p className={s.contador}>
            {pendente
              ? `${plural(alteracoes.total, 'alteração não salva', 'alterações não salvas')}` +
                ` (${[
                  alteracoes.criar.length && plural(alteracoes.criar.length, 'novo', 'novos'),
                  alteracoes.alterar.length && plural(alteracoes.alterar.length, 'alterado', 'alterados'),
                  alteracoes.excluir.length && plural(alteracoes.excluir.length, 'apagado', 'apagados'),
                ]
                  .filter(Boolean)
                  .join(', ')})`
              : 'Nenhuma alteração: o editor mostra a grade que está no site.'}
          </p>
          {erros.size > 0 && (
            <p className={s.problemas}>
              {plural(erros.size, 'horário precisa', 'horários precisam')} de ajuste antes de salvar.{' '}
              <button type="button" className={s.botaoLink} onClick={irParaProblema}>
                Ver o primeiro
              </button>
            </p>
          )}
          <div aria-live="polite">
            {aviso && (
              <p className={`${s.aviso} ${aviso.tipo === 'erro' ? s.avisoErro : aviso.tipo === 'ok' ? s.avisoOk : ''}`}>{aviso.texto}</p>
            )}
            {errosGerais.length > 0 && (
              <ul className={s.erros}>
                {errosGerais.map((e, i) => (
                  <li key={i}>{e.mensagem}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className={s.barraBotoes}>
          <a href="#previa-grade" className={`${s.botaoSecundario} ${s.soCelular}`}>
            Ver pré-visualização
          </a>
          <button type="button" className={s.botaoSecundario} onClick={desfazer} disabled={!historico.length || salvando}>
            Desfazer
          </button>
          <button type="button" className={s.botaoSecundario} onClick={descartar} disabled={!pendente || salvando}>
            Descartar alterações
          </button>
          <button type="button" className={s.botaoPrincipal} onClick={salvar} disabled={!pendente || salvando} aria-disabled={erros.size > 0 || undefined}>
            {salvando ? 'Salvando…' : 'Salvar e publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
