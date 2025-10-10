# Relayer Service - История проблем и решений

## Задача

Relayer получает TON от контракта и должен:
1. Обменять TON на jetton через STON.fi
2. Сжечь jetton'ы и отправить callback контракту
3. При ошибке - вернуть TON пользователю (refund)


## ✅ РЕШЕННЫЕ ПРОБЛЕМЫ

### ✅ Проблема №1: Неправильный расчет курса обмена (РЕШЕНО 2025-10-10)

**Статус:** ✅ ИСПРАВЛЕНО

**Решение:**
- Добавлено определение порядка токенов в резервах пула
- Исправлена формула расчета: `rate = (jettonReserve * 10^9 * 95) / (tonReserve * 100)`
- Добавлена валидация результата (проверка на 0 и разумность)
- Улучшено логирование для отладки

**Результат:** Курс теперь рассчитывается корректно: `1 TON = 8984 nano-jettons`

---

### ✅ Проблема №2: Router v1/v2 несовместимость (РЕШЕНО 2025-10-10)

**Статус:** ✅ ИСПРАВЛЕНО

**Решение:**
- Изменен Router с v1 на v2.2 (адрес: EQCS4UEa5UaJLzOyyKieqQOQ2P9M-7kXpkO5HnP3Bv250cN3)
- Изменен pTON с v1 на v2.1 для совместимости
- Исправлен minAskAmount: остается bigint для Router v2.2

**Результат:** Router v2.2 инициализируется успешно, swapTxParams создается

---

### 🔄 Проблема №3: gasAmount vs value в Router v2.2 (В ПРОЦЕССЕ 2025-10-10)

**Статус:** 🔄 ИСПРАВЛЯЕТСЯ

**Проблема:** Router v2.2 возвращает `value` вместо `gasAmount` в swapTxParams

**Лог ошибки:**
```
"allKeys": ["to", "value", "body"]
"hasAmount": false
"hasTonAmount": false  
"hasValue": true
```

**Решение:**
- Использовать `swapTxParams.value` вместо `swapTxParams.gasAmount`
- Добавлен fallback: `swapTxParams.value || swapTxParams.gasAmount`

**Ожидаемый результат:** `BigInt(swapTxParams.value)` вместо `BigInt(undefined)`

---

## 🔍 АРХИВ: Старые проблемы

### Проблема №1: Неправильный расчет курса обмена

**Лог ошибки:**
```
LOG [SwapService] [DEBUG] Current swap rate: 1 TON = 0 jettons
LOG [SwapService] [DEBUG] Swap transaction built: to=..., amount=undefined
ERROR [SwapService] [DEBUG] STON.fi swap failed: Cannot convert undefined to a BigInt
```

**Причина:** Неправильный расчет курса обмена в `getSwapRate()`.

**Анализ резервов:**
- **reserve0: 22576656310132521** (очень большое число)
- **reserve1: 213513654822** (меньшее число)
- **Текущий расчет:** `rate = (jettonReserve * 95n) / (tonReserve * 100n) = 0`

**Возможные причины:**
1. Резервы поменяны местами (reserve0 = jetton, reserve1 = TON)
2. Неправильная формула расчета курса
3. Проблема с единицами измерения (нано-единицы)

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

## Предложение от ChatGPT:

---

## 💥 Проблема в формуле

Ты сейчас считаешь курс так:

```ts
const rate = (jettonReserve * 95n) / (tonReserve * 100n);
```

при этом `reserve0` и `reserve1` у тебя — **в нанотонах и наноджеттонах** (оба имеют 9 знаков после запятой).
Если `reserve0 ≈ 22 576 656 310 132 521` и `reserve1 ≈ 213 513 654 822`,
то численно это:

```text
22 576 656 310 132 521 nanotons = 22 576 TON
213 513 654 822 nanoRUBLE = 213 RUBLE
```

Т.е. **1 TON ≈ 0.0095 RUBLE**, а не 106 000 😅
Значит, ты просто **перепутал порядок резервов** (STON.fi хранит их как `[token0, token1]` в порядке добавления в пул).

---

## ✅ Правильная формула

STON.fi всегда считает `reserve0` ↔ `token0`, `reserve1` ↔ `token1`.
Твой пул — **Jetton (RUBLE)** против **pTON**,
и в блокчейне он хранится, скорее всего, как **(RUBLE, pTON)**, не наоборот.

То есть, нужно делить наоборот:

```ts
// rate = сколько jettons за 1 TON
const rate = (jettonReserve * 10n ** 9n * 95n) / (tonReserve * 100n);
```

или если резерв0 = jetton, резерв1 = TON, то наоборот:

```ts
const rate = (reserve0 * 10n ** 9n * 95n) / (reserve1 * 100n);
```

---

## 🧮 Пример проверки

Возьмём твои реальные цифры:

```ts
const tonReserve = 22576656310132521n; // 22 576 TON
const jettonReserve = 213513654822n;   // 213 RUBLE
const rate = (jettonReserve * 10n ** 9n) / tonReserve;
console.log(rate); // ≈ 9456 nanoRUBLE за 1 nanoTON
```

→ `rate ≈ 9456`, то есть **1 TON ≈ 9 456 000 000 RUBLE**, если перевести из nano в обычные единицы ≈ 9.45 RUBLE** — разумное значение.
(Если наоборот — тогда будет 0.0001 RUBLE за 1 TON, что явно не так.)

---

## 🧩 Исправление функции `getSwapRate`

Вот так будет правильно:

```ts
// Get pool data
const poolData = await pool.getPoolData();
const reserve0 = poolData.reserve0;
const reserve1 = poolData.reserve1;

// Определи порядок токенов
// STON.fi SDK v2_1 возвращает поля token0 и token1 — можно проверить:
const token0 = await pool.getToken0();
const token1 = await pool.getToken1();

this.logger.debug(`[DEBUG] token0=${token0.toString()}, token1=${token1.toString()}`);

let tonReserve: bigint;
let jettonReserve: bigint;

// Определяем, где TON/pTON
if (token0.toString() === ptonAddress.toString()) {
  tonReserve = reserve0;
  jettonReserve = reserve1;
} else {
  tonReserve = reserve1;
  jettonReserve = reserve0;
}

// Добавляем масштаб и слиппедж
const rate = (jettonReserve * 10n ** 9n * 95n) / (tonReserve * 100n);
this.logger.log(`[DEBUG] Corrected swap rate: 1 TON = ${rate.toString()} jettons`);
return rate;
```

---

## 💡 Почему раньше было “1 TON = 0 jettons”

Потому что `(reserve1 * 95n) / (reserve0 * 100n)` при таких числах давало меньше 1 → округление в BigInt дало 0.
А далее `(amountNanotons * rate)` → 0, и в момент `BigInt(undefined)` — выброс ошибки.

---

## 🔧 Резюме правок

1. В `getSwapRate()`:

   * Определи, где TON/pTON, а где Jetton, через `getToken0() / getToken1()`.
   * Пересчитай формулу, добавив множитель `10^9` и проверку порядка.
2. В `performSwap()` оставь `(amountNanotons * rate) / 1_000_000_000n` — теперь `rate` будет в корректных единицах.
3. После этого твой курс `≈ 106 000 RUBLE за TON` станет совпадать с тем, что отображает STON.fi UI.
