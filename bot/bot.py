import logging
import os
import requests

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
ADMIN_ID = os.getenv("ADMIN_ID")
STATS_ID = os.getenv("STATS_IDS")

# Адрес вашего Telegram Web App
WEB_APP_URL = os.getenv("WEB_APP_URL")
TICKET_ROUTE = os.getenv("TICKET_ROUTE")

# Настройка логирования
logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format='%(filename)s:%(lineno)d #%(levelname)-8s '
           '[%(asctime)s] - %(name)s - %(message)s')

# Создаём экземпляры бота и диспетчера
bot_properties = DefaultBotProperties(parse_mode=ParseMode.HTML)
bot = Bot(token=BOT_TOKEN, default=bot_properties)
dp = Dispatcher()

# Словарь для отслеживания состояния ввода сообщений пользователями
user_feedback_state = {}

'''REQUESTS'''

# Функция для создания записи
def create_ticket(message):

    user_id = message.from_user.id

    logger.info(f"Создание Тикета. user_id: {user_id}, message: {message.text}")

    # Данные для создания записи
    data = {
        "userId": user_id,
        "message": message.text
    }

    # Отправка POST-запроса
    response = requests.post(TICKET_ROUTE, json=data)

    logger.info(f"Ответ от сервера за добавление записи: {response}")

    # Проверка результата
    if response.status_code == 201:
        message.answer("Ваше обращение успешно создано!")
    elif response.status_code == 409:
        message.answer("У вас уже есть активное обращение. Пожалуйста, дождитесь ответа.")
    else:
        message.answer("Произошла ошибка при создании обращения. Попробуйте позже.")

# Функция для удаления записи
def delete_ticket(user_ticket_id, message):

    logger.info(f"Удаление Тикета. user_id: {user_ticket_id}")

    data = {
        "userId": user_ticket_id,
    }

    # Отправка DELETE-запроса
    response = requests.delete(TICKET_ROUTE, json=data)
                               
    logger.info(f"Ответ от сервера за удаление записи: {response}")

    # Проверка результата
    if response.status_code == 200:
        message.answer("Обращение успешно удалено!")
    elif response.status_code == 404:
        message.answer("У вас нет активных обращений.")
    else:
        message.answer("Произошла ошибка при удалении обращения. Попробуйте позже.")

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

    await bot.send_message(user_id, "Введите ваше обращение, начиная со слова\n\nticket\n\nили нажмите 'НАЗАД' для отмены:", reply_markup=cancel_keyboard)
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
@dp.message(F.text.startswith("ticket"))
async def handle_text(message: types.Message):
    user_id = message.from_user.id
    
    logger.info(f"Пользователь {user_id} оставил Тикет: {message.text}")

    if user_id in user_feedback_state and user_feedback_state[user_id]:

        # Клавиатура с кнопкой "Ответить"
        answer_keyboard = InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text="Ответить", callback_data=f"answer_feedback_{user_id}")]
            ]
        )

        # Отправляем отзыв админу
        feedback_text = f"Новое обращение от #{user_id}:\n\n{message.text}"
        await bot.send_message(ADMIN_ID, feedback_text, reply_markup=answer_keyboard)

        # Подтверждаем пользователю, что сообщение отправлено
        await message.answer("Ваше обращение отправлено. Спасибо!", reply_markup=get_main_menu())
        create_ticket(message)

        # Убираем состояние ожидания ввода
        user_feedback_state.pop(user_id, None)
    else:
        await message.answer("Используйте /start, чтобы открыть Web App или оставить отзыв.", reply_markup=get_main_menu())

# Обработчик входа в режим ответа на обращение
@dp.callback_query(F.data[:16] == "answer_feedback_")
async def ticket_answer(callback_query: CallbackQuery):

    logger.info(f"Отвечаем на обращение {callback_query.data}")

    user_ticket_id = callback_query.data[16:]

    await callback_query.message.answer(f"Введи ответ пользователю, начиная с фразы:")
    await callback_query.message.answer(f"answer_{user_ticket_id}")
    await callback_query.answer()

# Обработка ответа пользователю от админа
@dp.message(F.text.startswith("answer_"))
async def ticket_answer_process(message: types.Message):

    logger.info(f"Отвечаем пользователю от админа {message.text}")

    user_ticket_id = message.text[7:message.text.find(" ")]
    answer_text = message.text[message.text.find(" "):]

    await bot.send_message(user_ticket_id, f"Ответ от тех. поддержки: {answer_text}")
    delete_ticket(user_ticket_id, message)

# Обработчик остальных сообщений
@dp.message()
async def unknown_message(message: types.Message):

    await message.answer("Вы отправили что то непонятное... Если хотите написать обращение для тех. поддержки - нажмите Обратная связь и введите свой запрос начиная со слова\n\nticket")

# Запуск бота
async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
