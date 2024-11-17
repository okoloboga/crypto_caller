# Базовый образ с Node.js
FROM node:18 AS build

# Установка рабочей директории
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm install

# Копируем остальные файлы проекта
COPY . .

# Компиляция TypeScript в JavaScript
RUN npm run build

# Установка переменных окружения
ENV NODE_ENV=production

# Экспонируем порт для приложения
EXPOSE 3000

# Запуск backend приложения
CMD ["npm", "run", "start:prod"]
