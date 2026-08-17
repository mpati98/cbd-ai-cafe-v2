# Voice Order — faster-whisper (local model) + VieNeu-TTS (đọc to)

Module đặt món bằng giọng nói + đọc to câu trả lời cho trang `/order`. Cả
nhận diện giọng nói (STT) và đọc to (TTS) đều chạy **local** (không gọi API
ngoài, không tốn phí, dữ liệu không rời khỏi máy). Gồm:

```
whisper-server/server.py           ← FastAPI local (STT), load model 1 lần, giữ warm
whisper-server/start.sh            ← script chạy server (tự set LD_LIBRARY_PATH cho cuDNN)
whisper-server/requirements.txt    ← dependencies Python (STT)
tts-server/server.py               ← FastAPI local (TTS, VieNeu-TTS), CPU/ONNX, giữ warm
tts-server/start.sh                ← script chạy server TTS
tts-server/requirements.txt        ← dependencies Python (TTS)
src/app/api/voice/route.ts         ← API route Next.js, forward audio sang whisper-server
src/app/api/tts/route.ts           ← API route Next.js, forward text sang tts-server
src/hooks/useVoiceInput.ts         ← Hook MediaRecorder (hydration-safe)
src/components/VoiceMicButton.tsx  ← Nút mic theo brand CBD
src/lib/speech.ts                  ← speak()/stopSpeaking() gọi /api/tts, phát qua <audio>
```

## 1. Cài đặt (một lần)

Cần Python 3.11+ với module `venv`. Tạo venv riêng để không đụng tới Python hệ thống:

```bash
cd whisper-server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Nếu chạy GPU NVIDIA (khuyến nghị — nhanh hơn nhiều so với CPU), cài thêm cuDNN/cuBLAS
qua pip (không cần cài CUDA Toolkit hệ thống):

```bash
.venv/bin/pip install nvidia-cudnn-cu12 nvidia-cublas-cu12
```

Không có GPU? Sửa `WHISPER_DEVICE=cpu` khi chạy server (xem mục 3) — vẫn chạy được,
chỉ chậm hơn.

Model (`medium` mặc định, ~1.5GB) tự tải từ Hugging Face vào `~/.cache/huggingface`
khi server khởi động lần đầu.

Tương tự cho TTS (đọc to câu trả lời), venv riêng:

```bash
cd tts-server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

VieNeu-TTS chạy **CPU/ONNX (int8)** theo mặc định — không cần GPU, nên không
tranh VRAM với whisper-server đang chạy CUDA trên cùng máy. Model (~vài trăm MB)
tự tải từ Hugging Face vào `~/.cache/huggingface` khi server khởi động lần đầu.

## 2. Chạy server

```bash
npm run voice:server   # STT — faster-whisper, cổng 8008
npm run tts:server      # TTS — VieNeu-TTS, cổng 8009
```

Kiểm tra:

```bash
curl http://127.0.0.1:8008/health
# {"status":"ok","model":"medium","device":"cuda"}

curl http://127.0.0.1:8009/health
# {"status":"ok","voice":"Trúc Ly"}
```

Chạy song song với `npm run dev` (3 terminal riêng: dev, voice:server, tts:server)
khi dev/test tính năng voice. Model được load 1 lần khi mỗi server start và giữ
warm cho các request sau — không load lại mỗi lần ghi âm/đọc to.

### Tuỳ chỉnh (biến môi trường khi chạy start.sh)

- `WHISPER_MODEL_SIZE` — `tiny` / `base` / `small` / `medium` (mặc định) / `large-v3`.
  Model lớn hơn chính xác hơn nhưng chậm hơn và tốn VRAM/RAM hơn.
- `WHISPER_DEVICE` — `cuda` (mặc định) hoặc `cpu`.
- `WHISPER_COMPUTE_TYPE` — mặc định `float16` (GPU) / `int8` (CPU).
- `VIENEU_VOICE` — tên giọng đọc TTS (mặc định `Trúc Ly` — nữ, Bắc, tự nhiên).
  Xem toàn bộ danh sách 14 giọng có sẵn (Bắc/Trung/Nam, nam/nữ) bằng:
  `.venv/bin/python -c "from vieneu import Vieneu; print(Vieneu().list_preset_voices())"`

Route Next.js đọc URL server qua `WHISPER_SERVER_URL` / `TTS_SERVER_URL` trong `.env`
(mặc định `http://127.0.0.1:8008/transcribe` và `http://127.0.0.1:8009/synthesize`,
không cần set nếu chạy local mặc định).

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
- Lỗi mạng / whisper-server chưa chạy → hiện thông báo tiếng Việt phía trên nút

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
- whisper-server / tts-server phải chạy trên **cùng máy** với Next.js server
  (hoặc máy khác cùng mạng nội bộ + đổi `WHISPER_SERVER_URL`/`TTS_SERVER_URL`)
  — không expose ra internet vì không có xác thực.
- VAD filter (`vad_filter=True` trong `whisper-server/server.py`) tự cắt khoảng
  lặng, giúp giảm ảo giác (hallucination) khi micro thu phải im lặng/tiếng ồn nền.
- VieNeu-TTS license **Apache 2.0** — dùng thoải mái cho sản phẩm thương mại
  (khác với nhiều model TTS tiếng Việt khác như mms-tts-vie/CC-BY-NC hay
  viXTTS/Coqui Public Model License, chỉ cho phép dùng phi thương mại).

## 6. Test nhanh

```bash
npm run voice:server   # terminal 1 — STT
npm run tts:server      # terminal 2 — TTS
npm run dev             # terminal 3
# Mở http://localhost:3000/order, bấm mic, nói:
# "Cho mình một ly cold brew ít ngọt"
# Bật nút 🔈 ở header chatbot để nghe bot đọc to câu trả lời
```

Test route riêng (STT):

```bash
curl -X POST http://localhost:3000/api/voice \
  -F "audio=@test.webm" \
  -F "hint=Cold Brew, Cà Phê Sữa Đá, Latte"
```

Test thẳng whisper-server (bỏ qua Next.js):

```bash
curl -X POST http://127.0.0.1:8008/transcribe \
  -F "audio=@test.webm" \
  -F "hint=Cold Brew, Cà Phê Sữa Đá, Latte"
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
