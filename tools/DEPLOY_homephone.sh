#!/usr/bin/env bash
# تشغيل أو تحديث وسيط هاتف المنزل
set -euo pipefail
cd "$(dirname "$0")/../homephone/gateway"
command -v docker >/dev/null || { echo "Docker غير منصوب على الخادم."; exit 1; }
if [ ! -f .env ]; then
  cp .env.example .env
  echo "أُنشئ ملف الإعداد لأول مرة. املأه من طرفية الخادم ثم أعد التشغيل:"
  echo "  nano $(pwd)/.env"
  exit 1
fi
docker compose up -d --build --quiet-pull 2>&1 | tail -n 15
sleep 6
bash "$(dirname "$0")/DEPLOY_homephone-status.sh"
