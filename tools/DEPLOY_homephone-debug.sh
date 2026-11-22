#!/usr/bin/env bash
# تشخيص التسجيل على البدالة: يعرض ما يرسله الوسيط وما تردّ به البدالة خلال 12 ثانية
set -uo pipefail
cd "$(dirname "$0")/../homephone/gateway"
RUN="${AST_RUN:-docker compose exec -T asterisk}"
raw="$($RUN sh -c '
  asterisk -rx "pjsip set logger on" >/dev/null
  asterisk -rx "pjsip send register *all" >/dev/null
  (sleep 12) | timeout 14 asterisk -rvvvv 2>&1
' | tr -d '\000' | sed 's/\x1b\[[0-9;]*[A-Za-z]//g' | tr -d '\r')"

# لكل رسالة: الاتجاه وسطرها الأول، وللردود الواردة أسباب الرفض إن وُجدت. المكرر يُجمع بعدد.
echo "$raw" | awk '
  /^<--- (Transmitting|Received) SIP/ {
    dir = ($2 == "Transmitting") ? "أرسلنا ←" : "وصلنا  →"
    sub(/^<--- [A-Za-z]+ SIP [a-z]+ \([0-9]+ bytes\) (to|from) /, ""); sub(/ --->$/, "")
    peer = $0; want = 1; recv = (dir ~ /وصلنا/); next
  }
  want == 1 { print dir " " peer "  |  " $0; want = 0; next }
  recv && /^(Warning|Reason|WWW-Authenticate|Contact|Expires):/ { print "          " $0 }
  /^$/ { recv = 0 }
' | uniq -c | head -n 30

sent="$(grep -c '^<--- Transmitting SIP' <<<"$raw")"
got="$(grep -c '^<--- Received SIP' <<<"$raw")"
echo "— الخلاصة: أُرسلت $sent رسالة ووصلت $got —"
if [ "$sent" -eq 0 ]; then
  echo "الوسيط لم يرسل شيئاً. أرسل ناتج: deploy khutwati homephone-logs"
elif [ "$got" -eq 0 ]; then
  echo "البدالة لم تردّ إطلاقاً: الرسائل لا تصلها أو ردّها لا يصلنا (عنوان/منفذ المنزل، أو جدار ناري)."
fi
$RUN asterisk -rx "pjsip show registrations" 2>&1 | grep -E "^ *reg[0-9]+/"
