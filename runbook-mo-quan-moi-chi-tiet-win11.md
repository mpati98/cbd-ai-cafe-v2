# Runbook Mở Quán Mới — CBD AI Cafe (bản Windows 11)

Dùng để bàn giao cho người thực hiện tại quán mới, chạy trên máy Windows 11. Làm đúng thứ tự từ trên xuống.

**Quy ước:** chỗ nào có dạng `<TÊN_TRONG_NGOẶC>` nghĩa là bạn phải thay bằng giá trị thật, không gõ nguyên văn `<...>`.

**Lưu ý:** cách làm trong file này KHÔNG cần quyền admin router, KHÔNG cần port-forward hay IP tĩnh — HTTPS chạy qua Cloudflare Tunnel (`cloudflared`), chỉ cần PC có internet ra ngoài (app vốn đã cần internet để gọi Anthropic/Gemini API).

---

## Bước -1 — Cài Docker Desktop (chỉ làm 1 lần nếu máy chưa có)

Windows không có Docker sẵn như Linux, cần cài **Docker Desktop**:

1. Tải tại https://www.docker.com/products/docker-desktop
2. Cài đặt, Docker Desktop sẽ tự yêu cầu bật **WSL2** (Windows Subsystem for Linux) nếu máy chưa có — làm theo hướng dẫn trên màn hình, có thể cần khởi động lại máy 1 lần
3. Mở Docker Desktop, đợi icon con cá voi ở khay hệ thống (system tray) chuyển sang trạng thái chạy (không còn loading)
4. Mở **PowerShell** (bấm phím Windows, gõ "PowerShell", Enter), kiểm tra:
```powershell
docker --version
docker compose version
```
Nếu cả 2 lệnh đều ra số phiên bản (không báo lỗi) → cài đặt thành công.

Cài thêm **Git for Windows** nếu máy chưa có: https://git-scm.com/download/win — cần để chạy lệnh `git clone`.

---

## Bước 0 — Chuẩn bị thông tin trước khi bắt đầu

Ghi ra giấy/note trước:

- Tên thành phố/chi nhánh (viết liền, không dấu, chữ thường): ví dụ `nhatrang`
- Domain sẽ dùng: `<TEN_THANH_PHO>.cbdaicafe.com` (ví dụ `nhatrang.cbdaicafe.com`)
- Store ID: `<TEN_THANH_PHO>-01` (ví dụ `nhatrang-01`)

---

## Bước 1 — Tạo Cloudflare Tunnel cho quán mới (thao tác trên web)

Mỗi quán dùng 1 tunnel riêng — tunnel tự lo HTTPS, tự tạo DNS record, PC không
cần IP tĩnh hay port-forward gì cả.

1. Vào https://one.dash.cloudflare.com/ (Zero Trust) → **Networks → Tunnels
   → Create a tunnel**.
2. Chọn connector **Cloudflared**, đặt tên (ví dụ `<TEN_THANH_PHO>` — vd. `nhatrang`).
3. Ở bước cài đặt, chọn hệ điều hành **Docker** — Cloudflare hiện lệnh dạng
   `docker run ... cloudflare/cloudflared tunnel run --token <TOKEN>`. Chỉ
   cần copy phần `<TOKEN>` (chuỗi dài sau `--token`) — đây chính là
   `CLOUDFLARE_TUNNEL_TOKEN`, dùng ở Bước 4. **Lưu lại ngay, token chỉ hiện 1 lần.**
4. Ở bước **Public Hostname**: điền:
   - Subdomain: `<TEN_THANH_PHO>` (ví dụ `nhatrang`)
   - Domain: `cbdaicafe.com`
   - Service Type: `HTTP`
   - URL: `pos-local:3000` (tên service trong `docker-compose.yml`, KHÔNG
     phải `localhost`)
5. Lưu lại. Cloudflare tự tạo DNS record trỏ domain vào tunnel — không cần
   vào mục DNS sửa gì thêm.

