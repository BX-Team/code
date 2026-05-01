FROM oven/bun:1.3-alpine AS base
WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY packages/ packages/
COPY apps/influx/ apps/influx/

RUN bun install --frozen-lockfile --production

WORKDIR /app/apps/influx
CMD ["bun", "run", "src/index.ts"]
