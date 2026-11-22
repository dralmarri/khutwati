#!/usr/bin/env bash
# تشغيل أو تحديث وسيط هاتف المنزل
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/../homephone/gateway"
command -v docker >/dev/null || { echo "Docker غير منصوب على الخادم."; exit 1; }
if [ ! -f .env ]; then
  cp .env.example .env
  echo "أُنشئ ملف الإعداد لأول مرة. املأه من طرفية الخادم ثم أعد التشغيل:"
  echo "  nano $(pwd)/.env"
  exit 1
fi

# خادم الويب: إن كان 443 مشغولاً ببرنامج آخر (nginx مثلاً) نعمل خلفه، وإلا نشغّل Caddy الخاص بنا
mode=caddy
if [ -z "$(docker compose --profile caddy ps -q caddy 2>/dev/null)" ] \
   && ss -ltn 2>/dev/null | grep -qE '[:.]443[[:space:]]'; then
  mode=external
fi
if [ "$mode" = caddy ]; then
  docker compose --profile caddy up -d --build --quiet-pull 2>&1 | tail -n 15
else
  docker compose up -d --build --quiet-pull 2>&1 | tail -n 15
  bash "$HERE/DEPLOY_homephone-nginx.sh" || echo "⚠️ ربط nginx لم يكتمل (التفاصيل أعلاه). الوسيط نفسه يعمل."
fi
sleep 6
bash "$HERE/DEPLOY_homephone-status.sh"
