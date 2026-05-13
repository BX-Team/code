FROM oven/bun:1.3-alpine AS base
WORKDIR /app

# Copy all package.json files for layer caching
COPY package.json bun.lock turbo.json ./
COPY apps/meridian/package.json apps/meridian/
COPY packages/stratus/package.json packages/stratus/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/

RUN bun install

# Copy source
COPY packages/stratus packages/stratus
COPY packages/types packages/types
COPY packages/ui packages/ui
COPY apps/meridian apps/meridian

ARG GIT_COMMIT_HASH=unknown
ARG GIT_COMMIT_MESSAGE=""
ENV GIT_COMMIT_HASH=$GIT_COMMIT_HASH
ENV GIT_COMMIT_MESSAGE=$GIT_COMMIT_MESSAGE

RUN bun run build:meridian

FROM oven/bun:1.3-alpine
WORKDIR /app
COPY --from=base /app/apps/meridian/.output .output

ENV NODE_ENV=production
EXPOSE 3000/tcp
ENTRYPOINT ["bun", "--bun", "run", "/app/.output/server/index.mjs"]
