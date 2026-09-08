# apps/pos-local — Docker + HTTPS tại quán

App Next.js (đặt món voice+text, career predict) chạy trên PC tại quán. Vì
camera/mic chỉ hoạt động trên trình duyệt điện thoại khách khi trang được
phục vụ qua **HTTPS hợp lệ**, toàn bộ traffic đi qua một reverse proxy có TLS
đứng trước container Next.js — mặc định là Cloudflare Tunnel (xem bên dưới).

Domain dùng: **`dalat.cbdaicafe.com`** (subdomain của `cbdaicafe.com`, DNS ở
Cloudflare).

Mặc định app **public qua internet** bằng **Cloudflare Tunnel**
(`cloudflared`) — không cần port-forward, không cần đụng router quán, chỉ
cần PC có internet ra ngoài (app vốn đã cần internet để gọi Anthropic/Gemini
API). Cloudflare cấp HTTPS hợp lệ ở edge của họ, PC chỉ mở kết nối outbound.
Xem phần "HTTPS qua Cloudflare Tunnel" bên dưới.

Có sẵn (nhưng **không dùng mặc định**) một phương án LAN-only dùng Caddy +
dnsmasq, giữ lại trong repo (`Caddyfile`, `dnsmasq.conf`,
`scripts/check-lan-https.sh`) để setup sau khi cần — xem phần "Phương án
LAN-only (dự phòng)".

## Build & chạy lần đầu

```bash
cd apps/pos-local
cp .env.example .env      # điền ANTHROPIC_API_KEY, GEMINI_API_KEY, CLOUDFLARE_TUNNEL_TOKEN, ...
docker compose up -d --build
```

`docker compose up` mặc định chạy `pos-local` + `cloudflared` (không chạy
`caddy` — service đó nằm trong profile `lan`, xem phần "Phương án LAN-only").
Cần tạo tunnel trước để có `CLOUDFLARE_TUNNEL_TOKEN` — xem phần "HTTPS qua
Cloudflare Tunnel" bên dưới; thiếu biến này `docker compose up` sẽ báo lỗi
rõ ràng thay vì chạy sai.

Build context của `pos-local` là **repo root** (`../..`) vì đây là app trong
Turborepo/npm workspaces — Dockerfile cần thấy `package-lock.json` và các
package khác (`@cbd/database`, `@cbd/shared-types`, `@cbd/ui`) để build đúng.

Database SQLite của pos-local (`LOCAL_DATABASE_URL`) chưa có bảng nào ngay
sau khi tạo volume lần đầu — cần chạy `prisma db push` một lần để tạo schema.
Cách đơn giản nhất: chạy trên host (không cần trong container) trỏ thẳng vào
file trong volume:

```bash
docker compose exec pos-local sh -c 'echo "container không có Prisma CLI — chạy lệnh dưới đây TỪ HOST"' || true
docker volume inspect pos-local_pos-local-data --format '{{ .Mountpoint }}'
# copy đường dẫn trên vào, rồi từ repo root:
LOCAL_DATABASE_URL="file:<mountpoint>/pos-local.db" \
  npm run db:push --workspace=@cbd/pos-local
```

(Chỉ cần làm 1 lần — volume `pos-local-data` giữ nguyên qua các lần
`docker compose up`/rebuild sau đó.)

## Restart khi có code mới

```bash
git pull
docker compose up -d --build pos-local
```

Chỉ rebuild lại `pos-local` (`cloudflared` dùng image có sẵn, không cần
rebuild; nếu đổi cấu hình tunnel trên dashboard chỉ cần
`docker compose up -d cloudflared`, không cần `--build`).

## Xem log

```bash
docker compose logs -f pos-local
docker compose logs -f cloudflared   # xem trạng thái kết nối tunnel
```

## HTTPS qua Cloudflare Tunnel

