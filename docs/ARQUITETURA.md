# Arquitetura — Plataforma ASKART (v2)

Escopo do cliente: [`ESPECIFICACAO.md`](ESPECIFICACAO.md). Esta versão incorpora a revisão independente (cobertura dos 40 itens, regras de kart, segurança e experiência do administrador).

## 1. Pilha e ambiente

| Camada | Escolha |
| --- | --- |
| Aplicação | Next.js 16 (App Router, React 19, Server Components) |
| CMS / painel | Payload 3.90.2 dentro do Next.js, em português (`@payloadcms/translations` `pt`) |
| Banco | PostgreSQL via `@payloadcms/db-postgres`, **migrações versionadas** (`src/migrations`); local: `postgres://askart:askart@localhost:5432/askart` |
| Arquivos | Disco local no desenvolvimento; Vercel Blob em produção com `clientUploads` (envio direto do navegador, sem o limite de 4,5 MB da função) |
| Hospedagem | Vercel (+ Neon/Vercel Postgres) |
| Testes | Vitest (regras e acesso) e Playwright (fluxos do painel e do site, 1280 px e 390 px) |

Fuso único: **America/Sao_Paulo**. Toda conta de data passa por `src/lib/datas.ts`.

## 2. Princípios

1. **Se aparece no site e pode mudar, é editável no painel** — inclusive títulos, textos de introdução e de "estado vazio" de cada página (global `textos-paginas`).
2. **Nenhum dado oficial inventado.** Produção nasce vazia. Dados de demonstração só por `npm run seed:demo` (desenvolvimento/prévia), todos com o prefixo `[DEMONSTRAÇÃO]` e removíveis por `npm run seed:limpar`. O telefone `+55 61 00000-0000` é o único contato provisório: o sistema o marca como **provisório** sozinho, e o site mostra o selo "Contato provisório" sem link de ligação.
3. **Uma informação, um dono.** Cada dado mora num só lugar; os outros lugares leem dele. Ex.: data da etapa só na etapa; endereço/horário/mapa/contatos só no global `contato`; destaques da home só em `pagina-inicial`.
4. **Derivados são calculados na leitura** (pontos, classificação, líder, estatísticas, dia da semana, duração, "situação" de publicação). Ajustes manuais existem, sempre com motivo, e o modo manual completo fica para temporadas históricas.
5. **Não se apaga histórico.** Excluir é bloqueado quando há vínculos (mensagem: "use Desativar"); coleções de conteúdo têm lixeira (`trash`). Temporada **encerrada** fica congelada.
6. **Painel para leigos:** menu agrupado por tarefa, rótulos e ajuda em português, valores padrão inteligentes, telas próprias para as tarefas difíceis (lançar resultados, agenda de treinos, painel inicial).

## 3. Visibilidade e publicação (padrão único)

- **Conteúdo editorial** (notícias, avisos, galerias, documentos, páginas, banners, eventos): rascunho nativo do Payload (`versions.drafts`), que permite editar uma notícia publicada sem pôr a mudança no ar até "Publicar alterações"; campo `publicarEm` (data/hora; futura = **programado**); campo `visibilidade` (`visivel` | `oculto` | `arquivado`).
- **Cadastros esportivos** (campeonatos, temporadas, categorias, equipes, pilotos, etapas, eventos, horários de treino): campo `visibilidade` (`visivel` | `oculto` | `arquivado`).
- **Arquivado** = sai das listas atuais, continua na página própria e no histórico.
- **Situação** (coluna colorida em toda lista e barra lateral "No site"): Rascunho · No ar · Programado para dd/mm hh:mm · Oculto · Arquivado · Expirado.
- Público vê: `_status = published` (quando houver rascunho) **e** `visibilidade = visivel` **e** `publicarEm ≤ agora` **e** (quando houver janela) `exibirDe ≤ agora ≤ exibirAte`. O filtro fica na **regra de acesso** (vale para REST/GraphQL) e o site lê sempre por `src/lib/publico.ts` com `overrideAccess: false`.
- Colaborador cria e edita rascunhos; editor/administrador publicam (hook recusa publicação por colaborador com mensagem clara).
- **Sem cron obrigatório:** as páginas usam ISR de 60 s e o filtro é por data na leitura; contagem regressiva e "hoje/amanhã" são calculados no cliente. Salvamentos revalidam na hora (`after()` → `revalidateTag('site')`).

