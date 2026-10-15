#!/usr/bin/env bash
# Implantação (Vercel roda "npm run vercel-build" sozinho):
# 1. aplica as migrações do banco; 2. cria o primeiro administrador (ADMIN_EMAIL/ADMIN_SENHA), se ainda
# não houver usuários; 3. só na prévia (DADOS_DEMONSTRACAO=1), carrega os dados de demonstração;
# 4. gera o site.
set -euo pipefail
npm run migrate -- --force-accept-warning
npm run criar-admin
if [ "${DADOS_DEMONSTRACAO:-0}" = "1" ]; then
  PERMITIR_DEMO=1 npm run seed:demo
fi
npm run build
