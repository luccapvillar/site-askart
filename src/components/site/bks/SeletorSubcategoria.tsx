'use client'

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { GrupoOpcoes, OpcaoSubcategoria } from './programacao'
import s from './SeletorSubcategoria.module.css'

/**
 * Seletor "Escolha a subcategoria" (calendário do BKS e página da etapa). Os horários de cada subcategoria já
 * vêm prontos no HTML do servidor (escondidos, com data-escolha); aqui só se mostra o da escolha e se esconde o
 * resto — nenhum dado é buscado. Sem JavaScript o seletor não aparece e a programação fica agrupada por
 * categoria, como sempre.
 *
 * A escolha fica no endereço (#subcategoria=f400-novatos, para mandar a alguém) e neste aparelho
 * (localStorage), e volta ao abrir a página de novo.
 */

const GUARDADAS = 'askart:subcategorias'
const PREFIXO_HASH = 'subcategoria='

/** Escolha que está no endereço (#subcategoria=…), ou null. */
export function escolhaDoEndereco(hash: string): string | null {
  const h = hash.replace(/^#/, '')
  if (!h.startsWith(PREFIXO_HASH)) return null
  try {
    return decodeURIComponent(h.slice(PREFIXO_HASH.length))
  } catch {
    return null
  }
}

/** Últimas escolhas feitas neste aparelho (a mais recente primeiro). Sem acesso ao armazenamento: nenhuma. */
function lerGuardadas(): string[] {
  try {
    const lista: unknown = JSON.parse(window.localStorage.getItem(GUARDADAS) ?? '[]')
    return Array.isArray(lista) ? lista.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

/**
 * Guarda a escolha como a mais recente. "Todas" tira as escolhas desta página (as de outra área, como a do
 * kart indoor, continuam guardadas para quando a pessoa voltar lá).
 */
function guardar(valor: string, daPagina: Map<string, OpcaoSubcategoria>) {
  try {
    const antes = lerGuardadas()
    const lista = valor ? [valor, ...antes.filter((v) => v !== valor)] : antes.filter((v) => !daPagina.has(v))
    window.localStorage.setItem(GUARDADAS, JSON.stringify(lista.slice(0, 8)))
  } catch {
    // Navegação privada ou armazenamento bloqueado: a escolha só não fica lembrada
  }
}

/** Põe a escolha no endereço sem recarregar nem criar um passo novo no "voltar". */
function atualizarEndereco(valor: string) {
  try {
    if (!valor && escolhaDoEndereco(window.location.hash) === null) return
    const url = new URL(window.location.href)
    url.hash = valor ? `${PREFIXO_HASH}${encodeURIComponent(valor)}` : ''
    window.history.replaceState(null, '', url)
  } catch {
    // Sem acesso ao histórico: a escolha continua valendo na página
  }
}

/** Texto para a programação que não tem horários da escolha. */
export function mensagemSemHorarios(escolha: OpcaoSubcategoria, categoriasDaEtapa: string[] | null): string {
  if (categoriasDaEtapa && !categoriasDaEtapa.includes(escolha.chaveCategoria)) return `A categoria ${escolha.categoria} não corre nesta etapa.`
  return escolha.ehSubcategoria ? 'Horários desta subcategoria ainda não divulgados.' : 'Horários desta categoria ainda não divulgados.'
}

/**
 * Mostra, dentro de `raiz`, só os horários da escolha (null = tudo, agrupado como veio do servidor):
 * - [data-programacao]: a programação de uma etapa; [data-visao="geral"] é a lista agrupada e cada
 *   [data-escolha] a lista de uma subcategoria; [data-aviso] recebe a mensagem quando não há horários;
 * - [data-programacao-modalidade]: bloco de uma modalidade (página da etapa), escondido quando a escolha é
 *   de outra modalidade.
 */
export function aplicarEscolha(raiz: ParentNode, escolha: OpcaoSubcategoria | null) {
  raiz.querySelectorAll<HTMLElement>('[data-programacao-modalidade]').forEach((bloco) => {
    bloco.hidden = escolha !== null && bloco.dataset.programacaoModalidade !== escolha.modalidade
  })
  raiz.querySelectorAll<HTMLElement>('[data-programacao]').forEach((prog) => {
    let achou = false
    prog.querySelectorAll<HTMLElement>('[data-escolha]').forEach((lista) => {
      const mostrar = escolha !== null && lista.dataset.escolha === escolha.valor
      lista.hidden = !mostrar
      achou ||= mostrar
    })
    prog.querySelectorAll<HTMLElement>('[data-visao="geral"]').forEach((geral) => {
      geral.hidden = escolha !== null
    })
    const aviso = prog.querySelector<HTMLElement>('[data-aviso]')
    if (!aviso) return
    aviso.hidden = escolha === null || achou
    if (escolha && !achou) {
      const categorias = prog.dataset.categorias
      aviso.textContent = mensagemSemHorarios(escolha, categorias === undefined ? null : categorias.split(' ').filter(Boolean))
    }
  })
}

export function SeletorSubcategoria({
  alvo,
  grupos,
  ajuda,
}: {
  /** id do elemento com as programações que o seletor controla. */
  alvo: string
  grupos: GrupoOpcoes[]
  /** Explicação curta abaixo do campo. */
  ajuda: string
}) {
  const id = useId()
  const campo = useRef<HTMLSelectElement>(null)
  const [anuncio, setAnuncio] = useState('')
  const opcoes = useMemo(() => new Map(grupos.flatMap((g) => g.opcoes).map((o) => [o.valor, o] as const)), [grupos])

  // Ao abrir: a escolha do endereço; senão, a feita antes de a página terminar de carregar ou a última
  // guardada neste aparelho. Mudar o endereço à mão (#subcategoria=…) também troca a escolha.
  useEffect(() => {
    const select = campo.current
    if (!select) return
    const mostrar = (valor: string) => {
      select.value = opcoes.has(valor) ? valor : ''
      const raiz = document.getElementById(alvo)
      if (raiz) aplicarEscolha(raiz, opcoes.get(select.value) ?? null)
    }
    mostrar([escolhaDoEndereco(window.location.hash), select.value, ...lerGuardadas()].find((v) => v && opcoes.has(v)) ?? '')
    const aoMudarEndereco = () => {
      const valor = escolhaDoEndereco(window.location.hash)
      if (valor !== null) mostrar(valor)
    }
    window.addEventListener('hashchange', aoMudarEndereco)
    return () => window.removeEventListener('hashchange', aoMudarEndereco)
  }, [alvo, opcoes])

  const aoEscolher = (e: ChangeEvent<HTMLSelectElement>) => {
    const valor = e.target.value
    const escolha = opcoes.get(valor) ?? null
    const raiz = document.getElementById(alvo)
    if (raiz) aplicarEscolha(raiz, escolha)
    guardar(valor, opcoes)
    atualizarEndereco(valor)
    setAnuncio(`Mostrando os horários de ${escolha ? escolha.rotulo : 'todas as categorias'}`)
  }

  return (
    <div className={s.seletor}>
      <label htmlFor={id} className={s.rotulo}>
        Escolha a subcategoria
      </label>
      <span className={s.campo}>
        <select id={id} ref={campo} className={s.select} defaultValue="" onChange={aoEscolher} aria-describedby={`${id}-ajuda`}>
          <option value="">Todas as categorias</option>
          {grupos.map((g) =>
            g.opcoes.length === 1 && !g.opcoes[0].ehSubcategoria ? (
              <option key={g.chaveCategoria} value={g.opcoes[0].valor}>
                {g.opcoes[0].rotulo}
              </option>
            ) : (
              <optgroup key={g.chaveCategoria} label={g.categoria}>
                {g.opcoes.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </optgroup>
            ),
          )}
        </select>
      </span>
      <p id={`${id}-ajuda`} className={s.ajuda}>
        {ajuda}
      </p>
      <p role="status" className="visualmente-oculto">
        {anuncio}
      </p>
    </div>
  )
}
