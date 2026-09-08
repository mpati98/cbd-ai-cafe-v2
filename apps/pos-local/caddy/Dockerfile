# Caddy chính thức không kèm plugin DNS provider — build lại bằng xcaddy để
# thêm caddy-dns/cloudflare (cần cho DNS-01 challenge qua Cloudflare, xem
# ../Caddyfile). Đây là cách chính thức Caddy khuyến nghị, thay vì tự vá
# binary hay build từ source thủ công.
FROM caddy:2-builder-alpine AS builder

RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:2-alpine

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
