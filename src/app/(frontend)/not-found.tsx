import { Botao } from '@/components/site/Botao'

export default function NaoEncontrada() {
  return (
    <section className="secao">
      <div className="conteiner" style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
        <p className="rotulo texto-2">Erro 404</p>
        <h1 className="titulo-marca h2">Página não encontrada</h1>
        <p className="texto-2">O endereço pode ter mudado ou a página foi retirada do ar.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Botao href="/" seta>
            Página inicial
          </Botao>
          <Botao href="/bks" variante="contorno">
            BKS
          </Botao>
          <Botao href="/kartodromo" variante="contorno">
            Kartódromo
          </Botao>
        </div>
      </div>
    </section>
  )
}
