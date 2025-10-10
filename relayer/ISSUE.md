# Relayer Service - Критические проблемы

## Задача

Relayer получает TON от контракта и должен:
1. Обменять TON на jetton через STON.fi
2. Сжечь jetton'ы и отправить callback контракту
3. При ошибке - вернуть TON пользователю (refund)

## Как должно работать

1. **Контракт** отправляет TON на relayer (`EQCpIGMtcP6OQH17MacwuwMKyuOF5F8LwBhU2NElKZtyGNPd`)
2. **Relayer** получает TON и обменивает их на jetton через STON.fi
3. **Relayer** сжигает jetton'ы и отправляет callback контракту
4. При ошибке - отправляет refund пользователю

## Текущие проблемы

### 1. STON.fi Pool Lookup - `Cannot read properties of undefined (reading 'toString')`

**Лог ошибки:**
```
ERROR [SwapService] [DEBUG] Pool lookup failed: Cannot read properties of undefined (reading 'toString')
ERROR [SwapService] TypeError: Cannot read properties of undefined (reading 'toString')
ERROR [SwapService] Swap failed: Insufficient liquidity for swap
```

**Причина:** STON.fi Router v1 API возвращает объект `pool` без свойства `address`.

**Исправление:** Добавлена проверка `pool.address` перед вызовом `.toString()`.

### 2. Wallet Type Mismatch - `Failed to unpack account state`

**Лог ошибки:**
```
ERROR [TonService] Error data: {
  "ok": false,
  "error": "LITE_SERVER_UNKNOWN: cannot apply external message to current state : Failed to unpack account state",
  "code": 500
}
```

**Причина:** Код создает WalletContractV4 без `walletId`, что создает V4R1 кошелек. Реальный relayer кошелек - V4R2.

**Исправление:** Добавлен `walletId: 698983191` для V4R2 mainnet.

### 3. Seqno = 0 - Wallet Synchronization Issues

**Лог ошибки:**
```
DEBUG [TonService] [DEBUG] Got seqno: 0 (attempt 1)
WARN [TonService] [DEBUG] Seqno is 0 - this might indicate wallet synchronization issues
WARN [TonService] [DEBUG] Wallet might need to be activated or has transaction history problems
```

**Причина:** Код обращается к неправильному типу кошелька (V4R1 вместо V4R2).

## Статус исправлений

### ✅ Выполнено:
- Добавлена проверка `pool.address` в SwapService
- Добавлен `walletId: 698983191` в TonService
- Исправлен Dockerfile для принудительной пересборки

### ❌ Проблема:
**Код попал в контейнер, но кошелек НЕ инициализируется с исправлениями!**

**Логи показывают:**
```
LOG [TonService] [DEBUG] Initializing relayer wallet...
LOG [TonService] TON service initialized for relayer: EQCpIGMtcP6OQH17MacwuwMKyuOF5F8LwBhU2NElKZtyGNPd
```

**НО НЕТ:**
```
LOG [TonService] [DEBUG] Wallet initialized from mnemonic (V4R2 mainnet)
```

## Диагностика

**Проверить на сервере:**
```bash
# 1. Код попал в контейнер?
docker exec ruble_caller-relayer-1 cat /app/dist/modules/ton/ton.service.js | grep -A 3 -B 3 "walletId"

# 2. Есть ли ошибки инициализации?
docker compose logs relayer | grep -i "failed to initialize"

# 3. Полные логи инициализации
docker compose logs relayer | grep -A 20 "Initializing relayer wallet"
```

## ✅ ПРОБЛЕМА РЕШЕНА!

### Исправления выполнены:

#### 1. **Исправлена асинхронная инициализация в конструкторе**
- ❌ **Было:** `initializeWallet()` вызывался асинхронно в конструкторе, ошибки не обрабатывались
- ✅ **Стало:** Убран вызов из конструктора, добавлен lazy initialization с `ensureWalletInitialized()`

#### 2. **Добавлен retry механизм**
- ✅ **Новый метод:** `initializeWalletWithRetry()` с 3 попытками и exponential backoff
- ✅ **Новый метод:** `ensureWalletInitialized()` для проверки состояния

#### 3. **Добавлены проверки инициализации**
- ✅ **Все методы** теперь проверяют `await this.ensureWalletInitialized()` перед работой
- ✅ **Новые методы:** `isWalletInitialized()`, `forceWalletInitialization()`, `resetWalletInitialization()`

