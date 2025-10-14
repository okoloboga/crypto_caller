# Проблема с STON.fi Swap: Неправильный destination адрес

## Суть проблемы

Мы отправляем TON **напрямую на Router STON.fi**, но Router не понимает прямой вызов и возвращает ошибку **exit code 65535** ("Unknown method").

## Анализ неуспешной транзакции

**Наша транзакция (неуспешная):**
```
Destination: EQBQ_UBQvR9ryUjKDwijtoiyyga2Wl-yJm6Y8gl0k-HDh_5x (Router)
Method: DEX_OP_CODES.SWAP (0x6664de2a)
Result: Exit code 65535 - "Unknown method"
```

**Логи показывают:**
```
[DEBUG] Direct Router destination: EQBQ_UBQvR9ryUjKDwijtoiyyga2Wl-yJm6Y8gl0k-HDh_5x
[DEBUG] Method: DEX_OP_CODES.SWAP (direct Router call)
[DEBUG] ✅ Transaction confirmed successfully
[DEBUG] ⚠️ No jettons received!
```

## Правильный flow (из успешных транзакций)

**Успешная транзакция:**
```
1. User → pTON Wallet (Pton Ton Transfer)
2. pTON → Router (Jetton Notify) 
3. Router → User (Jetton Transfer)
```

**Ключевое отличие:** В успешных транзакциях **destination = pTON Wallet**, а не Router!

## Корень проблемы

**Неправильная архитектура:**
```
❌ User → Router (прямо) → Exit code 65535
```

**Правильная архитектура:**
```
✅ User → pTON Wallet → Router (через Jetton Notify)
```

## Решение

Нужно **вернуться к использованию pTON** как посредника:

1. **Отправляем TON на pTON Wallet** (не Router)
2. **pTON делает Jetton Notify** на Router
3. **Router обрабатывает** уведомление от pTON

**Проблема:** Мы пытались обойти pTON, но pTON - это **обязательный посредник** для STON.fi Router!
