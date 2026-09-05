# Voice Order — Gemini (STT + TTS)

Module đặt món bằng giọng nói + đọc to câu trả lời cho trang `/order`. Cả
nhận diện giọng nói (STT) và đọc to (TTS) đều chạy qua Gemini API — không cần
server riêng nào, hoạt động giống nhau ở local dev lẫn Vercel production.

**STT (nhận diện giọng nói)** dùng `gemini-3.6-flash` (xem `src/lib/gemini.ts`
hàm `transcribeAudio`). Lịch sử: bản đầu dùng **faster-whisper chạy local**
(`whisper-server/`, đã xoá khỏi repo) — chỉ chạy được khi Next.js server và
whisper-server chung 1 máy, không hoạt động trên Vercel. Đổi sang **Groq API
(whisper-large-v3)** để chạy được trên Vercel, nhưng Whisper (mọi biến thể)
hay "bịa" (hallucinate) hẳn 1 câu không liên quan khi audio không có lời nói
rõ ràng (im lặng/tiếng ồn quán) — hệ quả của việc train nhiều trên phụ đề
YouTube tự động; chặn bằng blocklist từ khoá + ngưỡng no_speech_prob là chữa
cháy, không triệt để. Đổi tiếp sang **Gemini** — test thực tế không lặp lại
kiểu hallucination này trên audio im lặng/nhiễu nền, nhưng đổi lại có thể
thỉnh thoảng nghe nhầm/nhầm món khi khách nói tên món mượn tiếng Anh (Latte,
Cappuccino, Espresso...). Đây là đánh đổi đã biết và được chấp nhận — xem lịch
sử đổi chi tiết trong `src/app/api/voice/route.ts` và `src/lib/gemini.ts`.

**TTS (đọc to câu trả lời)** dùng `gemini-2.5-flash-preview-tts` (xem
`src/lib/gemini.ts` hàm `synthesizeSpeech`) — trả về audio PCM thô, được bọc
thành WAV trước khi trả cho client. Trước đây dùng **VieNeu-TTS chạy local**
(`tts-server/`, đã xoá khỏi repo) — cùng vấn đề với STT bản đầu: route gọi
`127.0.0.1:8009` chỉ hoạt động khi Next.js server và tts-server chung 1 máy,
nên đọc to không hoạt động thật trên Vercel (lỗi âm thầm vì đây là tính năng
phụ, không chặn luồng chính, nên không ai để ý cho tới khi kiểm tra kỹ).

```
src/app/api/voice/route.ts         ← API route Next.js, gọi Gemini transcribeAudio()
src/app/api/tts/route.ts           ← API route Next.js, gọi Gemini synthesizeSpeech()
src/lib/gemini.ts                  ← transcribeAudio() + synthesizeSpeech(), cả 2 đều gọi Gemini
src/hooks/useVoiceInput.ts         ← Hook MediaRecorder (hydration-safe)
src/components/VoiceMicButton.tsx  ← Nút mic theo brand CBD
src/lib/speech.ts                  ← speak()/stopSpeaking() gọi /api/tts, phát qua <audio>
```

## 0. Cấu hình

Chỉ cần biến môi trường `GEMINI_API_KEY` (dùng chung với tính năng tạo ảnh
check-in — xem `generateCheckinPhoto` trong `src/lib/gemini.ts` — nên đã có
sẵn trong `.env`; nhớ set tương ứng trong Vercel project settings cho
production/preview). Không cần cài đặt hay chạy server nào khác — cả STT lẫn
TTS đều gọi thẳng Gemini API qua SDK `@google/genai`. Thiếu key thì nút mic
vẫn hiện (ghi âm được) nhưng bấm gửi/đọc to sẽ báo lỗi thân thiện, không
crash trang.

## 1. Gắn vào chatbot panel

Trong component chatbot ở trang `/order`, đặt nút mic cạnh ô nhập tin nhắn và đẩy transcript vào **cùng hàm xử lý tin nhắn gõ tay** (pipeline scoring hiện tại giữ nguyên):

```tsx
import VoiceMicButton from "@/components/VoiceMicButton";

// menuItems: dữ liệu menu bạn đang có sẵn ở order page
<VoiceMicButton
  onTranscript={(text) => handleUserMessage(text)}
  hintPhrases={menuItems.map((m) => m.name)}
/>
```

`hintPhrases` rất quan trọng: tên món được truyền làm ngữ cảnh chính tả cho
Gemini, giúp nhận đúng các từ trộn Anh-Việt như "Cold Brew", "Latte", "Bạc Xỉu".

## 2. Hành vi

**Ghi âm (STT):**
- Bấm mic → xin quyền micro → ghi âm (viền cam lan tỏa khi đang nghe)
- Bấm lần nữa để dừng, hoặc tự dừng sau 12 giây
- Transcript trả về → đi vào chatbot như tin nhắn gõ tay
- Trình duyệt không hỗ trợ (hoặc chưa hydrate) → nút tự ẩn, không vỡ layout
- Lỗi mạng / Gemini API lỗi hoặc chưa cấu hình `GEMINI_API_KEY` → hiện thông báo tiếng Việt phía trên nút
- Audio không có lời nói rõ ràng (im lặng/tiếng ồn) → Gemini tự báo không nghe
  được, hiện "Mình chưa nghe rõ, bạn nói lại giúp mình nhé" thay vì bịa chữ

**Đọc to (TTS):**
- Nút 🔈/🔊 trên header ChatPanel bật/tắt đọc to — mặc định tắt
- Khi bật, mỗi câu trả lời mới của bot tự phát qua Gemini TTS (giọng
  `Kore` mặc định — đổi hằng số `TTS_VOICE` trong `src/lib/gemini.ts` nếu
  nghe thử thấy giọng khác hợp CBD Robot hơn; các lựa chọn khác: Puck, Aoede,
  Charon, Fenrir...)
- Bấm mic để ghi âm khi đang đọc → tự ngắt câu đang đọc cho rõ tiếng
- Lỗi mạng / Gemini API lỗi → im lặng, không đọc được (lỗi log ra console,
  không hiện gián đoạn UI vì đây là tính năng phụ, không phải luồng chính)

## 3. Lưu ý kỹ thuật

- **HTTPS bắt buộc** với `getUserMedia` — `localhost` được miễn, nhưng khi
  deploy phải có SSL, và khi test qua LAN (vd điện thoại → máy dev) sẽ bị chặn
  nếu không dùng https hoặc tunnel (ngrok, cloudflared).
- Safari/iOS ghi ra `audio/mp4` thay vì webm — route đã xử lý cả hai.
- Rate limit trong route voice (12 req/phút/IP) và tts (20 req/phút/IP) là
  in-memory, đủ cho MVP một instance.
- Cả STT lẫn TTS đều hoạt động độc lập với máy dev — chạy được trên Vercel
  production, không phụ thuộc máy nào đang bật, không cần expose port ra
  internet như 2 kiến trúc local trước đây.

## 4. Test nhanh

```bash
npm run dev
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

Test route riêng (TTS) — lưu kết quả ra file để nghe thử:

```bash
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Chào bạn! Mình là CBD Robot, bạn muốn uống gì hôm nay?"}' \
  -o reply.wav && open reply.wav   # hoặc xdg-open / aplay trên Linux
```
