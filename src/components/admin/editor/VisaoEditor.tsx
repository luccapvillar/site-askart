import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import { ehEditorOuAdmin } from '@/access'
import { EditorSite, type Aba } from './EditorSite'
import { limparCaminho } from './paginas'

const ABAS: Aba[] = ['ia', 'mao', 'pendentes']
const umValor = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Página /admin/editor ("Editar o site"), dentro do layout do painel (menu lateral). Aceita ?caminho=/bks e ?aba=pendentes. */
export function VisaoEditor({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  if (!req.user) redirect('/admin/login')

  const caminho = limparCaminho(umValor(searchParams?.caminho)) ?? '/'
  const aba = umValor(searchParams?.aba) as Aba | undefined

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        {ehEditorOuAdmin(req.user) ? (
          <EditorSite rotaInicial={caminho} abaInicial={aba && ABAS.includes(aba) ? aba : 'ia'} />
        ) : (
          <p style={{ margin: '40px 0' }}>Esta página é só para moderadores e administradores.</p>
        )}
      </Gutter>
    </DefaultTemplate>
  )
}
