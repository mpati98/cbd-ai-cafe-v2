# Voice Order — Groq Whisper API (STT) + VieNeu-TTS local (đọc to)

Module đặt món bằng giọng nói + đọc to câu trả lời cho trang `/order`.

**STT (nhận diện giọng nói) chạy qua Groq API** (`whisper-large-v3`) — production
deploy trên Vercel, không có máy nào luôn bật để chạy model local, nên STT
phải là 1 dịch vụ cloud có sẵn (trước đây dùng faster-whisper chạy local trên
máy dev qua `whisper-server/`, nhưng route đó gọi `127.0.0.1:8008` nên chỉ
chạy được khi Next.js server và whisper-server chung 1 máy — không hoạt động
trên Vercel, xem lịch sử đổi ở `src/app/api/voice/route.ts`). `whisper-server/`
vẫn còn trong repo để tham khảo/thử nghiệm local nếu cần nhưng không còn được
gọi bởi app.

**TTS (đọc to câu trả lời) vẫn chạy local** (VieNeu-TTS, không đổi) — vì đây
là tính năng phụ (lỗi thì im lặng, không chặn luồng chính) nên chấp nhận được
việc chỉ hoạt động khi dev/test local có `tts-server` chạy; sẽ cần tách ra
tương tự nếu muốn bật đọc to trên production.

```
whisper-server/                    ← (không còn dùng ở production — xem ghi chú trên) FastAPI local STT, giữ lại để tham khảo
tts-server/server.py               ← FastAPI local (TTS, VieNeu-TTS), CPU/ONNX, giữ warm
tts-server/start.sh                ← script chạy server TTS
tts-server/requirements.txt        ← dependencies Python (TTS)
src/app/api/voice/route.ts         ← API route Next.js, forward audio sang Groq (whisper-large-v3)
src/app/api/tts/route.ts           ← API route Next.js, forward text sang tts-server (local)
src/hooks/useVoiceInput.ts         ← Hook MediaRecorder (hydration-safe)
src/components/VoiceMicButton.tsx  ← Nút mic theo brand CBD
src/lib/speech.ts                  ← speak()/stopSpeaking() gọi /api/tts, phát qua <audio>
```

## 0. STT — Groq API

Cần biến môi trường `GROQ_API_KEY` (đã có sẵn trong `.env` cho dev; nhớ set
tương ứng trong Vercel project settings cho production/preview). Không cần
chạy gì thêm — route gọi thẳng `https://api.groq.com/openai/v1/audio/transcriptions`
với `model=whisper-large-v3`, `language=vi`, và `prompt` = tên món trong menu
(giúp nhận đúng "Cold Brew", "Latte"...). Hoạt động giống nhau ở mọi môi
trường (local dev lẫn Vercel production), không phụ thuộc máy nào đang bật.

## 1. Cài đặt (một lần)

STT (Groq) không cần cài gì — chỉ cần `GROQ_API_KEY` trong `.env`/Vercel env.

TTS (VieNeu-TTS, local) vẫn cần Python 3.11+ với module `venv`:

```bash
cd tts-server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

VieNeu-TTS chạy **CPU/ONNX (int8)** theo mặc định — không cần GPU. Model
(~vài trăm MB) tự tải từ Hugging Face vào `~/.cache/huggingface` khi server
khởi động lần đầu.

## 2. Chạy server

```bash
npm run tts:server      # TTS — VieNeu-TTS, cổng 8009 (chỉ cần cho tính năng đọc to)
```

Kiểm tra:

```bash
curl http://127.0.0.1:8009/health
# {"status":"ok","voice":"Trúc Ly"}
```

`npm run dev:all` đã tự chạy `tts:server` song song với `next dev`. STT (Groq)
không cần server riêng nên không có bước "chạy" nào cho nó.

### Tuỳ chỉnh (biến môi trường khi chạy start.sh)

- `VIENEU_VOICE` — tên giọng đọc TTS (mặc định `Trúc Ly` — nữ, Bắc, tự nhiên).
  Xem toàn bộ danh sách 14 giọng có sẵn (Bắc/Trung/Nam, nam/nữ) bằng:
  `.venv/bin/python -c "from vieneu import Vieneu; print(Vieneu().list_preset_voices())"`

Route Next.js đọc URL server TTS qua `TTS_SERVER_URL` trong `.env` (mặc định
`http://127.0.0.1:8009/synthesize`, không cần set nếu chạy local mặc định).
STT không có biến URL tương ứng nữa — luôn gọi Groq API.

## 3. Gắn vào chatbot panel

