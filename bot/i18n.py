"""
Internationalization (i18n) setup for the Telegram bot in the RUBLE Farming App.
This module provides a middleware and translator hub for handling localized messages.
It uses fluentogram and FluentBundle to manage translations in multiple languages (English and Russian).
"""

# Import FluentBundle for loading translation files
from fluent_compiler.bundle import FluentBundle

# Import FluentTranslator and TranslatorHub for managing translations
from fluentogram import FluentTranslator, TranslatorHub

# Import typing for type hints
from typing import Any, Awaitable, Callable, Dict

# Import aiogram components for middleware and user data
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, User

class TranslatorRunnerMiddleware(BaseMiddleware):
    """
    Middleware to inject a translator into aiogram event handlers.
    This middleware retrieves the user's language code and provides the appropriate translator
    to the handler via the data dictionary.
    """
    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any]
    ) -> Any:
        """
        Process the event and inject the translator into the data dictionary.
        Args:
            handler (Callable): The event handler to call.
            event (TelegramObject): The incoming event (e.g., message, callback query).
            data (Dict[str, Any]): The data dictionary passed to the handler.
        Returns:
            Any: The result of the handler.
        """
        user: User = data.get('event_from_user')  # Get the user from the event data
        
        if user is None:
            return await handler(event, data)  # Skip if no user is present

        hub: TranslatorHub = data.get('_translator_hub')  # Get the translator hub
        # Inject the translator for the user's language into the data
        data['i18n'] = hub.get_translator_by_locale(locale=user.language_code)

        return await handler(event, data)  # Call the handler with the updated data

def create_translator_hub() -> TranslatorHub:
    """
    Create a TranslatorHub for managing translations in multiple languages.
    Sets up translators for English ('en') and Russian ('ru') with fallback locales.
    Returns:
        TranslatorHub: The configured translator hub.
    """
    translator_hub = TranslatorHub(
        {
            "ru": ("ru", "en"),  # Russian locale with English fallback
            "en": ("en", "ru")   # English locale with Russian fallback
        },
        [
            FluentTranslator(
                locale="ru",
                translator=FluentBundle.from_files(
                    locale="ru-RU",
                    filenames=["locales/ru/LC_MESSAGES/txt.ftl"]  # Path to Russian translation file
                )
            ),
            FluentTranslator(
                locale="en",
                translator=FluentBundle.from_files(
                    locale="en-US",
                    filenames=["locales/en/LC_MESSAGES/txt.ftl"]  # Path to English translation file
                )
            )
        ]
    )

    return translator_hub