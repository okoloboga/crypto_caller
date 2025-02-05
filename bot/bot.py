import logging
import os
from aiogram import Bot, Dispatcher, types, F
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, CallbackQuery, FSInputFile
from aiogram.client.bot import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command
from dotenv import load_dotenv
import asyncio

# Загружаем переменные из .env файла
load_dotenv()

# Читаем токен из переменных окружения
BOT_TOKEN = os.getenv("BOT_TOKEN")

# ID пользователя, которому отправлять сообщения
ADMIN_ID = os.getenv("ADMIN_ID")  # Замените на нужный ID

# Адрес вашего Telegram Web App
WEB_APP_URL = os.getenv("WEB_APP_URL")

# Настройка логирования
logging.basicConfig(level=logging.INFO)

# Создаём экземпляры бота и диспетчера
bot_properties = DefaultBotProperties(parse_mode=ParseMode.HTML)
bot = Bot(token=BOT_TOKEN, default=bot_properties)
dp = Dispatcher()

# Словарь для отслеживания состояния ввода сообщений пользователями
user_feedback_state = {}

# Функция для создания главного меню
def get_main_menu():
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="RUBLE CALLER", web_app=WebAppInfo(url=WEB_APP_URL))
            ],
            [
                InlineKeyboardButton(text="Обратная связь", callback_data="leave_feedback")
            ]
        ]
    )

# Обработчик команды /start
@dp.message(Command("start"))
async def send_welcome(message: types.Message):

    photo = FSInputFile("main.jpg")
    caption_text = "Привет! Нажмите на кнопку ниже, чтобы запустить RUBLE CALLER или оставить отзыв:"

    # Отправляем изображение с подписью и клавиатурой
    await message.answer_photo(
        photo,
        caption=caption_text,
        reply_markup=get_main_menu()
    )

# Обработчик нажатия на кнопку "Оставить отзыв"
@dp.callback_query(F.data == "leave_feedback")
async def ask_for_feedback(callback_query: CallbackQuery):
    user_id = callback_query.from_user.id
    user_feedback_state[user_id] = True  # Устанавливаем флаг ожидания ввода сообщения
    
    # Клавиатура с кнопкой "Назад"
    cancel_keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 НАЗАД", callback_data="cancel_feedback")]
        ]
    )

    await bot.send_message(user_id, "Пожалуйста, введите ваше обращение или нажмите 'НАЗАД' для отмены:", reply_markup=cancel_keyboard)
    await callback_query.answer()

# Обработчик кнопки "НАЗАД"
@dp.callback_query(F.data == "cancel_feedback")
async def cancel_feedback(callback_query: CallbackQuery):
    user_id = callback_query.from_user.id

    # Убираем пользователя из состояния ввода
    user_feedback_state.pop(user_id, None)

    await bot.send_message(user_id, "Возвращаюсь в главное меню:", reply_markup=get_main_menu())
    await callback_query.answer()

# Обработчик текстовых сообщений (принимаем отзывы)
@dp.message()
async def handle_text(message: types.Message):
    user_id = message.from_user.id
    
    if user_id in user_feedback_state and user_feedback_state[user_id]:
        # Отправляем отзыв админу
        feedback_text = f"Новое обращение от @{message.from_user.username or message.from_user.full_name}:\n\n{message.text}"
        await bot.send_message(ADMIN_ID, feedback_text)

        # Подтверждаем пользователю, что сообщение отправлено
        await message.answer("Ваше обращение отправлено. Спасибо!", reply_markup=get_main_menu())

        # Убираем состояние ожидания ввода
        user_feedback_state.pop(user_id, None)
    else:
        await message.answer("Используйте /start, чтобы открыть Web App или оставить отзыв.", reply_markup=get_main_menu())

# Запуск бота
async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
