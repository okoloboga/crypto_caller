import logging
import os
from aiogram import Bot, Dispatcher, types
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.client.bot import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command  # Импортируем новый фильтр
from dotenv import load_dotenv
import asyncio

# Загружаем переменные из .env файла
load_dotenv()

# Читаем токен из переменных окружения
BOT_TOKEN = os.getenv("BOT_TOKEN")

# Адрес вашего Telegram Web App
WEB_APP_URL = "https://caller.ruble.website"

# Настройка логирования (рекомендуется для Aiogram)
logging.basicConfig(level=logging.INFO)

# Создаём экземпляры бота и диспетчера
bot_properties = DefaultBotProperties(parse_mode=ParseMode.HTML)  # Настроим parse_mode через DefaultBotProperties
bot = Bot(token=BOT_TOKEN, default=bot_properties)  # Передаем default вместо parse_mode
dp = Dispatcher()

# Обработчик команды /start
@dp.message(Command("start"))  # Используем новый фильтр для команды
async def send_welcome(message: types.Message):
    # Создаём кнопку для открытия Web App
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Войти в приложение", web_app=WebAppInfo(url=WEB_APP_URL)
                )
            ]
        ]
    )
    
    await message.answer(
        "Привет! Нажмите на кнопку ниже, чтобы войти в Telegram Web App:",
        reply_markup=keyboard
    )

# Обработчик текстовых сообщений (опционально)
@dp.message()
async def handle_text(message: types.Message):
    await message.answer("Используйте /start, чтобы открыть Web App.")

# Запуск бота
async def main():
    # Запускаем бота с помощью start_polling
    await dp.start_polling(bot)

if __name__ == "__main__":
    # Запускаем цикл событий asyncio
    asyncio.run(main())
