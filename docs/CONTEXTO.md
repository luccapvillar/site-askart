# Contexto do projeto ASKART — passagem para continuar com o Claude

Este arquivo conta **o que foi pedido, o que foi decidido e o que falta**. Leia junto com:

- [`docs/SITE.md`](SITE.md) — o site público, página por página;
- [`docs/PAINEL.md`](PAINEL.md) — a área de administração e a operação (publicação, banco, scripts);
- [`docs/ESPECIFICACAO.md`](ESPECIFICACAO.md) e [`docs/ARQUITETURA.md`](ARQUITETURA.md) — escopo original e decisões técnicas.

> Para o Claude: antes de mudar qualquer coisa, leia este arquivo inteiro, depois SITE.md e PAINEL.md. As regras da seção 3 são do cliente e valem sempre.

---

## 1. O que é

Site oficial e painel de administração da **ASKART — Associação de Pilotos de Kart de Brasília**, que administra o **Kartódromo Ayrton Senna do Guará** (Brasília/DF) e organiza o campeonato **BKS — Brasília Kart Series**.

| | |
|---|---|
| Site no ar | https://site-askart.vercel.app |
| Painel (moderador) | https://site-askart.vercel.app/admin |
| Repositório | `luccapvillar/site-askart` (GitHub), ramo `main` |
| Publicação | Vercel, projeto **site-askart**. Todo `git push` no `main` publica sozinho |
| Banco | Postgres (Neon, ligado ao projeto na Vercel) |
| Fotos e arquivos | Vercel Blob (ligado ao projeto, acesso automático por OIDC) |
| Tecnologia | Next.js 16.3.3 + Payload CMS 3.90.2 (o painel é o Payload), TypeScript |
| Estado | Versão de **demonstração** no ar: dados de exemplo marcados com "[DEMONSTRAÇÃO]" e selo "Exemplo" |

### Acessos que o sócio precisa (peça ao dono, nunca coloque senha em arquivo)

1. **GitHub:** ser adicionado como colaborador do repositório `luccapvillar/site-askart`.
2. **Vercel:** ser adicionado ao time `luccapvillar-3174`, para ver publicações, logs e variáveis.
3. **Painel:** um usuário próprio em `/admin`, criado pelo administrador em **Usuários**. Não compartilhe o login do dono.
4. **IA do painel:** a chave `ANTHROPIC_API_KEY` já fica nas variáveis da Vercel. Não precisa da chave para mexer no código.

---

## 2. Como continuar com o Claude

1. Abra o repositório no Claude Code: no terminal ou em claude.ai/code, com o repositório conectado.
2. Peça para ele ler `docs/CONTEXTO.md`, `docs/SITE.md` e `docs/PAINEL.md`. O `CLAUDE.md` da raiz já manda usar a skill do Payload (`.claude/skills/payload/`) e consultar a documentação do Next 16 em `node_modules/next/dist/docs/`, porque essa versão do Next tem mudanças.
3. **Fluxo que funcionou bem neste projeto:**
   - mudou coleção ou campo → gerar migração (`npm run migrate:create <nome>`) e **ler o SQL gerado** antes de publicar (veja PAINEL.md);
   - precisou acertar dados do site já publicado → criar um **passo idempotente** em `scripts/atualizacoes.ts` (roda sozinho a cada publicação, uma vez só, marcado em `payload.kv`);
   - testar com um banco local que imite o de produção, rodar `npx tsc --noEmit -p .`, `npx vitest run` e `npm run build` antes de dar push no `main`;
   - depois do push, acompanhar a publicação na Vercel e conferir o site no ar.
4. **Peça uma coisa de cada vez** e confira no site antes da próxima. O cliente muda de ideia com frequência; prefira soluções configuráveis no painel.

---

## 3. Regras do cliente (valem para tudo)

- **Nunca inventar** nomes de pilotos, categorias, campeonatos, datas, resultados, pontuações, preços, contatos, endereços ou qualquer informação oficial da ASKART. Se o dado não foi informado, o site mostra uma mensagem clara de "ainda não disponível/divulgado".
- **Dados de exemplo** só com o prefixo `[DEMONSTRAÇÃO]`. O site mostra o selo "Exemplo". Eles saem com `npm run seed:limpar`, e nunca vão para o lançamento oficial.
- **Único contato fictício autorizado:** `+55 61 00000-0000`, sempre marcado como **contato provisório**. O site nunca cria link de ligação para ele.
- O telefone `(61) 99928-6555` é da **equipe Pro Kart**, não da ASKART. Nunca use como contato da ASKART.
- Fotos da internet: o cliente liberou, mas use **só com licença livre** (domínio público ou Creative Commons) e **com crédito**. As fotos do Flickr de Jaqueline Husni e Vinícius de Melo são domínio público e já estão com crédito.
- **Português do Brasil**, sem jargão técnico para o moderador, sem frases genéricas de automobilismo ("nascido para vencer" etc.).
- **Visual:** institucional, "nível de governo", referência de acabamento **kgvracetracks.com**. **Sem clichês de kart:** quadriculado, fibra de carbono, fogo, neon, linhas de velocidade, zebra.
- **Acessibilidade AA** e **desempenho** de site oficial (meta Lighthouse 100 no celular). Movimento só com propósito, respeitando `prefers-reduced-motion`.
- **Crédito no rodapé:** "Site por Lucca Villar – luccapvillar@gmail.com", com o e-mail em link mailto, ao lado de "Acesso do administrador".

