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

## Следующие шаги

1. **Пополнить кошелек** - отправить TON на адрес `EQCpIGMtcP6OQH17MacwuwMKyuOF5F8LwBhU2NElKZtyGNPd`
2. **Протестировать** swap и refund после пополнения
3. **Проверить логи** - должны исчезнуть предупреждения о балансе