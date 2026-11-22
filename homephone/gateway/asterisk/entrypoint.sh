#!/bin/sh
# يملأ قوالب الإعداد من متغيرات البيئة، ويولّد إعداد كل تحويلة، ثم يشغّل Asterisk
set -eu
TEMPLATES="${TEMPLATES:-/templates}"
OUT="${CONF_OUT:-/etc/asterisk}"

fail() { echo "خطأ في ملف .env: $1" >&2; exit 1; }

# كلمة المرور: حروف إنجليزية وأرقام وأغلب الرموز. الممنوع: المسافة، الحروف غير الإنجليزية،
# والرموز ; \ " ' $ ` لأنها تُفسد ملف الإعداد. الرسالة تذكر نوع المشكلة دون عرض الكلمة.
check_pw() {
  rest="$(printf '%s' "$2" | LC_ALL=C tr -d 'A-Za-z0-9!#%&()*+,./:<=>?@^_{|}~[]-')"
  [ -z "$rest" ] && return 0
  case "$rest" in
    *[[:space:]]*) why="فيها مسافة (ربما في آخر السطر)" ;;
    *[\;\\\"\'\$\`]*) why="فيها أحد الرموز الممنوعة: ; \\ \" ' \$ \`" ;;
    *) why="فيها حروف غير إنجليزية أو أرقام عربية (٠-٩)" ;;
  esac
  fail "$1 $why"
}

for v in PBX_PUBLIC_HOST PBX_PUBLIC_PORT PBX_LAN_IP PBX_LAN_PORT PBX_EXTS GW_SIP_PORT; do
  eval "val=\${$v:-}"
  [ -n "$val" ] || fail "المتغير $v غير معرّف"
done
: "${RING_SECONDS:=45}"; export RING_SECONDS

VARS='$PBX_PUBLIC_HOST $PBX_PUBLIC_PORT $PBX_LAN_IP $PBX_LAN_PORT $GW_SIP_PORT $RING_SECONDS'
for f in "$TEMPLATES"/*; do
  envsubst "$VARS" < "$f" > "$OUT/$(basename "$f")"
done

PJSIP="$OUT/pjsip_lines.conf"
EXTS="$OUT/extensions_lines.conf"
: > "$PJSIP"
echo "[from-pbx]" > "$EXTS"
PROXY="sip:${PBX_PUBLIC_HOST}:${PBX_PUBLIC_PORT}\;lr"
first=""

for ext in $(echo "$PBX_EXTS" | tr ',' ' '); do
  case "$ext" in ''|*[!0-9]*) fail "رقم تحويلة غير صالح في PBX_EXTS: $ext";; esac
  eval "pbx_pw=\${PBX_PASSWORD_$ext:-}"
  eval "app_pw=\${MOBILE_PASSWORD_$ext:-}"
  [ -n "$pbx_pw" ] || fail "PBX_PASSWORD_$ext غير معرّف"
  [ -n "$app_pw" ] || fail "MOBILE_PASSWORD_$ext غير معرّف"
  check_pw "PBX_PASSWORD_$ext" "$pbx_pw"
  check_pw "MOBILE_PASSWORD_$ext" "$app_pw"
  [ -n "$first" ] || first="$ext"

  cat >> "$PJSIP" <<CONF
; ================= التحويلة $ext =================
; --- جهة البدالة: تسجيل ونقطة اتصال للمكالمات الصادرة ---
[reg$ext]
type=registration
transport=transport-udp
outbound_auth=pbxauth$ext
server_uri=sip:${PBX_LAN_IP}:${PBX_LAN_PORT}
client_uri=sip:$ext@${PBX_LAN_IP}:${PBX_LAN_PORT}
outbound_proxy=$PROXY
contact_user=$ext
expiration=300
retry_interval=30
forbidden_retry_interval=300
max_retries=1000000

[pbxauth$ext]
type=auth
auth_type=userpass
username=$ext
password=$pbx_pw

[pbx$ext](pbx-trunk)
outbound_auth=pbxauth$ext
from_user=$ext

; --- جهة التطبيق: الأجهزة التي تستخدم هذه التحويلة ---
[$ext]
type=aor
max_contacts=5
remove_existing=yes

[appauth$ext]
type=auth
auth_type=userpass
username=$ext
password=$app_pw

[$ext](app-device)
aors=$ext
auth=appauth$ext
set_var=HPEXT=$ext

CONF
  echo "exten => $ext,1,Goto(incoming,$ext,1)" >> "$EXTS"
done

[ -n "$first" ] || fail "PBX_EXTS فارغ"
# المكالمات الواردة من البدالة تُطابَق بعنوانها، ورقم التحويلة المطلوبة يأتي في الدعوة نفسها
cat >> "$PJSIP" <<CONF
[pbx-identify]
type=identify
endpoint=pbx$first
match=${PBX_PUBLIC_HOST}
CONF
# إن لم تحمل الدعوة رقم تحويلة معروفاً نوجّهها للتحويلة الأولى
echo "exten => _[+*#0-9a-zA-Z]!,1,Goto(incoming,$first,1)" >> "$EXTS"
echo "exten => s,1,Goto(incoming,$first,1)" >> "$EXTS"

[ -z "${RENDER_ONLY:-}" ] || exit 0
exec asterisk -f
