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

def get_main_menu(web_app_url: str, website_url: str, x_url: str, trade_url: str) -> InlineKeyboardMarkup:
    """
    Create the main menu keyboard with buttons for the web app, website, X, and feedback.
    Args:
        web_app_url (str): URL for the RUBLE CALLER web app.
        website_url (str): URL for the website.
        x_url (str): URL for X (e.g., Twitter).
        trade_url (str): URL for RUBLE TRADE.
    Returns:
        InlineKeyboardMarkup: The main menu keyboard.
    """
    return InlineKeyboardMarkup(
        inline_keyboard=[
            # Button to open the RUBLE CALLER web app
            [InlineKeyboardButton(text="📞 CALLER", web_app=WebAppInfo(url=web_app_url)),
             InlineKeyboardButton(text="📈 TRADER", web_app=WebAppInfo(url="https://trade.ruble.website/"))],
            # Button to open the RUBLE TRADE URL and contract
            [InlineKeyboardButton(text="🏦 BUY", url=trade_url),
             InlineKeyboardButton(text="🧾 CONTRACT", url="https://tonviewer.com/EQA5QopV0455mb09Nz6iPL3JsX_guIGf77a6l-DtqSQh0aE-")],
            # Buttons to open the website and X URLs
            [InlineKeyboardButton(text="WEBSITE", url=website_url),
             InlineKeyboardButton(text="X.COM", url=x_url)],
            # Button to trigger the feedback process
            [InlineKeyboardButton(text="Обратная связь", callback_data="leave_feedback")]
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
            # Button to cancel the feedback process with localized text
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
            # Button to trigger the answer process with the user ID in the callback data
            [InlineKeyboardButton(text=i18n.answer_button(), callback_data=f"answer_feedback_{user_id}")]
        ]
    )