---

## 4. Fatos confirmados pelo cliente

**ASKART e kartódromo**
- Endereço: Guará II, QE 25, Área Especial do CAVE, CEP 71025-500 (Brasília/DF).
- O kartódromo é **só para treinos e corridas**. **Não tem aluguel de kart** (nem indoor de aluguel).
- Tem **treino quase todo dia**, além do campeonato.
- **Grade semanal oficial de treinos**, editável pelo moderador. Veio de uma imagem oficial da ASKART/Secretaria de Esporte e Lazer e foi carregada por `scripts/dados-oficiais.ts`, com as cores oficiais das turmas.
- **Taxas:** taxa de ambulância **R$ 50,00 por piloto por dia de treino**; taxa de pista **avulsa R$ 80,00** (cliente, 21/10/2026).
- **Mensalidade da taxa de pista** (cliente, 21/10/2026): é **só para quem não corre no horário de iniciante**. Vem de um comunicado afixado no kartódromo, datado "Brasília, 12 de Fevereiro de 2026" (sem nome de quem assina; não atribuir a ninguém): "opções para o pagamento da mensalidade da taxa de pista que concedem algumas taxas de ambulância".

  | Taxas de ambulância incluídas | Sem desconto (pista + ambulâncias = total) | Com desconto bônus (pista + ambulâncias = total) |
  |---|---|---|
  | 4 | R$ 320 + R$ 200 = **R$ 520** | R$ 300 + R$ 150 = **R$ 450** |
  | 8 | R$ 320 + R$ 400 = **R$ 720** | R$ 300 + R$ 300 = **R$ 600** |
  | 12 | R$ 320 + R$ 600 = **R$ 920** | R$ 300 + R$ 450 = **R$ 750** |

  Regras do comunicado: o desconto passa a valer a partir da data do pagamento da pista; vale somente para pilotos mensalistas; é intransferível e inacumulável; treinos além dos incluídos no combo pagam a taxa de ambulância integral; valores com o bônus de desconto vigoram a partir de 12/02/2026. **Não informados (não inventar):** preço por treino, treinos por semana, quem emitiu o comunicado, formas de pagamento, validade da mensalidade além do que está acima.
  No painel: Kartódromo › Taxas e valores › "Mensalidade da taxa de pista" (o total é calculado pelo site). Os dados ficam em `src/lib/taxas.ts`.
- Informações úteis do site da equipe Pro Kart (prokartracing.com.br/informacoes-importantes/) foram usadas como referência de conteúdo, sem copiar contato.
- Categorias de treino: Mirim, Cadete, 125cc, F400 e Moto. Turmas de iniciante: 5–11 anos e 12+. Não há tolerância de horário.

**BKS — Brasília Kart Series**
- Dividido em **Karts profissionais** e **Karts indoor**. A modalidade é da **categoria**: o campo `modalidade` define em qual área a categoria aparece.
- **Categorias profissionais e subcategorias** (só os nomes, nada mais):
  - **F400:** Novatos, Junior, Graduados, Sênior, GSS/60+
  - **125cc:** Novatos, Junior, Graduados, Sênior
  - **Cadete** e **Mirim:** sem subcategoria
- **Kart indoor** é uma categoria com 4 subcategorias: Novatos - 95KGs (15HP), 80KGs (15HP), 95KGs (15HP), 110KGs (15HP).
- **Regras de competição (informadas pelo cliente):**
  - "A categoria é só o tipo de kart." **Cada subcategoria tem grid próprio**, com **Warm-up, Classificação (tomada de tempo), Corrida 1 e Corrida 2**, cada sessão num horário diferente. Isso vale também para o indoor.
  - **Pole por subcategoria:** o 1º da classificação da subcategoria.
  - **Resultado da etapa = média das posições nas duas corridas**, dentro da subcategoria. Exemplo do cliente: 2º e 2º = 2º na etapa.
  - **Pontos e classificação do campeonato são separados por subcategoria.**
  - O cliente disse que **ainda vai mandar o regulamento completo**. Até lá valem as decisões da seção 6.
