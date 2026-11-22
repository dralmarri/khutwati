#!/usr/bin/env bash
# إيقاف وسيط هاتف المنزل (تتوقف التحويلات عن التسجيل على البدالة)
set -euo pipefail
cd "$(dirname "$0")/../homephone/gateway"
docker compose down 2>&1 | tail -n 5
echo "أُوقف الوسيط."
