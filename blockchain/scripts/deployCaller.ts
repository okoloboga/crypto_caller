import { toNano, Address } from '@ton/core';
import { SubscriptionContract } from '../build/Caller/Caller_SubscriptionContract';
import { NetworkProvider } from '@ton/blueprint';
import * as QRCode from 'qrcode-terminal';

export async function run(provider: NetworkProvider) {
  // ⚙️ Задай параметры
  const owner = Address.parse('UQB26VtCk8H5o23Gk_fW80wCncY-kcWQ4LBEx6PDabmi5CLh');
  const stonRouter = Address.parse('UQCpIGMtcP6OQH17MacwuwMKyuOF5F8LwBhU2NElKZtyGI4Y'); // адрес relayer
  const jettonMaster = Address.parse('EQA5QopV0455mb09Nz6iPL3JsX_guIGf77a6l-DtqSQh0aE-'); // можно фейковый
  const minPayment = toNano('0.1'); // минимальный платеж (вместо фиксированной цены)
  const period = 30n * 24n * 3600n; // 30 дней

  // 📦 Создаём инстанс контракта
  const subscription = provider.open(
    await SubscriptionContract.fromInit(
      owner,
      stonRouter,
      jettonMaster,
      minPayment,
      period
    )
  );

  console.log('📋 Contract will be deployed at:', subscription.address.toString());
  console.log('💰 Deploy cost: ~0.05 TON');
  console.log('');
  
  // 📱 Показываем QR код для оплаты
  const deployLink = `ton://transfer/${subscription.address.toString()}?amount=${toNano('0.05').toString()}`;
  console.log('📱 Scan QR code to deploy contract:');
  console.log('');
  QRCode.generate(deployLink, { small: true });
  console.log('');
  console.log('🔗 Or use link:', deployLink);
  console.log('');
  console.log('⏳ Waiting for payment...');

  // 🚀 Отправляем транзакцию деплоя
  await subscription.send(
    provider.sender(),
    { value: toNano('0.05') }, // на газ
    { $$type: 'Subscribe' }
  );

  // ⏳ Ждём подтверждения
  await provider.waitForDeploy(subscription.address);

  console.log('✅ SubscriptionContract deployed at:', subscription.address.toString());
  console.log('📋 Contract parameters:');
  console.log('   Owner:', owner.toString());
  console.log('   Relayer:', stonRouter.toString());
  console.log('   Jetton Master:', jettonMaster.toString());
  console.log('   Min Payment:', minPayment.toString(), 'nanotons (0.1 TON)');
  console.log('   Period:', period.toString(), 'seconds (30 days)');
  console.log('');
  console.log('💡 Note: Price is now flexible and controlled by backend .env');
  console.log('   Contract accepts any payment >= 0.1 TON');
  console.log('   Backend controls actual subscription price via SUBSCRIPTION_PRICE');
}
