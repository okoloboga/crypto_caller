"""
Main Telegram bot script for the RUBLE Farming App.
This script defines a Telegram bot that interacts with users, allowing them to access the app,
leave feedback, and receive responses from admins. It uses aiogram for bot development,
integrates with a backend API for ticket management, and supports internationalization (i18n).
"""

import logging
import os
import requests
import asyncio

# Import aiogram components for bot development
from aiogram import Bot, Dispatcher, types, F
from aiogram.types import CallbackQuery, FSInputFile
from aiogram.client.bot import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command

# Import fluentogram for translation support
from fluentogram import TranslatorRunner

# Import dotenv for loading environment variables
from dotenv import load_dotenv

# Import custom modules for internationalization and keyboards
from i18n import TranslatorHub, create_translator_hub, TranslatorRunnerMiddleware
from keyboards import get_main_menu, get_cancel_keyboard, get_answer_keyboard

# Load environment variables from .env file
load_dotenv()

# Read environment variables
BOT_TOKEN = os.getenv("BOT_TOKEN")  # Telegram bot token
ADMIN_ID = os.getenv("ADMIN_ID")  # Admin user ID for receiving feedback
STATS_ID = os.getenv("STATS_IDS")  # IDs for statistics (not used in this script)
WEB_APP_URL = os.getenv("WEB_APP_URL")  # URL for the web app
WEBSITE_URL = os.getenv("WEBSITE_URL")  # URL for the website
TRADE_URL = os.getenv("TRADE_URL")  # URL for trading
X_URL = os.getenv("X_URL")  # URL for X (e.g., Twitter)
TICKET_ROUTE = os.getenv("TICKET_ROUTE")  # Backend API route for ticket management

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(filename)s:%(lineno)d #%(levelname)-8s '
           '[%(asctime)s] - %(name)s - %(message)s'
)

# Initialize bot and dispatcher with HTML parse mode
bot_properties = DefaultBotProperties(parse_mode=ParseMode.HTML)
bot = Bot(token=BOT_TOKEN, default=bot_properties)
dp = Dispatcher()

# Initialize translator hub for internationalization
translator_hub: TranslatorHub = create_translator_hub()

# Dictionary to track user feedback state (whether a user is in the process of submitting feedback)
user_feedback_state = {}

'''REQUESTS'''

def create_ticket(message):
    """
    Create a ticket by sending user feedback to the backend API.
    Args:
        message (types.Message): The message containing the user's feedback.
    Returns:
        int: The HTTP status code from the API response.
    """
    user_id = message.from_user.id
    logger.info(f"Creating ticket. user_id: {user_id}, message: {message.text}")
    data = {"userId": user_id, "message": message.text}
    response = requests.post(TICKET_ROUTE, json=data)
    logger.info(f"Server response for adding ticket: {response}")
    return response.status_code

def delete_ticket(user_ticket_id, message):
    """
    Delete a ticket from the backend API.
    Args:
        user_ticket_id (str): The ID of the user whose ticket is being deleted.
        message (types.Message): The message triggering the deletion.
    Returns:
        int: The HTTP status code from the API response.
    """
    logger.info(f"Deleting ticket. user_id: {user_ticket_id}")
    data = {"userId": user_ticket_id}
    response = requests.delete(TICKET_ROUTE, json=data)
    logger.info(f"Server response for deleting ticket: {response}")
    return response.status_code

@dp.message(Command("start"))
async def send_welcome(message: types.Message, i18n: TranslatorRunner):
    """
    Handle the /start command by sending a welcome message with a photo and main menu.
    Args:
        message (types.Message): The incoming message with the /start command.
        i18n (TranslatorRunner): The translator for localized messages.
    """
    photo = FSInputFile("main.jpg")  # Load the welcome photo
    caption_text = i18n.welcome_message()  # Get the localized welcome message
    await message.answer_photo(
        photo,
        caption=caption_text,
        reply_markup=get_main_menu(WEB_APP_URL, WEBSITE_URL, X_URL, TRADE_URL)  # Attach the main menu keyboard
    )

@dp.callback_query(F.data == "leave_feedback")
async def ask_for_feedback(callback_query: CallbackQuery, i18n: TranslatorRunner):
    """
    Handle the "leave_feedback" callback to prompt the user for feedback.
    Args:
        callback_query (CallbackQuery): The callback query from the user.
        i18n (TranslatorRunner): The translator for localized messages.
    """
    user_id = callback_query.from_user.id
    user_feedback_state[user_id] = True  # Mark the user as in feedback mode
    await bot.send_message(user_id, i18n.feedback_prompt(), reply_markup=get_cancel_keyboard(i18n))
    await callback_query.answer()

