import { permanentRedirect } from 'next/navigation'

/** Endereço antigo da lista de comunicados: agora é a aba Avisos. */
export default function Comunicados() {
  permanentRedirect('/avisos')
}
