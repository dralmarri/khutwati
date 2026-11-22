#!/bin/sh
# يملأ قوالب الإعداد من متغيرات البيئة ثم يشغّل Asterisk
set -eu
for v in PBX_PUBLIC_HOST PBX_PUBLIC_PORT PBX_LAN_IP PBX_LAN_PORT PBX_EXT PBX_PASSWORD GW_SIP_PORT MOBILE_PASSWORD; do
  eval "val=\${$v:-}"
  if [ -z "$val" ]; then echo "المتغير $v غير معرّف في ملف .env" >&2; exit 1; fi
done
: "${RING_SECONDS:=45}"; export RING_SECONDS
VARS='$PBX_PUBLIC_HOST $PBX_PUBLIC_PORT $PBX_LAN_IP $PBX_LAN_PORT $PBX_EXT $PBX_PASSWORD $GW_SIP_PORT $MOBILE_PASSWORD $RING_SECONDS'
for f in /templates/*; do
  envsubst "$VARS" < "$f" > "/etc/asterisk/$(basename "$f")"
done
exec asterisk -f -U asterisk -G asterisk