## 4. Modelo de dados

Slugs em português. Grupos do menu: **Competição**, **Kartódromo**, **Conteúdo do site**, **Informações e aparência**, **Administração**.

### Competição
- **campeonatos** — nome, slug, sigla, descrição, logo, banner, `temporadaAtual` (→ temporadas do próprio campeonato; fonte única de "temporada atual"), visibilidade, `orderable`.
- **temporadas** — campeonato, nome ("Campeonato X — 2026", gerado e editável), slug (único por campeonato), ano, descrição, logo/banner próprios, status (`planejada` | `em-andamento` | `encerrada`), `regra` (→ regras-pontuacao), `formatoEtapa` (lista de corridas padrão por categoria: nome, tipo, tabela de pontos, conta para a classificação, fator), `fonteDados` (`resultados` | `so-classificacao-final` para temporadas históricas), visibilidade. Encerrar grava a fotografia final (campeão, vice, 3º e linhas) e congela etapas/corridas/regra. Ação "Criar próxima temporada" duplica categorias, regra e formato.
- **temporada-categorias** (no menu: **Classificações**) — temporada, categoria, ordem, regra própria (opcional), `incluiResultadosDe` (categorias somadas), modo (`automatico` | `manual`), `ajustes` (inscrição, etapa opcional, tipo `penalidade`/`bonificacao`/`correcao`, pontos ±, motivo obrigatório, documento), `destaqueManual` (inscrição, rótulo "Destaque", exibir até), `linhasManuais` (só no modo manual; posição, piloto, número, equipe, pontos, vitórias, pódios, corridas, observação), `fotografiaFinal` (JSON, só leitura), campeão/vice/3º (→ inscrições), publicada. Índice único (temporada, categoria). Criada automaticamente para cada categoria da temporada.
- **categorias** — nome, sigla, slug, descrição, imagem, cor (validada), visibilidade, `orderable`.
- **equipes** — nome, sigla, logo, cidade, UF, visibilidade.
- **pilotos** — nome, nome de exibição, slug, foto, cidade, UF, biografia, visibilidade; privados (só painel): data de nascimento, autorização de imagem (sim/não, responsável, data, documento). Número/categoria/equipe vêm das **inscrições**. Aviso de possível duplicado; ação "Mesclar".
- **inscricoes** — temporada, categoria, piloto, número, equipe, condição (`titular` | `convidado`), status (`ativa` | `desistente` | `transferida` | `excluida`), observação. Índice único (temporada, categoria, piloto); número único entre inscrições ativas da mesma temporada/categoria. Convidado não pontua.
- **regras-pontuacao** — nome; `tabelas` (nome, pontos em ordem 1º, 2º, 3º… como lista numérica); pontos de pole, volta mais rápida e participação (+ requisito: `presente` | `largou` | `classificado`); abandono (`pela-posicao` | `so-participacao` | `zero`); percentual mínimo de voltas; convidados (`reclassificar-elegiveis` | `manter-posicoes`); descartes (quantidade, unidade `etapa` | `corrida`, a partir de N etapas realizadas, última etapa descartável?, desclassificação nunca é descartada); critérios de desempate (lista ordenada: mais vitórias, contagem de posições, melhor resultado na última etapa, mais poles); pontos com 1 casa decimal. Bloqueada para edição se usada por temporada encerrada; ação "Duplicar".
- **etapas** — temporada, número (padrão = último + 1), nome (padrão "3ª Etapa"), `inicio` e `fim` (data/hora com fuso), local (padrão = nome do kartódromo), categorias (padrão = da temporada), descrição, imagem, status (`agendada` | `confirmada` | `adiada` | `cancelada` | `realizada`, sendo `realizada` automática quando as corridas que contam estão oficiais), fator de pontuação, visibilidade; joins: corridas, notícias, galerias. Índice único (temporada, número). Título calculado ("2026 · 3ª Etapa · sáb 10/05"). Mudar data/status oferece "Publicar aviso".
- **corridas** (no menu: dentro de "Etapas e resultados") — etapa, categorias (normalmente uma), nome ("Bateria 1", "Final"), tipo (`tomada-de-tempo` | `classificatoria` | `bateria` | `pre-final` | `final`), tabela de pontos, conta para a classificação, fator, início, voltas previstas, status (`rascunho` | `oficial` | `cancelada`), **resultados** (lista editada numa grade tipo planilha: inscrição, posição de chegada, status `classificado` | `nao-classificado` | `abandono` | `desclassificado` | `nao-largou`, voltas, melhor volta (ms), penalidade {tipo `tempo` | `posicoes` | `pontos` | `advertencia`, valor, motivo}, posição oficial (calculada, editável com motivo), pontos manuais (opcional), observação). Pole = P1 da tomada de tempo da etapa/categoria; volta mais rápida = menor melhor volta (com substituição manual). Validações: inscrição única, posições oficiais únicas e contínuas. Gerada automaticamente pelo botão "Gerar corridas" a partir do formato da temporada.

