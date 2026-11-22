#!/usr/bin/env bash
# تتبّع المكالمات: يعرض مسار ما جرى في آخر 5 دقائق (جرّب المكالمة أولاً ثم شغّله). معطى اختياري: عدد الدقائق
set -uo pipefail
cd "$(dirname "$0")/../homephone/gateway"
RUN="${AST_RUN:-docker compose exec -T asterisk}"
MINS="${1:-5}"
[[ "$MINS" =~ ^[0-9]+$ ]] || { echo "عدد الدقائق غير صالح"; exit 1; }

raw="$($RUN sh -c '
  f=/var/log/asterisk/full
  [ -f "$f" ] || { echo "NOLOG"; exit 0; }
  # السجل يكبر مع الوقت: نبدأ ملفاً جديداً إذا تجاوز 30 ميغابايت
  [ "$(wc -c < "$f")" -lt 30000000 ] || asterisk -rx "logger rotate" >/dev/null 2>&1
  cut="$(date -d "-'"$MINS"' min" "+%F %T")"
  tail -n 20000 "$f" | awk -v cut="$cut" "
    /^\\[[0-9][0-9][0-9][0-9]-/ { ts = substr(\$0, 2, 19) }
    ts >= cut { print }"
' | tr -d '\000\r')"

if [ "$raw" = "NOLOG" ]; then
  echo "السجل التفصيلي غير مفعّل بعد. نفّذ أولاً: deploy khutwati homephone"
  exit 1
fi

echo "— رسائل SIP في آخر $MINS دقائق (التطبيق = WS، البدالة = UDP) —"
echo "$raw" | sed -E 's/^\[[^]]*\] VERBOSE\[[0-9]+\] res_pjsip_logger\.c: (<---)/\1/' | awk '
  /^<--- (Transmitting|Received) SIP/ {
    dir = ($2 == "Transmitting") ? "←" : "→"
    sub(/^<--- [A-Za-z]+ SIP [a-z]+ \([0-9]+ bytes\) (to|from) /, ""); sub(/ --->$/, "")
    split($0, p, ":"); peer = p[1]; want = 1; recv = (dir == "→"); skip = 0; next
  }
  want == 1 { first = $0; want = 0; hold = 1; next }
  hold == 1 && /^CSeq:/ {
    hold = 0
    if ($0 ~ /(REGISTER|OPTIONS)$/) { skip = 1 } else { print dir " " peer " | " first }
    next
  }
  !skip && recv && /^(Warning|Reason):/ { print "      " $0 }
' | uniq -c | tail -n 24

echo "— آخر تجديدات التسجيل على البدالة —"
echo "$raw" | awk '
  /res_pjsip_logger\.c: <--- Received SIP response .* from UDP:/ { ts = substr($0, 13, 8); want = 1; next }
  /res_pjsip_logger\.c: <---/ { want = 0; inreg = 0; next }
  want == 1 { status = $0; sub(/^SIP\/2\.0 /, "", status); want = 2; next }
  want == 2 && /^To:/ { who = $0; sub(/^To: *<sip:/, "", who); sub(/@.*/, "", who) }
  want == 2 && /^CSeq:/ { if ($0 ~ /REGISTER$/) print ts "  تحويلة " who "  ←  " status; want = 0 }
' | grep -v "401 Unauthorized" | tail -n 4

echo "— خطوات المكالمة وملاحظات Asterisk —"
echo "$raw" | grep -E "\] (WARNING|ERROR)\[|app_dial\.c|Executing \[[^]]*\] (Dial|NoOp)|exited non-zero" \
  | grep -vE "res_pjsip_logger|declined to load|already registered|may be removed|was deprecated|res_hep|cdr_|cel_|voicemail|geolocation|pgsql|ldap|musiconhold|phoneprov|Already have an application|No configured users for ARI|asterisk/moh" \
  | sed -E 's/^\[[0-9-]+ ([0-9:]+)\] /\1 /; s/(VERBOSE|WARNING|ERROR)\[[0-9]+\](\[C-[0-9a-f]+\])? /\1 /; s/VERBOSE (pbx|app_dial)\.c: //' \
  | cut -c1-160 | uniq | tail -n 12

echo "— الإشعارات —"
docker compose logs --no-log-prefix --since "${MINS}m" push 2>/dev/null | grep -E "incoming call|push to|no devices|internal error|APNs problem" | tail -n 6 \
  | sed -E 's/incoming call [0-9a-f-]+ for/مكالمة واردة للتحويلة/' || true

grep -qE "res_pjsip_logger" <<<"$raw" || echo "لم تمرّ أي رسالة SIP في هذه المدة."
