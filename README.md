# CBD AI Cafe — Next.js 16 + Tailwind CSS 4 + Prisma 7 / Neon

Landing page cho CBD AI Cafe. Next.js 16 (App Router, Turbopack) + TypeScript +
Tailwind CSS 4 (CSS-first config) + Prisma 7, dữ liệu (thực đơn, hướng phát
triển, chi nhánh, hero) lấy từ Postgres trên Neon qua driver adapter
`@prisma/adapter-neon`.

## 1. Cài đặt

```bash
npm install
```

`postinstall` sẽ tự chạy `prisma generate` (cần mạng để tải Prisma engine lần
đầu — bình thường trên máy local / CI, không cần làm gì thêm).

## 2. Tạo database trên Neon

1. Vào https://console.neon.tech → **New Project**.
2. Trong tab **Connect**, lấy 2 connection string:
   - **Pooled connection** (có `-pooler` trong hostname) → dùng cho `DATABASE_URL`
   - **Direct connection** (không có `-pooler`) → dùng cho `DIRECT_URL`
3. Copy `.env.example` thành `.env` và điền 2 giá trị trên:

```bash
cp .env.example .env
```

> Prisma 7 bắt buộc dùng driver adapter — không còn kết nối TCP trực tiếp như
> trước. App dùng `DATABASE_URL` (pooled) qua `@prisma/adapter-neon` khi chạy
> (`src/lib/prisma.ts`); Prisma CLI (generate/db push/studio) dùng `DIRECT_URL`
> qua `prisma.config.ts`.

## 3. Đẩy schema & seed dữ liệu mẫu

```bash
npm run db:push    # tạo bảng hero_slides, menu_items, roadmap_items, branches, users, sessions... trên Neon
npm run db:seed    # nạp dữ liệu mẫu + tự tạo tài khoản ADMIN đầu tiên (nếu bảng users đang trống)
```

> Nếu chưa cấu hình `.env`, trang vẫn chạy được bình thường nhờ dữ liệu tĩnh dự
> phòng ở `src/lib/fallback-data.ts` (xem console sẽ có cảnh báo). Sau khi seed
> xong, trang sẽ tự động đọc dữ liệu thật từ Neon — không cần sửa code.

> Tài khoản ADMIN đầu tiên lấy từ `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` /
> `SEED_ADMIN_NAME` trong `.env` (xem `.env.example`, có giá trị mặc định nếu
> bạn không đặt) — dùng để đăng nhập `/admin` lần đầu. Xem chi tiết ở mục
> "Xác thực & Phân quyền".

## 4. Chạy dev

```bash
npm run dev
```

Mở http://localhost:3000

## Cấu trúc chính

```
prisma.config.ts           # Prisma 7: cấu hình schema path + direct connection cho CLI
src/
  app/
    layout.tsx               # font (Be Vietnam Pro / Manrope / Space Mono), metadata
    page.tsx                  # fetch dữ liệu từ Prisma và ráp các section
    globals.css                 # @import "tailwindcss" + @theme (màu, shadow neon, font, animation)
    admin/                        # trang quản trị (client-side, xem mục "Xác thực & Phân quyền")
      layout.tsx                     # metadata riêng (noindex)
      page.tsx                        # kiểm tra phiên đăng nhập, render LoginForm hoặc AdminShell
    api/                          # REST API CRUD (xem mục "API CRUD quản lý dữ liệu")
      auth/login/route.ts            # POST — đăng nhập, set cookie phiên
      auth/logout/route.ts             # POST — đăng xuất, xoá phiên
      auth/me/route.ts                   # GET — thông tin user đang đăng nhập
      users/route.ts                       # GET (list) / POST — quản lý tài khoản, chỉ ADMIN
      users/[id]/route.ts                    # PATCH / DELETE — chỉ ADMIN
      tables/route.ts                          # GET (list) / POST — quản lý bàn, quyền `tables`
      tables/[id]/route.ts                       # PATCH (đổi tên/tạm ngưng/mã mới) / DELETE
      tables/by-code/[code]/route.ts               # GET — tra tên bàn theo mã, công khai
      hero-slides/route.ts                     # GET (list) / POST
      hero-slides/[id]/route.ts                  # GET / PATCH / DELETE
      menu-items/route.ts                          # GET (list) / POST
      menu-items/[id]/route.ts                       # GET / PATCH / DELETE
      roadmap-items/route.ts                           # GET (list) / POST
      roadmap-items/[id]/route.ts                        # GET / PATCH / DELETE
      branches/route.ts                                    # GET (list) / POST
      branches/[id]/route.ts                                 # GET / PATCH / DELETE
      media/route.ts                                           # GET (list) / POST (upload+convert ảnh)
      media/[id]/route.ts                                        # DELETE ảnh
      images/[id]/route.ts                                         # GET — trả thẳng bytes ảnh WebP (công khai)
      voice/route.ts                                                 # POST — ghi âm -> faster-whisper (local) -> chữ (công khai)
      orders/route.ts                                                # POST (công khai) / GET (cần quyền orders)
      orders/[id]/route.ts                                             # GET / PATCH (4 mốc) / DELETE
      stats/route.ts                                                     # GET — số đơn, doanh thu, top món
      menu-items/[id]/set-best-seller/route.ts                            # POST — gán best-seller atomic
      health/route.ts                                                       # GET — trạng thái kết nối Neon
  components/
    admin/                       # UI trang quản trị
      LoginForm.tsx                 # màn hình đăng nhập (email/mật khẩu)
      AdminShell.tsx                 # sidebar (lọc tab theo quyền) + topbar (trạng thái Neon, đăng xuất)
      UsersPanel.tsx                   # tab "Người dùng": tạo/sửa/xoá tài khoản, cấp quyền — chỉ ADMIN
      TablesPanel.tsx                    # tab "Bàn & QR": tạo bàn, sinh/tải QR, đổi mã
      ResourcePanel.tsx                  # bảng danh sách + form thêm/sửa (dùng chung cho 4 resource)
      ImagePickerModal.tsx                 # modal chọn ảnh có sẵn / upload nhanh trong form
      MediaLibraryPanel.tsx                  # tab "Thư viện ảnh": upload, xem, xoá theo mục đích
      OrdersPanel.tsx                          # tab "Đơn hàng & Thống kê": stats + danh sách đơn (tiến trình rút gọn)
      OrderEditModal.tsx                         # modal sửa đơn: ghi chú khách + 4 mốc xử lý + ghi chú nội bộ
      resource-configs.ts                      # khai báo field/cột/quyền cần có cho từng resource
    Nav.tsx                     # thanh điều hướng, chuyển nền khi cuộn, menu mobile
    Hero.tsx                     # carousel kể chuyện (Cà phê / Đà Lạt / CBD Robot)
    Divider.tsx                   # đường mạch điện tử nối các section (signature)
    Menu.tsx                       # món best-seller (neon glow) + lưới thực đơn
    Roadmap.tsx                     # timeline hướng phát triển + chi nhánh sắp mở
    Footer.tsx                       # footer
    Reveal.tsx                        # wrapper hiệu ứng xuất hiện khi cuộn
    VoiceMicButton.tsx                  # nút mic đặt món bằng giọng nói (dùng ở ChatPanel)
  hooks/
    useVoiceInput.ts                # ghi âm + tự dừng khi im lặng + gọi /api/voice
  lib/
    prisma.ts                    # Prisma Client + @prisma/adapter-neon, fallback an toàn
    auth.ts                        # server-only: hash mật khẩu (bcryptjs), tạo/tra cứu phiên đăng nhập
    auth-types.ts                    # type SessionUser + userHasPermission thuần (an toàn dùng ở client)
    permissions.ts                     # danh sách quyền theo tab (hero/menu/roadmap/branches/media/orders)
    content.ts                           # lớp đọc dữ liệu cho trang chủ (Neon trước, fallback tĩnh nếu lỗi)
    api.ts                                 # helper dùng chung cho API: requireUser/requirePermission, lỗi, response
    admin-api.ts                             # fetch wrapper phía client cho trang /admin (tự gửi cookie phiên)
    media.ts                                   # kích thước chuẩn + helper URL ảnh (dùng chung server/client)
    orders.ts                                    # tính trạng thái tổng hợp đơn hàng (4 mốc + huỷ → Hoàn tất/Đang xử lý/Đã huỷ)
    schemas.ts                                     # zod schema validate cho từng resource CRUD + auth/user
    fallback-data.ts                                 # dữ liệu mẫu / seed source of truth
  types/
    admin.ts                     # type dùng chung cho UI admin (không import Prisma)
  generated/prisma/                  # Prisma Client được generate ra đây (không commit, xem .gitignore)
prisma/
  schema.prisma               # model User, Session, HeroSlide, MenuItem, RoadmapItem, Branch, Order...
  seed.ts                       # script seed (npm run db:seed) — cũng tự tạo tài khoản ADMIN đầu tiên
```