### Kartódromo
- **horarios-treino** (grade semanal fixa) — dia da semana, hora início/fim (HH:mm, de 15 em 15 min), categorias (vazio = todas), tipo (→ tipos-treino), observação, válido de/até, visibilidade.
- **treinos** (agenda avulsa e exceções) — data, hora início/fim, categorias, tipo, status (`liberado` | `bloqueado` | `lotado` | `cancelado` | `extra`), substitui (→ horário da grade, opcional), motivo/observação, visibilidade. Ação "Bloquear período" (data, das/até, motivo).
- **tipos-treino** — nome, cor, descrição, ordem. (Valores iniciais genéricos e editáveis: Treino livre, Treino oficial, Tomada de tempo, Escolinha, Evento, Manutenção da pista.)
- Agenda = grade semanal + exceções, calculada por `src/lib/agenda.ts` (sem fim de validade "acidental").

### Conteúdo
- **noticias** — título, subtítulo, slug, capa, conteúdo (rich text com imagens e bloco de galeria), galeria, autor (padrão = nome do usuário), categoria (→ categorias-noticia), tags (→ tags), destaque, relacionados (temporada, etapa, categorias, pilotos), publicação.
- **categorias-noticia**, **tags** — nome, slug (cor nas categorias).
- **avisos** — título, texto, tipo (`alteracao-treino` | `alteracao-etapa` | `mudanca-horario` | `cancelamento` | `comunicado-oficial` | `informacao-importante`), nível (`informativo` | `atencao` | `urgente`), destaque (barra no topo), exibir de/até, relacionados (etapa, treino), anexo, publicação.
- **banners** (alimentam sempre o topo da home) — título, texto, mídia (imagem ou vídeo), imagem para celular, vídeo externo (URL), botão (texto + link), exibir de/até, publicação, `orderable`.
- **galerias** — título, slug, descrição, capa (padrão = 1ª foto), fotos (`upload` múltiplo e reordenável, envio em lote), tipo, exibição (`grade` | `carrossel` | `mosaico`), data, associações (campeonato, temporada, etapa, notícia, pilotos, categorias), publicação, `orderable`.
- **midia** — imagens (JPEG, PNG, WebP, AVIF; **sem SVG**) e vídeos (MP4/WebM); texto alternativo, legenda, crédito, pilotos marcados; tamanhos gerados; pastas (`folders`).
- **documentos** — arquivo (PDF, DOCX, XLSX, CSV, imagens), título, slug, tipo (→ tipos-documento), revisão, vigente desde, substitui, descrição, campeonato, temporada, categoria, publicação. Link público estável `/documentos/[slug]/arquivo` (sempre o arquivo atual).
- **tipos-documento** — nome, ordem (iniciais: Regulamento, Comunicado, Informativo, Tabela, Documento oficial, Outro).
- **eventos** — título, slug, início/fim, local, descrição, imagem, categorias, link de inscrição, publicação.
- **paginas** — páginas livres (título, slug, blocos de conteúdo, mostrar no menu).
- **atividades** — registro de auditoria só de inclusão (quem, o quê, quando).

