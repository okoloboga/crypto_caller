# Stage 1: Сборка фронтенда
FROM node:16 as frontend-build

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY ./frontend/package*.json ./
RUN npm install

# Копируем исходный код фронтенда и собираем приложение
COPY ./frontend .
RUN npm run build

# Stage 2: Настройка Nginx с собранным фронтендом
FROM nginx:alpine

# Копируем конфигурацию Nginx
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

# Копируем собранные файлы фронтенда в директорию для обслуживания Nginx
COPY --from=frontend-build /app/build /usr/share/nginx/html

# Открываем порты
EXPOSE 80
EXPOSE 443
