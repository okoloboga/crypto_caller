# Stage 1: Сборка фронтенда
FROM node:16 as frontend-build

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

# Копируем исходный код фронтенда и собираем приложение
COPY frontend/ ./
RUN npm run build

# Stage 2: Настройка Nginx с собранным фронтендом
FROM nginx:alpine

# Копируем собранный фронтенд из первого этапа в папку, которую Nginx обслуживает
COPY --from=frontend-build /app/build /usr/share/nginx/html

# Копируем конфигурацию Nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Открываем порты
EXPOSE 80
EXPOSE 443
