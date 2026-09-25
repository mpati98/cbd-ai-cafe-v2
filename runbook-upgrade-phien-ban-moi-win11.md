# Runbook Nâng Cấp Phiên Bản Mới — CBD AI Cafe (bản Windows 11)

Dùng khi code đã có bản cập nhật mới trên GitHub và cần đưa lên máy đang chạy
thật tại quán (máy đã setup xong theo `runbook-mo-quan-moi-chi-tiet-win11.md`,
không phải setup lần đầu). Làm đúng thứ tự từ trên xuống — **không bỏ qua
Bước 1 (sao lưu)**, kể cả khi bản cập nhật "chỉ sửa nhỏ".

**Quy ước:** chỗ nào có dạng `<TÊN_TRONG_NGOẶC>` nghĩa là phải thay bằng giá
trị thật.

**Thời điểm nên làm:** ngoài giờ khách đông (app sẽ gián đoạn ~1-2 phút lúc
container restart). Toàn bộ lệnh chạy trong **PowerShell**, đứng đúng thư
mục `...\cbd-ai-cafe\apps\pos-local` trừ khi ghi chú khác.

---

## Bước 1 — Sao lưu dữ liệu trước khi đổi gì cả

Dữ liệu quán (đơn hàng, bàn, ảnh in, khảo sát...) nằm trong volume Docker
`pos-local_pos-local-data`, không nằm trong code — `git pull`/rebuild không
đụng tới, nhưng bước nâng cấp có thể chạy `prisma db push` (đổi cấu trúc
database) nên **luôn sao lưu trước**, phòng khi cần khôi phục lại.

```powershell
mkdir C:\CBD-Backups -ErrorAction SilentlyContinue
$date = Get-Date -Format "yyyy-MM-dd_HHmm"
docker run --rm `
  -v pos-local_pos-local-data:/data `
  -v C:\CBD-Backups:/backup `
  alpine cp /data/pos-local.db /backup/pos-local_$date.db
```

Kiểm tra file vừa tạo có trong `C:\CBD-Backups` và **có dung lượng > 0 KB**
(mở File Explorer nhìn cột Size). File 0 KB nghĩa là chưa copy được — chạy
lại lệnh trên trước khi tiếp tục.

Ghi lại luôn **commit hiện tại** để có đường lùi nếu bản mới bị lỗi:

```powershell
git log --oneline -1
```

Copy dòng kết quả (dạng `a1b2c3d Tên commit`) dán vào đâu đó tạm (Notepad),
dùng ở Bước 6 nếu cần rollback.

---

## Bước 2 — Kiểm tra máy đang sạch, chưa sửa gì tay

```powershell
git status
```

Phải thấy dòng `nothing to commit, working tree clean`. Nếu thấy danh sách
file bị sửa (thường do ai đó sửa trực tiếp trên máy quán, không nên làm) —
**dừng lại, báo người quản lý dự án**, đừng tự `git pull` đè lên vì có thể
mất thay đổi hoặc gây xung đột khi pull.

---

## Bước 3 — Lấy code mới nhất

```powershell
git pull
```

Đọc nhanh danh sách file thay đổi hiện ra. Nếu thấy dòng có
`apps/pos-local/.env.example` → mở so sánh với file `.env` đang dùng (`code
.env.example` rồi `notepad .env`), thêm biến mới nếu có (hỏi người quản lý dự
án giá trị thật của biến đó). Bỏ qua bước này nếu `.env.example` không đổi.

---

## Bước 4 — Build lại và khởi động

```powershell
docker compose build pos-local
docker compose up -d pos-local
```

Chỉ build lại `pos-local` — `cloudflared` dùng image có sẵn, không cần động
tới. Chờ khoảng 1 phút, kiểm tra:

```powershell
docker compose ps
```

Cột STATUS của `pos-local` phải là `Up`/`running` (`healthy` sau ~15 giây).
Nếu thấy `Restarting` liên tục, xem Bước 6 (Nếu lỗi) trước khi làm tiếp.

---

## Bước 5 — Đồng bộ lại cấu trúc database (luôn làm, kể cả không chắc có đổi)

Lệnh `prisma db push` dưới đây **an toàn để chạy mỗi lần nâng cấp** — nếu
cấu trúc database không đổi so với bản trước, lệnh chạy xong ngay không làm
gì cả; nếu bản mới có thêm bảng/cột, lệnh tự thêm vào, dữ liệu cũ giữ
nguyên. Không cần hỏi trước "bản này có đổi database không" — cứ chạy.

Đứng ở thư mục repo gốc (lùi lại 2 cấp từ `apps\pos-local`):

```powershell
cd ..\..
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

