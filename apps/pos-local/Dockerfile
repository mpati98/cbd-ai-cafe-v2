# syntax=docker/dockerfile:1
#
# apps/pos-local — image cho PC tại quán (order voice+text, career predict).
# Build context PHẢI là repo root (npm workspaces / Turborepo) — xem
# docker-compose.yml (build.context: ../..). Multi-stage: cài deps 1 lần,
# build bằng turbo (tự build trước @cbd/database, @cbd/shared-types, @cbd/ui
# — xem turbo.json dependsOn "^build"), rồi copy output "standalone" của
# Next.js (apps/pos-local/next.config.js) sang runner tối giản.

ARG NODE_VERSION=22-bookworm-slim

# ---- deps: cài toàn bộ dependencies của workspace, cache theo lockfile ----
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# python3/make/g++: fallback node-gyp cho native deps (better-sqlite3, sharp)
# nếu không có prebuilt binary khớp platform — bị bỏ lại ở stage này, không
# lọt vào image chạy thật.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy đúng các package.json của từng workspace (không copy source) để layer
# `npm ci` chỉ invalidate khi dependency thay đổi, không phải mỗi lần sửa code.
COPY package.json package-lock.json ./
COPY apps/pos-local/package.json apps/pos-local/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY apps/landing/package.json apps/landing/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm ci

# ---- builder: generate Prisma client + build @cbd/pos-local qua turbo ----
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
ENV TURBO_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package-lock.json ./
COPY . .

# `next build` prerender trang /order (export const revalidate = 60, xem
# src/app/order/page.tsx) — nó gọi getLocalClient() qua requireDb(), throw
# cứng nếu LOCAL_DATABASE_URL hoàn toàn chưa set (khác với thiếu bảng, vốn đã
# được try/catch fallback về danh sách tĩnh trong lib/menu-cache.ts). Giá trị
# dưới đây chỉ tồn tại lúc build, không liên quan tới DB thật lúc chạy (do
# docker-compose.yml ghi đè LOCAL_DATABASE_URL sang volume /data).
ENV LOCAL_DATABASE_URL=file:./build-time-placeholder.db

# turbo.json không khai `env` cho task "build" -> turbo mặc định env-mode
# "strict" (Turborepo 2.x), tự lọc bỏ mọi biến môi trường không được khai báo
# trước khi spawn task con — kể cả LOCAL_DATABASE_URL vừa set ở trên. Dùng
# --env-mode=loose CHỈ cho lệnh build trong Docker (không đụng turbo.json,
# không ảnh hưởng cache/dev behavior của cả repo).
RUN npx turbo build --filter=@cbd/pos-local --env-mode=loose

# ---- runner: image chạy thật — chỉ chứa output standalone tối thiểu ----
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

# curl: dùng cho HEALTHCHECK bên dưới (và tiện debug tay trong container).
# openssl: Prisma query engine cần libssl lúc runtime.
# fontconfig + fonts-noto-core: sharp (lib libvips/librsvg) cần font hệ thống
# để render chữ SVG đè lên ảnh in career-prediction (ô ghi chú nghề nghiệp) -
# Noto Sans hỗ trợ đầy đủ dấu tiếng Việt, thiếu gói này chữ sẽ bị mất/lỗi ô vuông.
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl openssl fontconfig fonts-noto-core \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1001 nodejs \
    && useradd --uid 1001 --gid nodejs --shell /usr/sbin/nologin --no-create-home nextjs

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# output: "standalone" đã truy vết đúng node_modules cần thiết (kể cả native
# binary better-sqlite3/sharp) — copy nguyên cây thay vì cài lại node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/apps/pos-local/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/pos-local/.next/static ./apps/pos-local/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/pos-local/public ./apps/pos-local/public

# sharp gọi libvips-cpp.so qua dlopen() lúc runtime (không phải require() tĩnh)
# nên Next.js output-file-tracing (dùng cho .next/standalone ở trên) KHÔNG phát
# hiện được và bỏ sót các file .so nặng (~18MB) - route career-prediction sẽ
# crash "ERR_DLOPEN_FAILED: libvips-cpp.so... cannot open shared object file"
# dù npm ci đã tải đủ. Copy tay 2 thư mục này (nguyên vẹn, chưa bị tracing cắt
# bớt) từ builder để đảm bảo binary luôn có mặt trong image chạy thật.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@img ./node_modules/@img

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fs http://localhost:3000/api/health || exit 1

# server.js tự process.chdir(__dirname) — chạy được từ bất kỳ cwd nào, miễn
# đường dẫn tới file đúng (xem .next/standalone/apps/pos-local/server.js).
CMD ["node", "apps/pos-local/server.js"]
