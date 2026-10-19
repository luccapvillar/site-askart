/**
 * Navegação da aba BKS, logo abaixo do topo com a logo (componente de servidor: nenhum JavaScript vai
 * para o visitante; cada página diz onde está).
 *
 * 1. A divisão pedida pelo cliente, bem à vista: "Karts profissionais | Karts indoor", como duas abas
 *    grandes presas ao topo escuro. A área atual fica branca, ligada ao conteúdo, e tem aria-current.
 * 2. As seções, numa barra fixa sob o cabeçalho: Calendário, Classificação e Resultados são de cada área
 *    (/bks/… ou /bks/indoor/…); História, Fotos e Regulamento são do BKS como um todo.
 */
import Link from 'next/link'
import { caminhoDaArea, MODALIDADES, ROTULO_MODALIDADE, type Modalidade, type SecaoArea } from '@/lib/site'
import s from './Bks.module.css'

export type SecaoBks = SecaoArea | 'historia' | 'fotos' | 'regulamento'

const SECOES_DA_AREA: { secao: SecaoArea; rotulo: string }[] = [
  { secao: 'calendario', rotulo: 'Calendário' },
  { secao: 'classificacao', rotulo: 'Classificação' },
  { secao: 'resultados', rotulo: 'Resultados' },
]

const SECOES_GERAIS: { secao: Exclude<SecaoBks, SecaoArea>; rotulo: string; href: string }[] = [
  { secao: 'historia', rotulo: 'História', href: '/bks/historia' },
  { secao: 'fotos', rotulo: 'Fotos', href: '/bks/fotos' },
  { secao: 'regulamento', rotulo: 'Regulamento', href: '/bks/regulamento' },
]

const ehDaArea = (secao: SecaoBks): secao is SecaoArea => secao === 'calendario' || secao === 'classificacao' || secao === 'resultados'

/** Ícones simples das duas áreas (decorativos: o nome vem escrito). */
function IconeArea({ area }: { area: Modalidade }) {
  return (
    <svg className={s.areaIcone} aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {area === 'profissional' ? (
        <>
          {/* pista ao ar livre */}
          <path d="M4 17c0-6 3-10 8-10s8 4 8 10" />
          <path d="M8 17c0-3.5 1.6-6 4-6s4 2.5 4 6" />
          <path d="M3 20h18" />
        </>
      ) : (
        <>
          {/* pista coberta */}
          <path d="M3 10 12 4l9 6" />
          <path d="M5 9.5V20h14V9.5" />
          <path d="M8.5 20v-4.5a3.5 3.5 0 0 1 7 0V20" />
        </>
      )}
    </svg>
  )
}

export function NavegacaoBks({ area, secao }: { area?: Modalidade; secao: SecaoBks }) {
  const daArea = ehDaArea(secao)
  // Nas seções gerais, as seções de área levam aos karts profissionais (o endereço de sempre)
  const areaDosLinks: Modalidade = area ?? 'profissional'
  return (
    <>
      <nav className={s.areas} aria-label="Karts profissionais ou karts indoor">
        <ul className={`conteiner ${s.areasLista}`}>
          {MODALIDADES.map((m) => {
            const atual = daArea && m === area
            return (
              <li key={m}>
                <Link href={caminhoDaArea(m, daArea ? secao : 'calendario')} className={s.area} aria-current={atual ? 'page' : undefined}>
                  <IconeArea area={m} />
                  <span className={s.areaNome}>{ROTULO_MODALIDADE[m]}</span>
                  {atual && <span className="visualmente-oculto"> (área atual)</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <nav className={s.secoes} aria-label="Seções do BKS">
        <div className={`conteiner ${s.secoesInterno}`}>
          <ul className={s.secoesLista}>
            {SECOES_DA_AREA.map((i) => (
              <li key={i.secao}>
                <Link href={caminhoDaArea(areaDosLinks, i.secao)} aria-current={i.secao === secao ? 'page' : undefined}>
                  {i.rotulo}
                </Link>
              </li>
            ))}
            {SECOES_GERAIS.map((i, n) => (
              <li key={i.secao} className={n === 0 ? s.secoesGerais : undefined}>
                <Link href={i.href} aria-current={i.secao === secao ? 'page' : undefined}>
                  {i.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  )
}
