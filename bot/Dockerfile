# Используем базовый образ Python
FROM python:3.11-slim

# Установка рабочей директории
WORKDIR /app

# Копируем файл зависимостей
COPY requirements.txt ./

# Установка зависимостей через pip
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код бота
COPY . .

# Настройка переменных окружения
ENV TELEGRAM_TOKEN=your-telegram-token

# Экспонируем порт, если это необходимо (обычно для Aiogram не требуется)
EXPOSE 5000

# Запуск бота
CMD ["python", "bot.py"]
