# Базовый образ с Node.js
FROM node:18 AS build

# Установка рабочей директории
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm install --legacy-peer-deps

# Копируем все остальные файлы проекта
COPY . .

# Собираем проект
RUN npm run build

# Разворачиваем сервер с готовым билдом
FROM nginx:alpine

# Копируем билд фронтенда в папку для nginx
COPY --from=build /app/build /usr/share/nginx/html

# Настройка порта, на котором будет работать nginx
EXPOSE 80

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]
