# ASKART — site oficial e painel

Site da **ASKART — Associação de Pilotos de Kart de Brasília**, do **Kartódromo Ayrton Senna do Guará** e do **BKS — Brasília Kart Series**, com painel para o moderador atualizar tudo (calendário, horários, classificação, resultados, treinos, taxas, notícias, contatos).

- Escopo do cliente: [`docs/ESPECIFICACAO.md`](docs/ESPECIFICACAO.md) (o "Norte" escrito à mão vem primeiro).
- Decisões técnicas: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).
- Fotos e autorizações: [`docs/FOTOS.md`](docs/FOTOS.md) e [`marca/fotos-livres/CREDITOS.md`](marca/fotos-livres/CREDITOS.md).

## O que tem

**Site (4 abas):**
- **BKS** — calendário (tocar na etapa mostra os horários de cada categoria, o local com mapa e o botão da IZY Pass), classificação por categoria, resultados por etapa, história e campeões, fotos, regulamento.
- **Kartódromo** — onde fica, taxas (taxa de pista e taxa de ambulância mostram **"R$ X"** até o valor ser informado), tabela de treinos por categoria e agenda dos próximos 7 dias, como treinar, história, notícias, dúvidas recorrentes, contatos e Instagram.
- **Notícias** — notícias, anúncios e comunicados oficiais.
- **Contato** — telefones, WhatsApp, e-mail, endereço, mapa, redes sociais e dúvidas.

**Painel (`/admin`):** tela inicial com o que precisa de atenção e atalhos; competição (campeonatos, temporadas, categorias, pilotos, inscrições, etapas, corridas e resultados, regras de pontuação, classificações calculadas sozinhas); kartódromo (grade semanal de treinos e exceções); conteúdo (notícias, comunicados, galerias, documentos, páginas, perguntas frequentes); configurações, contato, menu e textos. Papéis: **administrador**, **moderador** e **colaborador** (só rascunhos). Todo registro fica no histórico de atividades.

**Regras de conteúdo:** nada oficial é inventado. Dados de demonstração só entram com `npm run seed:demo`, levam o prefixo `[DEMONSTRAÇÃO]` (o site mostra o selo "Exemplo") e saem com `npm run seed:limpar`. O telefone **+55 61 00000-0000** é o único contato fictício: o sistema o marca como provisório sozinho e o site nunca cria link de ligação para ele.

## Prévia na Vercel (passo a passo)

1. Na Vercel: **Add New → Project** → importe o repositório `site-askart`.
2. Antes de clicar em Deploy, abra **Environment Variables** e crie:
   - `PAYLOAD_SECRET` — um texto aleatório com 32 caracteres ou mais (ex.: o resultado de `openssl rand -hex 32`).
   - `ADMIN_EMAIL` e `ADMIN_SENHA` — o primeiro acesso ao painel (senha com 10+ caracteres, letras e números). `ADMIN_NOME` é opcional.
   - `DADOS_DEMONSTRACAO` = `1` — só na prévia, para o site aparecer preenchido com exemplos.
3. Clique em **Deploy**. A primeira tentativa vai falhar por falta de banco — é esperado.
4. No projeto, aba **Storage**:
   - **Create Database → Neon (Postgres)** → conecte ao projeto (cria `DATABASE_URL` sozinho).
   - **Create → Blob** → conecte ao projeto (cria `BLOB_READ_WRITE_TOKEN` sozinho).
5. Aba **Deployments** → no último deploy, **⋯ → Redeploy**. A implantação aplica o banco, cria o administrador, carrega os exemplos e publica o site.
6. Painel: `https://<endereço-da-prévia>/admin`, com o e-mail e a senha do passo 2.

Antes de divulgar o site oficial: no painel, troque o contato provisório, informe os valores das taxas e o link da IZY Pass, rode `npm run seed:limpar` (ou apague os exemplos) e desligue a faixa "Versão de demonstração" em **Configurações gerais → Prévia**. Remova `DADOS_DEMONSTRACAO` da Vercel.

## Desenvolvimento local

Requisitos: Node 20.9+ e PostgreSQL 16.

```bash
cp .env.example .env          # ajuste DATABASE_URL e PAYLOAD_SECRET
npm install
npm run migrate               # cria as tabelas
ADMIN_EMAIL=voce@exemplo.com ADMIN_SENHA=SenhaForte2026 npm run criar-admin
npm run seed:demo             # opcional: dados de demonstração
npm run dev                   # http://localhost:3000 e http://localhost:3000/admin
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` / `build` / `start` | Servidor de desenvolvimento, versão de produção e servidor de produção |
| `npm run migrate` | Aplica as migrações do banco |
| `npm run migrate:create <nome>` | Gera uma migração depois de mudar coleções ou globais |
| `npm run generate:types` / `generate:importmap` | Atualiza os tipos e o mapa de componentes do painel |
| `npm run criar-admin` | Cria o primeiro administrador (só quando ainda não há usuários) |
| `npm run seed:demo` / `seed:limpar` | Carrega / remove os dados de demonstração |
| `npm run test:int` | Testes do motor de classificação, agenda e estatísticas |

## Estrutura

```
src/
  access/           regras de acesso por papel
  collections/      competição, kartódromo, conteúdo e administração
  globals/          configurações, contato, kartódromo, página inicial, sobre, textos, menu
  hooks/competicao/ regras de integridade (inscrições, corridas, temporadas encerradas…)
  lib/              classificação, agenda, estatísticas, datas, leitura do site, revalidação
  components/site/  peças do site público
  components/admin/ tela inicial do painel e marca
  app/(frontend)/   páginas do site
  app/(payload)/    painel e API
scripts/            seed, limpeza, administrador e implantação
marca/              logos e fotos originais (com créditos)
```
