import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import { ehEditorOuAdmin } from '@/access'
import { carregarDadosGrade } from '@/collections/kartodromo/endpoints'
import { variaveisDeCor } from '@/lib/site'
import type { Configuracoe } from '@/payload-types'
import { EditorGrade } from './EditorGrade'

/** Página /admin/grade-treinos ("Grade de treinos"), dentro do layout do painel (menu lateral). */
export async function VisaoGrade({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  if (!req.user) redirect('/admin/login')

  let conteudo: React.ReactNode
  if (!ehEditorOuAdmin(req.user)) {
    conteudo = <p style={{ margin: '40px 0' }}>Esta página é só para moderadores e administradores.</p>
  } else {
    const [dados, config] = await Promise.all([
      carregarDadosGrade(req),
      req.payload
        .findGlobal({ slug: 'configuracoes', depth: 0, overrideAccess: false, req })
        .catch(() => null) as Promise<Configuracoe | null>,
    ])
    conteudo = (
      <EditorGrade
        inicial={dados}
        marca={variaveisDeCor(config)}
      />
    )
  }

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
      <Gutter>{conteudo}</Gutter>
    </DefaultTemplate>
  )
}
