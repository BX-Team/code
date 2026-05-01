FROM oven/bun:1.3-alpine AS base
WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY packages/ packages/
COPY apps/cinder/ apps/cinder/

RUN bun install --frozen-lockfile --production

WORKDIR /app/apps/cinder
CMD ["bun", "run", "index.ts"]
