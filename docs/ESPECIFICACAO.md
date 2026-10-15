# Especificação do cliente — Site oficial da ASKART

## ⭐ Norte do cliente (anotações à mão, 15/10/2026)

Imagem original: [`anotacoes-cliente-2026-10-15.jpg`](anotacoes-cliente-2026-10-15.jpg). **Esta é a prioridade do projeto**; o texto detalhado mais abaixo complementa. ■ = "precisa ter a capacidade de ser editado pelo moderador".

**BKS = Brasília Kart Series** (o campeonato principal).

1. **Abas do site:** BKS · Kartódromo · Contatos · Notícias.
2. **BKS:**
   - ■ Calendário com as datas de cada etapa do ano; **clicar na data mostra os horários de cada categoria**.
   - ■ Tabela de liderança de cada categoria, com nome dos pilotos e número de pontos.
   - ■ Resultado de cada etapa numa sub-aba chamada **Resultados**.
   - ■ Onde cada etapa vai ser, **com link para o mapa**.
   - História do campeonato.
   - ■ **Link da IZY Pass** para comprar treinos livres e corridas de cada etapa.
   - Usar a **logo do BKS** em vários lugares e **várias fotos do campeonato**.
3. **Kartódromo:**
   - Onde fica. História dele. Logo da ASKART em alguns lugares.
   - Taxas e valores (de pista, ambulância etc. — palavra parcialmente ilegível na anotação; confirmar).
   - ■ Tabela de dias e horários de treino de cada categoria.
   - Como treinar lá.
   - ■ Notícias (avisar se algo aconteceu ou vai acontecer lá).
   - ■ Contatos importantes (telefone, WhatsApp e e-mail).
   - Aba de **dúvidas recorrentes** (perguntas frequentes).
   - Instagram em algum lugar.
4. O site é da **instituição ASKART**: precisa ser **bem profissional (nível site governamental)**. Várias coisas são atualizadas ao longo do tempo por um **moderador** (tabela de liderança, pontos de cada piloto etc.); a edição tem que ser **fácil** e **só o moderador** pode fazer. Ele também faz **posts como notícias ou anúncios**.
5. Seria bom ter uma **IA integrada**: o moderador manda para ela o que quer postar ou alterar e ela **já atualiza automaticamente** no site.

---

## Pedido detalhado (texto enviado em 15/10/2026)

Texto enviado pelo cliente em 15/10/2026 (fonte oficial do escopo). Resumo fiel, item por item; os 40 itens originais são a referência de aceite.

**Projeto:** site oficial, completo, moderno, profissional e funcional da **ASKART — Associação de Kart de Brasília**, responsável pela administração do **Kartódromo Ayrton Senna do Guará** (Brasília/DF) e pela organização dos campeonatos de kart de Brasília. Não é um site estático: é uma **plataforma dinâmica com banco de dados e painel administrativo robusto**, em que o administrador controla, edita, adiciona, remove, atualiza e publica praticamente tudo do site público. **Não inventar informações oficiais**; quando não fornecidas, deixar a estrutura pronta.

