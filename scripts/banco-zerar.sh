#!/usr/bin/env bash
# Só para desenvolvimento local: apaga e recria o banco "askart" e aplica as migrações.
set -euo pipefail
su postgres -c "psql -q -c 'drop database if exists askart' -c 'create database askart owner askart'"
rm -rf midia documentos 2>/dev/null || true
npm run --silent migrate