### Globais
- **configuracoes** — nome da associação, sigla, logo (clara/escura), favicon, cores (validadas, contraste AA), campeonato principal, rodapé (texto, links), SEO padrão.
- **contato** — canais (tipo `telefone` | `whatsapp` | `email` | `outro`, rótulo, valor, provisório — marcado sozinho para `+55 61 00000-0000`, exibir no rodapé / na página de contato / na do kartódromo), endereço, horário de funcionamento, mapa (link do Google Maps ou coordenadas), redes sociais (rede, link validado).
- **pagina-inicial** — seções em blocos ordenáveis, cada um com liga/desliga, título, subtítulo, rótulo e link do botão: próxima etapa (com contagem), líderes, classificação, treinos, notícias da semana, comunicados, pilotos em destaque (escolhidos aqui), galeria em destaque (escolhida aqui), kartódromo, contato, patrocinadores/apoiadores (logos com link, só se o cliente fornecer).
- **institucional** — sobre, missão/valores, história, diretoria (nome, cargo, foto), galeria.
- **kartodromo** — nome, textos, galerias (→ galerias), estrutura (título, texto, imagem), dados da pista (rótulo → valor, só quando fornecidos), informações para pilotos e para visitantes. Endereço/contato vêm do global `contato`.
- **textos-paginas** — para cada rota fixa: título, subtítulo, introdução, imagem de topo, texto de estado vazio, SEO.
- **navegacao** — menu e colunas do rodapé com o campo de link reutilizável (`interno` → documento, `rota` → página fixa, `externo` → URL validada).

## 5. Regras derivadas (`src/lib`)

- `classificacao.ts` — função pura e testada: recebe regra, etapas, corridas, inscrições e ajustes e devolve linhas (posição, pontos, vitórias, pódios, corridas, poles, voltas mais rápidas, pontos por etapa com descartes marcados, posição anterior) e critérios aplicados. Considera só etapas `realizada`, corridas `oficial` que contam, fator de pontuação, convidados, abandono, penalidades (depois dos descartes), desempates.
- `agenda.ts` — expande a grade semanal no intervalo e aplica exceções/bloqueios.
- `estatisticas.ts` — totais por temporada a partir das classificações (automáticas ou manuais) e métricas por etapa a partir dos resultados.
- `datas.ts` — fuso America/Sao_Paulo, dia da semana, "hoje/amanhã/semana/próxima semana".
- `publico.ts` — única porta de leitura do site (`overrideAccess: false`, `draft: false`, `depth` e `select` explícitos, cache com tag `site`).
- `busca.ts` — texto normalizado (sem acento, minúsculo) gravado em `textoBusca` nas coleções pesquisáveis.

## 6. Painel administrativo (telas próprias)

- **Painel inicial**: temporada atual, próxima etapa (data, dia, contagem), categorias e pilotos ativos, líderes, treinos de hoje e amanhã, últimos resultados, notícias recentes e programadas, avisos em destaque, **pendências** (etapa passada sem resultado oficial, corrida em rascunho, classificação manual, contato provisório no ar, banner expirando, temporada sem regra) e os 10 atalhos com destino certo.
- **Lançar resultados**: temporada → etapa → categoria → corrida, grade tipo planilha pré-preenchida com os inscritos, ordem de chegada digitando os números ("33 12 7…"), colar do Excel/cronometragem, prévia de pontos, botões "Salvar rascunho" e "Publicar resultado oficial" (com prévia do efeito na classificação).
- **Classificação**: tabela calculada (somente leitura no modo automático) com "Ajustar pontos" por piloto (grava em `ajustes`), troca para manual só por administrador com confirmação.
- **Agenda de treinos**: semana atual e próxima; clicar num horário permite bloquear, cancelar, marcar lotado ou alterar só aquele dia.
- Coluna "Situação", busca por campos úteis (`listSearchableFields`), lixeira, histórico de versões, importação/exportação CSV (pilotos, equipes, categorias, inscrições, etapas, treinos).