- **Eventos (texto do cliente):** o evento é aberto ao público e a entrada é de graça; food trucks para o público se alimentar; telão para assistir à corrida de diversos ângulos; mesas e cadeiras para acomodar o público; narrador profissional narrando todas as corridas.
- **Transmissão:** cada etapa tem link de **YouTube** diferente, e o link dos **karts profissionais é diferente do indoor**. O link só é divulgado **dias antes** da corrida. Depois da etapa o link **continua** na página, porque a gravação completa fica nele.
- **Compras:** cada etapa tem o **link para comprar a etapa** e o **link para comprar os treinos livres**. Os dois são diferentes por etapa, vêm da IZY Pass e são colocados pelo moderador, em média 2 a 3 semanas antes, junto com a **grade horária dos treinos livres** daquela etapa. Depois da etapa, as compras **saem sozinhas** do site.

---

## 5. Textos exatos pedidos pelo cliente (não altere sem pedir)

| Situação | Texto |
|---|---|
| Sem link de compra da etapa | O link para comprar esta etapa ainda não foi disponibilizado. |
| Sem link dos treinos livres | Compra dos treinos livres para essa etapa ainda não está disponível |
| Sem grade dos treinos livres | A grade horária para os treinos livres dessa etapa ainda não está disponível |
| Sem link da transmissão (cada modalidade) | O link da transmissão ao vivo ainda não está disponível |
| Depois da etapa (no lugar das compras) | Esta etapa já ocorreu em <data>. Não é mais possível realizar a compra. |
| Aba Avisos vazia | Nenhum aviso no momento. |
| Botões de edição no painel | **Salvar edição** (lança no site), **Descartar edição**, **Refazer com IA**, **Refazer à mão** |

Os textos ficam em `src/lib/site.ts` (`MENSAGENS_ETAPA`, `mensagemJaOcorreu`) e nas traduções do Payload em `src/payload.config.ts`.

**Ordem obrigatória na página de cada etapa, antes de ela acontecer:**
1. Comprar a etapa
2. Comprar treinos livres
3. Grade horária dos treinos livres
4. Transmissão (profissional e indoor)

---

## 6. Decisões tomadas sem confirmação (confirmar com o cliente)

Ficam concentradas em código para trocar fácil (veja SITE.md, motor de pontuação, `DECISOES_MEDIA` em `src/lib/classificacao.ts`).

- **Empate na média:** desempata a melhor posição na Corrida 2, depois a melhor na Classificação. Se ainda empatar, mesma posição e mesmos pontos.
- **Abandono, não largou, desclassificado ou não correu:** vale a última posição do grid da subcategoria naquela corrida.
- **Desclassificado nas duas corridas:** ainda recebe os pontos da posição final pela tabela. Confirmar se deveria zerar.
- **Cadete e Mirim:** mesma regra da média, com a categoria inteira como um grid.
- **Temporadas já encerradas:** mantêm o cálculo antigo ("por corrida"), para o resultado oficial não mudar.
- **Roxo:** só os **números do melhor tempo** de cada sessão dentro da subcategoria (pedido do cliente). O vencedor não fica roxo. Tempos de desclassificado e de quem não largou não entram.
- **Posição na subcategoria:** aparece também a geral entre parênteses nas sessões, ex.: "1º (3º geral)".
- **Subcategoria da inscrição:** pode ser alterada mesmo com a temporada encerrada (só organiza as tabelas).
- Nomes das transmissões: "Karts profissionais" e "Karts indoor".

---

## 7. Histórico do que foi pedido e entregue (em ordem)

1. **Estrutura:** abas **BKS · Kartódromo · Notícias · Avisos · Contato**. Calendário em que tocar na etapa mostra os horários por categoria; classificação por categoria; resultados; mapa por etapa; história e campeões; link IZY Pass; fotos; logo do BKS.
2. **Kartódromo:** onde fica, história, taxas, grade de treinos editável, como treinar, notícias, contatos, dúvidas frequentes e Instagram.
3. **Logos:** melhoradas em alta resolução (`marca/melhoradas/`). Os originais ficam em `marca/recebidos/`.
4. **Publicação na Vercel**, com banco Neon e Blob. Houve ajustes porque a Vercel passou a ligar o Blob por OIDC: o adaptador próprio fica em `src/lib/armazenamento.ts`.
5. **Rodada de 13 pedidos:**
   - polir o site;
   - **pré-visualizar** a edição antes de lançar (Salvar/Descartar/Refazer com IA/à mão);
   - grade de treinos editável;
   - painel com **cópia do site** para editar à mão ou com IA ("Editar o site");
   - links de transmissão profissional e indoor;
   - aba **Avisos** (vazia, sem exemplo);
   - link e grade de **treinos livres por etapa**;
   - link de **compra da etapa** antes dos treinos livres;
   - texto de **evento aberto ao público**;
   - mensagem de transmissão indisponível;
   - transmissão que **continua após a etapa**;
   - **compras retiradas** sozinhas após a etapa;
   - **crédito no rodapé**.