Mặc định — không cần port-forward, không cần đụng router quán, hoạt động cả
khi PC đứng sau NAT/CGNAT. `cloudflared` chỉ mở kết nối **outbound** tới
Cloudflare; Cloudflare edge cấp HTTPS hợp lệ và forward traffic ngược vào
container qua tunnel đó.

### Tạo tunnel (làm 1 lần)

1. Vào https://one.dash.cloudflare.com/ (Zero Trust) → **Networks → Tunnels
   → Create a tunnel**.
2. Chọn connector **Cloudflared**, đặt tên (vd. `pos-local`).
3. Ở bước cài đặt, chọn hệ điều hành **Docker** — Cloudflare hiện lệnh
   `docker run ... cloudflare/cloudflared tunnel run --token <TOKEN>`. Chỉ
   cần copy phần `<TOKEN>` (chuỗi dài sau `--token`), dán vào
   `CLOUDFLARE_TUNNEL_TOKEN` trong `.env`.
4. Ở bước **Public Hostname**: Subdomain = `dalat`, Domain = `cbdaicafe.com`,
   Service Type = `HTTP`, URL = `pos-local:3000` (tên service trong
   `docker-compose.yml`, không phải `localhost`). Lưu.
5. Cloudflare tự tạo DNS record trỏ domain vào tunnel — không cần sửa gì
   thêm ở phần DNS.
6. `docker compose up -d cloudflared` (hoặc `docker compose up -d` nếu chưa
   chạy gì) — kiểm tra tunnel "Healthy" trên dashboard hoặc
   `docker compose logs -f cloudflared`.

Không cần Cloudflare API Token (`CLOUDFLARE_API_TOKEN`) cho phương án này —
biến đó chỉ dùng cho phương án LAN-only (Caddy) bên dưới.

## Phương án LAN-only (dự phòng, không dùng mặc định)

Giữ lại trong repo (`Caddyfile`, `dnsmasq.conf`,
`scripts/check-lan-https.sh`, service `caddy` trong `docker-compose.yml`
dưới profile `lan`) cho trường hợp cần chạy hoàn toàn không phụ thuộc
internet bên ngoài — traffic chỉ đi trong LAN quán, không qua Cloudflare
Tunnel. Kích hoạt bằng:

```bash
docker compose --profile lan up -d caddy
```

Dùng **Caddy** thay vì certbot chạy riêng ngoài container — Caddy tự động
xin và renew chứng chỉ Let's Encrypt qua Cloudflare DNS-01, không cần cron.
Service `caddy` (`apps/pos-local/caddy/Dockerfile`) build lại image chính
thức của Caddy kèm plugin `caddy-dns/cloudflare` qua `xcaddy` (Caddy không
đóng gói sẵn plugin provider DNS nào).

### Tạo Cloudflare API Token

1. Vào https://dash.cloudflare.com/profile/api-tokens → **Create Token**.
2. Chọn **Custom token**, quyền: **Zone → DNS → Edit**.
3. **Zone Resources**: giới hạn **Specific zone → cbdaicafe.com** (không chọn
   "All zones").
4. Tạo token, dán vào `CLOUDFLARE_API_TOKEN` trong `.env`.

Tuyệt đối không dùng token có quyền full account — token này chỉ nên sửa
được DNS của đúng 1 zone.

