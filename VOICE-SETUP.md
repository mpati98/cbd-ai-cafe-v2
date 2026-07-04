# Voice Order — Groq Whisper (free tier)

Module đặt món bằng giọng nói cho trang `/order`. Gồm 3 file mới, không ghi đè file nào hiện có:

```
src/app/api/voice/route.ts      ← API route gọi Groq (key giữ server-side)
src/hooks/useVoiceInput.ts      ← Hook MediaRecorder (hydration-safe)
src/components/VoiceMicButton.tsx ← Nút mic theo brand CBD
```

## 1. Lấy API key (miễn phí, không cần thẻ)

1. Đăng ký tại https://console.groq.com
2. Tạo API key trong mục **API Keys**
3. Thêm vào `.env` (file này đã nằm trong `.gitignore`):

```
GROQ_API_KEY=gsk_xxxxxxxxxxxx
```

Free tier: ~2.000 request audio/ngày — mỗi lượt khách nói = 1 request.

## 2. Gắn vào chatbot panel

Trong component chatbot ở trang `/order`, đặt nút mic cạnh ô nhập tin nhắn và đẩy transcript vào **cùng hàm xử lý tin nhắn gõ tay** (pipeline scoring hiện tại giữ nguyên):

```tsx
import VoiceMicButton from "@/components/VoiceMicButton";

// menuItems: dữ liệu menu bạn đang có sẵn ở order page
<VoiceMicButton
  onTranscript={(text) => handleUserMessage(text)}
  hintPhrases={menuItems.map((m) => m.name)}
/>
```

`hintPhrases` rất quan trọng: tên món được truyền làm ngữ cảnh cho Whisper,
giúp nhận đúng các từ trộn Anh-Việt như "Cold Brew", "Latte", "Bạc Xỉu".

## 3. Hành vi

- Bấm mic → xin quyền micro → ghi âm (viền cam lan tỏa khi đang nghe)
- Bấm lần nữa để dừng, hoặc tự dừng sau 12 giây
- Transcript trả về → đi vào chatbot như tin nhắn gõ tay
- Trình duyệt không hỗ trợ (hoặc chưa hydrate) → nút tự ẩn, không vỡ layout
- Lỗi mạng / Groq bận → hiện thông báo tiếng Việt phía trên nút

## 4. Lưu ý kỹ thuật

- **HTTPS bắt buộc** với `getUserMedia` — `localhost` được miễn, nhưng khi
  deploy phải có SSL, và khi test qua LAN (vd điện thoại → máy dev) sẽ bị chặn
  nếu không dùng https hoặc tunnel (ngrok, cloudflared).
- Safari/iOS ghi ra `audio/mp4` thay vì webm — route đã xử lý cả hai.
- Rate limit trong route (12 req/phút/IP) là in-memory, đủ cho MVP một instance.
- Muốn đổi model: sửa hằng `MODEL` trong `route.ts`
  (`whisper-large-v3` chính xác hơn chút, chậm hơn chút).

## 5. Test nhanh

```bash
npm run dev
# Mở http://localhost:3000/order, bấm mic, nói:
# "Cho mình một ly cold brew ít ngọt"
```

Nếu muốn test route riêng:

```bash
curl -X POST http://localhost:3000/api/voice \
  -F "audio=@test.webm" \
  -F "hint=Cold Brew, Cà Phê Sữa Đá, Latte"
```
