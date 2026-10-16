'use client'

import { useEffect, useState } from 'react'
import { buscarPendentes } from './chamadas'
import d from './Destaques.module.css'

/** Faixa do painel inicial: alterações salvas que ainda não foram publicadas no site. */
export function AvisoPendentes() {
  const [total, setTotal] = useState(0)
  useEffect(() => {
    let vivo = true
    buscarPendentes()
      .then((lista) => vivo && setTotal(lista.length))
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [])

  if (!total) return null
  return (
    <div className={d.aviso} role="status">
      <p>
        <strong>{total === 1 ? '1 alteração esperando publicação.' : `${total} alterações esperando publicação.`}</strong> Já estão salvas, mas ainda não aparecem no site.
      </p>
      <a href="/admin/editor?aba=pendentes">Revisar e publicar →</a>
    </div>
  )
}