cd apps\pos-local
```

`chown` + `restart` ở cuối là bắt buộc mỗi lần chạy `db push` — lệnh push
chạy bằng user root nên có thể để lại quyền sở hữu sai trên file database,
khiến app thật (`user nextjs`) không ghi được (`SQLITE_CANTOPEN`) nếu bỏ qua.

---

## Bước 6 — Kiểm tra sau nâng cấp

```powershell
docker compose exec pos-local curl -fs http://localhost:3000/api/health
```

Phải thấy `{"status":"ok"}`. Sau đó xem log để chắc không có lỗi khi khởi
động:

```powershell
docker compose logs --tail=50 pos-local
```

Trên điện thoại (cùng WiFi quán), kiểm tra lần lượt:

- `https://<domain-quán>` — trang order load được, chọn món thử (không cần
  gửi đơn thật)
- `https://<domain-quán>/ops` — đăng nhập nhân viên vẫn vào được
- `https://<domain-quán>/ops/orders`, `/ops/tables`, `/ops/print-photos`,
  `/ops/survey` — từng trang mở lên bình thường, không báo lỗi

**Nếu bản cập nhật có ghi chú riêng** (ví dụ đổi cách sinh link bàn, đổi giao
diện...) — làm thêm đúng phần ghi chú đó trước khi cho khách dùng (ví dụ: in
lại QR nếu link bàn đổi). Hỏi người quản lý dự án nếu không chắc bản này có
việc cần làm thêm không.

---

## Nếu lỗi — quay lại bản cũ (rollback)

Nếu sau Bước 4/5 mà `pos-local` cứ `Restarting`, hoặc kiểm tra ở Bước 6 phát
hiện lỗi không sửa được ngay:

```powershell
git log --oneline -5
git checkout <commit-đã-ghi-lại-ở-Bước-1>
docker compose build pos-local
docker compose up -d pos-local
```

Kiểm tra lại Bước 6. Nếu ổn, báo người quản lý dự án về lỗi gặp phải (kèm
log Bước 6) trước khi thử `git pull` lại bản mới.

Nếu database bị lỗi sau khi chạy `db push` (hiếm, nhưng có thể do bản mới có
thay đổi không tương thích ngược) — khôi phục lại file đã sao lưu ở Bước 1:

```powershell
docker compose stop pos-local
docker run --rm `
  -v pos-local_pos-local-data:/data `
  -v C:\CBD-Backups:/backup `
  alpine cp /backup/pos-local_<ngày-giờ-đã-sao-lưu>.db /data/pos-local.db
docker compose -f apps/pos-local/docker-compose.yml exec -u root pos-local chown -R nextjs:nodejs /data 2>$null
docker compose start pos-local
```

(Dòng `exec -u root` có thể báo lỗi vì `pos-local` đang stop lúc copy —
không sao, chạy `docker compose start pos-local` trước rồi chạy lại đúng
dòng `chown` này 1 lần nữa nếu cần.)

---

## Nếu gặp lỗi không biết xử lý

Chụp màn hình lỗi hoặc copy nguyên đoạn báo lỗi trong PowerShell, gửi cho
người quản lý dự án kèm theo: đang ở Bước mấy, commit trước khi nâng cấp là
gì (Bước 1), đã thử rollback chưa.
