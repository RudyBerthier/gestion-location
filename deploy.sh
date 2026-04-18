#!/bin/bash
# ============================================================
# 🚀 DEPLOY — Gestion-Locative
# Usage depuis ton Mac : ./deploy.sh "message du commit"
# ============================================================

MSG=${1:-"deploy $(date '+%Y-%m-%d %H:%M')"}
SERVER="ubuntu@141.253.127.90"
KEY="$HOME/Downloads/ssh-key-2026-04-18.key"

echo ""
echo "╔════════════════════════════════╗"
echo "║   🚀 Déploiement en cours...   ║"
echo "╚════════════════════════════════╝"
echo ""

# ── 1. Push vers GitHub ──────────────────────────────────
echo "📦 Push GitHub..."
git add .
git commit -m "$MSG" 2>/dev/null || echo "   (rien à committer)"
git push origin main:simple
echo "   ✅ GitHub OK"
echo ""

# ── 2. Mise à jour sur le serveur ────────────────────────
echo "🖥️  Mise à jour du serveur Oracle..."
ssh -i "$KEY" "$SERVER" << 'ENDSSH'
  set -e
  cd /var/www/gestion-locative

  echo "  → git pull..."
  git pull origin simple

  echo "  → npm install..."
  npm install --silent

  echo "  → build frontend..."
  npm run build

  echo "  → restart backend..."
  pm2 restart gestion-locative-api

  echo ""
  echo "  ✅ Serveur mis à jour !"
  pm2 list
ENDSSH

echo ""
echo "╔════════════════════════════════╗"
echo "║   ✅ Déploiement terminé !     ║"
echo "║   🌐 https://rberthier.fr      ║"
echo "╚════════════════════════════════╝"
echo ""
