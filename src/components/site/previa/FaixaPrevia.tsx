/**
 * Faixa da pré-visualização (só aparece com o modo de prévia ligado — ver o layout do site).
 * O estilo vai junto, num <style> próprio, e o código do navegador vem num pedaço separado
 * (CarregadorPrevia), para nada disto pesar no site público.
 */
import { CarregadorPrevia } from './CarregadorPrevia'

const ESTILO = `
.previa-faixa{position:fixed;inset-inline:0;bottom:0;z-index:2147483000;display:flex;align-items:center;gap:8px 16px;flex-wrap:wrap;
  padding:10px var(--margem,16px) calc(10px + env(safe-area-inset-bottom));background:#111;color:#f3f5f0;
  border-top:3px solid var(--amarelo,#edd357);box-shadow:0 -6px 20px rgb(0 0 0 / .18);
  font:500 .875rem/1.4 var(--fonte,system-ui,-apple-system,'Segoe UI',sans-serif)}
.previa-faixa p{margin:0;flex:1 1 16rem;min-width:0}
.previa-faixa strong{color:var(--amarelo,#edd357);font-weight:700}
.previa-faixa a{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:6px;background:var(--amarelo,#edd357);
  color:#111;font-weight:700;text-decoration:none;white-space:nowrap}
.previa-faixa a:hover{text-decoration:underline;text-underline-offset:3px}
.previa-faixa a:focus-visible{outline:3px solid #fff;outline-offset:3px}
.previa-faixa[data-quadro]{padding:5px 12px;font-size:.75rem;border-top-width:2px;box-shadow:none}
body:has(.previa-faixa){padding-bottom:72px}
body:has(.previa-faixa[data-quadro]){padding-bottom:32px}
@media (min-width:640px){body:has(.previa-faixa){padding-bottom:64px}}
`

export function FaixaPrevia() {
  return (
    <>
      <style>{ESTILO}</style>
      <CarregadorPrevia />
    </>
  )
}
