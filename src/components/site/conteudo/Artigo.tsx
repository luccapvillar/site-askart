import Link from 'next/link'
import type { ReactNode } from 'react'
import { Trilha, type ItemTrilha } from '@/components/site/paginas/TopoPagina'
import s from './Conteudo.module.css'

type Props = {
  /** "Você está aqui" (o início entra sozinho). O último item é a página atual. */
  trilha: ItemTrilha[]
  /** Selos acima do título (categoria, nível do aviso, tipo). */
  meta?: ReactNode
  titulo: ReactNode
  /** Linha fina (subtítulo da notícia). */
  linhaFina?: ReactNode
  /** Data de publicação e autor. */
  assinatura?: ReactNode
  /** Foto de capa (mais larga que o texto). */
  capa?: ReactNode
  /** Faixa colorida no alto do artigo (avisos de atenção e urgentes). */
  tom?: 'atencao' | 'urgente'
  children: ReactNode
  /** Blocos depois do texto (documento para baixar, "sobre a etapa"…). */
  depois?: ReactNode
  voltar: { href: string; rotulo: string }
}

/**
 * Página de leitura (notícia, aviso, página livre): trilha, título, linha fina, assinatura, capa e texto
 * numa coluna de leitura confortável (até ~68 caracteres por linha). Só servidor, sem JavaScript.
 */
export function Artigo({ trilha, meta, titulo, linhaFina, assinatura, capa, tom, children, depois, voltar }: Props) {
  return (
    <article className={`${s.artigo} ${tom ? s[`artigo_${tom}`] : ''}`} aria-labelledby="titulo-artigo">
      <header className={`conteiner ${s.cabeca}`}>
        <Trilha itens={trilha} />
        {meta && <div className={s.meta}>{meta}</div>}
        <h1 id="titulo-artigo" className={`titulo-marca ${s.titulo}`}>
          {titulo}
        </h1>
        {linhaFina && <p className={s.linhaFina}>{linhaFina}</p>}
        {assinatura && <div className={s.assinatura}>{assinatura}</div>}
      </header>
      {capa && <div className={`conteiner ${s.capa}`}>{capa}</div>}
      <div className={`conteiner ${s.corpo}`}>
        {children}
        {depois}
        <p className={s.voltar}>
          <Link href={voltar.href}>
            <span aria-hidden="true">←</span> {voltar.rotulo}
          </Link>
        </p>
      </div>
    </article>
  )
}

/** Título curto para a trilha (o título inteiro já está no h1). */
export function tituloCurto(texto: string, limite = 48): string {
  const t = texto.trim()
  if (t.length <= limite) return t
  const corte = t.slice(0, limite)
  const espaco = corte.lastIndexOf(' ')
  return `${(espaco > limite * 0.6 ? corte.slice(0, espaco) : corte).replace(/[\s,.;:–-]+$/, '')}…`
}

/** Cartão de documento para baixar (anexo do aviso, bloco "documento" das páginas). */
export function DocumentoParaBaixar({ href, titulo, rotulo = 'Documento para baixar' }: { href: string; titulo: ReactNode; rotulo?: string }) {
  return (
    <a className={s.documento} href={href}>
      <span className={s.documentoIcone} aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M12 11v6M9.5 14.5 12 17l2.5-2.5" />
        </svg>
      </span>
      <span className={s.documentoTextos}>
        <span className={s.documentoRotulo}>{rotulo}</span>
        <span className={s.documentoTitulo}>{titulo}</span>
      </span>
    </a>
  )
}

/** Bloco "Sobre:" com os links relacionados (etapa, treino). */
export function Relacionados({ titulo = 'Relacionado', itens }: { titulo?: string; itens: { href: string; rotulo: ReactNode }[] }) {
  if (!itens.length) return null
  return (
    <aside className={s.relacionados} aria-label={titulo}>
      <p className={s.relacionadosTitulo}>{titulo}</p>
      <ul>
        {itens.map((i) => (
          <li key={i.href}>
            <Link className="link-seta" href={i.href}>
              {i.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