Trong component chatbot ở trang `/order`, đặt nút mic cạnh ô nhập tin nhắn và đẩy transcript vào **cùng hàm xử lý tin nhắn gõ tay** (pipeline scoring hiện tại giữ nguyên):

```tsx
import VoiceMicButton from "@/components/VoiceMicButton";

// menuItems: dữ liệu menu bạn đang có sẵn ở order page
<VoiceMicButton
  onTranscript={(text) => handleUserMessage(text)}
  hintPhrases={menuItems.map((m) => m.name)}
/>
```

`hintPhrases` rất quan trọng: tên món được truyền làm ngữ cảnh (initial prompt)
cho Whisper, giúp nhận đúng các từ trộn Anh-Việt như "Cold Brew", "Latte", "Bạc Xỉu".

## 4. Hành vi

**Ghi âm (STT):**
- Bấm mic → xin quyền micro → ghi âm (viền cam lan tỏa khi đang nghe)
- Bấm lần nữa để dừng, hoặc tự dừng sau 12 giây
- Transcript trả về → đi vào chatbot như tin nhắn gõ tay
- Trình duyệt không hỗ trợ (hoặc chưa hydrate) → nút tự ẩn, không vỡ layout
- Lỗi mạng / Groq API lỗi hoặc chưa cấu hình `GROQ_API_KEY` → hiện thông báo tiếng Việt phía trên nút

**Đọc to (TTS):**
- Nút 🔈/🔊 trên header ChatPanel bật/tắt đọc to — mặc định tắt
- Khi bật, mỗi câu trả lời mới của bot tự phát qua VieNeu-TTS (giọng Việt tự
  nhiên, không phải SpeechSynthesis của trình duyệt)
- Bấm mic để ghi âm khi đang đọc → tự ngắt câu đang đọc cho rõ tiếng
- tts-server chưa chạy / lỗi mạng → im lặng, không đọc được (lỗi log ra console,
  không hiện gián đoạn UI vì đây là tính năng phụ, không phải luồng chính)

## 5. Lưu ý kỹ thuật

- **HTTPS bắt buộc** với `getUserMedia` — `localhost` được miễn, nhưng khi
  deploy phải có SSL, và khi test qua LAN (vd điện thoại → máy dev) sẽ bị chặn
  nếu không dùng https hoặc tunnel (ngrok, cloudflared).
- Safari/iOS ghi ra `audio/mp4` thay vì webm — route đã xử lý cả hai.
- Rate limit trong route voice (12 req/phút/IP) và tts (20 req/phút/IP) là
  in-memory, đủ cho MVP một instance.
- STT (Groq) hoạt động độc lập với máy dev — chạy được trên Vercel production.
  TTS (`tts-server`) thì vẫn phải chạy trên **cùng máy** với Next.js server
  (hoặc máy khác cùng mạng nội bộ + đổi `TTS_SERVER_URL`) — không expose ra
  internet vì không có xác thực; trên production hiện tại (Vercel) nghĩa là
  tính năng đọc to chỉ hoạt động khi test local, không hoạt động trên domain
  thật cho tới khi tts-server cũng được tách ra tương tự STT.
- VieNeu-TTS license **Apache 2.0** — dùng thoải mái cho sản phẩm thương mại
  (khác với nhiều model TTS tiếng Việt khác như mms-tts-vie/CC-BY-NC hay
  viXTTS/Coqui Public Model License, chỉ cho phép dùng phi thương mại).

## 6. Test nhanh

```bash
npm run dev:all         # chạy tts:server + next dev cùng lúc
# Mở http://localhost:3000/order, bấm mic, nói:
# "Cho mình một ly cold brew ít ngọt"
# Bật nút 🔈 ở header chatbot để nghe bot đọc to câu trả lời
```

Test route riêng (STT — gọi Groq API):

```bash
curl -X POST http://localhost:3000/api/voice \
  -F "audio=@test.webm" \
  -F "hint=Cold Brew, Cà Phê Sữa Đá, Latte"
```

Test thẳng Groq API (bỏ qua Next.js):

```bash
curl -X POST https://api.groq.com/openai/v1/audio/transcriptions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -F "file=@test.webm" \
  -F "model=whisper-large-v3" \
  -F "language=vi"
```

Test route riêng (TTS) — lưu kết quả ra file để nghe thử:

```bash
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Chào bạn! Mình là CBD Robot, bạn muốn uống gì hôm nay?"}' \
  -o reply.wav && open reply.wav   # hoặc xdg-open / aplay trên Linux
```

Test thẳng tts-server (bỏ qua Next.js):

```bash
curl -X POST http://127.0.0.1:8009/synthesize -F "text=Xin chào" -o test.wav
```
