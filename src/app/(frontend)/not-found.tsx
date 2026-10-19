import Link from 'next/link'
import { Botao } from '@/components/site/Botao'
import i from '@/components/site/conteudo/Institucional.module.css'

const CAMINHOS = [
  { href: '/bks', titulo: 'BKS', texto: 'Calendário, classificação e resultados do campeonato.' },
  { href: '/kartodromo', titulo: 'Kartódromo', texto: 'Grade de treinos, taxas e como treinar.' },
  { href: '/noticias', titulo: 'Notícias', texto: 'O que acontece na pista e no campeonato.' },
  { href: '/avisos', titulo: 'Avisos', texto: 'Comunicados oficiais da ASKART.' },
  { href: '/contato', titulo: 'Contato', texto: 'Telefone, endereço e dúvidas frequentes.' },
]

/** Página não encontrada: diz o que aconteceu e oferece os caminhos principais do site. */
export default function NaoEncontrada() {
  return (
    <>
      <section className={`escuro ${i.erro}`} aria-labelledby="titulo-erro">
        <div className={`conteiner ${i.erroConteudo}`}>
          <p className={`rotulo ${i.erroRotulo}`}>Erro 404</p>
          <h1 id="titulo-erro" className="titulo-marca h1">
            Página não encontrada
          </h1>
          <p className="lead">O endereço pode ter mudado ou a página foi retirada do ar. Confira se ele foi digitado certo ou siga por um dos caminhos abaixo.</p>
          <div className="botoes">
            <Botao href="/" variante="destaque" seta>
              Ir para a página inicial
            </Botao>
          </div>
        </div>
        <div className={`faixa-marca ${i.erroFaixa}`} aria-hidden="true" />
      </section>
      <nav className="secao-compacta fundo-branco" aria-labelledby="caminhos-erro">
        <div className="conteiner">
          <h2 id="caminhos-erro" className="titulo-marca h3">
            Caminhos principais
          </h2>
          <ul className={i.caminhos}>
            {CAMINHOS.map((c) => (
              <li key={c.href} className={i.caminho}>
                <Link href={c.href}>{c.titulo}</Link>
                <span className="texto-2 texto-pequeno">{c.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  )
}
