#!/usr/bin/env bash
# ربط وسيط هاتف المنزل بـnginx الموجود على الخادم (بلوك مستقل + شهادة TLS)
# يضيف ملفاً واحداً جديداً ولا يعدّل أي إعداد قائم. إن فشل فحص nginx يتراجع عنه.
set -euo pipefail
GW="$(cd "$(dirname "$0")/../homephone/gateway" && pwd)"
[ -f "$GW/.env" ] || { echo "املأ ملف $GW/.env أولاً."; exit 1; }
DOMAIN="$(sed -n 's/^GW_DOMAIN=[[:space:]]*//p' "$GW/.env" | tr -d '\r"'"'"' ' | tail -n 1)"
[[ "$DOMAIN" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]] || { echo "GW_DOMAIN في .env فارغ أو غير صالح."; exit 1; }

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx ليس منصوباً مباشرة على الخادم (ربما يعمل داخل Docker)."
  echo "أرسل ناتج الأمر:  docker ps --format '{{.Names}}  {{.Image}}  {{.Ports}}'"
  exit 1
fi

CONF_TEXT="$(nginx -T 2>/dev/null || true)"
if grep -q 'conf\.d/\*\.conf' <<<"$CONF_TEXT"; then CONF=/etc/nginx/conf.d/zz-homephone.conf
elif grep -q 'sites-enabled/' <<<"$CONF_TEXT"; then CONF=/etc/nginx/sites-enabled/zz-homephone.conf
else echo "لم أجد مجلد إعدادات مضمَّناً في nginx (conf.d أو sites-enabled)."; exit 1
fi
SNIP=/etc/nginx/homephone.locations
ACME=/var/www/homephone-acme
LIVE="/etc/letsencrypt/live/$DOMAIN"

# النطاق مستخدم في بلوك آخر؟ لا نضيف بلوكاً ثانياً بالاسم نفسه ولا نعدّل ملفات مشروع آخر.
OTHER="$(grep -rlE "^[[:space:]]*server_name[^;]*[[:space:]]${DOMAIN//./\\.}([[:space:]][^;]*)?;" /etc/nginx 2>/dev/null | grep -v "$CONF" || true)"
if [ -n "$OTHER" ]; then
  install -m 644 "$GW/nginx-homephone.locations" "$SNIP"
  echo "النطاق $DOMAIN مستخدم مسبقاً في:"
  echo "$OTHER" | sed 's/^/  /'
  echo "لم أعدّل هذا الملف. الحل الأسهل: اجعل GW_DOMAIN نطاقاً غير مستخدم (نطاق فرعي جديد يشير للخادم) وأعد التشغيل."
  echo "أو أضف يدوياً داخل بلوك server (443) لذلك النطاق السطر:  include $SNIP;"
  exit 1
fi

write_conf() { # $1 = with_tls (0/1)
  {
    echo "# هاتف المنزل — يولّده tools/DEPLOY_homephone-nginx.sh"
    echo "server {"
    echo "    listen 80;"
    echo "    listen [::]:80;"
    echo "    server_name $DOMAIN;"
    echo "    location /.well-known/acme-challenge/ { root $ACME; }"
    echo "    location / { return 301 https://\$host\$request_uri; }"
    echo "}"
    if [ "$1" = 1 ]; then
      echo "server {"
      echo "    listen 443 ssl;"
      echo "    listen [::]:443 ssl;"
      echo "    server_name $DOMAIN;"
      echo "    ssl_certificate $LIVE/fullchain.pem;"
      echo "    ssl_certificate_key $LIVE/privkey.pem;"
      echo "    include $SNIP;"
      echo "    location / { return 404; }"
      echo "}"
    fi
  } > "$CONF"
}
apply() {
  if ! nginx -t >/tmp/homephone-nginx-test.log 2>&1; then
    rm -f "$CONF"
    echo "فحص nginx فشل فتراجعت عن التغيير (إعدادك السابق لم يُمسّ):"
    tail -n 6 /tmp/homephone-nginx-test.log
    exit 1
  fi
  nginx -s reload
}

mkdir -p "$ACME"
install -m 644 "$GW/nginx-homephone.locations" "$SNIP"

if [ ! -f "$LIVE/fullchain.pem" ]; then
  write_conf 0
  apply
  if ! command -v certbot >/dev/null 2>&1; then
    command -v apt-get >/dev/null 2>&1 || { echo "certbot غير منصوب. نصّبه ثم أعد التشغيل."; exit 1; }
    echo "تنصيب certbot…"
    DEBIAN_FRONTEND=noninteractive apt-get install -y -q certbot >/dev/null
  fi
  echo "طلب شهادة TLS للنطاق $DOMAIN …"
  certbot certonly --webroot -w "$ACME" -d "$DOMAIN" -n --agree-tos --register-unsafely-without-email \
    --deploy-hook "nginx -s reload" 2>&1 | tail -n 8
  [ -f "$LIVE/fullchain.pem" ] || { echo "لم تصدر الشهادة. تأكد أن $DOMAIN يشير إلى هذا الخادم."; exit 1; }
fi
write_conf 1
apply
echo "nginx جاهز: $CONF"
sleep 1
echo "فحص: $(curl -fsS -m 8 "https://$DOMAIN/homephone/api/health" 2>&1 || true)"
