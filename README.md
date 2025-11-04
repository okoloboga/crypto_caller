# RUBLE CALLER

**Overview**

**RUBLE CALLER** is a cryptocurrency application that combines a landing page, a Telegram bot, and a main app (frontend + backend) to provide users with a seamless experience for farming RUBLE tokens, monitoring cryptocurrency prices, and managing token withdrawals. The main app is built with React JS, the backend uses NestJS, and the entire system integrates with the TON blockchain, OKX API, and Twilio for notifications.

The core feature of RUBLE CALLER is token farming: users can farm RUBLE tokens (up to 50) and withdraw them to their TON wallet. Additional features, such as price monitoring with notifications, are available via a paid subscription.

## Features

**Main App (Frontend)**
Built with: **React JS, JavaScript, Material-UI.**
Platform: Telegram app.
Token Farming: Users authenticate via a TON wallet to start farming RUBLE tokens (max 50). Clicking the progress bar resets the farm and sends tokens to the user's TON wallet.
Subscription-Based Features:
Price Monitoring: Users can create tasks to monitor cryptocurrency pairs (e.g., BTC/USD) via the OKX API, set target prices, and receive phone call notifications (via Twilio) when the price hits the target.
Task Management: Edit or delete price monitoring tasks.
Subscription: Costs 0.75 TON and requires a phone number for notifications.

**Landing Page**
Purpose: A user-friendly entry point to the **RUBLE CALLER** ecosystem.
Links:
Social media profiles.
Telegram bot.
**RUBLE** token [contract](https://tonviewer.com/EQA5QopV0455mb09Nz6iPL3JsX_guIGf77a6l-DtqSQh0aE-).
Token trading platform.

**Telegram Bot**
Built with: **Aiogram3**
Functionality:
A user-friendly entry point to the **RUBLE CALLER** App.
Provides all links available on the landing page (social media, token contract, trading platform).
Allows users to contact support directly.
Purpose: Enhances user engagement and support within Telegram.

**Backend**
Built with: **NestJS, TypeORM.**
Functionality:
Manages user data, subscriptions, and points.
Handles price monitoring tasks and integrates with the OKX API for real-time price data.
Sends notifications via Twilio when price targets are reached.
Processes token withdrawals on the TON blockchain.

## Project Structure
- **Main App (Frontend):** React JS app running in Telegram, handling token farming, price monitoring, and user interactions.
- **Landing Page:** Static page with links to social media, the bot, token contract, and trading platform.
- **Telegram Bot:** Automates user interactions, provides links, and offers support.
- **Backend:** NestJS server with modules for user management, price monitoring, notifications, tickets, and TON blockchain operations.

## Technologies Used
- ****Frontend:** React JS, JavaScript, Material-UI (for the main app).
- **Backend:** NestJS, TypeORM (for database operations).
- **Blockchain:** TON SDK (@ton/ton) for token withdrawals.

## APIs:
- **OKX API** for real-time cryptocurrency price data.
- **Twilio** for sending phone call notifications.
- **Deployment:** Docker for containerized deployment.

## Key Integrations
- **TON Blockchain:** Used for user authentication and token withdrawals (RUBLE tokens).
- **OKX API:** Fetches real-time cryptocurrency prices for price monitoring tasks.
- **Twilio:** Sends phone call notifications to users when price targets are reached.

## Getting Started
This project is designed to be run using Docker. Ensure you have the necessary environment variables configured (e.g., API keys for OKX, TON mnemonic, Twilio credentials, database credentials) before starting the application.

## Prerequisites
- **Node.js** (for development purposes)
- **Docke**r (for deployment)
- A database **PostgreSQL** compatible with **TypeORM**
- API keys for **OKX, TON blockchain**, and **Twilio**
- Environment Variables
- The application relies on several environment variables for configuration. Ensure the following are set in your .env file:

OKX_API_KEY, OKX_API_SECRET, OKX_API_PASSPHRASE: Credentials for the OKX API.
TON_API_KEY, JETTON_MASTER_ADDRESS, RELAYER_PRIV_KEY, RELAYER_WALLET_ADDR: Credentials for TON blockchain operations (Backend uses the same wallet as Relayer with WalletContractV5R1).
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER: Credentials for Twilio notifications.
Database connection details (e.g., DATABASE_HOST, DATABASE_PORT, etc.).
Future Improvements
UI/UX Enhancements: Improve the React app's interface with real-time updates and better visuals.
Bot Features: Add more interactive commands to the Telegram bot (e.g., task creation, subscription management).
Security: Use a secrets manager for sensitive data (e.g., TON mnemonic, Twilio credentials).
Scalability: Optimize price monitoring for large numbers of tasks using a queue system.
Localization: Support multiple languages for the app, bot, and landing page.

### Contributing
We are open to contributions! Feel free to create an issue or submit a pull request. Share your feedback via Telegram: [okoloboga](https://t.me/okolo_boga).

### License
[MIT License](https://github.com/okoloboga/sna_net/blob/main/LICENSE.md)

### Authors
[okoloboga](https://t.me/okolo_boga)