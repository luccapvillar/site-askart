'use client'

/**
 * Pré-visualização no navegador (só carrega com o modo de prévia ligado):
 *  - recarrega os dados quando o painel salva (Live Preview do Payload, a cada autosalvamento);
 *  - recarrega quando o editor do site manda { tipo: 'askart:recarregar' };
 *  - avisa o editor do site a cada navegação ({ tipo: 'askart:rota', caminho });
 *  - mostra a faixa "Pré-visualização" (compacta quando aberta dentro do painel).
 */
import { RefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useSyncExternalStore } from 'react'

const semAssinatura = () => () => {}
const dentroDoPainel = () => window.self !== window.top
const origemAtual = () => window.location.origin
const noServidorFalso = () => false
const noServidorVazio = () => ''

export function OuvintePrevia() {
  const router = useRouter()
  const caminho = usePathname()
  const emQuadro = useSyncExternalStore(semAssinatura, dentroDoPainel, noServidorFalso)
  const origem = useSyncExternalStore(semAssinatura, origemAtual, noServidorVazio)
  const recarregar = useCallback(() => router.refresh(), [router])

  // Pedido de recarga vindo do painel (mesma origem)
  useEffect(() => {
    const ouvir = (evento: MessageEvent) => {
      if (evento.origin !== window.location.origin) return
      const dados = evento.data as { tipo?: unknown } | null
      if (dados && typeof dados === 'object' && dados.tipo === 'askart:recarregar') router.refresh()
    }
    window.addEventListener('message', ouvir)
    return () => window.removeEventListener('message', ouvir)
  }, [router])

  // Cada navegação dentro da prévia é contada ao painel
  useEffect(() => {
    if (window.parent === window) return
    window.parent.postMessage({ tipo: 'askart:rota', caminho }, window.location.origin)
  }, [caminho])

  return (
    <>
      {origem && <RefreshRouteOnSave serverURL={origem} refresh={recarregar} />}
      <aside className="previa-faixa" aria-label="Pré-visualização" data-quadro={emQuadro ? '' : undefined}>
        <p>
          <strong>Pré-visualização:</strong> você está vendo alterações ainda não publicadas
        </p>
        {!emQuadro && <a href={`/previa/sair?caminho=${encodeURIComponent(caminho || '/')}`}>Sair da prévia</a>}
      </aside>
    </>
  )
}
