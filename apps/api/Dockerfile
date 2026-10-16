# Multi-stage Dockerfile for Fastify API on Cloud Run (us-central1 Free Tier)
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.11.2 --activate

# Copiar arquivos de configuração do monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar código-fonte
COPY packages/core ./packages/core
COPY packages/types ./packages/types
COPY apps/api ./apps/api

# Build de pacotes compartilhados e API
RUN pnpm --filter @dieta-ai/core build && \
    pnpm --filter @dieta-ai/types build && \
    pnpm --filter @dieta-ai/api build

# Stage 2: Runtime enxuto (< 90MB) para sub-50ms cold-start
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

RUN corepack enable && corepack prepare pnpm@12.11.2 --activate

# Copiar pacotes e builds compilados do estágio builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Instala apenas dependências de produção
RUN pnpm install --prod --frozen-lockfile

USER node

EXPOSE 8080

CMD ["node", "apps/api/dist/server.js"]
