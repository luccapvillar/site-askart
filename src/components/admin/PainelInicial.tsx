import type { Payload, TypedUser } from 'payload'
import { formatarDataExtenso, formatarDataHora } from '@/lib/datas'
import { valorDaTaxa, VALOR_A_CONFIRMAR } from '@/lib/taxas'
import s from './PainelInicial.module.css'

type Props = { payload: Payload; user?: TypedUser | null }

type Pendencia = { texto: string; href: string; acao: string; grave?: boolean }

const ATALHOS = [
  { rotulo: '✦ Assistente com IA', href: '/admin/assistente', desc: 'Peça em texto: resultados, treinos, notícias' },
  { rotulo: 'Lançar resultado', href: '/admin/collections/corridas', desc: 'Corridas e resultados de cada etapa' },
  { rotulo: 'Nova notícia', href: '/admin/collections/noticias/create', desc: 'Notícia ou anúncio no site' },
  { rotulo: 'Novo comunicado', href: '/admin/collections/avisos/create', desc: 'Aviso oficial no topo do site' },
  { rotulo: 'Etapas e calendário', href: '/admin/collections/etapas', desc: 'Datas, local, mapa e IZY Pass' },
  { rotulo: 'Classificações', href: '/admin/collections/temporada-categorias', desc: 'Tabela de liderança por categoria' },
  { rotulo: 'Grade de treinos', href: '/admin/collections/horarios-treino', desc: 'Dias e horários de cada categoria' },
  { rotulo: 'Mudar um treino', href: '/admin/collections/treinos/create', desc: 'Horário extra, pista fechada, lotação' },
  { rotulo: 'Pilotos e inscrições', href: '/admin/collections/inscricoes', desc: 'Quem corre em cada categoria' },
  { rotulo: 'Kartódromo e taxas', href: '/admin/globals/kartodromo', desc: 'Taxas, como treinar, história' },
  { rotulo: 'Contatos', href: '/admin/globals/contato', desc: 'Telefone, WhatsApp, e-mail, Instagram' },
]

