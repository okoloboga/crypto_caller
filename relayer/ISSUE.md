# Relayer Service Issues Analysis

## Проблема

При попытке relayer'а выполнить обмен TON на jetton через STON.fi возникает критическая ошибка:

```
ERROR [SwapService] Failed to check swap possibility: http provider parse response error
ERROR [SwapService] Swap failed: Insufficient liquidity for swap
```

Затем relayer пытается отправить refund пользователю, но и это не удается:

```
ERROR [TonService] Axios Response error: Request failed with status code 500
ERROR [TonService] Error data: {
  "ok": false,
  "error": "LITE_SERVER_UNKNOWN: cannot apply external message to current state : Failed to unpack account state",
  "code": 500
}
```

## Анализ проблем

### 1. Проблемы с STON.fi интеграцией

#### 1.1 Неправильная инициализация Router
**Файл:** `src/modules/swap/swap.service.ts:34-37`

```typescript
this.router = new Router(this.provider, {
  revision: ROUTER_REVISION.V1,
  address: ROUTER_REVISION_ADDRESS.V1,
});
```

**Проблема:** Используется устаревшая версия Router API. В новых версиях STON.fi SDK API изменился.

#### 1.2 Неправильный поиск пула
**Файл:** `src/modules/swap/swap.service.ts:288-293`

```typescript
const pool = await this.router.getPool({
  jettonAddresses: [
    "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez", // ProxyTON
    jettonWalletAddress, // Use actual jetton wallet address
  ],
});
```

**Проблемы:**
- Передается jetton wallet address вместо jetton master address
- Неправильный порядок адресов в массиве
- ProxyTON адрес может быть устаревшим

#### 1.3 Неправильное использование buildSwapProxyTonTxParams
**Файл:** `src/modules/swap/swap.service.ts:105-113`

```typescript
const swapTxParams = await this.router.buildSwapProxyTonTxParams({
  userWalletAddress: userAddress,
  proxyTonAddress: "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez", // ProxyTON
  offerAmount: new TonWeb.utils.BN(amountNanotons.toString()),
  askJettonAddress: this.config.jettonMasterAddress, // Use jetton master address for swap
  minAskAmount: new TonWeb.utils.BN(1), // Minimum 1 jetton unit
  queryId: Date.now(),
  referralAddress: undefined,
});
```

**Проблемы:**
- `userWalletAddress` должен быть адресом relayer'а, а не пользователя
- `askJettonAddress` должен быть jetton master address, но используется неправильно
- `minAskAmount` слишком мал (1 единица)

### 2. Проблемы с TON интеграцией

#### 2.1 Ошибка "Failed to unpack account state"
**Причина:** Relayer кошелек не инициализирован правильно или имеет неправильное состояние.

**Файл:** `src/modules/ton/ton.service.ts:80-109`

```typescript
private async initializeWallet() {
  try {
    // Try to parse as mnemonic first
    const mnemonic = this.config.relayerPrivateKey.split(" ");
    if (mnemonic.length === 24) {
      // It's a mnemonic
      this.keyPair = await mnemonicToWalletKey(mnemonic);
      this.relayerWallet = WalletContractV4.create({
        workchain: 0,
        publicKey: this.keyPair.publicKey,
      });
```

**Проблема:** Кошелек создается, но не проверяется его состояние в сети.

#### 2.2 Проблемы с seqno синхронизацией
**Файл:** `src/modules/ton/ton.service.ts:400-496`

```typescript
async sendInternalMessage(
  to: string | Address,
  value: bigint,
  body?: Cell | any,
): Promise<string> {
  // Wait for seqno lock to be free
  while (this.seqnoLock) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
```

**Проблема:** Простая блокировка может привести к deadlock'ам.

### 3. Проблемы с архитектурой

#### 3.1 Неправильная логика swap'а
**Проблема:** Relayer пытается выполнить swap от имени пользователя, но должен выполнять от своего имени.

