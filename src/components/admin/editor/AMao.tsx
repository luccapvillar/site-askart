'use client'

import { useEffect, useState } from 'react'
import { ALVOS_PREVIA, ROTAS_SITE, rotaDoDoc, urlAdmin, type AlvoPrevia } from '@/lib/previa/alvos'
import { nomeDaRota, semBusca } from './paginas'
import e from './Editor.module.css'

type Modelo = { alvo: AlvoPrevia; campo: 'id' | 'slug'; padrao: RegExp }
type DocDaPagina = { alvo: AlvoPrevia; id: number | string; titulo: string }

// Páginas de um item só (/etapas/12, /noticias/nome): o mesmo desenho de endereço que o site usa
const MODELOS: Modelo[] = ALVOS_PREVIA.filter((a) => a.tipo === 'colecao').flatMap((alvo) => {
  const modelo = rotaDoDoc(alvo.slug, { id: '__ID__', slug: '__SLUG__' })
  if (!modelo || !/__(ID|SLUG)__/.test(modelo)) return []
  const campo = modelo.includes('__ID__') ? ('id' as const) : ('slug' as const)
  const padrao = new RegExp(`^${modelo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/__(ID|SLUG)__/, '([^/]+)')}$`)
  return [{ alvo, campo, padrao }]
})
const ROTAS_FIXAS = new Set([...ROTAS_SITE, ...ALVOS_PREVIA.flatMap((a) => a.rotas)])
const emTodas = (a: AlvoPrevia) => ROTAS_SITE.every((r) => a.rotas.includes(r))

const decodificar = (v: string) => {
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

function tituloDe(doc: Record<string, unknown>, alvo: AlvoPrevia) {
  for (const campo of ['titulo', 'nome', 'title', 'pergunta']) if (typeof doc[campo] === 'string' && (doc[campo] as string).trim()) return doc[campo] as string
  if (typeof doc.numero === 'number') return `${doc.numero}ª etapa`
  return alvo.rotulo
}

/** O item (etapa, notícia, aviso…) que a página aberta mostra, se for a página de um item só. */
function useDocDaPagina(rota: string) {
  const [achado, setAchado] = useState<{ rota: string; doc: DocDaPagina | null } | null>(null)
  useEffect(() => {
    const limpo = semBusca(rota)
    if (ROTAS_FIXAS.has(limpo)) return
    const candidatos = MODELOS.flatMap((m) => {
      const r = m.padrao.exec(limpo)
      return r ? [{ m, valor: decodificar(r[1]) }] : []
    })
    if (!candidatos.length) return
    const controle = new AbortController()
    void (async () => {
      for (const { m, valor } of candidatos) {
        try {
          const url =
            m.campo === 'id'
              ? `/api/${m.alvo.slug}/${encodeURIComponent(valor)}?depth=0&draft=true`
              : `/api/${m.alvo.slug}?where[slug][equals]=${encodeURIComponent(valor)}&depth=0&limit=1&draft=true`
          const r = await fetch(url, { credentials: 'include', signal: controle.signal })
          if (!r.ok) continue
          const dados = await r.json()
          const doc = (m.campo === 'id' ? dados : dados?.docs?.[0]) as Record<string, unknown> | undefined
          if (doc && (typeof doc.id === 'number' || typeof doc.id === 'string')) {
            setAchado({ rota, doc: { alvo: m.alvo, id: doc.id, titulo: tituloDe(doc, m.alvo) } })
            return
          }
        } catch {
          if (controle.signal.aborted) return
        }
      }
      setAchado({ rota, doc: null })
    })()
    return () => controle.abort()
  }, [rota])
  return achado?.rota === rota ? achado.doc : null
}

function LinkNovaAba({ href, children, primario }: { href: string; children: React.ReactNode; primario?: boolean }) {
  return (
    <a className={primario ? `${e.botao} ${e.primario}` : e.botao} href={href} target="_blank" rel="noopener noreferrer">
      {children} <span aria-hidden="true">↗</span>
      <span className={e.sr}> (abre em outra aba)</span>
    </a>
  )
}

function ItemAlvo({ alvo, aoVer }: { alvo: AlvoPrevia; aoVer?: () => void }) {
  const url = urlAdmin(alvo.tipo, alvo.slug)
  return (
    <li className={e.item}>
      <strong>{alvo.rotulo}</strong>
      <span className={e.acoesItem}>
        {aoVer && (
          <button type="button" className={e.botao} onClick={aoVer}>
            Ver
          </button>
        )}
        {alvo.tipo === 'global' ? (
          <LinkNovaAba href={url} primario>
            Editar
          </LinkNovaAba>
        ) : (
          <>
            <LinkNovaAba href={url}>Abrir a lista</LinkNovaAba>
            <LinkNovaAba href={`${url}/create`}>Novo</LinkNovaAba>
          </>
        )}
      </span>
    </li>
  )
}

/** Aba "À mão": o que aparece na página aberta e onde editar cada parte. */
export function AMao({ rota, aoIrPara }: { rota: string; aoIrPara: (rota: string) => void }) {
  const limpo = semBusca(rota)
  const doc = useDocDaPagina(rota)
  const comuns = ALVOS_PREVIA.filter(emTodas)
  const daPagina = ALVOS_PREVIA.filter((a) => a.rotas.includes(limpo) && !emTodas(a))
  const outros = ALVOS_PREVIA.filter((a) => !daPagina.includes(a) && !comuns.includes(a))

  return (
    <div className={e.mao}>
      <p className={e.dica}>
        “Editar” abre o formulário em outra aba. Lá, “Salvar rascunho” guarda sem publicar e “Publicar alterações” coloca no site. Ao voltar para esta aba, a cópia do site se atualiza
        sozinha.
      </p>

      <section aria-labelledby="mao-pagina">
        <h2 id="mao-pagina" className={e.subtitulo}>
          Nesta página: {nomeDaRota(rota)}
        </h2>
        {doc || daPagina.length ? (
          <ul className={e.lista}>
            {doc && (
              <li className={e.item}>
                <span>
                  <strong>{doc.titulo}</strong> <span className={e.etiqueta}>{doc.alvo.rotulo}</span>
                </span>
                <span className={e.acoesItem}>
                  <LinkNovaAba href={urlAdmin('colecao', doc.alvo.slug, doc.id)} primario>
                    Editar
                  </LinkNovaAba>
                </span>
              </li>
            )}
            {daPagina.map((a) => (
              <ItemAlvo key={`${a.tipo}-${a.slug}`} alvo={a} />
            ))}
          </ul>
        ) : (
          <p className={e.vazio}>Nada específico desta página. Veja as partes comuns abaixo ou escolha outra página no alto.</p>
        )}
      </section>

      <section aria-labelledby="mao-comuns">
        <h2 id="mao-comuns" className={e.subtitulo}>
          Partes comuns do site
        </h2>
        <ul className={e.lista}>
          {comuns.map((a) => (
            <ItemAlvo key={`${a.tipo}-${a.slug}`} alvo={a} />
          ))}
        </ul>
      </section>

      <details className={e.outros}>
        <summary>Outras partes do site</summary>
        <ul className={e.lista}>
          {outros.map((a) => (
            <ItemAlvo key={`${a.tipo}-${a.slug}`} alvo={a} aoVer={a.rotas[0] ? () => aoIrPara(a.rotas[0]) : undefined} />
          ))}
        </ul>
      </details>
    </div>
  )
}