Cert lưu ở Docker volume `caddy-data`/`caddy-config` — không mất khi
restart/rebuild container, nên không xin cấp lại mỗi lần (tránh rate limit
của Let's Encrypt).

### dnsmasq trên PC (resolve LAN)

`dalat.cbdaicafe.com` cần resolve về **IP LAN nội bộ** của PC chạy pos-local
khi thiết bị trong WiFi quán tra domain này — đó là việc của `dnsmasq`.

**2 lựa chọn:**

| | Cài trên host PC | Chạy trong Docker |
|---|---|---|
| Ưu điểm | Không xung đột network namespace, đơn giản, không cần port LAN đặc biệt | Quản lý cùng `docker compose`, dễ tái tạo |
| Nhược điểm | Cần cài thêm phần mềm trên host | dnsmasq cần bind port 53 UDP/TCP ra LAN thật — phải chạy với `network_mode: host` (mất phần lớn lợi ích cô lập của Docker), dễ xung đột nếu host cũng có service dùng port 53 (`systemd-resolved`...) |

**Khuyến nghị: cài trên host** (đơn giản và ít rủi ro xung đột hơn cho 1 PC
đứng cố định tại quán).

### Cài trên host (Linux, ví dụ Ubuntu/Debian)

```bash
sudo apt install dnsmasq
sudo cp apps/pos-local/dnsmasq.conf /etc/dnsmasq.d/dalat-cbdaicafe.conf
# sửa <LAN_IP_CUA_PC> trong file vừa copy thành IP LAN thật của PC (xem bên dưới)
sudo systemctl restart dnsmasq
```

Nếu PC tại quán chạy Windows, dnsmasq không chạy native — dùng WSL2 (cài
dnsmasq trong WSL2, cần cấu hình port forwarding cẩn thận) hoặc một DNS
server nhẹ khác trên Windows (vd. Acrylic DNS Proxy) với cùng nguyên lý: map
`dalat.cbdaicafe.com` → LAN IP của PC. Đơn giản hơn cả là chạy dnsmasq trên
một thiết bị Linux nhỏ riêng (Raspberry Pi, mini PC cũ) nếu có sẵn.

### Tìm LAN IP hiện tại của PC

```bash
ip addr        # Linux — tìm IP dạng 192.168.x.x hoặc 10.x.x.x trên interface WiFi/LAN đang dùng
# hoặc: ifconfig
```

### Trỏ DHCP của router quán về PC này

Vào trang quản trị router (thường `192.168.1.1` hoặc `192.168.0.1`, xem tem
dán dưới router) → tìm mục **DHCP Settings** / **LAN Settings** (tên khác
nhau tùy hãng router) → đổi **DNS Server** router cấp qua DHCP thành LAN IP
của PC tìm được ở trên → lưu, khởi động lại router nếu cần.

⚠️ **Lưu ý quan trọng**: nếu LAN IP của PC bị DHCP cấp lại (đổi IP), cấu hình
trên sẽ sai và khách không vào được. Đặt **static IP** hoặc **DHCP
reservation** cho PC này trên router để IP không đổi.

## Kiểm tra cuối

```bash
curl -fsS https://dalat.cbdaicafe.com/api/health
```

Chạy được từ bất kỳ máy nào có internet (không cần cùng WiFi quán nữa, vì
traffic đi qua Cloudflare Tunnel) — trả về `{"status":"ok"}` là toàn bộ chuỗi
cloudflared → pos-local hoạt động.

**Test bằng điện thoại thật:**

1. Mở `https://dalat.cbdaicafe.com` trên trình duyệt điện thoại (không bắt
   buộc phải ở WiFi quán).
2. Kiểm tra icon ổ khóa hợp lệ trên thanh địa chỉ (không cảnh báo "Not
   Secure").
3. Vào trang career predict, xác nhận trình duyệt cho phép xin quyền camera
   (chỉ hoạt động khi HTTPS hợp lệ).

Nếu đang dùng phương án LAN-only (profile `lan`) thay vì Cloudflare Tunnel,
dùng `scripts/check-lan-https.sh dalat.cbdaicafe.com` từ máy trong cùng WiFi
quán — script này xác nhận chuỗi dnsmasq → Caddy (TLS) → pos-local.

## Biến môi trường

Xem `.env.example` — copy thành `.env` (không commit vào git, đã có trong
`.gitignore` gốc). File này gộp cả biến app (Next.js) lẫn biến chỉ dùng bởi
`docker-compose.yml`:
- `CLOUDFLARE_TUNNEL_TOKEN` — dùng mặc định (Cloudflare Tunnel).
- `DOMAIN`, `CLOUDFLARE_API_TOKEN` — chỉ cần nếu bật phương án LAN-only
  (profile `lan`, xem phần "Phương án LAN-only").