#### 4. **Исправлен паттерн async/await**
- ✅ **TonService:** Все методы теперь ждут инициализации кошелька
- ✅ **SwapService:** Все методы теперь ждут инициализации кошелька

### Результат исправлений:

**Логи ПОСЛЕ исправлений:**
```
LOG [TonService] [DEBUG] Initializing relayer wallet... (attempt 1/3)
LOG [TonService] [DEBUG] Initializing relayer wallet...
LOG [TonService] [DEBUG] Wallet initialized from mnemonic (V4R2 mainnet)
LOG [TonService] [DEBUG] Wallet state verification completed
LOG [TonService] [DEBUG] Wallet initialization completed successfully
```

**✅ Кошелек теперь инициализируется успешно!**

### Обнаруженная новая проблема:

```
WARN [TonService] [DEBUG] Relayer wallet has zero balance - this may cause issues
WARN [MonitoringService] Low balance warning: 561511271 nanotons (threshold: 1000000000)
```

**Кошелек имеет нулевой баланс!** Это объясняет, почему swap операции не работают.

## ✅ ПРОГРЕСС: Кошелек V5R1 работает!

### Исправления V5R1 успешны:
- ✅ **seqno: 2** (было 0)
- ✅ **balance: 661038333 nanotons** (было 0) 
- ✅ **Transaction sent successfully** (было Failed to unpack account state)
- ✅ **Refund прошел успешно!** 🎉

## 🔍 НОВЫЕ ПРОБЛЕМЫ ОБНАРУЖЕНЫ

### Проблема №1: "Cannot read properties of undefined (reading 'toString')"

**Лог ошибки:**
```
ERROR [SwapService] [DEBUG] Pool lookup failed: Cannot read properties of undefined (reading 'toString')
ERROR [SwapService] TypeError: Cannot read properties of undefined (reading 'toString')
```

**Причина:** STON.fi Router API возвращает объект `pool` с `address` свойством, но `pool.address` имеет значение `undefined`.

**Исправление:** ✅ Добавлено детальное логирование и безопасный вызов `toString()`.

### Проблема №2: "Insufficient liquidity for swap"

**Лог ошибки:**
```
ERROR [SwapService] Swap failed: Insufficient liquidity for swap
```

**Причина:** Jetton `EQA5QopV0455mb09Nz6iPL3JsX_guIGf77a6l-DtqSQh0aE-` **НЕ ИМЕЕТ** пула на STON.fi с pTON.

**Диагностика:** Нужно проверить:
1. Существует ли пул для этого jetton на https://app.ston.fi/pools
2. Активен ли пул
3. Есть ли ликвидность в пуле

## ✅ ПРОГРЕСС: Pool найден!

### Исправления getPoolAddress работают:
- ✅ **Pool address найден:** `EQARa0ANmuCvqlb-sm5ImaAslSa9nWhTBi6g1hig0dqlFz88`
- ✅ **Router методы работают:** `getPoolAddress` возвращает корректный адрес
- ✅ **Кошелек V5R1 работает:** seqno: 3, транзакции отправляются успешно

## 🔍 НОВАЯ ПРОБЛЕМА ОБНАРУЖЕНА

### Проблема №3: "source.indexOf is not a function"

**Лог ошибки:**
```
ERROR [SwapService] [DEBUG] Pool lookup failed: source.indexOf is not a function
ERROR [SwapService] TypeError: source.indexOf is not a function
ERROR [SwapService] [DEBUG] Error stack:
TypeError: source.indexOf is not a function
    at Address.isRaw (/app/node_modules/@ton/core/dist/address/Address.js:74:20)
    at Address.parse (/app/node_modules/@ton/core/dist/address/Address.js:104:26)
    at SwapService.canSwap (/app/dist/modules/swap/swap.service.js:252:100)
```

**Причина:** `Address.parse()` получает не строку, а другой тип данных.

**Анализ:**
1. **Pool address получен успешно:** `EQARa0ANmuCvqlb-sm5ImaAslSa9nWhTBi6g1hig0dqlFz88`
2. **Ошибка в строке 252:** `Address.parse(poolAddress)` 
3. **Проблема:** `poolAddress` не является строкой

**Диагностика:**
- `poolAddress` возвращается как объект, а не строка
- `Address.parse()` ожидает строку, но получает объект
- Нужно извлечь строковое представление из объекта

## Следующие шаги

1. **Исправить парсинг poolAddress** - извлечь строку из объекта перед `Address.parse()`
2. **Добавить проверку типа** для `poolAddress` перед парсингом
3. **Протестировать** swap после исправления парсинга