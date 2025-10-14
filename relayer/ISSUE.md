# Проблема с STON.fi Swap: Неправильное использование SDK

## Суть проблемы

Мы пытались **обойти SDK** и создать payload вручную, но SDK знает правильную структуру для Router.

## Анализ проблемы

### **Неправильный подход (наш):**
```typescript
// ❌ Мы создавали payload вручную
const forwardPayload = this.buildSwapForwardPayload(
  askJettonWalletAddress,
  minAskAmount,
  Address.parse(this.config.relayerWalletAddress),
);

const ptonTransferBody = this.buildPtonTonTransferBody(
  amountNanotons,
  Address.parse(routerAddress),
  forwardPayload,
);
```

### **Правильный подход (из примеров):**
```typescript
// ✅ Используем SDK для создания правильного payload
const swapParams = await router.getSwapTonToJettonTxParams({
  userWalletAddress: userAddress,
  proxyTon: dexContracts.pTON.create(routerMetadata.ptonMasterAddress),
  askJettonAddress: simulationResult.askAddress,
  offerAmount: simulationResult.offerUnits,
  minAskAmount: simulationResult.minAskUnits,
});
```

## Корень проблемы

**Мы пытались обойти SDK, но SDK знает правильную структуру payload!**

### **Почему Router возвращал TON:**
- **Неправильная структура** forward payload
- **Неправильный opcode** для Router
- **Неправильные параметры** в payload

### **Почему SDK решает проблему:**
- **SDK знает правильную структуру** для Router v2
- **SDK создает правильный payload** с корректными параметрами
- **SDK использует правильные opcodes** и адреса

## Решение

**Вернуться к использованию SDK с правильными параметрами:**

```typescript
// ✅ ПРАВИЛЬНО: Используем SDK
const swapParams = await this.router.getSwapTonToJettonTxParams({
  userWalletAddress: this.config.relayerWalletAddress,
  proxyTon: this.contracts.pTON.create(this.routerInfo.ptonMasterAddress),
  offerAmount: amountNanotons,
  askJettonAddress: jettonMasterAddress,
  minAskAmount: minAskAmount,
});

// ✅ ПРАВИЛЬНО: Отправляем на правильный destination
await this.tonService.sendInternalMessage(
  swapParams.to.toString(), // ← SDK знает правильный destination!
  swapParams.value,
  swapParams.body,
);
```

## Вывод

**Проблема была в попытке обойти SDK!**

**SDK существует для того, чтобы создавать правильные payload для Router.**
**Не нужно изобретать велосипед - используем SDK!** 🚀
