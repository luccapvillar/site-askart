'use client'

import { memo } from 'react'
import { duracaoTexto } from '@/lib/agenda'
import { HORARIOS_FIM, HORARIOS_INICIO, textoValidade, type LinhaGrade, type OpcaoCategoria, type OpcaoTipo } from './modelo'
import s from './EditorGrade.module.css'

// Criadas uma vez: 288 opções em cada seletor de horário
const OPCOES_INICIO = HORARIOS_INICIO.map((h) => (
  <option key={h} value={h}>
    {h}
  </option>
))
const OPCOES_FIM = HORARIOS_FIM.map((h) => (
  <option key={h} value={h}>
    {h === '24:00' ? '24:00 (meia-noite)' : h}
  </option>
))

type Props = {
  linha: LinhaGrade
  numero: number
  tipos: OpcaoTipo[]
  categorias: OpcaoCategoria[]
  erros: string[] | undefined
  estado: 'novo' | 'alterado' | null
  onMudar: (chave: string, mudanca: Partial<LinhaGrade>, campo: string) => void
  onDuplicar: (chave: string) => void
  onApagar: (chave: string) => void
}

/** Um horário da grade no editor: início, fim, turma, categorias, observação e opções. */
export const LinhaHorario = memo(function LinhaHorario({
  linha: l,
  numero,
  tipos,
  categorias,
  erros,
  estado,
  onMudar,
  onDuplicar,
  onApagar,
}: Props) {
  const id = (campo: string) => `${l.chave}-${campo}`
  const descricaoErros = erros?.length ? id('erros') : undefined
  const marcadas = categorias.filter((c) => l.categorias.some((x) => String(x) === String(c.id)))
  const resumoCategorias = l.categorias.length
    ? marcadas.map((c) => c.sigla || c.nome).join(', ') || `${l.categorias.length} marcada(s)`
    : 'Todas'
  const duracao = duracaoTexto(l.horaInicio, l.horaFim)
  const validade = textoValidade(l)
  const tipoExiste = l.tipo === null || tipos.some((t) => String(t.id) === String(l.tipo))
  const mudar = (campo: keyof LinhaGrade, valor: LinhaGrade[keyof LinhaGrade]) => onMudar(l.chave, { [campo]: valor }, campo)

  function marcarCategoria(catId: OpcaoCategoria['id'], marcada: boolean) {
    const atuais = l.categorias.filter((x) => String(x) !== String(catId))
    // Mantém a ordem da lista de categorias (o título do horário segue essa ordem)
    const novas = marcada
      ? categorias.filter((c) => atuais.some((x) => String(x) === String(c.id)) || String(c.id) === String(catId)).map((c) => c.id)
      : atuais
    onMudar(l.chave, { categorias: novas }, 'categorias')
  }

  return (
    <li className={s.linha} data-estado={estado ?? undefined} data-oculto={l.visivel ? undefined : 'sim'} data-erro={erros?.length ? 'sim' : undefined}>
      <fieldset className={s.conjunto}>
        <legend className={s.legenda}>
          <span className={s.numero}>Horário {numero}</span>
          {estado === 'novo' && <span className={`${s.selo} ${s.seloNovo}`}>Novo</span>}
          {estado === 'alterado' && <span className={`${s.selo} ${s.seloAlterado}`}>Alterado</span>}
          {!l.visivel && <span className={`${s.selo} ${s.seloOculto}`}>Fora do site</span>}
          {validade && <span className={s.validade}>{validade}</span>}
        </legend>

        <div className={s.campos}>
          <div className={s.campo}>
            <label htmlFor={id('inicio')}>Início</label>
            <select
              id={id('inicio')}
              value={HORARIOS_INICIO.includes(l.horaInicio) ? l.horaInicio : ''}
              onChange={(e) => mudar('horaInicio', e.target.value)}
              aria-invalid={erros?.length ? true : undefined}
              aria-describedby={descricaoErros}
            >
              <option value="">--:--</option>
              {OPCOES_INICIO}
            </select>
          </div>
          <div className={s.campo}>
            <label htmlFor={id('fim')}>Término</label>
            <select
              id={id('fim')}
              value={HORARIOS_FIM.includes(l.horaFim) ? l.horaFim : ''}
              onChange={(e) => mudar('horaFim', e.target.value)}
              aria-describedby={descricaoErros}
            >
              <option value="">--:--</option>
              {OPCOES_FIM}
            </select>
          </div>
          <div className={`${s.campo} ${s.campoTurma}`}>
            <label htmlFor={id('tipo')}>Turma (tipo de treino)</label>
            <select
              id={id('tipo')}
              value={l.tipo === null || !tipoExiste ? '' : String(l.tipo)}
              onChange={(e) => {
                const escolhido = tipos.find((t) => String(t.id) === e.target.value)
                mudar('tipo', escolhido ? escolhido.id : null)
              }}
              aria-describedby={descricaoErros}
            >
              <option value="">Escolha a turma…</option>
              {tipos.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          {duracao && (
            <p className={s.duracao}>
              <span className={s.rotuloMiudo}>Duração</span> {duracao}
            </p>
          )}
        </div>

        <div className={s.campos}>
          <details className={s.categorias}>
            <summary>
              Categorias: <strong>{resumoCategorias}</strong>
            </summary>
            <div className={s.caixaCategorias}>
              <p className={s.dica}>Nenhuma marcada = vale para todas as categorias.</p>
              {categorias.length ? (
                <ul className={s.listaCategorias}>
                  {categorias.map((c) => {
                    const marcada = l.categorias.some((x) => String(x) === String(c.id))
                    return (
                      <li key={String(c.id)}>
                        <label className={s.marcar}>
                          <input type="checkbox" checked={marcada} onChange={(e) => marcarCategoria(c.id, e.target.checked)} />
                          {c.nome}
                          {!c.publica && <span className={s.dica}> (oculta no site)</span>}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className={s.dica}>Nenhuma categoria cadastrada.</p>
              )}
            </div>
          </details>
          <div className={`${s.campo} ${s.campoObs}`}>
            <label htmlFor={id('obs')}>Observação (opcional)</label>
            <input
              id={id('obs')}
              type="text"
              maxLength={300}
              value={l.observacao}
              placeholder="Ex.: Traga o transponder"
              onChange={(e) => mudar('observacao', e.target.value)}
              aria-describedby={descricaoErros}
            />
          </div>
        </div>

        <div className={s.rodapeLinha}>
          <label className={s.marcar}>
            <input type="checkbox" checked={l.visivel} onChange={(e) => mudar('visivel', e.target.checked)} />
            Aparece no site
          </label>
          <details className={s.mais}>
            <summary>Mais opções</summary>
            <div className={s.caixaMais}>
              <div className={s.campo}>
                <label htmlFor={id('de')}>Válido a partir de</label>
                <input id={id('de')} type="date" value={l.validoDe ?? ''} onChange={(e) => mudar('validoDe', e.target.value || null)} />
              </div>
              <div className={s.campo}>
                <label htmlFor={id('ate')}>Válido até (o último dia conta)</label>
                <input id={id('ate')} type="date" value={l.validoAte ?? ''} onChange={(e) => mudar('validoAte', e.target.value || null)} />
              </div>
              <p className={s.dica}>Vazio = vale sempre. Para mudar a grade a partir de uma data, preencha “Válido até” aqui e crie outro horário com “Válido a partir de”.</p>
              <label className={s.marcar}>
                <input
                  type="checkbox"
                  checked={l.permitirSobreposicao}
                  onChange={(e) => mudar('permitirSobreposicao', e.target.checked)}
                />
                Permitir coincidir com outro horário (só se for de propósito)
              </label>
            </div>
          </details>
          <div className={s.botoesLinha}>
            <button type="button" className={s.botaoMiudo} onClick={() => onDuplicar(l.chave)}>
              Duplicar
            </button>
            {l.vinculos > 0 ? (
              l.visivel && (
                <button
                  type="button"
                  className={s.botaoMiudo}
                  onClick={() => mudar('visivel', false)}
                  title='Tem alterações em "Treinos e exceções": não pode ser apagado, mas pode sair do site.'
                >
                  Tirar do site
                </button>
              )
            ) : (
              <button type="button" className={`${s.botaoMiudo} ${s.botaoPerigo}`} onClick={() => onApagar(l.chave)}>
                Apagar
              </button>
            )}
          </div>
        </div>
        {l.vinculos > 0 && (
          <p className={s.dica}>
            Este horário tem {l.vinculos} alteração(ões) registradas em “Treinos e exceções”, por isso não pode ser apagado — só
            sair do site.
          </p>
        )}

        {erros?.length ? (
          <ul id={id('erros')} className={s.erros}>
            {erros.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}
      </fieldset>
    </li>
  )
})
