# Stage 1: Сборка фронтенда
FROM node:18 AS frontend-build

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

# Копируем исходный код фронтенда
COPY frontend/ ./

# Собираем приложение
RUN npm run build

# Проверяем, что билд создан
RUN ls -al /app/build

# Stage 2: Настройка Nginx
FROM nginx:alpine

# Копируем собранный фронтенд в папку Nginx
COPY --from=frontend-build /app/build /usr/share/nginx/html

# Копируем конфигурации для Nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Открываем порты
EXPOSE 80
EXPOSE 443

# Запускаем Nginx
CMD ["nginx", "-g", "daemon off;"]
