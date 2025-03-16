from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from fluentogram import TranslatorRunner

# URL для Web App (передаем из основного файла)
def get_main_menu(web_app_url: str, website_url: str, x_url: str):
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="RUBLE CALLER", web_app=WebAppInfo(url=web_app_url))],
            [InlineKeyboardButton(text="WEBSITE", web_app=WebAppInfo(url=website_url)),
             InlineKeyboardButton(text="X", web_app=WebAppInfo(url=x_url))],
            [InlineKeyboardButton(text="Обратная связь", callback_data="leave_feedback")]
        ]
    )

def get_cancel_keyboard(i18n: TranslatorRunner):
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=i18n.back_button(), callback_data="cancel_feedback")]
        ]
    )

def get_answer_keyboard(user_id: str, i18n: TranslatorRunner):
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=i18n.answer_button(), callback_data=f"answer_feedback_{user_id}")]
        ]
    )