ARG NODE_IMAGE=node:18-slim

# 1. Build Stage - сборка frontend
FROM ${NODE_IMAGE} AS frontend-build
WORKDIR /app

# Копируем зависимости для кеширования
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Копируем исходный код frontend
COPY frontend/ ./

# Собираем приложение
RUN npm run build

# 2. Production Stage - nginx с собранным frontend
FROM nginx:1.25-alpine AS production

# Копируем собранный frontend
COPY --from=frontend-build /app/build /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d /etc/nginx/conf.d

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