#### 3.2 Отсутствие проверки баланса
**Проблема:** Нет проверки достаточности TON для выполнения swap'а.

#### 3.3 Неправильная обработка ошибок
**Проблема:** При ошибке swap'а relayer пытается отправить refund, но это тоже может не сработать.

## Рекомендации по исправлению

### 1. Обновить STON.fi интеграцию

#### 1.1 Использовать правильный API
```typescript
// Вместо устаревшего Router API
import { Router } from "@ston-fi/sdk";

// Использовать новый API
const router = new Router({
  apiEndpoint: "https://api.ston.fi",
  rpcEndpoint: "https://toncenter.com/api/v2/jsonRPC",
  apiKey: process.env.TON_API_KEY,
});
```

#### 1.2 Правильный поиск пула
```typescript
// Использовать jetton master address, а не wallet address
const pool = await router.getPool({
  jettonAddresses: [
    "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez", // ProxyTON
    this.config.jettonMasterAddress, // Jetton master address
  ],
});
```

#### 1.3 Правильный swap
```typescript
// Relayer должен выполнять swap от своего имени
const swapTxParams = await router.buildSwapProxyTonTxParams({
  userWalletAddress: this.config.relayerWalletAddress, // Relayer address
  proxyTonAddress: "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez",
  offerAmount: new TonWeb.utils.BN(amountNanotons.toString()),
  askJettonAddress: this.config.jettonMasterAddress,
  minAskAmount: new TonWeb.utils.BN(expectedJettonAmount.toString()),
  queryId: Date.now(),
});
```

### 2. Исправить TON интеграцию

#### 2.1 Проверка состояния кошелька
```typescript
private async initializeWallet() {
  // ... existing code ...
  
  // Проверить состояние кошелька в сети
  const walletContract = this.client.open(this.relayerWallet);
  const balance = await walletContract.getBalance();
  
  if (balance === 0n) {
    throw new Error("Relayer wallet has zero balance");
  }
  
  this.logger.log(`Relayer wallet balance: ${balance} nanotons`);
}
```

#### 2.2 Улучшить seqno синхронизацию
```typescript
private async getFreshSeqno(): Promise<number> {
  const walletContract = this.client.open(this.relayerWallet);
  return await walletContract.getSeqno();
}
```

### 3. Улучшить архитектуру

#### 3.1 Добавить проверки баланса
```typescript
async canSwap(amountNanotons: bigint): Promise<boolean> {
  // Проверить баланс relayer'а
  const balance = await this.tonService.getWalletBalance();
  if (balance < amountNanotons + BigInt(this.config.gasForCallback)) {
    this.logger.warn("Insufficient relayer balance for swap");
    return false;
  }
  
  // ... existing pool checks ...
}
```

#### 3.2 Улучшить обработку ошибок
```typescript
async handleSwapFailure(transaction: TransactionEntity, error: string) {
  try {
    // Попытаться отправить refund
    await this.tonService.sendRefundUser(
      transaction.userAddress,
      BigInt(transaction.amountNanotons)
    );
  } catch (refundError) {
    this.logger.error(`Failed to send refund: ${refundError.message}`);
    // Записать в базу для ручной обработки
    await this.saveFailedRefund(transaction, error, refundError.message);
  }
}
```

## Критические проблемы для немедленного исправления

1. **Обновить STON.fi SDK** до последней версии
2. **Исправить инициализацию Router** с правильными параметрами
3. **Проверить состояние relayer кошелька** перед началом работы
4. **Исправить логику swap'а** - relayer должен выполнять от своего имени
5. **Добавить проверки баланса** перед выполнением операций

## Тестирование

После исправлений необходимо протестировать:

1. **Инициализацию relayer'а** - проверка состояния кошелька
2. **Поиск пула** - корректность параметров
3. **Выполнение swap'а** - от имени relayer'а
4. **Обработку ошибок** - корректные refund'ы
5. **Мониторинг** - логирование всех операций

