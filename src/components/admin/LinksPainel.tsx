'use client'

import { useAuth } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { ehEditorOuAdmin } from '@/access'
import s from './editor/LinksPainel.module.css'

const LINKS = [
  { href: '/admin/editor', icone: '✎', rotulo: 'Editar o site' },
  { href: '/admin/grade-treinos', icone: '▦', rotulo: 'Grade de treinos' },
  { href: '/admin/assistente', icone: '✦', rotulo: 'Assistente com IA' },
]

/** Atalhos fixos no topo do menu lateral do painel (só moderador e administrador usam essas páginas). */
export function LinksPainel() {
  const atual = usePathname()
  const { user } = useAuth()
  if (!ehEditorOuAdmin(user)) return null
  return (
    <div className={s.links}>
      {LINKS.map((l) => {
        const ativo = atual === l.href || atual?.startsWith(`${l.href}/`)
        return (
          <a key={l.href} href={l.href} className={ativo ? `${s.link} ${s.ativo}` : s.link} aria-current={ativo ? 'page' : undefined}>
            <span className={s.icone} aria-hidden="true">
              {l.icone}
            </span>
            {l.rotulo}
          </a>
        )
      })}
    </div>
  )
}
