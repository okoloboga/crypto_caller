ARG NODE_IMAGE=node:18-slim

# 1. Build Stage
FROM ${NODE_IMAGE} AS builder
WORKDIR /app

# Копируем зависимости для кеширования
COPY package*.json ./
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# 2. Production Stage
FROM nginx:1.25-alpine AS production

# Копируем собранные файлы
COPY --from=builder /app/build /usr/share/nginx/html

# Копируем конфигурацию nginx (если есть)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]