## Исправления (08.10.2025)

### ✅ Выполненные исправления:

#### 1. Обновлена STON.fi интеграция
- **Исправлено:** Инициализация Router с новым API (2025)
- **Исправлено:** Поиск пула с правильными параметрами (jetton master address вместо wallet address)
- **Исправлено:** Логика swap - relayer выполняет от своего имени, а не пользователя

#### 2. Улучшена TON интеграция
- **Добавлено:** Проверка состояния кошелька при инициализации
- **Добавлено:** Проверка баланса перед отправкой транзакций
- **Улучшено:** Обработка seqno синхронизации с retry механизмом

#### 3. Добавлены проверки баланса
- **Добавлено:** Проверка баланса relayer'а перед swap операциями
- **Добавлено:** Проверка достаточности средств для refund операций
- **Добавлено:** Предупреждения о низком балансе

#### 4. Улучшена обработка ошибок
- **Улучшено:** Детальная обработка ошибок swap и burn операций
- **Улучшено:** Проверка баланса перед refund операциями
- **Добавлено:** Логирование критических ошибок для ручного вмешательства

#### 5. Добавлены отладочные логи
- **Добавлено:** Подробные DEBUG логи на всех этапах обработки
- **Добавлено:** Логирование параметров транзакций и состояний
- **Добавлено:** Логирование времени выполнения операций

### 🔧 Ключевые изменения в коде:

#### SwapService:
```typescript
// Исправлена инициализация Router
this.router = new Router({
  apiEndpoint: "https://api.ston.fi",
  rpcEndpoint: "https://toncenter.com/api/v2/jsonRPC",
  apiKey: process.env.TON_API_KEY,
});

// Исправлен поиск пула
const pool = await this.router.getPool({
  jettonAddresses: [
    "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez", // ProxyTON
    jettonMasterAddress, // Jetton master address (не wallet)
  ],
});

// Исправлена логика swap
const swapTxParams = await this.router.buildSwapProxyTonTxParams({
  userWalletAddress: this.config.relayerWalletAddress, // Relayer address
  askJettonAddress: jettonMasterAddress, // Jetton master address
  minAskAmount: new TonWeb.utils.BN(expectedJettonAmount.toString()),
});
```

#### TonService:
```typescript
// Добавлена проверка состояния кошелька
private async verifyWalletState(): Promise<void> {
  const balance = await walletContract.getBalance();
  const accountState = await this.client.getAccount(this.relayerAddress);
  // Проверки и логирование
}

// Улучшена отправка сообщений
async sendInternalMessage(to, value, body) {
  // Проверка баланса перед отправкой
  if (balance < value + BigInt(this.config.gasForCallback)) {
    throw new Error(`Insufficient balance`);
  }
  // Retry механизм с seqno синхронизацией
}
```

#### RelayerService:
```typescript
// Улучшена обработка ошибок
private async handleSwapFailure(transaction, error) {
  // Проверка баланса перед refund
  const relayerBalance = await this.tonService.getWalletBalance();
  if (relayerBalance < BigInt(transaction.amountNanotons) + BigInt(this.config.gasForCallback)) {
    // Обработка недостаточного баланса
  }
  // Детальное логирование ошибок
}
```

## Заключение

Все критические проблемы исправлены:

✅ **STON.fi интеграция** - обновлен API, исправлены параметры  
✅ **TON интеграция** - добавлены проверки состояния кошелька  
✅ **Логика swap** - relayer выполняет от своего имени  
✅ **Проверки баланса** - добавлены на всех этапах  
✅ **Обработка ошибок** - улучшена с детальным логированием  
✅ **Отладочные логи** - добавлены подробные DEBUG логи  

Система готова к тестированию. Рекомендуется:
1. Протестировать на testnet
2. Проверить логи при работе
3. Убедиться в достаточности баланса relayer'а
4. Мониторить критические ошибки для ручного вмешательства
