#!/usr/bin/env bash
# آخر سجلات وسيط هاتف المنزل (معطى اختياري: asterisk أو push أو caddy)
set -uo pipefail
cd "$(dirname "$0")/../homephone/gateway"
docker compose logs --no-log-prefix --tail 60 "${1:-asterisk}" 2>&1