1. **Objetivo:** portal que reúna institucional da ASKART, kartódromo, campeonatos, temporadas, categorias, pilotos, classificações, pontuações, resultados, calendário de etapas, programação de treinos, notícias, comunicados, galeria, documentos/regulamentos, histórico, estatísticas, contatos, redes sociais e informações para pilotos e visitantes. Imagem de organização esportiva profissional.
2. **Controle total pelo admin:** painel moderno, intuitivo, com login. Criar, editar, excluir, ocultar, publicar, despublicar, ativar/desativar, reordenar, programar, atualizar e substituir conteúdos. Toda informação que pode mudar fica no banco e é editável; nada dinâmico fixo no código.
3. **Dados fornecidos pelo cliente progressivamente:** logo, identidade, cores, fotos (kartódromo, pilotos, karts, corridas, treinos, eventos), logos de campeonatos/categorias, categorias, pilotos, números, equipes, classificações, pontuações, resultados, datas, calendário, treinos, horários, institucional, notícias, comunicados, regulamentos, documentos, redes, contatos. Criar primeiro a estrutura com campos prontos.
4. **Dashboard do admin:** campeonato atual, temporada atual, próxima etapa e data, categorias, pilotos cadastrados, líderes das categorias, próximos treinos, últimos resultados, notícias recentes, avisos importantes. Atalhos: nova notícia, novo piloto, nova categoria, editar classificação, editar calendário, editar programação de treinos, adicionar etapa, adicionar resultado, gerenciar fotos, gerenciar documentos.
5. **Gestão de conteúdo:** textos, títulos, subtítulos, imagens, fotos, logos, banners, botões, links, notícias, comunicados, institucional, kartódromo, campeonatos, contatos, redes. Editores visuais e campos simples.
6. **Página inicial** impactante e administrável: logo, foto/vídeo de destaque do kartódromo, campeonato atual, próxima etapa, contagem regressiva, próximos treinos, classificações, pilotos em destaque, líderes, notícias da semana, comunicados, galeria, kartódromo, contato. Admin escolhe o que aparece em destaque.
7. **Notícias** (seção + "Notícias da Semana" na home): criar, editar, excluir, publicar, despublicar, programar publicação, capa, imagens, destaque, data, autor, categoria, tags. Campos: título, subtítulo, texto, capa, galeria, data, autor, categoria, tags, status.
8. **Campeonatos e temporadas:** várias temporadas (ex.: Campeonato Brasiliense de Kart — 2026, 2027, 2028). Cada campeonato: nome, temporada, descrição, logo, banner, regulamento, categorias, etapas, calendário, classificação, resultados, status. Tudo editável.
9. **Categorias:** nome, sigla, descrição, imagem, cor, pilotos, classificação, resultados, histórico. Criar, editar, excluir, ativar, desativar.
10. **Pilotos:** adicionar, editar, excluir, ativar/desativar, alterar categoria, número, equipe, foto. Campos: nome, nome de exibição, número, categoria, foto, equipe, cidade/UF, biografia, pontuação, vitórias, pódios, participações, resultados, histórico.
11. **Classificação** por categoria: posição, número do kart, piloto, equipe, pontos, vitórias, pódios, corridas, outros indicadores. Edição manual de piloto, número, equipe, pontuação, posição, estatísticas, resultados. **Modo automático** (calcula a partir dos resultados e das regras cadastradas) e **modo manual**. Admin tem controle final do que é exibido.
12. **Piloto líder** de cada categoria identificado automaticamente (foto, nome, número, equipe, pontuação, posição), com opção de destaque manual.
13. **Resultados** por corrida: piloto, número, posição, pontos, voltas, status, observações; alimentam a classificação automaticamente.
14. **Etapas:** criar, editar, excluir, alterar data, horário, local, categorias, status; adicionar informações, resultados, fotos, notícias relacionadas. Campos: número, nome, data, dia da semana, horário, local, categorias, descrição, status, resultados, fotos, notícias.
15. **Calendário** visual e profissional; mudança de data no painel reflete em todo o site. Mostrar etapa, data, dia da semana, local, categorias, status.
16. **Grade de treinos** do kartódromo, totalmente administrável: criar/editar/excluir horários, alterar datas, dias, categorias, duração, tipo de treino, observações, bloquear/liberar horários. Registro: data, dia da semana, hora inicial, hora final, categoria, tipo, observação, status. Visualizações: hoje, amanhã, semana, próxima semana, calendário, categoria.
17. **Página do Kartódromo Ayrton Senna do Guará:** fotos (pista, estrutura, boxes, karts, pilotos, corridas, treinos, eventos), informações gerais, horários, programação, contato, localização. Tudo editável.
18. **Galerias:** upload, excluir, substituir, reordenar, criar galerias, definir capa, descrição, associar fotos a etapas, notícias, pilotos e campeonatos. Grids, carrosséis, destaques.
19. **Identidade visual** a partir da logo e materiais oficiais (a fornecer). Sem identidade genérica. Transmitir velocidade, competição, tecnologia, precisão, automobilismo, organização, credibilidade, profissionalismo.
20. **Banners da home:** adicionar, imagem, título, texto, botão, link, período de exibição, ativar/desativar, reordenar.
21. **Avisos e comunicados oficiais** (alteração de treino, de etapa, mudança de horário, cancelamento, comunicado oficial, informação importante). Admin define quais ficam em destaque.
22. **Regulamentos e documentos:** regulamentos, comunicados, PDFs, documentos oficiais, informativos, tabelas, outros. Upload, substituir, excluir, atualizar.
23. **Histórico:** temporadas e campeonatos anteriores, categorias, campeões, classificações, pilotos, resultados, estatísticas, fotos. Arquivo histórico do kartismo de Brasília.
24. **Estatísticas:** mais vitórias, mais pódios, maior pontuação, participações, evolução de pontuação, desempenho por etapa, histórico por temporada. Gráficos quando ajudarem.
25. **Contato do kartódromo:** telefone, WhatsApp, e-mail, endereço, horário de funcionamento, redes, mapa, outros canais — todos editáveis. Provisoriamente usar **+55 61 00000-0000**, que é **fictício/provisório** e não pode ser apresentado como contato oficial.
26. **Redes sociais** editáveis.
27. **Configurações gerais:** nome da associação, logo, favicon, cores, telefones, e-mails, endereço, redes, links, institucional, kartódromo, textos do rodapé, outros dados gerais.
28. **Pesquisa e filtros:** pilotos, categorias, campeonatos, temporadas, etapas, resultados, notícias, treinos, datas.
29. **Controle de publicação:** rascunho, publicado, oculto, programado, arquivado.
30. **Design** profissional, sofisticado, impactante, sem cara de template; fotos reais; hero, imagens grandes, cards, tabelas modernas, animações sutis, transições, tipografia moderna, ícones, gráficos, indicadores, elementos de automobilismo, ótima hierarquia. Sem excesso de animação.
31. **Responsividade** total; classificação e grade de treinos muito bem adaptadas ao celular.
32. **Banco de dados** estruturado e escalável: administradores, usuários, campeonatos, temporadas, categorias, pilotos, equipes, etapas, corridas, resultados, classificações, treinos, notícias, avisos, banners, galerias, fotos, documentos, configurações. Sem duplicação desnecessária.
33. **Segurança:** autenticação no painel; boas práticas em login, senhas, sessões, rotas administrativas, validação, uploads, controle de acesso; preparado para níveis (administrador, editor, colaborador).
34. **Experiência do admin:** pessoa sem conhecimento técnico consegue alterar data, horário, cadastrar piloto, alterar pontuação, atualizar classificação, publicar notícia, adicionar foto, trocar banner, alterar contato, atualizar calendário e treinos. Alterações atualizam automaticamente os locais relacionados.
35. **Dados reais** serão enviados depois e incorporados de forma organizada e editável.
36. **Não inventar** nomes, categorias, campeonatos, datas, resultados, pontuações, contatos, endereços ou qualquer dado oficial. Campos provisórios claramente identificados. Único contato fictício autorizado: +55 61 00000-0000, identificado como provisório/demonstração.
37. **Escalabilidade** para vários anos: novas temporadas, campeonatos, categorias, pilotos, etapas, notícias, eventos, galerias, documentos sem reconstruir o site.
38. **Futuro** (não implementar agora, mas não impedir): inscrições, área do piloto, pagamentos, ranking, estatísticas avançadas, resultados em tempo real, integração com redes e cronometragem, notificações, mais níveis de usuário, aplicativo.
39. **Testes e revisão final:** login, dashboard, categorias, pilotos (cadastro e edição), classificação, pontuação, resultados, líderes, etapas, calendário, alteração de datas, grade de treinos, alteração de horários, notícias, banners, fotos, galerias, documentos, contatos, redes, histórico, filtros, pesquisa, responsividade, segurança, persistência; e verificar que uma alteração aparece em todos os lugares onde é usada.
40. **Resultado final:** plataforma oficial e profissional, fácil de administrar. Regra principal: **se uma informação aparece no site e pode mudar, ela é editável pelo painel.** Prioridades: profissionalismo + facilidade de administração + experiência visual + organização + velocidade + responsividade + segurança + escalabilidade.
