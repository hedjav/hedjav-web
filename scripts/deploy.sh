#!/usr/bin/env bash
# ============================================================
# scripts/deploy.sh — Déploiement Hostinger VPS
#
# À exécuter SUR le VPS, dans /var/www/hedjav-web
#
# Usage : bash scripts/deploy.sh
# ============================================================
set -euo pipefail

echo "→ Pull main"
git fetch origin
git reset --hard origin/main

echo "→ Install deps (production)"
npm ci --omit=dev

echo "→ Build standalone"
npm run build

echo "→ Reload PM2"
pm2 reload hedjav || pm2 start ecosystem.config.js

echo "✅ Déploiement terminé"
pm2 status hedjav