6. **IA no painel** ("Assistente com IA"): o moderador pede em texto (e pode anexar foto ou PDF), a IA propõe as mudanças, ele confere na pré-visualização e confirma.
7. **BKS dividido** em karts profissionais e indoor, com bloco **"Venha assistir"** na página geral do BKS.
8. **Resultados da etapa:** tabela com **Warm-up, Classificação, Corrida 1, Corrida 2 e Resultado da etapa** de todos os pilotos.
9. **Site refeito** do zero no visual (base institucional nova). A página inicial perdeu o bloco "Treinos de hoje e amanhã", que o cliente não gostou. A **aba Fotos** foi refeita.
10. **Subcategorias** em todo lugar:
    - resultados separados por subcategoria, com abas;
    - classificação por subcategoria;
    - horários por subcategoria e **seletor "Escolha a subcategoria"** no calendário;
    - "Gerar corridas" cria as 4 sessões por subcategoria.
11. **Pontuação** pela média das corridas por subcategoria (configurável em Regras de pontuação → "Como a etapa é pontuada").
12. **Página inicial começa pela ASKART** (institucional), com caminhos para BKS e Kartódromo. Mostra os líderes de **todas** as subcategorias.
13. **Exemplos do Kart indoor** com sessões por subcategoria.
14. **Roxo só nos números** do melhor tempo.
15. **Identidades visuais por aba:**
    - **BKS:** cores da logo, azul royal #0A1AB4, vermelho #D52E20 e branco, editáveis em Campeonatos → Cores;
    - **Kartódromo:** identidade própria, com asfalto grafite, verde-gramado e amarelo de sinalização, e faixa tracejada de pista;
    - cabeçalho, rodapé e página inicial seguem a ASKART.
16. **Taxa de pista e mensalidade** (21/10/2026): taxa de pista avulsa R$ 80,00 e a seção "Mensalidade da taxa de pista" na aba Kartódromo (tabela "Sem desconto" × "Com desconto bônus" com o total em destaque e as regras do comunicado de 12/02/2026), editável no painel. O site já publicado recebe os dados pelo passo 9 de `scripts/atualizacoes.ts` (só preenche o que ainda está vazio ou "a confirmar").

---

## 8. Pendências e próximos passos

**Dados que faltam do cliente (o site já mostra "ainda não disponível")**
- Contatos oficiais da ASKART (telefone, WhatsApp, e-mail), no lugar do provisório.
- **Link geral da IZY Pass** e os links de cada etapa.
- **Instagram oficial**.
- **Calendário real**: etapas profissionais e indoor, horários de cada sessão por subcategoria, grades de treinos livres e links de transmissão.
- **Regulamento** completo do BKS, para confirmar as regras da seção 6.
- Inscrições reais dos pilotos, com a **subcategoria** de cada um.

**Funcionalidades combinadas e ainda não feitas**
- **IA lendo várias fotos de resultados de uma vez** (classificação, corrida 1, corrida 2, resultado da etapa), conferindo o resultado calculado contra a foto e lançando tudo. Hoje a IA aceita **um** anexo por mensagem.
- **Botão "Gerar corridas" no painel** (tela da etapa). A geração por subcategoria já existe, mas só por API (`POST /api/etapas/:id/gerar-corridas`). Sem o botão, o moderador cadastra as sessões à mão.

**Antes do lançamento oficial** (lista detalhada em PAINEL.md)
- Rodar `npm run seed:limpar` (ou apagar os exemplos) e tirar `DADOS_DEMONSTRACAO` das variáveis da Vercel.
- Desligar a faixa "Versão de demonstração" em Configurações gerais → Prévia.
- Trocar o contato provisório e preencher IZY e Instagram.
- Ligar um domínio próprio e definir `NEXT_PUBLIC_SERVER_URL`.

**Problemas conhecidos**
- `npm run lint` não roda: erro de configuração antigo do ESLint ("Converting circular structure to JSON"). Use `npx tsc --noEmit -p .` e `npx vitest run`.
- Na Vercel existe um projeto extra, **gabriel-brunetti-site-h9ay**, ligado por engano a este repositório. Toda publicação dele falha. Pode ser apagado, e **só ele**: o projeto **gabriel-brunetti-site** é de outro cliente e não tem relação com a ASKART.
- Tela inteira de algumas fotos pode demorar no primeiro acesso, porque passam pelo site (Blob privado ou público). Depois ficam guardadas na CDN.