## Chỉnh nội dung

Sau khi đã seed Neon, cách nhanh nhất để sửa nội dung là mở:

```bash
npm run db:studio
```

Prisma Studio sẽ mở ở http://localhost:5555 — sửa trực tiếp món trong thực
đơn, mốc roadmap, hoặc chi nhánh, lưu lại là trang sẽ cập nhật (do
`page.tsx` dùng `revalidate = 60`, tối đa chờ 60 giây hoặc chạy lại `npm run dev`).

## Ảnh minh hoạ (Hero & Thực đơn)

Hero slide và món trong thực đơn có thể gắn ảnh minh hoạ thật. Ảnh được lưu
thẳng trong Postgres (Neon) — không cần cấu hình thêm dịch vụ lưu trữ file
ngoài (S3, Vercel Blob...).

**Kích thước chuẩn** (tự động resize + convert sang WebP khi upload, xem
`src/lib/media.ts`):

| Mục đích | Kích thước | Dùng ở |
|---|---|---|
| `HERO` | 1920×1080 (16:9) | Ảnh nền/minh hoạ cho 1 slide trong hero carousel |
| `MENU` | 900×900 (vuông) | Ảnh món / thumbnail trong thực đơn |

Mỗi ảnh **bắt buộc có ghi chú** (`note`, tối thiểu 3 ký tự) mô tả ảnh dùng cho
phần nào — ví dụ `"Hero slide 2 — sương mù Đà Lạt buổi sớm"` hoặc `"Ảnh món
Cold Brew Tầng Mây"`. Ghi chú hiển thị trong thư viện ảnh ở trang admin để dễ
quản lý khi có nhiều ảnh.

**Cách thêm ảnh:**
1. Vào `/admin` → **Thư viện ảnh** → chọn "Dùng cho" (Hero/Thực đơn) → chọn
   file → viết ghi chú → **Tải lên**. Ảnh tự resize + convert WebP ngay lúc
   upload.
2. Vào form **Hero** hoặc **Thực đơn** → field "Ảnh nền slide" / "Ảnh món" →
   **Chọn / tải ảnh** → chọn ảnh có sẵn (đã lọc đúng loại) hoặc tải ảnh mới
   ngay tại đó.
3. Nếu slide/món chưa gắn ảnh, trang chủ tự dùng minh hoạ SVG mặc định (không
   vỡ layout) — gắn ảnh là tuỳ chọn, không bắt buộc.

**API liên quan** (cần đăng nhập + quyền `media` cho GET/upload/xoá — xem mục
"Xác thực & Phân quyền"):