## 7. Site público

Rotas: `/` · `/campeonatos` · `/campeonatos/[campeonato]` · `/campeonatos/[campeonato]/[temporada]` · `/classificacao` · `/calendario` · `/etapas/[id]` · `/resultados` · `/treinos` · `/pilotos` · `/pilotos/[slug]` · `/categorias` · `/categorias/[slug]` · `/noticias` · `/noticias/[slug]` · `/comunicados` · `/comunicados/[id]` · `/eventos` · `/eventos/[slug]` · `/galeria` · `/galeria/[slug]` · `/documentos` · `/documentos/[slug]/arquivo` · `/historico` · `/estatisticas` · `/kartodromo` · `/sobre` · `/contato` · `/busca` · `/[pagina]` · `sitemap.xml` · `robots.txt`.

Filtros por URL compartilhável: `/pilotos?categoria=&equipe=&q=`, `/resultados?temporada=&etapa=&categoria=&piloto=`, `/calendario?temporada=&categoria=&status=&tipo=etapas|eventos`, `/noticias?categoria=&tag=&de=&ate=&q=`, `/treinos?visao=hoje|amanha|semana|proxima-semana|calendario&categoria=&tipo=`, `/documentos?tipo=&temporada=&categoria=`, `/historico?campeonato=&temporada=`, `/estatisticas?temporada=&categoria=`.

Identidade: cores e logo da ASKART (verde, amarelo, preto; bandeira quadriculada é elemento da própria logo), tokens CSS gerados das cores das configurações. Celular: classificação com colunas fixas (posição, piloto, pontos) e detalhes expansíveis; treinos como agenda por dia.

## 8. Segurança

- Acesso explícito em todas as operações de todas as coleções/globais (fábrica que preenche o que faltar com "só administrador"); teste que falha se alguma ficar no padrão do Payload.
- Matriz: **administrador** tudo; **editor** conteúdo, competição e publicação, sem usuários/configurações; **colaborador** rascunhos de conteúdo, sem competição/globais.
- Login: bloqueio por tentativas, senha forte, `beforeLogin` recusa usuário desativado, sessões invalidadas ao desativar/trocar papel, último administrador protegido, primeiro usuário só por script (`npm run criar-admin`), papel padrão = colaborador.
- `serverURL`, `csrf`, `cors`, cookies `secure`/`SameSite`; cabeçalhos (HSTS, nosniff, Referrer-Policy, Permissions-Policy, `frame-ancestors 'self'`).
- API pública: limite de página (máx. 50) e profundidade (máx. 1) para anônimos; GraphQL Playground desligado em produção; endpoints próprios exigem papel.
- Uploads: tipos permitidos por coleção, sem SVG, limites (imagem 15 MB, vídeo 60 MB, documento 25 MB), nome aleatório no Blob.
- LGPD: dados de menores (nascimento, autorização de imagem) só no painel.
- Variáveis de ambiente validadas na inicialização (`src/env.ts`).

## 9. Testes (item 39)

Vitest: classificação (pontos, descartes, convidados, penalidades, desempates, etapa cancelada, temporada encerrada), agenda, estatísticas, matriz de acesso. Playwright (1280 e 390 px): login, painel inicial, categorias, pilotos, inscrições, etapa, mudança de data refletida em calendário/home/etapa, lançar resultados → classificação → líder, treinos (grade + exceção), notícia programada, banner, galeria, documento, contato/redes, histórico, filtros, busca, papéis, persistência após reinício.
