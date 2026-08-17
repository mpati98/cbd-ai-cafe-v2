"""Local faster-whisper transcription server cho voice order.

Chạy: whisper-server/.venv/bin/uvicorn server:app --host 127.0.0.1 --port 8008
Model được load một lần khi server khởi động và giữ warm trong VRAM/RAM
(tránh phải nạp lại model mỗi request như cách gọi subprocess).
"""

import os
import tempfile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from faster_whisper import WhisperModel

MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "medium")
DEVICE = os.environ.get("WHISPER_DEVICE", "cuda")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "float16" if DEVICE == "cuda" else "int8")

app = FastAPI()
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE, "device": DEVICE}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), hint: str = Form("")):
    suffix = os.path.splitext(audio.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        segments, _info = model.transcribe(
            tmp_path,
            language="vi",
            temperature=0,
            initial_prompt=hint[:800] if hint else None,
            vad_filter=True,
        )
        text = "".join(seg.text for seg in segments).strip()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        os.unlink(tmp_path)

    return {"text": text}
