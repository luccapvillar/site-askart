import type { Metadata, Viewport } from 'next'
import { Archivo, Geist_Mono } from 'next/font/google'
import type { CSSProperties, ReactNode } from 'react'
import { Cabecalho } from '@/components/site/Cabecalho'
import { Rodape } from '@/components/site/Rodape'
import { fontesDaFoto } from '@/components/site/Foto'
import { semDemo } from '@/components/site/TextoDemo'
import type { Midia } from '@/payload-types'
import { env } from '@/env'
import { lerAvisos, lerConfiguracoes, lerContato, lerKartodromo, lerNavegacao } from '@/lib/publico'
import { canaisDoContato, itemDoLink, menuDoSite, NOMES_REDES, variaveisDeCor } from '@/lib/site'
import type { ValorLink } from '@/fields/link'
import './globals.css'

// Um só arquivo de fonte (larguras e pesos variáveis). O itálico dos títulos é inclinado pelo navegador:
// economiza ~100 KB no celular. A fonte de números/rótulos não bloqueia a primeira pintura.
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], style: ['normal'], variable: '--fonte-archivo', display: 'swap' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--fonte-geist-mono', display: 'swap', preload: false })

export const revalidate = 60

export const viewport: Viewport = { themeColor: '#111111', width: 'device-width', initialScale: 1 }

export async function generateMetadata(): Promise<Metadata> {
  const config = await lerConfiguracoes()
  const sigla = config.sigla || 'ASKART'
  const titulo = config.tituloSite || `${sigla} — ${config.nome || 'Associação de Pilotos de Kart de Brasília'}`
  const imagem = config.imagemCompartilhamento as Midia | null | undefined
  const favicon = config.favicon as Midia | null | undefined
  return {
    metadataBase: new URL(env.SERVER_URL),
    title: { default: titulo, template: `%s — ${sigla}` },
    description: config.descricao || undefined,
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      siteName: sigla,
      images: imagem?.sizes?.compartilhamento?.url ? [{ url: imagem.sizes.compartilhamento.url, width: 1200, height: 630 }] : undefined,
    },
    icons: favicon?.url ? { icon: favicon.url } : undefined,
    robots: config.faixaDemonstracao ? { index: false, follow: false } : undefined,
  }
}

export default async function LayoutSite({ children }: { children: ReactNode }) {
  const [config, navegacao, contato, kartodromo, avisos] = await Promise.all([
    lerConfiguracoes(),
    lerNavegacao(),
    lerContato(),
    lerKartodromo(),
    lerAvisos(10),
  ])
  const sigla = config.sigla || 'ASKART'
  const nome = config.nome || 'Associação de Pilotos de Kart de Brasília'
  const logo = config.logo as Midia | null | undefined
  const logoInfo = logo?.url ? (() => {
    const f = fontesDaFoto(logo, 'miniatura')
    return { url: f.src, largura: f.largura, altura: f.altura }
  })() : null

  // Comunicado em destaque mais recente, dentro do período de exibição
  const agora = Date.now()
  const destaque = avisos.find(
    (a) =>
      a.destaque &&
      (!a.exibirDe || new Date(a.exibirDe).getTime() <= agora) &&
      (!a.exibirAte || new Date(a.exibirAte).getTime() >= agora),
  )

  const canais = canaisDoContato(contato, 'rodape')
  const redes = (contato.redes ?? []).map((r) => ({ rede: r.rede, url: r.url, usuario: r.usuario }))
  const instagram = redes.find((r) => r.rede === 'instagram')
  const colunas = (navegacao.rodape ?? []).map((c) => ({
    titulo: c.titulo,
    links: (c.links ?? []).map((l) => itemDoLink(l.link as ValorLink)).filter((l): l is NonNullable<typeof l> => l !== null),
  }))
  const destaqueMenu = itemDoLink(navegacao.botaoDestaque as ValorLink)

  return (
    <html lang="pt-BR" className={`${archivo.variable} ${mono.variable}`} style={variaveisDeCor(config) as CSSProperties}>
      <body>
        <a className="pular" href="#conteudo">
          Pular para o conteúdo
        </a>
        {config.faixaDemonstracao && (
          <div className="faixa-demo" role="note">
            <div className="conteiner">
              <strong>Versão de demonstração.</strong> Nomes, datas, resultados e textos marcados como “Exemplo” são
              fictícios. O contato +55 61 00000-0000 é provisório.
            </div>
          </div>
        )}
        <Cabecalho
          sigla={sigla}
          nome={nome}
          logo={logoInfo}
          menu={menuDoSite(navegacao)}
          local={`${kartodromo.nome || 'Kartódromo Ayrton Senna do Guará'} · Brasília/DF`}
          atalhos={[
            ...(instagram ? [{ rotulo: NOMES_REDES.instagram, href: instagram.url, externo: true }] : []),
            { rotulo: 'Contato', href: '/contato' },
          ]}
          destaque={destaqueMenu}
          aviso={destaque ? { titulo: semDemo(destaque.titulo), href: `/comunicados/${destaque.id}`, nivel: destaque.nivel } : null}
        />
        <main id="conteudo" tabIndex={-1}>
          {children}
        </main>
        <Rodape
          sigla={sigla}
          nome={nome}
          texto={config.textoRodape || config.descricao}
          colunas={colunas}
          canais={canais}
          endereco={semDemo(contato.endereco?.texto?.split('\n')[0]) || null}
          redes={redes}
          ano={new Date().getFullYear()}
        />
      </body>
    </html>
  )
}
