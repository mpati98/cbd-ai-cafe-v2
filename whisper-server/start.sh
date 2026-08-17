#!/usr/bin/env bash
# Chạy local faster-whisper server cho voice order (xem ../src/app/api/voice/route.ts)
set -e
cd "$(dirname "$0")"
SITE=".venv/lib/python3.14/site-packages"
export LD_LIBRARY_PATH="$SITE/nvidia/cudnn/lib:$SITE/nvidia/cublas/lib:$SITE/nvidia/cuda_nvrtc/lib:$LD_LIBRARY_PATH"
exec .venv/bin/uvicorn server:app --host 127.0.0.1 --port 8008
