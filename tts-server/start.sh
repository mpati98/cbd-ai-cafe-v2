#!/usr/bin/env bash
# Chạy local VieNeu-TTS server cho tính năng đọc to câu trả lời
# (xem ../src/app/api/tts/route.ts)
set -e
cd "$(dirname "$0")"
exec .venv/bin/uvicorn server:app --host 127.0.0.1 --port 8009
