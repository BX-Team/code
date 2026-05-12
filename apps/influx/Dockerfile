FROM oven/bun:1.3-alpine AS base
WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY apps/influx/package.json apps/influx/
COPY apps/cinder/package.json apps/cinder/
COPY apps/meridian/package.json apps/meridian/
COPY apps/zenith/package.json apps/zenith/
COPY packages/stratus/package.json packages/stratus/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/

RUN bun install --frozen-lockfile --production

COPY packages/stratus packages/stratus
COPY packages/types packages/types
COPY apps/influx apps/influx

WORKDIR /app/apps/influx
CMD ["bun", "run", "src/index.ts"]
