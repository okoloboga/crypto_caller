# Relayer Service - Актуальные проблемы

## Задача

Relayer получает TON от контракта и должен:
1. Обменять TON на jetton через STON.fi
2. Сжечь jetton'ы и отправить callback контракту
3. При ошибке - вернуть TON пользователю (refund)

## 🔍 АКТУАЛЬНЫЕ ПРОБЛЕМЫ

### Проблема №1: ABI/версия mismatch - V1 SDK для V2 контракта

**Лог ошибки:**
```
ERROR [SwapService] [DEBUG] Failed to get pool data: Unable to execute get method. Got exit_code: -13
ERROR [SwapService] [DEBUG] Failed to get pool data for rate: Unable to execute get method. Got exit_code: -13
```

**Причина:** Используем `DEX.v1.Pool.create()` для `stonfi_pool_v2` контракта.

**Доказательства:**
- **TonViewer:** `stonfi_pool_v2` ✅
- **Наш код:** `DEX.v1.Pool.create()` ❌
- **Результат:** `exit_code: -13` (ABI mismatch)

### Проблема №2: amount=undefined в swap транзакции

**Лог ошибки:**
```
LOG [SwapService] [DEBUG] Swap transaction built: to=..., amount=undefined
ERROR [SwapService] [DEBUG] STON.fi swap failed: Cannot convert undefined to a BigInt
ERROR [SwapService] TypeError: Cannot convert undefined to a BigInt
```

**Причина:** `getSwapRate()` возвращает fallback из-за ошибки pool data, но где-то используется `undefined`.

### Проблема №3: Router возвращает неправильный адрес пула

**Router возвращает:** `EQARa0ANmuCvqlb-sm5ImaAslSa9nWhTBi6g1hig0dqlFz88` (exit_code: -13)
**Рабочий пул:** `EQCJKn-99vd6GEUKTkVEyFwmha33lxtb2oo-eMsU0tFGIZbf` (активен!)

**Обнаружен активный пул RUBLE-pTON:**
- **Адрес пула:** [EQCJKn-99vd6GEUKTkVEyFwmha33lxtb2oo-eMsU0tFGIZbf](https://tonviewer.com/EQCJKn-99vd6GEUKTkVEyFwmha33lxtb2oo-eMsU0tFGIZbf)
- **Тип:** `jetton_master, stonfi_pool_v2` ✅
- **Статус:** `Active` ✅
- **Пара:** `RUBLE-pTON` ✅
- **Ликвидность:** `Max.supply: 69,047.09 RUBLE-pTON LP`
- **Последние транзакции:** 01 Oct, 30 Sep, 22 Sep (активен!)

## 🎯 ТЕХНИЧЕСКОЕ ЗАДАНИЕ ПО ИСПРАВЛЕНИЮ

### Задача 1: Исправить ABI/версию mismatch

**Проблема:** Используем V1 SDK для V2 контракта.

**Решение (по приоритету):**

#### 1.1 САМОЕ ПРОСТОЕ - использовать router.getPool()
```typescript
// ❌ НЕПРАВИЛЬНО:
const poolAddress = await this.router.getPoolAddress({...});
const pool = this.client.open(DEX.v1.Pool.create(Address.parse(poolAddress.toString())));

// ✅ ПРАВИЛЬНО:
const pool = await this.router.getPool([ptonAddress, jettonAddress]);
const poolData = await pool.getPoolData(); // Должно работать!
```

#### 1.2 АЛЬТЕРНАТИВА - использовать DEX.v2.Pool
```typescript
// ✅ ПРАВИЛЬНО - V2 SDK для V2 контракта
const pool = this.client.open(DEX.v2.Pool.create(Address.parse(poolAddress.toString())));
const poolData = await pool.getPoolData();
```

#### 1.3 ОБНОВИТЬ SDK
```bash
npm update @ston-fi/sdk
# Проверить, что DEX.v2 доступен
```

### Задача 2: Исправить amount=undefined

**Проблема:** После исправления pool data нужно найти, откуда берется `undefined` в amount.

**Решение:**
1. Исправить pool data (Задача 1)
2. Проверить, что `getSwapRate()` возвращает корректное значение
3. Найти место, где используется `undefined` вместо rate

### Задача 3: Исправить получение адреса пула

**Проблема:** Router возвращает неправильный адрес пула.

**Решение:**
1. **Быстрый fix:** Хардкод рабочего адреса
```typescript
const poolAddress = Address.parse("EQCJKn-99vd6GEUKTkVEyFwmha33lxtb2oo-eMsU0tFGIZbf");
```

2. **Правильное решение:** Использовать `router.getPool()` вместо `getPoolAddress()`

## 📋 ПЛАН ВЫПОЛНЕНИЯ

### Этап 1: Исправить ABI mismatch (ПРИОРИТЕТ 1)
1. Заменить `getPoolAddress` + `DEX.v1.Pool.create()` на `router.getPool()`
2. Протестировать - должны исчезнуть `exit_code: -13`
3. Проверить, что `pool.getPoolData()` возвращает данные

### Этап 2: Исправить amount=undefined (ПРИОРИТЕТ 2)
1. После исправления pool data проверить `getSwapRate()`
2. Найти место, где используется `undefined` в amount
3. Исправить передачу корректного значения

### Этап 3: Оптимизировать получение адреса пула (ПРИОРИТЕТ 3)
1. Если `router.getPool()` не работает - использовать хардкод
2. В будущем разобраться, почему router возвращает неправильный адрес

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После исправлений:
- ✅ `pool.getPoolData()` вернет данные без `exit_code: -13`
- ✅ `poolData.reserve0` и `poolData.reserve1` будут содержать резервы
- ✅ `getSwapRate()` будет работать корректно
- ✅ `amount=undefined` исчезнет
- ✅ Swap транзакция будет строиться успешно