**Nếu sau này cần đổi cấu hình tunnel** (đổi Public Hostname, v.v.), quay lại
đúng tunnel này trên Zero Trust dashboard, không cần tạo lại.

---

## Bước 2 — Tạo Store ID và Store API Key

Mở **PowerShell**, chạy lệnh sau để tạo key ngẫu nhiên (Windows không có sẵn `openssl` như Linux, dùng lệnh PowerShell thay thế):

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
([System.BitConverter]::ToString($bytes) -replace '-','').ToLower()
```

Lệnh này in ra 1 chuỗi 64 ký tự dạng hex, ví dụ `a1b2c3d4e5f6...`.

**Copy chuỗi này lại, đây chính là `STORE_API_KEY` của quán mới. Không dùng lại key của quán khác.**

Store ID không cần lệnh, tự đặt theo Bước 0, ví dụ `nhatrang-01`.

*(Nếu máy đã cài Git for Windows, có thể mở **Git Bash** thay vì PowerShell và dùng lại đúng lệnh `openssl rand -hex 32` như bản Linux — Git Bash có sẵn openssl.)*

---

## Bước 3 — Thêm quán mới vào Dashboard (thao tác trên web)

1. Đăng nhập vào trang dashboard quản lý
2. Vào mục quản lý **Store / Chi nhánh**
3. Bấm **Thêm quán mới**, điền:
   - Store ID: `<TEN_THANH_PHO>-01`
   - Tên quán, địa chỉ
   - Dán `STORE_API_KEY` vừa tạo ở Bước 2
4. Bấm **Lưu**

---

## Bước 4 — Chuẩn bị máy tại quán mới

Mở **PowerShell**, tạo thư mục làm việc rồi clone code:

```powershell
cd C:\
mkdir CBD-Projects
cd CBD-Projects
git clone <URL_GITHUB_REPO>
cd cbd-ai-cafe-v2\apps\pos-local
```

Tạo file cấu hình:

```powershell
Copy-Item .env.example .env
notepad .env
```

Lệnh `notepad` mở file bằng Notepad để sửa. Sửa các dòng sau (giữ nguyên tên biến bên trái dấu `=`, chỉ đổi phần bên phải), lưu lại (`Ctrl+S`) rồi đóng Notepad. **Lưu ý:** `Store ID` (`<TEN_THANH_PHO>-01`) chỉ dùng để điền vào form trên Dashboard (Bước 3) — pos-local không có biến `STORE_ID`, không cần thêm vào file `.env` này.

```
ANTHROPIC_API_KEY=<hỏi người quản lý dự án lấy key này>
GEMINI_API_KEY=<hỏi người quản lý dự án lấy key này>
STORE_API_KEY=<dán key đã tạo ở Bước 2>
DASHBOARD_URL=<URL dashboard production — hỏi người quản lý dự án>
DOMAIN=nhatrang.cbdaicafe.com
CLOUDFLARE_TUNNEL_TOKEN=<token đã lấy ở Bước 1>
```

`CLOUDFLARE_API_TOKEN` và `PRINT_PHOTOS_PASSWORD` trong file có thể để trống
hoặc theo giá trị mặc định — `CLOUDFLARE_API_TOKEN` chỉ cần cho phương án
LAN-only (không dùng ở runbook này).

---

## Bước 5 — Build và chạy hệ thống

Đứng ở thư mục `apps\pos-local` trong PowerShell:

```powershell
docker compose build
docker compose up -d
```

Chờ khoảng 1-2 phút, kiểm tra:

```powershell
docker compose ps
```

Tất cả dòng phải có chữ `Up`/`running` ở cột STATUS. Nếu thấy `Restarting` liên tục:

```powershell
docker compose logs pos-local
```

Copy đoạn lỗi màu đỏ gửi cho người quản lý dự án.

**Lưu ý quan trọng khi chạy `docker compose ps`:** phải đứng đúng thư mục chứa file `docker-compose.yml`, nếu không sẽ báo lỗi "no configuration file provided". Kiểm tra đang đứng đúng chỗ bằng:
```powershell
pwd
```

**Bắt buộc — chỉ cần làm 1 lần cho mỗi quán mới:** volume database SQLite mới tạo chưa có bảng nào, container thật cũng chưa chắc ghi được vào `/data` (owner mặc định của volume mới là root, container chạy bằng user `nextjs`). Nếu bỏ qua bước này, log sẽ báo `SQLITE_CANTOPEN: unable to open database file`. Đứng ở thư mục repo root (`cd ..\..` từ `apps\pos-local`), chạy:

```powershell
docker build --target builder -t pos-local-builder-tmp -f apps/pos-local/Dockerfile .

