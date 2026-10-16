#!/usr/bin/env bash
# Implantação (Vercel roda "npm run vercel-build" sozinho):
# 1. aplica as migrações do banco; 2. cria o primeiro administrador (ADMIN_EMAIL/ADMIN_SENHA), se ainda
# não houver usuários; 3. carrega os dados oficiais (grade, taxas, endereço) uma única vez; 4. só na prévia (DADOS_DEMONSTRACAO=1), carrega os dados de demonstração;
# 5. gera o site.
set -euo pipefail

# Aceita as variáveis também com prefixo (a Vercel às vezes cria, por exemplo, STORAGE_DATABASE_URL)
achar() {
  for s in "$@"; do
    for n in $(compgen -e | grep -E "(^|_)${s}$" || true); do
      if [ -n "${!n}" ]; then echo "${!n}"; return 0; fi
    done
  done
}
export DATABASE_URL="${DATABASE_URL:-$(achar DATABASE_URL POSTGRES_URL)}"
export BLOB_READ_WRITE_TOKEN="${BLOB_READ_WRITE_TOKEN:-$(achar BLOB_READ_WRITE_TOKEN)}"

if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo "Falta o banco de dados. Na Vercel: aba Storage → Create Database → Neon (Postgres) → conecte a este projeto"
  echo "(marque Production, Preview e Development). Se já conectou, confira em Settings → Environment Variables."
  echo "Depois, em Storage → Create → Blob, conecte também o armazenamento de fotos. Em seguida: Deployments → Redeploy."
  echo "Variáveis de banco/fotos que este deploy recebeu (só os nomes): $(for n in $(compgen -e | grep -iE 'database|postgres|^pg|neon|blob' || true); do [ -n "${!n}" ] && printf '%s ' "$n"; done; true)"
  echo ""
  exit 1
fi
if [ -z "$BLOB_READ_WRITE_TOKEN" ] && [ "${VERCEL:-}" = "1" ]; then
  echo ""
  echo "Falta o armazenamento de fotos. Na Vercel: aba Storage → Create → Blob → conecte a este projeto e faça Redeploy."
  echo ""
  exit 1
fi
npm run migrate -- --force-accept-warning
npm run criar-admin
npm run dados:oficiais
if [ "${DADOS_DEMONSTRACAO:-0}" = "1" ]; then
  PERMITIR_DEMO=1 npm run seed:demo
fi
npm run build
