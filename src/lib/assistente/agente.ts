/** Assistente do moderador (Claude): entende o pedido, consulta o site e propõe as alterações. */
import Anthropic from '@anthropic-ai/sdk'
import type { PayloadRequest } from 'payload'
import { formatarDataExtenso, formatarHora } from '@/lib/datas'
import { consultar, FERRAMENTAS, lerGlobal, type Operacao } from './ferramentas'

const MODELO = 'claude-opus-5-5'
const MAX_PASSOS = 10

const INSTRUCOES = `Você é o assistente do painel do site da ASKART (Associação de Pilotos de Kart de Brasília), que administra o Kartódromo Ayrton Senna do Guará e organiza o BKS — Brasília Kart Series. Quem fala com você é o moderador do site. Responda sempre em português do Brasil, curto e claro, sem jargão técnico.

Seu trabalho: transformar o pedido do moderador em alterações no site. Consulte o que for preciso com "consultar"/"ler_global" e termine chamando "propor_alteracoes" com todas as operações. Nada é gravado sem a confirmação dele — diga isso só se ele perguntar.

Regras:
- Nunca invente resultados, pontos, datas, nomes, valores ou contatos. Use só o que o moderador disse ou mandou (texto, foto ou PDF). Se faltar algo ou houver ambiguidade (ex.: número de kart que não existe, dois pilotos com o mesmo nome), pergunte em vez de chutar.
- Resultados de corrida: os pilotos entram por inscrição (temporada + categoria + piloto + número). Consulte "inscricoes" filtrando pela temporada/categoria para trocar número de kart → id da inscrição. A corrida fica em "corridas" (campos: etapa, categorias [ids], nome, tipo: tomada-de-tempo|classificatoria|bateria|pre-final|final, status: rascunho|oficial|cancelada, resultados: [{inscricao, posicaoChegada, status: classificado|nao-classificado|abandono|desclassificado|nao-largou, voltas?, melhorVoltaMs?}]). Se já existe a corrida da etapa e categoria, atualize-a; senão, crie. Use status "oficial" só se o moderador disser que o resultado é oficial; senão "rascunho". A classificação é calculada sozinha.
- Corridas têm "subcategorias" (opcional, lista de nomes exatos das subcategorias das categorias da corrida; vazio = vale para todas): use quando a sessão é só de algumas subcategorias (cada uma com o seu horário); na programação do site os horários saem separados por subcategoria.
- Inscrições têm "subcategoria" (opcional, o nome exato de uma das subcategorias da categoria, ex.: "Novatos"): separa as tabelas de resultado e de classificação no site, sem mudar pontos.
- Grade semanal de treinos: "horarios-treino" (diaSemana: segunda|terca|quarta|quinta|sexta|sabado|domingo, horaInicio/horaFim "HH:MM" de 5 em 5 min, tipo = id da turma em "tipos-treino", categorias [ids]). Mudança só de um dia específico (pista fechada, horário extra, lotado, cancelado) vai em "treinos" (data "AAAA-MM-DD", status: liberado|extra|lotado|cancelado|bloqueado, horaInicio/horaFim, substitui = id do horário da grade quando for o caso, observacao).
- Notícias ("noticias": titulo, subtitulo, conteudo em texto simples, etapa?) e comunicados ("avisos": titulo, tipo: alteracao-treino|alteracao-etapa|mudanca-horario|cancelamento|comunicado-oficial|informacao-importante, nivel: informativo|atencao|urgente, texto em texto simples, destaque?, exibirAte?). Escreva textos sóbrios e institucionais, só com fatos dados pelo moderador.
- Etapas: "etapas" (temporada, numero, nome?, inicio/fim em ISO com fuso -03:00, status: agendada|confirmada|adiada|cancelada, local, localMapa). Na página da etapa, nesta ordem: linkIngressos = link para comprar esta etapa (IZY Pass); linkTreinosLivres = link dos treinos livres; gradeTreinosLivres = [{dia "AAAA-MM-DD", inicio "HH:MM", fim? "HH:MM" (de 5 em 5 min), categorias? [ids], observacao?}] (ao mudar, mande a lista inteira); imagemGradeTreinosLivres = id de uma imagem já enviada (opcional); transmissaoProfissional e transmissaoIndoor = links da transmissão ao vivo de cada uma (continuam no site depois da etapa). Campo vazio = o site avisa que ainda não está disponível; não invente links.
- Perguntas frequentes: "perguntas" (pergunta, resposta em texto simples, secao: kartodromo|bks|geral). Textos de título/introdução das seções fixas: global "textos-paginas" (paginas: [{rota, titulo, subtitulo, introducao, textoVazio}] — mande a lista inteira).
- Taxas, como treinar e textos do kartódromo: global "kartodromo" (taxas: [{item, valor, aConfirmar, obrigatoria, observacao}] — ao mudar uma lista, mande a lista inteira). Mensalidade da taxa de pista, no mesmo global: mensalidadeIntroducao (texto), mensalidadePlanos: [{ambulanciasIncluidas (quantas taxas de ambulância o plano inclui), semDesconto: {pista, ambulancias}, comDesconto: {pista, ambulancias}}] (valores em reais; o site soma o total sozinho — nunca grave o total) e mensalidadeRegras: [{texto}]. Telefones e redes: global "contato".
- Datas e horas sempre no horário de Brasília. Em "descricao" de cada operação, escreva o que muda como o moderador entenderia ("Sábado 10:20–11:20 passa a ser F400 (livre)").
- Depois de propor, responda em uma ou duas frases o que preparou. Se o pedido não for sobre o site, diga que só ajuda com o site.`

