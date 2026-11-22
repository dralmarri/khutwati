#!/usr/bin/env bash
# حالة وسيط هاتف المنزل: التسجيل على البدالة والأجهزة المتصلة
set -uo pipefail
cd "$(dirname "$0")/../homephone/gateway"
echo "— الحاويات —"
docker compose ps --format '{{.Service}}: {{.Status}}'
if ! docker compose exec -T asterisk asterisk -rx "core show version" >/dev/null 2>&1; then
  echo "— Asterisk لا يعمل. آخر ما كتبه: —"
  docker compose logs --no-log-prefix --tail 400 asterisk 2>&1 | sed 's/\x1b\[[0-9;]*m//g' \
    | grep -vE "declined to load|already registered|ALSA lib|may be removed|was deprecated" | tail -n 14
  exit 1
fi
echo "— التسجيل على البدالة —"
docker compose exec -T asterisk asterisk -rx "pjsip show registrations" 2>&1 | grep -E "^ *reg[0-9]+/|Objects found|No objects|Unable" || echo "(Asterisk لا يرد)"
echo "— الجوالات المتصلة الآن —"
docker compose exec -T asterisk asterisk -rx "pjsip show contacts" 2>&1 | grep -E "^ *Contact: +[0-9]+/" | awk '{print "  تحويلة " substr($2,1,index($2,"/")-1) "  " $4}' | sort | uniq -c || true
echo "— خدمة الإشعارات —"
docker compose logs --no-log-prefix --tail 200 push 2>/dev/null | grep -E "^extensions:" | tail -n 1 || echo "(لا تعمل)"
DOMAIN="$(sed -n 's/^GW_DOMAIN=[[:space:]]*//p' .env 2>/dev/null | tr -d '\r" ' | tail -n 1)"
echo "— الوصول من الإنترنت (https://$DOMAIN) —"
curl -fsS -m 8 "https://$DOMAIN/homephone/api/health" 2>&1 || echo "(غير متاح بعد)"
echo
