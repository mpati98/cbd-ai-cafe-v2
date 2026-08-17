"""Local VieNeu-TTS server cho tính năng đọc to câu trả lời (text-to-speech).

Chạy: tts-server/.venv/bin/uvicorn server:app --host 127.0.0.1 --port 8009
Model được load một lần khi server khởi động và giữ warm. Chạy CPU/ONNX
(int8) theo mặc định của VieNeu-TTS — không cần GPU, nên không tranh VRAM
với whisper-server (voice-to-text) đang chạy CUDA trên cùng máy.
"""

import io
import os
import wave

from fastapi import FastAPI, Form, HTTPException
from fastapi.responses import Response
from vieneu import Vieneu

# Giọng mặc định: nữ, miền Bắc, phong cách tự nhiên — xem toàn bộ danh sách
# giọng có sẵn bằng engine.list_preset_voices().
VOICE = os.environ.get("VIENEU_VOICE", "Trúc Ly")
MAX_CHARS = 2000

app = FastAPI()
engine = Vieneu()


@app.get("/health")
def health():
    return {"status": "ok", "voice": VOICE}


@app.post("/synthesize")
def synthesize(text: str = Form(...)):
    text = text.strip()[:MAX_CHARS]
    if not text:
        raise HTTPException(status_code=400, detail="Thiếu nội dung cần đọc.")

    try:
        audio = engine.infer(text, voice=VOICE)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    # audio là numpy float32 trong [-1, 1] — chuyển sang PCM 16-bit chuẩn để
    # <audio>/Web Audio API ở client chắc chắn giải mã được (float WAV không
    # được hỗ trợ đồng nhất trên mọi trình duyệt).
    pcm16 = (audio.clip(-1, 1) * 32767).astype("<i2")

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(engine.sample_rate)
        wf.writeframes(pcm16.tobytes())

    return Response(content=buf.getvalue(), media_type="audio/wav")