/** Tela inicial do painel: atalhos do moderador, próxima etapa e o que precisa de atenção. */
export async function PainelInicial({ payload, user }: Props) {
  const agora = new Date()
  const nome = (user as { nome?: string } | undefined)?.nome?.split(' ')[0] ?? ''
  const papel = (user as { papel?: string } | undefined)?.papel
  const rotuloPapel = papel === 'administrador' ? 'Administrador' : papel === 'editor' ? 'Moderador' : 'Colaborador'

  const [config, contato, kartodromo, etapasPassadas, proximas, rascunhos, naoPublicadas, atividades] = await Promise.all([
    payload.findGlobal({ slug: 'configuracoes', depth: 0 }),
    payload.findGlobal({ slug: 'contato', depth: 0 }),
    payload.findGlobal({ slug: 'kartodromo', depth: 0 }),
    payload.find({
      collection: 'etapas',
      where: { and: [{ inicio: { less_than: new Date(agora.getTime() - 12 * 3600e3).toISOString() } }, { status: { not_in: ['realizada', 'cancelada'] } }] },
      depth: 0,
      limit: 10,
      sort: 'inicio',
    }),
    payload.find({ collection: 'etapas', where: { and: [{ inicio: { greater_than_equal: agora.toISOString() } }, { status: { not_equals: 'cancelada' } }] }, depth: 0, limit: 1, sort: 'inicio' }),
    payload.count({ collection: 'corridas', where: { status: { equals: 'rascunho' }, 'etapa.inicio': { less_than: agora.toISOString() } } }),
    payload.count({ collection: 'temporada-categorias', where: { publicada: { not_equals: true } } }),
    payload.find({ collection: 'atividades', sort: '-createdAt', depth: 1, limit: 6 }),
  ])

  const pendencias: Pendencia[] = []
  for (const e of etapasPassadas.docs) {
    pendencias.push({
      texto: `${e.nome || `${e.numero}ª etapa`} (${e.inicio ? formatarDataExtenso(e.inicio) : 'sem data'}) já passou e não tem resultado oficial.`,
      href: '/admin/collections/corridas',
      acao: 'Lançar resultado',
      grave: true,
    })
  }
  if (rascunhos.totalDocs > 0) {
    pendencias.push({ texto: `${rascunhos.totalDocs} corrida(s) de etapas que já passaram ainda estão em rascunho (não contam pontos).`, href: '/admin/collections/corridas?where[status][equals]=rascunho', acao: 'Revisar', grave: true })
  }
  if (naoPublicadas.totalDocs > 0) {
    pendencias.push({ texto: `${naoPublicadas.totalDocs} classificação(ões) não publicada(s): não aparecem no site.`, href: '/admin/collections/temporada-categorias', acao: 'Publicar' })
  }
  if ((contato.canais ?? []).some((c) => c.provisorio)) {
    pendencias.push({ texto: 'O contato provisório +55 61 00000-0000 está no ar. Troque pelo telefone/WhatsApp oficial.', href: '/admin/globals/contato', acao: 'Atualizar contato', grave: true })
  }
  if (!(contato.canais ?? []).some((c) => c.tipo === 'email')) {
    pendencias.push({ texto: 'Nenhum e-mail de contato cadastrado.', href: '/admin/globals/contato', acao: 'Cadastrar' })
  }
  if ((kartodromo.taxas ?? []).some((t) => valorDaTaxa(t) === VALOR_A_CONFIRMAR)) {
    pendencias.push({ texto: `Taxas com valor a confirmar (aparecem como "${VALOR_A_CONFIRMAR}" no site).`, href: '/admin/globals/kartodromo', acao: 'Informar valores' })
  }
  if (!config.izyPass) {
    pendencias.push({ texto: 'Link da IZY Pass não cadastrado: o botão de compra mostra "link em breve".', href: '/admin/globals/configuracoes', acao: 'Cadastrar link' })
  }
  if (config.faixaDemonstracao) {
    pendencias.push({ texto: 'A faixa "Versão de demonstração" está ligada. Desligue antes de divulgar o site.', href: '/admin/globals/configuracoes', acao: 'Configurações' })
  }

  const proxima = proximas.docs[0]
  const dias = proxima?.inicio ? Math.ceil((new Date(proxima.inicio).getTime() - agora.getTime()) / 86400e3) : null

  return (
    <div className={s.painel}>
      <header className={s.cabeca}>
        <div>
          <p className={s.rotulo}>{rotuloPapel}</p>
          <h1 className={s.titulo}>{nome ? `Olá, ${nome}` : 'Painel da ASKART'}</h1>
          <p className={s.sub}>Tudo o que aparece no site é atualizado por aqui. As mudanças entram no ar assim que você salva ou publica.</p>
        </div>
        <a className={s.verSite} href="/" target="_blank" rel="noopener noreferrer">
          Ver o site ↗
        </a>
      </header>

      <div className={s.grade}>
        <section className={s.cartao} aria-labelledby="proxima">
          <h2 id="proxima" className={s.rotulo}>
            Próxima etapa
          </h2>
          {proxima ? (
            <>
              <p className={s.destaque}>{proxima.nome || `${proxima.numero}ª etapa`}</p>
              <p>{proxima.inicio ? formatarDataExtenso(proxima.inicio) : 'Data a definir'}</p>
              {dias !== null && <p className={s.dias}>{dias <= 0 ? 'É hoje' : dias === 1 ? 'Amanhã' : `Faltam ${dias} dias`}</p>}
              <a href={`/admin/collections/etapas/${proxima.id}`}>Editar etapa →</a>
            </>
          ) : (
            <p>Nenhuma etapa futura cadastrada.</p>
          )}
        </section>

        <section className={`${s.cartao} ${s.largo}`} aria-labelledby="pendencias">
          <h2 id="pendencias" className={s.rotulo}>
            Precisa de atenção {pendencias.length ? `(${pendencias.length})` : ''}
          </h2>
          {pendencias.length ? (
            <ul className={s.pendencias}>
              {pendencias.map((p, i) => (
                <li key={i} className={p.grave ? s.grave : undefined}>
                  <span>{p.texto}</span>
                  <a href={p.href}>{p.acao} →</a>
                </li>
              ))}
            </ul>
          ) : (
            <p>Tudo em dia.</p>
          )}
        </section>
      </div>

      <section aria-labelledby="atalhos">
        <h2 id="atalhos" className={s.rotulo}>
          Atalhos
        </h2>
        <ul className={s.atalhos}>
          {ATALHOS.map((a) => (
            <li key={a.href}>
              <a href={a.href}>
                <strong>{a.rotulo}</strong>
                <span>{a.desc}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {atividades.docs.length > 0 && (
        <section aria-labelledby="atividades" className={s.cartao}>
          <h2 id="atividades" className={s.rotulo}>
            Últimas alterações
          </h2>
          <ul className={s.atividades}>
            {atividades.docs.map((a) => (
              <li key={a.id}>
                <span className={s.quando}>{formatarDataHora(a.createdAt)}</span>
                <span>
                  <strong>{(a.usuario as { nome?: string } | null)?.nome ?? 'Sistema'}</strong> {a.acao} em {a.onde}: {a.resumo}
                </span>
              </li>
            ))}
          </ul>
          <a href="/admin/collections/atividades">Ver tudo →</a>
        </section>
      )}
    </div>
  )
}
