"""
Keyboard layouts for the Telegram bot in the RUBLE Farming App.
This module defines inline keyboards for user interaction, including the main menu,
cancel button for feedback, and answer button for admins. The keyboards include buttons
that link to web apps, external URLs, or trigger callback queries.
"""

# Import aiogram types for creating inline keyboards and buttons
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

# Import TranslatorRunner for localized button text
from fluentogram import TranslatorRunner

def get_main_menu(backgammon_url: str) -> InlineKeyboardMarkup:
    """
    Create the main menu keyboard with buttons for the web app, website, X, and feedback.
    Args:
        backgammon_url (str): The user-specific URL for the BACKGAMMON web app.
    Returns:
        InlineKeyboardMarkup: The main menu keyboard.
    """
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="📞 CALLER", web_app=WebAppInfo(url="https://caller.ruble.website")),
                InlineKeyboardButton(text="📈 TRADER", web_app=WebAppInfo(url="https://trade.ruble.website"))
            ],
            [
                InlineKeyboardButton(text="🎲 BACKGAMMON", web_app=WebAppInfo(url=backgammon_url))
            ],
            [
                InlineKeyboardButton(text="🏦 BUY", url="https://www.geckoterminal.com/ru/ton/pools/EQDPn9nZc_0B1Hv6mWbFBvM1F64yLPnbpL6wGVPJQaoeL8BZ"),
                InlineKeyboardButton(text="🧾 CONTRACT", url="https://tonviewer.com/EQA5QopV0455mb09Nz6iPL3JsX_guIGf77a6l-DtqSQh0aE-")
            ],
            [
                InlineKeyboardButton(text="WEBSITE", url="https://ruble.website"),
                InlineKeyboardButton(text="X.COM", url="https://x.com/ruble_com?s=11")
            ],
            [
                InlineKeyboardButton(text="Обратная связь", callback_data="leave_feedback")]
        ]
    )

def get_cancel_keyboard(i18n: TranslatorRunner) -> InlineKeyboardMarkup:
    """
    Create a keyboard with a cancel button for the feedback process.
    Args:
        i18n (TranslatorRunner): The translator for localized button text.
    Returns:
        InlineKeyboardMarkup: The cancel keyboard.
    """
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=i18n.back_button(), callback_data="cancel_feedback")]
        ]
    )

def get_answer_keyboard(user_id: str, i18n: TranslatorRunner) -> InlineKeyboardMarkup:
    """
    Create a keyboard with an answer button for admins to respond to user feedback.
    Args:
        user_id (str): The ID of the user whose feedback is being answered.
        i18n (TranslatorRunner): The translator for localized button text.
    Returns:
        InlineKeyboardMarkup: The answer keyboard.
    """
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=i18n.answer_button(), callback_data=f"answer_feedback_{user_id}")]
        ]
    )