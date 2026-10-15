#!/usr/bin/env bash
# Implantação (Vercel roda "npm run vercel-build" sozinho):
# 1. aplica as migrações do banco; 2. cria o primeiro administrador (ADMIN_EMAIL/ADMIN_SENHA), se ainda
# não houver usuários; 3. só na prévia (DADOS_DEMONSTRACAO=1), carrega os dados de demonstração;
# 4. gera o site.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ] && [ -z "${POSTGRES_URL:-}" ]; then
  echo ""
  echo "Falta o banco de dados. Na Vercel: aba Storage → Create Database → Neon (Postgres) → conecte a este projeto."
  echo "Depois, em Storage → Create → Blob, conecte também o armazenamento de fotos. Em seguida: Deployments → Redeploy."
  echo ""
  exit 1
fi
if [ -z "${BLOB_READ_WRITE_TOKEN:-}" ] && [ "${VERCEL:-}" = "1" ]; then
  echo ""
  echo "Falta o armazenamento de fotos. Na Vercel: aba Storage → Create → Blob → conecte a este projeto e faça Redeploy."
  echo ""
  exit 1
fi
npm run migrate -- --force-accept-warning
npm run criar-admin
if [ "${DADOS_DEMONSTRACAO:-0}" = "1" ]; then
  PERMITIR_DEMO=1 npm run seed:demo
fi
npm run build
