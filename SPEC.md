# Relayer Service Architecture

## Обзор

Relayer реализован как отдельный микросервис на NestJS, который обрабатывает подписки пользователей через двухэтапный процесс:

1. **Получение платежа**: Пользователь платит 0.75 TON в контракт
2. **Распределение средств**: Контракт отправляет 0.25 TON владельцу, 0.5 TON relayer'у
3. **Обработка relayer'ом**: 
   - Swap TON → Jetton через STON.fi
   - Burn полученных jettons
   - Отправка OnSwapCallback в контракт
4. **Активация подписки**: Контракт активирует подписку пользователя

## Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Subscription   │───▶│     Relayer     │───▶│   STON.fi API   │
│    Contract     │    │    Service      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Jetton Master  │
                       │   (Burn)        │
                       └─────────────────┘
```

## Структура проекта

```
relayer/
├── src/
│   ├── modules/
│   │   ├── ton/          # TON blockchain integration
│   │   ├── swap/         # STON.fi swap integration
│   │   ├── burn/         # Jetton burning
│   │   └── monitoring/   # Metrics and logging
│   ├── services/
│   │   └── relayer.service.ts  # Main service
│   ├── entities/
│   │   └── transaction.entity.ts  # Database entity
│   ├── controllers/
│   │   └── relayer.controller.ts  # API endpoints
│   └── config/
│       └── relayer.config.ts  # Configuration
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Конфигурация

### Environment Variables

```bash
# TON Network Configuration
RPC_ENDPOINT=https://mainnet-v4-rpc.tonhubapi.com/jsonRPC
RELAYER_PRIV_KEY=word1 word2 word3 ... word24  # 24-word mnemonic phrase
RELAYER_WALLET_ADDR=EQxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUBSCRIPTION_CONTRACT_ADDR=EQyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
JETTON_MASTER_ADDR=EQzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz

# Processing Configuration
POLL_INTERVAL_MS=5000
MAX_RETRIES=3
GAS_FOR_CALLBACK=10000000

# STON.fi Configuration
STON_SDK_KEY=your_ston_sdk_key_here
STON_API_URL=https://api.ston.fi

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=crypto_caller

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Monitoring Configuration
ENABLE_METRICS=true
LOG_LEVEL=info
```

### Обязательные переменные

- `RELAYER_PRIV_KEY`: 24-словная мнемоническая фраза relayer кошелька
- `RELAYER_WALLET_ADDR`: TON адрес relayer кошелька
- `SUBSCRIPTION_CONTRACT_ADDR`: Адрес контракта подписки
- `JETTON_MASTER_ADDR`: Адрес jetton master контракта
- `RPC_ENDPOINT`: TON RPC endpoint

## Основные компоненты

### 1. RelayerService (Главный сервис)

Основной сервис, который координирует всю работу relayer'а:

- **Обработка транзакций**: Получает транзакции от TON сети
- **Idempotency**: Использует PostgreSQL для предотвращения повторной обработки
- **Rate limiting**: Ограничивает частоту RPC вызовов
- **Error handling**: Обрабатывает ошибки и выполняет retry
- **Metrics**: Собирает метрики производительности

### 2. TonService (TON интеграция)

Сервис для работы с TON блокчейном:

- **Парсинг транзакций**: Извлекает данные из входящих транзакций
- **Отправка сообщений**: Отправляет OnSwapCallback и RefundUser
- **Управление кошельком**: Работа с relayer кошельком
- **Получение баланса**: Проверка баланса TON и jettons

### 3. SwapService (STON.fi интеграция)

Сервис для выполнения swap операций:

- **TON → Jetton swap**: Конвертация TON в jettons через STON.fi
- **Rate calculation**: Расчет курса обмена
- **Liquidity check**: Проверка доступности ликвидности
- **Error handling**: Обработка ошибок swap'а

### 4. BurnService (Сжигание jettons)

Сервис для сжигания jettons:

- **Jetton wallet**: Получение адреса jetton кошелька
- **Burn operation**: Выполнение операции сжигания
- **Balance check**: Проверка баланса jettons
- **Transaction tracking**: Отслеживание операций сжигания

### 5. MonitoringService (Мониторинг)

Сервис для мониторинга и логирования:

- **Structured logging**: Структурированное логирование
- **Health checks**: Проверка состояния сервиса
- **Metrics collection**: Сбор метрик производительности
- **Alerting**: Уведомления о проблемах

## Workflow обработки транзакций

### 1. Получение транзакции

```typescript
// RelayerService получает транзакции каждые 5 секунд
@Cron(CronExpression.EVERY_5_SECONDS)
async processTransactions() {
  const transactions = await this.tonService.getRecentTransactions(25);
  for (const tx of transactions) {
    await this.processTransaction(tx);
  }
}
```

### 2. Парсинг транзакции