| Endpoint | Chức năng |
|---|---|
| `GET /api/media?purpose=HERO\|MENU` | Danh sách ảnh đã upload (không kèm dữ liệu nhị phân) |
| `POST /api/media` | Upload ảnh mới — `multipart/form-data`: `file`, `purpose`, `note`. 🔒 |
| `DELETE /api/media/:id` | Xoá ảnh — slide/món đang dùng sẽ tự về không có ảnh (`imageId = null`), không bị xoá theo. 🔒 |
| `GET /api/images/:id` | Trả thẳng bytes ảnh WebP (dùng làm `src` cho `<img>`), công khai, cache 1 năm |

Ví dụ upload bằng curl (đăng nhập trước để lấy cookie, xem mục "Xác thực &
Phân quyền"):

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/media \
  -F "file=@/duong/dan/toi/anh.jpg" \
  -F "purpose=MENU" \
  -F "note=Ảnh món Espresso Tonic Cao Nguyên"
```

Xử lý ảnh dùng thư viện `sharp` (Node.js runtime, không chạy trên Edge) — resize
kiểu `cover` theo trọng tâm ảnh (`attention`), nén WebP quality 82.

**Minh hoạ khi chưa có ảnh thật:** mỗi món (cả ở trang chủ lẫn `/order`) khi
chưa gắn ảnh sẽ hiện minh hoạ SVG riêng theo loại đồ uống (cà phê nóng, đá,
trà trái cây, matcha, cacao...) thay vì icon/emoji đơn điệu — xem
`src/components/DrinkArt.tsx` + `src/lib/drink-art.ts` (map mã món → kiểu
minh hoạ, món mới không khớp mã sẽ tự xoay vòng qua các kiểu có sẵn). Gắn ảnh
thật qua `/admin` sẽ tự thay thế minh hoạ này.

## Bố cục "vừa màn hình" & phân trang thực đơn

Trên desktop (≥1024px), 3 section chính (Hero, Thực đơn, Hướng phát triển) mỗi
section chiếm trọn 1 màn hình (`lg:h-screen`) và có scroll-snap nhẹ
(`scroll-snap-type: y proximity`) để cuộn gọn gàng giữa các phần — xem
`.snap-section` trong `globals.css`. Trên mobile giữ cuộn tự nhiên (không ép
vừa màn hình) vì màn hình nhỏ không đủ chỗ mà không ảnh hưởng trải nghiệm đọc.

- **Thực đơn**: món best-seller cố định bên trái; các món còn lại chia trang
  **2 món/trang** (`src/components/MenuGrid.tsx`, client component) với dot +
  nút mũi tên điều hướng, thay vì cuộn dài — nhờ vậy cả section vừa 1 màn
  hình dù thực đơn có nhiều món. (Thử nghiệm 4 món/trang ban đầu bị tràn quá
  chiều cao cố định của section nên đã giảm xuống 2 món/trang cho chắc chắn
  vừa khung hình ở mọi độ phân giải desktop phổ biến.)
- **Hướng phát triển**: chuyển "Lộ trình" và "Chi nhánh" thành 2 tab
  (`src/components/RoadmapTabs.tsx`) thay vì xếp chồng — mỗi lúc chỉ hiện 1
  khối nội dung nên cũng vừa 1 màn hình; nội dung dài bất thường sẽ tự cuộn
  bên trong tab thay vì đẩy cả section tràn màn hình.

## Trang đặt món (/order) — chatbot gợi ý đồ uống

Mở **http://localhost:3000/order**: màn hình chia 2 phần — 2/3 là lưới thực
đơn có thể tương tác, 1/3 là khung chat với **CBD Robot**.

**Luồng hội thoại** (rule-based, không gọi AI ngoài — nhanh, không cần API
key, dễ kiểm soát):
1. Bot chào + hỏi khách đã biết muốn uống gì chưa, hay để bot gợi ý.
2. Nếu khách **đã biết** → bot hỏi tên món (gõ tự do), bot tìm trong thực đơn
   (khớp gần đúng, không phân biệt dấu tiếng Việt — gõ "tra dao" vẫn tìm ra
   "Trà Đào Cam Sả"). Nếu khớp nhiều món, bot đưa nút để khách chọn đúng món.
3. Nếu khách **muốn được gợi ý** → bot hỏi lần lượt 3 câu ngắn (đậm/nhẹ →
   nóng/lạnh → trái cây/truyền thống), mỗi câu có 2 nút bấm chọn nhanh.
4. Khi xác định được món (từ bước 2 hoặc 3): món đó được **highlight + phóng
   to** ngay trong lưới thực đơn bên trái (tự cuộn tới nếu đang ở ngoài màn
   hình), bot mô tả chi tiết + giá, rồi hỏi khách cần giúp gì thêm — có thể
   **"Thêm vào giỏ hàng"** ngay trong chat, **"Gợi ý món khác"** (quay lại bước
   3), hoặc **"Không, cảm ơn"** (bot chào tạm biệt, có nút "Bắt đầu lại").
5. Khách cũng có thể gõ tự do bất kỳ lúc nào thay vì bấm nút — bot luôn cố
   hiểu là một lượt tìm món mới nếu không khớp lựa chọn đang chờ.

**Đặt món bằng giọng nói:** nút 🎤 cạnh ô nhập liệu — bấm, nói câu muốn gửi
(vd: "cho tôi trà đào" hoặc trả lời câu hỏi trắc nghiệm bằng giọng nói: "đậm
đà", "đá lạnh"...). Bot nhận diện xong sẽ **điền vào ô nhập liệu để xem lại/sửa
trước khi gửi** (cố tình không tự gửi thẳng — nhận diện dù chính xác cao vẫn
có thể sai, luôn cho 1 bước xác nhận). Nút 🔈/🔊 cạnh tên "CBD Robot" bật/tắt
việc bot **đọc to câu trả lời** (dùng
[Web Speech Synthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
có sẵn trong trình duyệt — miễn phí, không cần đổi gì).

**Kiến trúc nhận diện giọng nói:** ghi âm bằng `MediaRecorder` ngay trên
trình duyệt, gửi file âm thanh lên server, server forward sang
**faster-whisper chạy local** (`whisper-server/`, model `medium`, GPU) để
chuyển thành chữ, trả kết quả về — thay cho Web Speech API có sẵn trong
trình duyệt (SpeechRecognition) đã dùng ở bản trước. Lý do đổi: SpeechRecognition
của trình duyệt cho tiếng Việt chỉ ổn trong môi trường yên tĩnh, không có cách
nào "gợi ý" thêm từ vựng đặc thù (tên món), và Firefox không hỗ trợ luôn.
Whisper chính xác hơn hẳn với tiếng Việt trong môi trường ồn (quán cà phê),
và hỗ trợ gửi kèm **prompt/gợi ý ngữ cảnh** — API route tự đính kèm toàn bộ
tên món trong thực đơn vào gợi ý để Whisper nhận đúng tên riêng như
"Cold Brew", "Bạc Xỉu" thay vì đoán chữ gần giống. Chạy local (thay vì gọi
API Groq) nghĩa là không tốn phí theo request, không giới hạn quota, và âm
thanh không rời khỏi máy — đổi lại cần GPU đủ mạnh và phải tự chạy
`whisper-server` (xem `VOICE-SETUP.md`).

**Tự động dừng ghi âm** theo 2 mốc — dừng ngay khi đạt mốc nào trước:
- **Im lặng liên tục 3 giây** — theo dõi mức âm lượng qua Web Audio API
  (`AnalyserNode`), khách nói xong là ghi tự dừng, không cần bấm dừng tay.
- **Tối đa 12 giây** — phòng trường hợp môi trường quá ồn khiến không bao giờ
  "im lặng đủ 3s" (nhạc quán, tiếng nói chuyện xung quanh vẫn có tiếng liên tục).

Mốc "im lặng 3s" dùng **ngưỡng tự đo theo nhiễu nền thực tế** (500ms đầu của
lượt ghi) thay vì 1 số cố định — mỗi máy/micro/phòng có mức nhiễu nền khác
nhau, ngưỡng cố định dễ bị "nhiễu nền còn cao hơn ngưỡng" nên không bao giờ
tính là im lặng được (đây là lý do phiên bản đầu không tự dừng được). Ngoài
ra có thêm lớp lọc: 1 tiếng động phải kéo dài liên tục ≥150ms mới tính là
"nói lại" (reset bộ đếm) — tránh tiếng động chớp nhoáng (cốc chạm bàn, tiếng
gõ...) làm gián đoạn bộ đếm 1 cách oan uổng.

**Muốn kiểm tra/chỉnh lại nếu vẫn chưa tự dừng đúng ý:** bật
`debugSilence` ở `<VoiceMicButton />` (đang tạm bật trong
`ChatPanel.tsx` kèm dòng `// TODO: bỏ dòng này...`) rồi mở Console
trình duyệt (F12) khi ghi âm — sẽ thấy dòng `đã đo nhiễu nền ~X, ngưỡng im
lặng = Y` ngay khi bắt đầu, và rải rác `rms=... threshold=...` trong lúc ghi.
Nếu `rms` lúc không nói vẫn cao hơn `threshold` hiển thị, môi trường đang ồn
hơn mức ngưỡng tự động cho phép — chỉnh `thresholdMultiplier` (mặc định 2.5)
hoặc `minThreshold` (mặc định 0.01) khi gọi `watchForSilence` trong
`src/hooks/useVoiceInput.ts`. Nhớ **bỏ `debugSilence`** sau khi xác nhận ổn,
tránh log rác trong production.

Cấu hình 2 mốc này ở `useVoiceInput({ silenceTimeoutMs, maxDurationMs })`
trong `src/hooks/useVoiceInput.ts`.

**Cần cấu hình:** chạy `npm run voice:server` (xem `VOICE-SETUP.md` để cài
đặt lần đầu — venv Python riêng trong `whisper-server/`, không đụng Python hệ
thống). Whisper-server chưa chạy thì nút mic vẫn hiện (ghi âm được) nhưng
bấm gửi sẽ báo lỗi thân thiện, không crash trang.

**Giới hạn tốc độ (rate limit):** `/api/voice` tự chặn nếu 1 IP gửi quá 12
request/phút — đơn giản (lưu trong bộ nhớ RAM, không cần Redis) nên chỉ tính
theo từng instance server, không dùng chung giữa nhiều instance khi scale
ngang — đủ cho quy mô 1 quán, nếu scale nhiều server cần chuyển sang rate
limit tập trung (Redis/Upstash) để chính xác hơn.

**Cấu trúc:**
```
src/hooks/useVoiceInput.ts             # ghi âm (MediaRecorder) + tự dừng khi im lặng + gọi /api/voice
src/components/VoiceMicButton.tsx        # nút mic (idle/recording/transcribing/error), hiệu ứng sóng lan toả
src/app/api/voice/route.ts                 # nhận file âm thanh, forward sang whisper-server local, trả chữ về
src/lib/speech.ts                            # chỉ còn phần đọc to (TTS) — nhận diện đã chuyển sang faster-whisper ở trên
```

**Bug đã sửa trong logic chatbot** (không liên quan chất lượng nhận diện —
lộ ra khi thêm voice, xem `src/lib/chatbot.ts`):
1. **Câu hỏi trắc nghiệm khớp được cả câu nói tự nhiên** ("đậm đà") thay vì
   chỉ khớp đúng mã nội bộ nút bấm ("dam") — giọng nói không thể "gửi" mã nội
   bộ như nút bấm, chỉ nói ra được câu tự nhiên theo đúng nhãn hiển thị.
2. **Fallback dò tên món gần đúng** (Levenshtein theo từng từ, ưu tiên không
   khớp nhầm hơn khớp rộng) — chịu được vài ký tự bị nhận sai/thiếu dấu.

**Gợi ý theo tag:** mỗi món trong thực đơn có thể gắn tối đa 3 tag (1 tag mỗi
trục: đậm/nhẹ, nóng/lạnh, trái cây/truyền thống) — sửa trong `/admin` → Thực
đơn → field "Tag gợi ý (order-chatbot)". Bot chấm điểm món theo số tag khớp
với câu trả lời của khách, ưu tiên món best-seller khi hoà điểm. Logic thuần
nằm ở `src/lib/chatbot.ts` (không phụ thuộc UI, dễ viết test — xem ví dụ mô
phỏng hội thoại trong quá trình phát triển).

**Giỏ hàng:** đặt món thật (gửi `POST /api/orders`, xem mục "Quản lý đơn hàng"
bên dưới), lưu tạm giỏ ở `localStorage` trình duyệt cho tới khi đặt xong. Thêm
món bằng nút trên từng thẻ món hoặc ngay trong chat.

**Đặt món tại bàn:** vào qua `/order/t/{code}` (link riêng từng bàn, tạo ở tab
"Bàn & QR" — xem mục "Đặt món tại bàn qua QR" bên dưới) sẽ tự gắn kèm bàn vào
đơn; vào trực tiếp `/order` (không qua QR) thì đơn không gắn bàn nào (khách tự
đặt, mang về...).

**Cấu trúc:**
```
src/app/order/page.tsx                 # fetch menu items, render OrderExperience (không có bàn)
src/app/order/t/[code]/page.tsx          # tra bàn theo mã, render OrderExperience kèm ngữ cảnh bàn
src/components/order/
  OrderExperience.tsx                    # state giỏ hàng + layout 2/3-1/3 + banner tên bàn (nếu có)
  OrderMenu.tsx                            # lưới món, highlight/phóng to món được gợi ý
  ChatPanel.tsx                              # UI chat (tin nhắn, quick-reply, ô nhập liệu)
  CartSummary.tsx                              # giỏ hàng nổi (floating button + drawer), gửi đơn kèm tableCode
src/lib/
  chatbot.ts                             # state machine + tìm kiếm + chấm điểm gợi ý (pure function)
  tags.ts                                  # định nghĩa 3 trục tag + câu hỏi tương ứng
  table-code.ts                              # sinh mã bàn ngẫu nhiên (server-only)
  speech.ts                                    # chỉ còn đọc to (TTS) — nhận diện giọng nói xem src/hooks/useVoiceInput.ts
```

## Quản lý đơn hàng &amp; Thống kê (/admin → Đơn hàng &amp; Thống kê)

Khách đặt món ở trang `/order` (nút "Tiến hành đặt món" trong giỏ hàng) sẽ tạo
1 đơn hàng thật trong Neon — không cần đăng nhập, giá/tên món luôn lấy lại từ
server (không tin dữ liệu giá do trình duyệt gửi lên). Admin theo dõi &amp;
cập nhật tiến trình tại tab **📦 Đơn hàng &amp; Thống kê**.

**4 mốc xử lý** (độc lập, không bắt buộc tuần tự — vd. có thể thanh toán trước
khi pha chế xong): **Nhận đơn** (mặc định bật khi tạo đơn) → **Pha chế** →
**Đã thanh toán** → **Giao món**. Danh sách đơn hiện tiến trình rút gọn dạng
thanh 4 vạch; **nhấp đúp vào 1 đơn** (hoặc bấm nút **"Sửa"** to, dễ thấy) để
mở modal cập nhật — trong đó thấy đầy đủ chi tiết món, **ghi chú của khách**
(nếu có), bật/tắt từng mốc, và thêm **ghi chú nội bộ** (chỉ nhân viên thấy).
Khi cả 4 mốc đều bật, đơn tự động hiện badge **"Hoàn tất"**.

**Huỷ đơn:** trong modal có công tắc riêng **"Huỷ đơn này"** (tách biệt khỏi
4 mốc xử lý, vì có thể huỷ dù đã làm dở vài bước) — đơn huỷ hiện badge **"Đã
huỷ"**, mờ đi trong danh sách, không tính vào doanh thu/đơn hoàn tất, và
**không bị xoá** khỏi hệ thống (không có nút xoá đơn — huỷ là cách xử lý
chính thức thay vì xoá, giữ lại lịch sử đầy đủ).

**Thống kê** ở đầu trang: tổng số đơn, đơn hôm nay, doanh thu (chỉ tính đơn
đã **Đã thanh toán** và **chưa bị huỷ**), số đơn hoàn tất/đang xử lý/đã huỷ.

**Liên kết với thực đơn:** phần "Món bán chạy nhất" tổng hợp trực tiếp từ dữ
liệu đơn hàng thật (không phải gắn cờ thủ công) — mỗi món có nút **"Đặt
best-seller"**, bấm vào sẽ tự động bỏ cờ best-seller ở món cũ và gán cho món
này (1 giao dịch atomic, không có lúc 2 món cùng là best-seller), phản ánh
ngay trên trang chủ và trang đặt món.

**API:**

| Endpoint | Chức năng |
|---|---|
| `POST /api/orders` | Tạo đơn — **công khai**, không cần đăng nhập (khách hàng dùng) |
| `GET /api/orders` | Danh sách đơn — cần quyền `orders` |
| `GET /api/orders/:id` · `PATCH` · `DELETE` | Xem / cập nhật 4 mốc / xoá đơn — cần quyền `orders` |
| `GET /api/stats` | Số đơn, doanh thu, top món bán chạy — cần quyền `orders` |
| `POST /api/menu-items/:id/set-best-seller` | Gán best-seller (atomic) — cần quyền `menu` |

## Đặt món tại bàn qua QR (/admin → Bàn &amp; QR)

**Vì sao không dùng UTM?** UTM (`utm_source`, `utm_campaign`...) là công cụ
cho phân tích marketing (biết khách từ đâu tới), không phải để định danh một
thực thể nghiệp vụ như "bàn" — dùng UTM cho việc này có 2 vấn đề: (1) không
tra ngược được UTM thành "bàn số mấy" một cách an toàn (chỉ là chuỗi text tự
do, ai cũng sửa được trên URL), và (2) không có nơi lưu trạng thái (bàn còn
hoạt động không, đổi tên bàn thì sao). Giải pháp ở đây: **1 model `Table`
riêng trong DB**, mỗi bàn có **mã ngẫu nhiên không đoán được** (`code`, 6 ký
tự) — link đặt món là `/order/t/{code}`, và khi tạo đơn, server tự tra `code`
→ gắn đúng bàn vào đơn (không tin dữ liệu bàn nếu client tự gửi lên).

**Cách dùng:**
1. Vào `/admin` → tab **🪑 Bàn &amp; QR** → **+ Thêm bàn** → đặt tên (vd:
   "Bàn 5", "Sân vườn 2").
2. Mỗi bàn hiện sẵn 1 mã QR (encode link `/order/t/{code}` với domain thật,
   tự lấy theo `window.location.origin` nên đúng cả ở localhost lẫn production
   mà không cần cấu hình thêm) — bấm vào QR để xem to hơn + **Tải ảnh QR
   (PNG)** để in dán tại bàn.
3. Khách quét QR → vào thẳng trang đặt món, thấy banner **"🪑 Đang đặt cho:
   Bàn 5"** ở đầu trang — đặt món như bình thường, đơn tạo ra tự gắn kèm bàn.
4. Trong tab **Đơn hàng &amp; Thống kê**, mỗi đơn có gắn bàn sẽ hiện 🪑 kèm
   tên bàn ngay cạnh tên khách, để nhân viên biết mang đi đâu.

**Các nút quản lý mỗi bàn:**
- **Đổi tên** — sửa tên hiển thị, không đổi mã QR (QR đã in vẫn dùng được).
- **Tạm ngưng / Bật lại** — tạm ẩn bàn (link cũ trả "không tìm thấy bàn") mà
  không cần xoá, hữu ích khi dẹp bớt bàn theo mùa.
- **Tạo mã mới** — sinh mã QR khác hẳn cho bàn này, **mã QR cũ (đã in) sẽ hết
  tác dụng ngay** — dùng khi nghi ngờ QR bị lộ/dán nhầm chỗ.
- **Xoá** — xoá bàn khỏi hệ thống; đơn cũ đã gắn bàn này vẫn giữ nguyên (nhờ
  `tableLabel` đã lưu snapshot lúc đặt), chỉ mất liên kết `tableId`.

**Quyền:** tab này dùng quyền riêng `tables` (không chung với `orders`) — cấp
cho nhân viên nào cần in/quản lý QR mà chưa muốn cho xem toàn bộ đơn hàng.

**API:**

| Endpoint | Chức năng |
|---|---|
| `GET /api/tables` · `POST` | Danh sách / tạo bàn (tự sinh mã). Quyền `tables`. |
| `PATCH /api/tables/:id` | Đổi tên / tạm ngưng / sinh mã mới. Quyền `tables`. |
| `DELETE /api/tables/:id` | Xoá bàn. Quyền `tables`. |
| `GET /api/tables/by-code/:code` | Tra tên bàn theo mã — **công khai** (trang `/order/t/:code` gọi). |

## Xác thực &amp; Phân quyền

Trang `/admin` dùng **tài khoản đăng nhập thật** (email + mật khẩu), không còn
1 API key dùng chung như trước. Mỗi người 1 tài khoản riêng, có thể giới hạn
chỉ được truy cập một vài tab.

**2 vai trò:**
- **ADMIN** — toàn quyền mọi tab, kể cả tab **Người dùng** (tạo/sửa/xoá tài
  khoản, cấp quyền cho người khác).
- **STAFF** — chỉ thấy/thao tác được các tab được cấp trong `permissions`.
  Không thấy tab **Người dùng** dù có cấp quyền gì (chỉ ADMIN mới quản lý
  được người dùng).

**7 quyền tương ứng 7 tab** (`src/lib/permissions.ts`): `hero` (Hero),
`menu` (Thực đơn), `roadmap` (Hướng phát triển), `branches` (Chi nhánh),
`media` (Thư viện ảnh), `orders` (Đơn hàng &amp; Thống kê), `tables` (Bàn &amp;
QR). Một STAFF có thể được cấp bất kỳ tổ hợp nào trong 7 quyền này.

**Cách hoạt động:**
- Đăng nhập ở `POST /api/auth/login` → server tạo 1 phiên (bảng `sessions`),
  set cookie `cbd_session` (`httpOnly`, `sameSite=lax`, hết hạn sau 7 ngày).
  Không dùng JWT — token là chuỗi ngẫu nhiên, tra thẳng vào DB mỗi request,
  nên **đăng xuất = xoá dòng session, thu hồi ngay lập tức**, không cần hạ
  tầng blacklist riêng.
- Mọi route quản trị đều gọi `requirePermission(req, "key")` (thay cho
  `requireAdmin` + `x-api-key` cũ) — vừa cần đăng nhập, vừa cần đúng quyền.
  Áp dụng cho **cả GET lẫn POST/PATCH/DELETE** — 1 STAFF không có quyền
  `media` thì gọi thẳng `GET /api/media` qua curl cũng bị chặn (401/403), chứ
  không chỉ ẩn tab trên giao diện.
- `AdminShell` lọc sidebar theo `user.permissions` (ADMIN thấy hết) — STAFF
  đăng nhập vào sẽ chỉ thấy đúng những tab được cấp.
- Mật khẩu hash bằng `bcryptjs` (không lưu plaintext, không tự viết thuật
  toán hash).

**Tạo tài khoản ADMIN đầu tiên:** chạy `npm run db:seed` (xem mục "3. Đẩy
schema & seed dữ liệu mẫu") — nếu bảng `users` đang trống, script tự tạo 1
tài khoản ADMIN từ `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` /
`SEED_ADMIN_NAME` trong `.env` (xem `.env.example`). **Đổi mật khẩu ngay** sau
khi đăng nhập lần đầu (tab Người dùng → Sửa → điền mật khẩu mới).

**Tạo thêm tài khoản cho nhân viên:** đăng nhập bằng ADMIN → tab **👤 Người
dùng** → **+ Thêm người dùng** → điền email/tên/mật khẩu, chọn vai trò STAFF,
tick chọn các tab được phép truy cập → Lưu.

**API xác thực:**

| Endpoint | Chức năng |
|---|---|
| `POST /api/auth/login` | `{ email, password }` → set cookie phiên. Công khai. |
| `POST /api/auth/logout` | Xoá phiên hiện tại + clear cookie. |
| `GET /api/auth/me` | Thông tin user đang đăng nhập (401 nếu chưa đăng nhập). |
| `GET /api/users` · `POST` | Danh sách / tạo tài khoản. Chỉ ADMIN. |
| `PATCH /api/users/:id` · `DELETE` | Sửa / xoá tài khoản. Chỉ ADMIN — không tự xoá được chính mình, không xoá được ADMIN cuối cùng. |

- Trang `/admin` có `robots: noindex` nên không bị Google index; đây chỉ là
  tối ưu SEO, **không thay thế xác thực** — việc truy cập dữ liệu vẫn được
  chặn đúng ở tầng API như mô tả ở trên.
- Góc trên `/admin` có chấm trạng thái kết nối Neon (xanh = đã kết nối, cam =
  chưa cấu hình, đỏ = không kết nối được) — gọi `/api/health`.

## API CRUD quản lý dữ liệu

Toàn bộ nội dung (hero slide, thực đơn, roadmap, chi nhánh) có thể quản lý qua
REST API dưới `/api/*`. **Mọi request (kể cả GET) đều cần đăng nhập + đúng
quyền** — xem mục "Xác thực & Phân quyền" ở trên. Gọi trực tiếp bằng curl thì
cần đăng nhập trước để lấy cookie phiên rồi dùng lại cookie đó:

```bash
# Đăng nhập, lưu cookie vào file cookies.txt
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@cbdaicafe.local", "password": "..." }'

# Dùng lại cookie cho các request sau
curl -b cookies.txt http://localhost:3000/api/menu-items
```

### Endpoints

| Resource | GET (list) | GET (:id) | POST | PATCH (:id) | DELETE (:id) | Quyền |
|---|---|---|---|---|---|---|
| `/api/hero-slides` | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | `hero` |
| `/api/menu-items` | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | `menu` |
| `/api/roadmap-items` | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | `roadmap` |
| `/api/branches` | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | `branches` |
| `/api/media` | 🔒 | — | 🔒 | 🔒 (xoá) | — | `media` |
| `/api/orders` | 🔒 | 🔒 | ✅ công khai | 🔒 | 🔒 | `orders` |
| `/api/stats` | 🔒 | — | — | — | — | `orders` |
| `/api/health` | ✅ công khai | — | — | — | — | — |

🔒 = cần đăng nhập + đúng quyền tương ứng (ADMIN luôn qua được hết)

Response format:
- Thành công: `{ "ok": true, "data": ... }` (201 khi tạo mới, 204 rỗng khi xoá)
- Lỗi: `{ "ok": false, "error": "...", "details": ... }` với status 400 (dữ
  liệu sai) / 401 (chưa đăng nhập/phiên hết hạn) / 403 (đã đăng nhập nhưng
  không đủ quyền) / 404 (không tìm thấy) / 409 (trùng giá trị unique, ví dụ
  `code` món trùng) / 503 (DB chưa cấu hình)

### Ví dụ (menu-items — các resource khác dùng đúng pattern này)

```bash
# Đăng nhập trước (xem mục "Xác thực & Phân quyền")
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -d '{ "email": "...", "password": "..." }'

# Danh sách
curl -b cookies.txt http://localhost:3000/api/menu-items

# Xem 1 món
curl -b cookies.txt http://localhost:3000/api/menu-items/<id>

# Tạo món mới
curl -b cookies.txt -X POST http://localhost:3000/api/menu-items \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CBD-008",
    "name": "Espresso Tonic Cao Nguyên",
    "description": "Espresso sốc nhẹ với tonic và vỏ cam.",
    "priceVnd": 48000,
    "isBestSeller": false,
    "order": 7
  }'

# Sửa giá / đổi best-seller
curl -b cookies.txt -X PATCH http://localhost:3000/api/menu-items/<id> \
  -H "Content-Type: application/json" \
  -d '{ "priceVnd": 52000, "isBestSeller": true }'

# Xoá món
curl -b cookies.txt -X DELETE http://localhost:3000/api/menu-items/<id>
```

`branches` có thêm trường `status` (enum: `PLANNING` | `SCOUTING` | `LEASING`
| `FIT_OUT` | `OPEN`). `menu-items` có thêm `tags` (mảng string, dùng cho
order-chatbot — xem mục "Trang đặt món" bên trên) và `imageId`. Schema validate
đầy đủ nằm ở `src/lib/schemas.ts`
(dùng zod) — mọi request POST/PATCH đều bị chặn nếu thiếu trường bắt buộc,
sai kiểu, hoặc sai enum, kèm chi tiết lỗi trong `details`.

## Thiết kế

- **Nền**: latte tối (`latte-900` `#1B130B`) để làm nổi hiệu ứng neon, thay vì
  nền kem sáng thông thường.
- **Neon accent**: cam (`orange-500` `#EE7211` → `orange-400` `#FF9A44`) qua
  các utility tự định nghĩa trong `@theme` (`globals.css`): `shadow-neon-orange`,
  `shadow-neon-orange-sm`, `text-shadow-neon`, `animate-pulse-glow` — dùng cho
  badge best-seller, nút CTA, chấm timeline, và các đường mạch điện tử trang trí.
- **Font**: Be Vietnam Pro (display) + Manrope (nội dung) + Space Mono (nhãn kỹ
  thuật/eyebrow) — nạp qua `next/font/google`, ánh xạ vào Tailwind qua
  `--font-display` / `--font-body` / `--font-mono` trong `@theme`.

## Về Tailwind CSS 4

Không còn `tailwind.config.ts` — toàn bộ theme (màu, shadow, background,
animation, font) khai báo trực tiếp bằng CSS trong `src/app/globals.css` qua
khối `@theme { ... }`. `postcss.config.js` chỉ còn 1 plugin: `@tailwindcss/postcss`.
Việc quét file để tìm class dùng tới (`content`) giờ tự động, không cần khai báo.

**`[browser] ... DATABASE_URL is not set` xuất hiện trong console trình
duyệt** (không phải terminal server) — nghĩa là 1 Client Component nào đó
đang import (trực tiếp hoặc gián tiếp) từ `src/lib/content.ts` hoặc
`src/lib/prisma.ts`, khiến Next.js gộp cả code Prisma vào bundle trình duyệt.
Quy tắc: `content.ts`/`prisma.ts` chỉ được import từ Server Component hoặc
route API. Các hàm/hằng số thuần (không đụng Prisma) như `formatVnd` sống ở
`src/lib/format.ts`, `BRANCH_STATUS_LABEL` ở `src/lib/constants.ts` — Client
Component luôn import từ 2 file này, không phải từ `content.ts`.

**Đang dùng bản cũ hơn (trước khi có tài khoản đăng nhập), chỉ có
`ADMIN_API_KEY`?** — bản hiện tại đã bỏ hẳn cơ chế API key dùng chung, thay
bằng tài khoản đăng nhập thật (xem mục "Xác thực & Phân quyền"). Sau khi cập
nhật code: xoá `ADMIN_API_KEY` khỏi `.env` (không còn dùng), thêm
`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` (xem `.env.example`), rồi:
```bash
npx prisma generate && npm run db:push && npm run db:seed
```
Script seed sẽ tự tạo tài khoản ADMIN đầu tiên nếu bảng `users` đang trống.

**Cảnh báo hydration mismatch nhắc tới thuộc tính lạ trên `<body>`** (vd.
`cz-shortcut-listen`, `bis_skin_checked`, `data-gramm`...) — không phải lỗi
code, mà do **extension trình duyệt** (ColorZilla, Grammarly, Bitdefender...)
tự chèn thuộc tính vào HTML trước khi React kịp hydrate. `layout.tsx` đã có
sẵn `suppressHydrationWarning` trên `<body>` để bỏ qua đúng loại cảnh báo giả
này (chỉ ảnh hưởng thẻ `<body>`, không che các lỗi hydration thật ở nơi
khác). Nếu vẫn thấy, thử tắt extension hoặc test ở cửa sổ ẩn danh.

**`Type 'Buffer<ArrayBufferLike>' is not assignable to type 'Uint8Array<ArrayBuffer>'`
khi build** (thường ở route xử lý ảnh) — TypeScript bản mới (5.7+) làm
`Uint8Array` generic hoá theo loại buffer bên trong, còn `Buffer` (Node.js)
lại khai báo lỏng hơn (`ArrayBufferLike`, bao gồm cả `SharedArrayBuffer`) nên
không còn tự gán được cho field `Bytes` của Prisma 7 như trước. Cách sửa
(đã áp dụng ở `src/app/api/media/route.ts`): không truyền `Buffer` thẳng vào
Prisma, mà cấp phát `Uint8Array` mới đúng độ dài rồi copy dữ liệu vào:
```ts
const bytes = new Uint8Array(buffer.byteLength);
bytes.set(buffer);
// dùng `bytes` thay cho `buffer` khi gán vào field Bytes
```

## Xử lý sự cố thường gặp

**`Cannot read properties of undefined (reading 'create')` (hoặc `.findMany`,
`.update`...)** — Prisma Client đang chạy được generate từ **schema cũ**,
chưa có model bạn vừa thêm/pull về. Chạy lại:
```bash
npx prisma generate
```
rồi khởi động lại `npm run dev` / `npm run start`. Quy tắc chung: **mỗi lần
`prisma/schema.prisma` thay đổi** (tự sửa hoặc pull code mới), luôn cần chạy
lại `prisma generate` — `npm install` cũng tự chạy việc này qua `postinstall`
nên cách chắc ăn nhất là `npm install` lại.

**Lỗi nhắc tới bảng không tồn tại (`P2021`, "the table ... does not exist")**
— schema đã có model mới nhưng chưa được đẩy lên Neon. Chạy:
```bash
npm run db:push
```

**Lỗi `P2022` ("The column ... does not exist" / `ColumnNotFound`)** — gần
giống `P2021` nhưng ở mức cột: bạn đã thêm field mới vào 1 model có sẵn (vd.
`adminNote` trong `Order`) và chạy `prisma generate` (client đã biết field
này), nhưng **chưa `db:push`** nên cột đó chưa thực sự tồn tại trên Neon. Chạy
lại `npm run db:push` là đủ — không cần generate lại.

**Cả hai lỗi trên đều đã có thông báo rõ ràng hơn** ở tầng API (thay vì lỗi
500 chung chung) — xem `withErrorHandling` trong `src/lib/api.ts`.

## Deploy

Khuyến nghị deploy trên Vercel (native cho Next.js) + Neon:

1. Push code lên GitHub.
2. Import project vào Vercel, thêm biến môi trường `DATABASE_URL` và `DIRECT_URL`.
3. Vercel sẽ tự chạy `npm install` → `postinstall` (`prisma generate`) → `next build`.
4. Chạy `npm run db:push && npm run db:seed` một lần (từ máy local, trỏ vào Neon
   production) để khởi tạo dữ liệu.
