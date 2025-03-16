import logging
import os
import requests
import asyncio

from aiogram import Bot, Dispatcher, types, F
from aiogram.types import CallbackQuery, FSInputFile
from aiogram.client.bot import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command
from fluentogram import TranslatorRunner
from dotenv import load_dotenv

from i18n import TranslatorHub, create_translator_hub, TranslatorRunnerMiddleware
from keyboards import get_main_menu, get_cancel_keyboard, get_answer_keyboard

# Загружаем переменные из .env файла
load_dotenv()

# Читаем токен из переменных окружения
BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_ID = os.getenv("ADMIN_ID")
STATS_ID = os.getenv("STATS_IDS")
WEB_APP_URL = os.getenv("WEB_APP_URL")
WEBSITE_URL = os.getenv("WEBSITE_URL")
X_URL = os.getenv("X_URL")
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
translator_hub: TranslatorHub = create_translator_hub()

# Словарь для отслеживания состояния ввода сообщений пользователями
user_feedback_state = {}

'''REQUESTS'''

def create_ticket(message):
    user_id = message.from_user.id
    logger.info(f"Создание Тикета. user_id: {user_id}, message: {message.text}")
    data = {"userId": user_id, "message": message.text}
    response = requests.post(TICKET_ROUTE, json=data)
    logger.info(f"Ответ от сервера за добавление записи: {response}")
    return response.status_code

def delete_ticket(user_ticket_id, message):
    logger.info(f"Удаление Тикета. user_id: {user_ticket_id}")
    data = {"userId": user_ticket_id}
    response = requests.delete(TICKET_ROUTE, json=data)
    logger.info(f"Ответ от сервера за удаление записи: {response}")
    return response.status_code

@dp.message(Command("start"))
async def send_welcome(message: types.Message, i18n: TranslatorRunner):
    photo = FSInputFile("main.jpg")
    caption_text = i18n.welcome_message()
    await message.answer_photo(
        photo,
        caption=caption_text,
        reply_markup=get_main_menu(WEB_APP_URL, WEBSITE_URL, X_URL)
    )

@dp.callback_query(F.data == "leave_feedback")
async def ask_for_feedback(callback_query: CallbackQuery, i18n: TranslatorRunner):
    user_id = callback_query.from_user.id
    user_feedback_state[user_id] = True
    await bot.send_message(user_id, i18n.feedback_prompt(), reply_markup=get_cancel_keyboard(i18n))
    await callback_query.answer()

@dp.callback_query(F.data == "cancel_feedback")
async def cancel_feedback(callback_query: CallbackQuery, i18n: TranslatorRunner):
    user_id = callback_query.from_user.id
    user_feedback_state.pop(user_id, None)
    await bot.send_message(user_id, i18n.return_to_menu(), reply_markup=get_main_menu(WEB_APP_URL, WEBSITE_URL, X_URL))
    await callback_query.answer()

@dp.message(F.text.startswith("ticket"))
async def handle_text(message: types.Message, i18n: TranslatorRunner):
    user_id = message.from_user.id
    logger.info(f"Пользователь {user_id} оставил Тикет: {message.text}")

    if user_id in user_feedback_state and user_feedback_state[user_id]:
        feedback_text = i18n.new_feedback(user_id=user_id, message=message.text)
        await bot.send_message(ADMIN_ID, feedback_text, reply_markup=get_answer_keyboard(user_id, i18n))

        status = create_ticket(message)
        if status == 201:
            await message.answer(i18n.feedback_success(), reply_markup=get_main_menu(WEB_APP_URL, WEBSITE_URL, X_URL))
        elif status == 409:
            await message.answer(i18n.feedback_exists(), reply_markup=get_main_menu(WEB_APP_URL, WEBSITE_URL, X_URL))
        else:
            await message.answer(i18n.feedback_error(), reply_markup=get_main_menu(WEB_APP_URL, WEBSITE_URL, X_URL))

        user_feedback_state.pop(user_id, None)
    else:
        await message.answer(i18n.use_start(), reply_markup=get_main_menu(WEB_APP_URL, WEBSITE_URL, X_URL))

@dp.callback_query(F.data[:16] == "answer_feedback_")
async def ticket_answer(callback_query: CallbackQuery, i18n: TranslatorRunner):
    logger.info(f"Отвечаем на обращение {callback_query.data}")
    user_ticket_id = callback_query.data[16:]
    await callback_query.message.answer(i18n.answer_prompt(user_ticket_id=user_ticket_id))
    await callback_query.answer()

@dp.message(F.text.startswith("answer_"))
async def ticket_answer_process(message: types.Message, i18n: TranslatorRunner):
    logger.info(f"Отвечаем пользователю от админа {message.text}")
    user_ticket_id = message.text[7:message.text.find(" ")]
    answer_text = message.text[message.text.find(" "):]
    
    status = delete_ticket(user_ticket_id, message)
    if status == 200:
        await bot.send_message(user_ticket_id, i18n.support_answer(answer_text=answer_text))
    elif status == 404:
        await message.answer(i18n.no_active_tickets())
    else:
        await message.answer(i18n.delete_error())

@dp.message()
async def unknown_message(message: types.Message, i18n: TranslatorRunner):
    await message.answer(i18n.unknown_message())

async def main():
    dp.update.middleware(TranslatorRunnerMiddleware())
    await dp.start_polling(bot, _translator_hub=translator_hub)

if __name__ == "__main__":
    asyncio.run(main())