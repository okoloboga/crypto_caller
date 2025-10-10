# Relayer Service - Актуальные проблемы

## Задача

Relayer получает TON от контракта и должен:
1. Обменять TON на jetton через STON.fi
2. Сжечь jetton'ы и отправить callback контракту
3. При ошибке - вернуть TON пользователю (refund)

## ✅ РЕШЕННЫЕ ПРОБЛЕМЫ

### Кошелек V5R1 - РЕШЕНО ✅
- ✅ **seqno: 4** (было 0)
- ✅ **balance: 683828926 nanotons** (было 0) 
- ✅ **Transaction sent successfully** (было Failed to unpack account state)
- ✅ **Refund прошел успешно!** 🎉

### Pool lookup - РЕШЕНО ✅
- ✅ **Pool address найден:** `EQARa0ANmuCvqlb-sm5ImaAslSa9nWhTBi6g1hig0dqlFz88`
- ✅ **Router методы работают:** `getPoolAddress` возвращает корректный адрес
- ✅ **Address parsing исправлен:** добавлен `.toString()` перед `Address.parse()`

## 🔍 АКТУАЛЬНЫЕ ПРОБЛЕМЫ

### Проблема №1: Неправильный адрес пула

**Router возвращает:** `EQARa0ANmuCvqlb-sm5ImaAslSa9nWhTBi6g1hig0dqlFz88`
**Рабочий пул:** `EQCJKn-99vd6GEUKTkVEyFwmha33lxtb2oo-eMsU0tFGIZbf`

**Обнаружен активный пул RUBLE-pTON:**
- **Адрес пула:** [EQCJKn-99vd6GEUKTkVEyFwmha33lxtb2oo-eMsU0tFGIZbf](https://tonviewer.com/EQCJKn-99vd6GEUKTkVEyFwmha33lxtb2oo-eMsU0tFGIZbf)
- **Тип:** `jetton_master, stonfi_pool_v2` ✅
- **Статус:** `Active` ✅
- **Пара:** `RUBLE-pTON` ✅
- **Ликвидность:** `Max.supply: 69,047.09 RUBLE-pTON LP`
- **Последние транзакции:** 01 Oct, 30 Sep, 22 Sep (активен!)

**Возможные причины:**
1. Router возвращает LP Token адрес вместо адреса пула
2. Нужно использовать другой метод для получения адреса пула
3. Возможно, нужно работать с LP Token адресом

### Проблема №2: BigInt serialization (РЕШЕНО ✅)

**Лог ошибки:**
```
ERROR [SwapService] [DEBUG] Pool lookup failed: Do not know how to serialize a BigInt
ERROR [SwapService] TypeError: Do not know how to serialize a BigInt
```

**Исправление:** ✅ Убрано `JSON.stringify(pool)`, добавлено безопасное логирование.

## Следующие шаги

1. **Протестировать с отладочными логами** - посмотреть, что возвращает router
2. **Сравнить адреса** - router vs известный рабочий пул
3. **Проверить данные пула** - резервы, ликвидность
4. **Исправить получение адреса пула** если нужно