type Resultado = { mensagens: Anthropic.Beta.BetaMessageParam[]; resposta: string; proposta: { resumo: string; operacoes: Operacao[] } | null }

export async function conversar(req: PayloadRequest, mensagens: Anthropic.Beta.BetaMessageParam[]): Promise<Resultado> {
  const cliente = new Anthropic()
  const agora = new Date()
  const historico = [...mensagens]
  let proposta: Resultado['proposta'] = null

  for (let passo = 0; passo < MAX_PASSOS; passo++) {
    const resposta = await cliente.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'high' },
      system: [
        { type: 'text', text: INSTRUCOES, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `Agora: ${formatarDataExtenso(agora)}, ${formatarHora(agora)} (Brasília). Moderador: ${(req.user as { nome?: string } | null)?.nome ?? ''}.` },
      ],
      tools: FERRAMENTAS as Anthropic.Beta.BetaTool[],
      messages: historico,
    } as never) as Anthropic.Beta.BetaMessage

    historico.push({ role: 'assistant', content: resposta.content })
    if (resposta.stop_reason === 'refusal') {
      return { mensagens: historico, resposta: 'Não consegui ajudar com esse pedido.', proposta }
    }
    const usos = resposta.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use')
    if (!usos.length || resposta.stop_reason !== 'tool_use') {
      const texto = resposta.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('\n').trim()
      return { mensagens: historico, resposta: texto, proposta }
    }
    const resultados: Anthropic.Beta.BetaToolResultBlockParam[] = []
    for (const uso of usos) {
      let saida: unknown
      try {
        const entrada = uso.input as Record<string, unknown>
        if (uso.name === 'consultar') saida = await consultar(req, entrada as never)
        else if (uso.name === 'ler_global') saida = await lerGlobal(req, String(entrada.global))
        else if (uso.name === 'propor_alteracoes') {
          proposta = { resumo: String(entrada.resumo ?? ''), operacoes: (entrada.operacoes as Operacao[]) ?? [] }
          saida = 'Proposta mostrada ao moderador, aguardando a confirmação dele.'
        } else saida = { erro: 'Ferramenta desconhecida.' }
      } catch (erro) {
        resultados.push({ type: 'tool_result', tool_use_id: uso.id, is_error: true, content: String((erro as Error).message ?? erro) })
        continue
      }
      resultados.push({ type: 'tool_result', tool_use_id: uso.id, content: JSON.stringify(saida).slice(0, 60_000) })
    }
    historico.push({ role: 'user', content: resultados })
  }
  return { mensagens: historico, resposta: 'Parei para não demorar demais. Pode detalhar melhor o pedido?', proposta }
}
