ARG NODE_IMAGE=node:18-slim

# 1. Base Stage
FROM ${NODE_IMAGE} AS base
WORKDIR /app

# 2. Production Dependencies Stage
FROM base AS prod-deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 3. Build Stage
FROM base AS builder
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .
RUN npm run build

# 4. Runner Stage (Final)
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production

# Установка curl для healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Копируем только production зависимости
COPY --from=prod-deps /app/node_modules ./node_modules

# Копируем только собранные файлы и package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