```typescript
// TonService парсит входящие транзакции
private async parseTransaction(tx: any): Promise<ParsedTransaction | null> {
  // Проверяем, что транзакция от subscription contract
  if (fromAddress !== this.config.subscriptionContractAddress) {
    return null;
  }
  
  // Извлекаем адрес пользователя из body сообщения
  const body = Cell.fromBase64(inMsg.body);
  const slice = body.beginParse();
  const op = slice.loadUint(32); // 0x73616d70
  const userAddress = slice.loadAddress();
  
  return { userAddress, amountNanotons, ... };
}
```

### 3. Выполнение swap

```typescript
// SwapService выполняет TON → Jetton swap
async performSwap(amountNanotons: bigint, userAddress: string): Promise<SwapResult> {
  // TODO: Интеграция с STON.fi SDK
  const jettonAmount = await this.stonFiClient.swap(amountNanotons);
  return { jettonAmount, success: true };
}
```

### 4. Сжигание jettons

```typescript
// BurnService сжигает полученные jettons
async burnJetton(jettonAmount: bigint): Promise<BurnResult> {
  const jettonWallet = await this.tonService.getJettonWalletAddress();
  const burnTx = await this.sendBurnMessage(jettonWallet, jettonAmount);
  return { success: true, txHash: burnTx };
}
```

### 5. Отправка callback

```typescript
// TonService отправляет OnSwapCallback в контракт
async sendOnSwapCallback(userAddress: string, jettonAmount: bigint, success: boolean) {
  const messageBody = this.buildOnSwapCallbackBody(userAddress, jettonAmount, success);
  await this.sendInternalMessage(subscriptionContract, gasAmount, messageBody);
}
```

## API Endpoints

### Health Check
```bash
GET /health
```
Возвращает статус здоровья сервиса и метрики.

### Metrics
```bash
GET /metrics
```
Возвращает детальные метрики производительности.

### Transaction History
```bash
GET /transactions?limit=100
```
Возвращает историю обработанных транзакций.

### Status
```bash
GET /status
```
Возвращает общий статус сервиса с краткой информацией.

## Мониторинг и метрики

### Собираемые метрики

- **Общее количество транзакций**
- **Успешные транзакции**
- **Неудачные транзакции**
- **Общее количество сожженных jettons**
- **Общее количество обмененных TON**
- **Среднее время обработки**
- **Баланс кошелька**
- **Время работы сервиса**

### Health Checks

- **Баланс кошелька**: Проверка достаточности средств для газа
- **RPC подключение**: Проверка доступности TON RPC
- **База данных**: Проверка подключения к PostgreSQL
- **Redis**: Проверка подключения к Redis
- **Последняя обработка**: Проверка времени последней обработанной транзакции

## Обработка ошибок

### Типы ошибок

1. **Swap ошибки**:
   - Недостаточная ликвидность
   - Ошибки STON.fi API
   - Неверный курс обмена
   - Таймаут операции

2. **Burn ошибки**:
   - Недостаточный баланс jettons
   - Ошибки jetton контракта
   - Неверные параметры сжигания

3. **TON ошибки**:
   - RPC недоступен
   - Недостаточный газ
   - Ошибки подписи сообщений
   - Неверные адреса

### Стратегии восстановления

1. **Retry механизм**: Автоматические повторы с экспоненциальной задержкой
2. **Refund при неудаче**: Автоматический возврат средств пользователю
3. **Graceful degradation**: Продолжение работы при частичных сбоях
4. **Alerting**: Уведомления о критических ошибках

## Безопасность

### Управление ключами

- **Mnemonic фразы**: Хранение в переменных окружения
- **Изоляция**: Отдельный кошелек только для relayer'а
- **Минимальные права**: Только необходимые операции

### Валидация

- **Проверка адресов**: Валидация всех TON адресов
- **Проверка сумм**: Валидация сумм транзакций
- **Rate limiting**: Ограничение частоты операций
- **Idempotency**: Предотвращение повторной обработки

## Развертывание

### Docker

```bash
# Сборка образа
docker build -t crypto-caller-relayer .

# Запуск контейнера
docker run -d --env-file .env crypto-caller-relayer
```

### Docker Compose

```yaml
relayer:
  build: ./relayer
  env_file: ./.env
  ports:
    - "3002:3001"
  depends_on:
    - postgres
    - redis
  restart: unless-stopped
```

### Production Checklist

- [ ] Настроены переменные окружения
- [ ] Настроена база данных PostgreSQL
- [ ] Настроен Redis
- [ ] Настроен мониторинг
- [ ] Настроены алерты
- [ ] Протестирована интеграция с STON.fi
- [ ] Протестирована работа с jetton контрактом
- [ ] Настроено логирование
- [ ] Настроено резервное копирование

## Заключение

Новая архитектура relayer'а обеспечивает:

- **Надежность**: Двухэтапная подписка с автоматическими refund'ами
- **Масштабируемость**: Модульная архитектура на NestJS
- **Мониторинг**: Полное покрытие метриками и health checks
- **Безопасность**: Правильное управление ключами и валидация
- **Отказоустойчивость**: Graceful degradation и retry механизмы

Система готова к продакшену после настройки STON.fi интеграции и тестирования на testnet.