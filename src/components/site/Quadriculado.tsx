/** Faixa quadriculada da logo da ASKART (bandeira de chegada), usada como assinatura discreta nos títulos. */
export function Quadriculado({ colunas = 6, linhas = 2, tamanho = 6, className }: { colunas?: number; linhas?: number; tamanho?: number; className?: string }) {
  const quadrados = []
  for (let l = 0; l < linhas; l++)
    for (let c = 0; c < colunas; c++) if ((l + c) % 2 === 0) quadrados.push(<rect key={`${l}-${c}`} x={c * tamanho} y={l * tamanho} width={tamanho} height={tamanho} />)
  return (
    <svg
      className={className}
      width={colunas * tamanho}
      height={linhas * tamanho}
      viewBox={`0 0 ${colunas * tamanho} ${linhas * tamanho}`}
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      {quadrados}
    </svg>
  )
}
