# Stage 1: Сборка фронтенда
FROM node:18 AS frontend-build

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install --legacy-peer-deps

# Копируем исходный код фронтенда
COPY frontend/ ./

# Собираем приложение
RUN npm run build

# Проверяем содержимое папки build
RUN ls -al /app/build

# Stage 2: Настройка Nginx
FROM nginx:alpine

# Копируем собранный фронтенд в Nginx
COPY --from=frontend-build /app/build /usr/share/nginx/html

# Проверяем, что файлы действительно скопированы
RUN ls -al /usr/share/nginx/html

# Настраиваем конфигурацию
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