@dp.callback_query(F.data == "cancel_feedback")
async def cancel_feedback(callback_query: CallbackQuery, i18n: TranslatorRunner):
    """
    Handle the "cancel_feedback" callback to cancel the feedback process.
    Args:
        callback_query (CallbackQuery): The callback query from the user.
        i18n (TranslatorRunner): The translator for localized messages.
    """
    user_id = callback_query.from_user.id
    user_feedback_state.pop(user_id, None)  # Remove the user from feedback mode
    await bot.send_message(user_id, i18n.return_to_menu(), reply_markup=get_main_menu(WEB_APP_URL, WEBSITE_URL, X_URL, TRADE_URL))
    await callback_query.answer()

@dp.message(F.text.startswith("ticket"))
async def handle_text(message: types.Message, i18n: TranslatorRunner):
    """
    Handle messages starting with "ticket" as user feedback submissions.
    Sends the feedback to the admin and creates a ticket via the backend API.
    Args:
        message (types.Message): The incoming message with the feedback.
        i18n (TranslatorRunner): The translator for localized messages.
    """
    user_id = message.from_user.id
    logger.info(f"User {user_id} submitted a ticket: {message.text}")

    if user_id in user_feedback_state and user_feedback_state[user_id]:
        feedback_text = i18n.new_feedback(user_id=user_id, message=message.text)
        await bot.send_message(ADMIN_ID, feedback_text, reply_markup=get_answer_keyboard(user_id, i18n))

        # Create a ticket in the backend
        status = create_ticket(message)
        if status == 201:
            await message.answer(i18n.feedback_success(), reply_markup=get_main_menu(WEB_APP_URL, WEBSITE_URL, X_URL, TRADE_URL))
        elif status == 409:
            await message.answer(i18n.feedback_exists(), reply_markup=get_main_menu(WEB_APP_URL, WEBSITE_URL, X_URL, TRADE_URL))
        else:
            await message.answer(i18n.feedback_error(), reply_markup=get_main_menu(WEB_APP_URL, WEBSITE_URL, X_URL, TRADE_URL))

        user_feedback_state.pop(user_id, None)  # Remove the user from feedback mode
    else:
        await message.answer(i18n.use_start(), reply_markup=get_main_menu(WEB_APP_URL, WEBSITE_URL, X_URL, TRADE_URL))

@dp.callback_query(F.data[:16] == "answer_feedback_")
async def ticket_answer(callback_query: CallbackQuery, i18n: TranslatorRunner):
    """
    Handle the "answer_feedback_" callback to prompt the admin to answer a user's feedback.
    Args:
        callback_query (CallbackQuery): The callback query from the admin.
        i18n (TranslatorRunner): The translator for localized messages.
    """
    logger.info(f"Responding to ticket {callback_query.data}")
    user_ticket_id = callback_query.data[16:]  # Extract the user ID from the callback data
    await callback_query.message.answer(i18n.answer_prompt(user_ticket_id=user_ticket_id))
    await callback_query.answer()

@dp.message(F.text.startswith("answer_"))
async def ticket_answer_process(message: types.Message, i18n: TranslatorRunner):
    """
    Handle messages starting with "answer_" as admin responses to user feedback.
    Deletes the ticket from the backend and sends the response to the user.
    Args:
        message (types.Message): The incoming message with the admin's response.
        i18n (TranslatorRunner): The translator for localized messages.
    """
    logger.info(f"Admin responding to user: {message.text}")
    user_ticket_id = message.text[7:message.text.find(" ")]  # Extract the user ID
    answer_text = message.text[message.text.find(" "):]  # Extract the response text

    # Delete the ticket from the backend
    status = delete_ticket(user_ticket_id, message)
    if status == 200:
        await bot.send_message(user_ticket_id, i18n.support_answer(answer_text=answer_text))
    elif status == 404:
        await message.answer(i18n.no_active_tickets())
    else:
        await message.answer(i18n.delete_error())

@dp.message()
async def unknown_message(message: types.Message, i18n: TranslatorRunner):
    """
    Handle unknown messages by sending a default response.
    Args:
        message (types.Message): The incoming message.
        i18n (TranslatorRunner): The translator for localized messages.
    """
    await message.answer(i18n.unknown_message())

async def main():
    """
    Main function to start the bot.
    Registers the translator middleware and starts polling for updates.
    """
    dp.update.middleware(TranslatorRunnerMiddleware())  # Add middleware for translations
    await dp.start_polling(bot, _translator_hub=translator_hub)

if __name__ == "__main__":
    asyncio.run(main())  # Run the bot