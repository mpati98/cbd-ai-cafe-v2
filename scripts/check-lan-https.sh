#!/usr/bin/env bash
# Kiểm tra nhanh chuỗi dnsmasq -> Caddy (TLS) -> pos-local sau khi setup HTTPS
# LAN (xem apps/pos-local/README.md). Chạy từ PC tại quán (hoặc bất kỳ máy
# nào trong cùng WiFi, miễn dùng đúng dnsmasq của quán làm DNS).
#
# Usage: scripts/check-lan-https.sh [domain]

set -euo pipefail

DOMAIN="${1:-dalat.cbdaicafe.com}"
URL="https://${DOMAIN}/api/health"

echo "==> Resolving ${DOMAIN} ..."
if command -v getent >/dev/null 2>&1; then
  RESOLVED_IP="$(getent hosts "${DOMAIN}" | awk '{print $1}' | head -n1)"
else
  RESOLVED_IP="$(dig +short "${DOMAIN}" | head -n1)"
fi

if [ -z "${RESOLVED_IP}" ]; then
  echo "FAIL: không resolve được ${DOMAIN}. Kiểm tra dnsmasq.conf và DNS server DHCP cấp cho máy này." >&2
  exit 1
fi
echo "    -> ${RESOLVED_IP} (phải là LAN IP của PC chạy pos-local, không phải IP thật trên Cloudflare)"

echo "==> curl ${URL} ..."
HTTP_BODY="$(curl -fsS --max-time 10 "${URL}")" || {
  echo "FAIL: không gọi được ${URL}. Kiểm tra: caddy có đang chạy (docker compose ps), cert đã cấp xong chưa (docker compose logs caddy), pos-local có healthy không." >&2
  exit 1
}

echo "    -> ${HTTP_BODY}"

if echo "${HTTP_BODY}" | grep -q '"status"[[:space:]]*:[[:space:]]*"ok"'; then
  echo "OK: dnsmasq -> Caddy (TLS hợp lệ) -> pos-local hoạt động."
else
  echo "FAIL: nhận được response nhưng không đúng định dạng mong đợi ({\"status\":\"ok\"})." >&2
  exit 1
fi
