#!/usr/bin/env bash
# تتبّع مكالمة: شغّله ثم أجرِ المكالمة خلال 40 ثانية، فيعرض مسارها بين التطبيق والوسيط والبدالة
set -uo pipefail
cd "$(dirname "$0")/../homephone/gateway"
RUN="${AST_RUN:-docker compose exec -T asterisk}"
SECS="${1:-40}"
raw="$($RUN sh -c '
  asterisk -rx "pjsip set logger on" >/dev/null
  (sleep '"$SECS"') | timeout '"$((SECS + 3))"' asterisk -rvvvv 2>&1
  asterisk -rx "pjsip set logger off" >/dev/null
' | tr -d '\000' | sed 's/\x1b\[[0-9;]*[A-Za-z]//g' | tr -d '\r')"

echo "— رسائل SIP (التطبيق = WS، البدالة = UDP) —"
echo "$raw" | awk '
  /^<--- (Transmitting|Received) SIP/ {
    dir = ($2 == "Transmitting") ? "←" : "→"
    sub(/^<--- [A-Za-z]+ SIP [a-z]+ \([0-9]+ bytes\) (to|from) /, ""); sub(/ --->$/, "")
    split($0, p, ":"); peer = p[1]; want = 1; recv = (dir == "→"); next
  }
  want == 1 { if ($0 !~ /^(REGISTER|OPTIONS) / && $0 !~ / (REGISTER|OPTIONS)$/) print dir " " peer " | " $0; want = 0; next }
  recv && /^(Warning|Reason):/ { print "      " $0 }
  /^$/ { recv = 0 }
' | grep -vE "SIP/2.0 (401|200 OK)$" | uniq -c | head -n 22

echo "— ملاحظات Asterisk —"
echo "$raw" | grep -E "WARNING|ERROR|Everyone is busy|is ringing|answered|Called PJSIP|exited non-zero|No such|not found|Failed|failed" \
  | grep -vE "^<---|ALSA|history file" | sed -E 's/^\[[^]]*\] *//; s/\[[0-9]+\](\[C-[0-9a-f]+\])?: //' | cut -c1-170 | uniq | head -n 12

n="$(grep -cE '^<--- (Transmitting|Received) SIP' <<<"$raw")"
[ "$n" -gt 0 ] || echo "لم تمرّ أي رسالة خلال $SECS ثانية: المكالمة لم تصل إلى الوسيط أصلاً."