docker run --rm `
  -v pos-local_pos-local-data:/data `
  -w /app/apps/pos-local `
  pos-local-builder-tmp `
  npx prisma db push `
    --config ../../packages/database/prisma.config.local.ts `
    --schema ../../packages/database/prisma/schema.local.prisma `
    --url "file:/data/pos-local.db"

docker rmi pos-local-builder-tmp

docker compose -f apps/pos-local/docker-compose.yml exec -u root pos-local chown -R nextjs:nodejs /data
docker compose -f apps/pos-local/docker-compose.yml restart pos-local
```

Xem chi tiết/lý do trong `apps\pos-local\README.md` (mục "Build & chạy lần đầu").

---

## Bước 6 — Kiểm tra cuối cùng

**Lưu ý:** container `pos-local` KHÔNG publish port 3000 ra máy host (chỉ `cloudflared`/`caddy` mới expose ra ngoài) — nên `curl http://localhost:3000` từ PC sẽ luôn báo lỗi "Unable to connect", đó KHÔNG phải dấu hiệu lỗi. Muốn kiểm tra health ngay trên PC, chạy curl từ bên trong container:

```powershell
docker compose exec pos-local curl -fs http://localhost:3000/api/health
```

Phải thấy kết quả dạng `{"status":"ok"}`.

Trên điện thoại (đã connect ĐÚNG WiFi của quán mới — phải cùng mạng với PC):
1. Mở trình duyệt, gõ `https://nhatrang.cbdaicafe.com`
2. Phải thấy trang web load lên, có icon ổ khóa hợp lệ

**Nếu không vào được, kiểm tra theo thứ tự:**
- `docker compose ps` — cả `pos-local` lẫn `cloudflared` có đang `Up` không
- `docker compose logs cloudflared` — phải thấy dòng báo kết nối thành công
  (không có lỗi liên quan token); trên Zero Trust dashboard (Bước 1), tunnel
  phải ở trạng thái **Healthy**
- `CLOUDFLARE_TUNNEL_TOKEN` trong `.env` có đúng, không thiếu ký tự khi copy-paste không
- PC có internet ra ngoài không (`cloudflared` chỉ cần outbound, không liên quan WiFi của khách)
- Docker Desktop có đang mở và chạy không (khác Linux, trên Windows nếu tắt Docker Desktop thì toàn bộ container dừng theo)

**Lưu ý riêng cho Windows:** nếu PC khởi động lại, Docker Desktop cần được mở lên trước thì các container mới tự chạy lại — có thể bật tính năng "Start Docker Desktop when you sign in" trong Settings của Docker Desktop để tránh quên.

Nếu tất cả đúng → tiếp tục thêm địa điểm cho Vi vu Đà Lạt trên dashboard, rồi chạy đầy đủ checklist test hệ thống trước khi cho khách dùng thật.

---

## Nếu gặp lỗi không biết xử lý

Chụp màn hình lỗi hoặc copy nguyên đoạn báo lỗi trong PowerShell, gửi cho người quản lý dự án kèm theo: đang ở Bước mấy, đã làm đúng các bước trước đó chưa.
