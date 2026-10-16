/**
 * Ícones simples (traço, 24 × 24) dos blocos da etapa. Sempre decorativos: o texto ao lado diz tudo.
 */
import type { ReactNode } from 'react'

export type NomeIcone =
  | 'ingresso'
  | 'relogio'
  | 'calendario'
  | 'transmissao'
  | 'publico'
  | 'caminhao'
  | 'tela'
  | 'mesa'
  | 'microfone'
  | 'confere'
  | 'feito'

const DESENHOS: Record<NomeIcone, ReactNode> = {
  ingresso: (
    <>
      <path d="M3 7.5h18v3a1.75 1.75 0 0 0 0 3.5v3H3v-3a1.75 1.75 0 0 0 0-3.5z" />
      <path d="M14.5 7.5v10" strokeDasharray="1.6 2" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  calendario: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4M7.5 13h3M13.5 13h3M7.5 16.5h3" />
    </>
  ),
  transmissao: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M10 9.2v5.6l4.8-2.8z" />
    </>
  ),
  publico: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.6 14.3a4.6 4.6 0 0 1 5.4 4.7" />
    </>
  ),
  caminhao: (
    <>
      <path d="M2.5 6.5h11v10h-11z" />
      <path d="M13.5 9.5h4l3 3.2v3.8h-7" />
      <circle cx="6.5" cy="17.5" r="1.6" />
      <circle cx="17" cy="17.5" r="1.6" />
      <path d="M5 9.5h6" />
    </>
  ),
  tela: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8.5 20h7M12 16v4" />
    </>
  ),
  mesa: (
    <>
      <path d="M3 9.5h18" />
      <path d="M6 9.5 5 19M18 9.5l1 9.5M8.5 14h7" />
    </>
  ),
  microfone: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </>
  ),
  confere: <path d="m5 12.5 4.2 4.2L19 7" />,
  feito: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.3 12.3 2.6 2.6 4.9-5.4" />
    </>
  ),
}

export function Icone({ nome, tamanho = 20, className }: { nome: NomeIcone; tamanho?: number; className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      focusable="false"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {DESENHOS[nome]}
    </svg>
  )
}

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Ícone de cada item do "Aberto ao público", pelo texto que o administrador escreveu. */
export function iconeDoItem(texto: string): NomeIcone {
  const t = semAcento(texto)
  if (/food|truck|comida|lanche|aliment|bebida/.test(t)) return 'caminhao'
  if (/telao|tela|monitor/.test(t)) return 'tela'
  if (/mesa|cadeira|assento/.test(t)) return 'mesa'
  if (/narra|locu|microf|\bsom\b/.test(t)) return 'microfone'
  if (/gratu|entrada|ingresso/.test(t)) return 'ingresso'
  return 'confere'
}
