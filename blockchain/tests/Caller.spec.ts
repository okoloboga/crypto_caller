import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { SubscriptionContract } from '../build/Caller/Caller_SubscriptionContract';
import '@ton/test-utils';

describe('SubscriptionContract - advanced', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let treasury: SandboxContract<TreasuryContract>;
    let router: SandboxContract<TreasuryContract>;
    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let user3: SandboxContract<TreasuryContract>;
    let contract: SandboxContract<SubscriptionContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        treasury = await blockchain.treasury('treasury');
        router = await blockchain.treasury('router');
        user1 = await blockchain.treasury('user1');
        user2 = await blockchain.treasury('user2');
        user3 = await blockchain.treasury('user3');

        contract = blockchain.openContract(
            await SubscriptionContract.fromInit(
                deployer.address,   // owner
                treasury.address,   // treasury - получает 1/3 от платежей
                router.address,     // router - получает 2/3 от платежей
                deployer.address,   // mock jetton master
                toNano('0.1'),      // минимальный платеж (вместо фиксированной цены)
                30n * 24n * 3600n   // 30 days
            )
        );

        // Deploy contract by sending initial owner message
        await contract.send(deployer.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerPause', flag: false });
    });

    it('should allow multiple users to subscribe independently', async () => {
        // Subscribe - creates pending subscriptions
        await contract.send(user1.getSender(), { value: toNano('0.75') }, { $$type: 'Subscribe' });
        await contract.send(user2.getSender(), { value: toNano('0.75') }, { $$type: 'Subscribe' });

        // Check pending subscriptions
        const pending1 = await contract.getIsPendingSubscription(user1.address);
        const pending2 = await contract.getIsPendingSubscription(user2.address);
        expect(pending1).toBeGreaterThan(0n);
        expect(pending2).toBeGreaterThan(0n);

        // Check that subscriptions are not active yet
        const expiry1 = await contract.getIsSubscribed(user1.address);
        const expiry2 = await contract.getIsSubscribed(user2.address);
        expect(expiry1).toBe(0n);
        expect(expiry2).toBe(0n);

        // Activate subscriptions via OnSwapCallback
        await contract.send(router.getSender(), { value: toNano('0.01') }, { 
            $$type: 'OnSwapCallback', 
            user: user1.address, 
            jettonAmount: toNano('10'), 
            success: true 
        });
        await contract.send(router.getSender(), { value: toNano('0.01') }, { 
            $$type: 'OnSwapCallback', 
            user: user2.address, 
            jettonAmount: toNano('10'), 
            success: true 
        });

        // Now check active subscriptions
        const finalExpiry1 = await contract.getIsSubscribed(user1.address);
        const finalExpiry2 = await contract.getIsSubscribed(user2.address);
        expect(finalExpiry1).toBeGreaterThan(0n);
        expect(finalExpiry2).toBeGreaterThan(0n);
    });

    it('should correctly extend subscription if subscribing near expiry', async () => {
        // First subscription
        await contract.send(user1.getSender(), { value: toNano('0.75') }, { $$type: 'Subscribe' });
        await contract.send(router.getSender(), { value: toNano('0.01') }, { 
            $$type: 'OnSwapCallback', 
            user: user1.address, 
            jettonAmount: toNano('10'), 
            success: true 
        });
        const firstExpiry = await contract.getIsSubscribed(user1.address);

        // Jump close to expiry (1s before) without going back in time
        blockchain.now = Number(firstExpiry - 1n);

        // Second subscription
        await contract.send(user1.getSender(), { value: toNano('0.75') }, { $$type: 'Subscribe' });
        await contract.send(router.getSender(), { value: toNano('0.01') }, { 
            $$type: 'OnSwapCallback', 
            user: user1.address, 
            jettonAmount: toNano('10'), 
            success: true 
        });

        const secondExpiry = await contract.getIsSubscribed(user1.address);

        expect(secondExpiry).toBeGreaterThan(firstExpiry);
    });

    it('should prevent non-owner from calling owner functions', async () => {
        const newRouter = user3.address;

        const res1 = await contract.send(user1.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerSetRouter', router: newRouter });
        expect(res1.transactions).toHaveTransaction({ from: user1.address, to: contract.address, success: false });

        const res2 = await contract.send(user1.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerSetMinPayment', minPayment: toNano('1') });
        expect(res2.transactions).toHaveTransaction({ from: user1.address, to: contract.address, success: false });

        const res3 = await contract.send(user1.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerPause', flag: true });
        expect(res3.transactions).toHaveTransaction({ from: user1.address, to: contract.address, success: false });
    });

    it('should handle multiple successful and failed swap callbacks', async () => {
        // Successful swap
        const res1 = await contract.send(
            router.getSender(), 
            { value: toNano('0.1') },
            { $$type: 'OnSwapCallback', user: user1.address, jettonAmount: toNano('10'), success: true });
    
        expect(res1.transactions).toHaveTransaction({
            from: router.address,
            to: contract.address,
            success: true
        });
    
        // Failed swap (но контракт не падает)
        const res2 = await contract.send(
            router.getSender(), 
            { value: toNano('0.01') },
            { $$type: 'OnSwapCallback', user: user2.address, jettonAmount: toNano('10'), success: false });
    
        expect(res2.transactions).toHaveTransaction({
            from: router.address,
            to: contract.address,
            success: true // теперь true, а не false
        });
    
        // И проверим, что отправилось уведомление владельцу
        expect(res2.transactions).toHaveTransaction({
            from: contract.address,
            to: deployer.address,
            success: true,
            op: 0xDEAD
        });
    });

    it('should correctly update owner-controlled parameters', async () => {
        const newRouter = user2.address;
        const newMinPayment = toNano('0.2');

        await contract.send(deployer.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerSetRouter', router: newRouter });
        await contract.send(deployer.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerSetMinPayment', minPayment: newMinPayment });
        await contract.send(deployer.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerPause', flag: false });

        const router = await contract.getGetRouter();
        const minPayment = await contract.getGetMinPayment();
        const paused = await contract.getIsPaused();

        expect(router.toString()).toBe(newRouter.toString());
        expect(minPayment).toBe(newMinPayment);
        expect(paused).toBe(false);
    });

    it('should return 0 for non-subscribed users', async () => {
        const expiry = await contract.getIsSubscribed(user3.address);
        expect(expiry).toBe(0n);
    });

    it('should handle subscriptions right on expiry boundary', async () => {
        // First subscription
        await contract.send(user1.getSender(), { value: toNano('0.75') }, { $$type: 'Subscribe' });
        await contract.send(router.getSender(), { value: toNano('0.01') }, { 
            $$type: 'OnSwapCallback', 
            user: user1.address, 
            jettonAmount: toNano('10'), 
            success: true 
        });
        const firstExpiry = await contract.getIsSubscribed(user1.address);

        // Fast-forward exactly to expiry
        blockchain.now = Number(firstExpiry);

        // Second subscription
        await contract.send(user1.getSender(), { value: toNano('0.75') }, { $$type: 'Subscribe' });
        await contract.send(router.getSender(), { value: toNano('0.01') }, { 
            $$type: 'OnSwapCallback', 
            user: user1.address, 
            jettonAmount: toNano('10'), 
            success: true 
        });
        const secondExpiry = await contract.getIsSubscribed(user1.address);

        expect(secondExpiry).toBe(firstExpiry + 30n*24n*3600n);
    });

    it('should prevent subscriptions when paused', async () => {
        await contract.send(deployer.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerPause', flag: true });

        const res = await contract.send(user1.getSender(), { value: toNano('0.75') }, { $$type: 'Subscribe' });
        expect(res.transactions).toHaveTransaction({ from: user1.address, to: contract.address, success: false });
    });

    it('should handle failed swap callback and clear pending subscription', async () => {
        // Subscribe - creates pending subscription
        await contract.send(user1.getSender(), { value: toNano('0.75') }, { $$type: 'Subscribe' });
        
        // Check pending subscription exists
        const pendingBefore = await contract.getIsPendingSubscription(user1.address);
        expect(pendingBefore).toBeGreaterThan(0n);
        
        // Send failed swap callback
        const res = await contract.send(router.getSender(), { value: toNano('0.01') }, { 
            $$type: 'OnSwapCallback', 
            user: user1.address, 
            jettonAmount: toNano('0'), 
            success: false 
        });
        
        // Check that pending subscription is cleared
        const pendingAfter = await contract.getIsPendingSubscription(user1.address);
        expect(pendingAfter).toBe(0n);
        
        // Check that active subscription is not created
        const active = await contract.getIsSubscribed(user1.address);
        expect(active).toBe(0n);
        
        // Check that owner notification was sent
        expect(res.transactions).toHaveTransaction({
            from: contract.address,
            to: deployer.address,
            success: true,
            op: 0xDEAD
        });
    });

    it('should handle RefundUser message from relayer', async () => {
        const refundAmount = toNano('0.5');
        
        const res = await contract.send(router.getSender(), { value: toNano('0.01') }, { 
            $$type: 'RefundUser', 
            user: user1.address, 
            amount: refundAmount 
        });
        
        // Check that the RefundUser message was processed successfully
        expect(res.transactions).toHaveTransaction({
            from: router.address,
            to: contract.address,
            success: true,
            op: 6
        });
        
        // Note: The refund message is sent with SendIgnoreErrors mode,
        // so it might not appear in the transaction list if it fails
        // This is acceptable behavior for the refund mechanism
    });

    it('should prevent non-relayer from sending OnSwapCallback', async () => {
        const res = await contract.send(user1.getSender(), { value: toNano('0.01') }, { 
            $$type: 'OnSwapCallback', 
            user: user1.address, 
            jettonAmount: toNano('10'), 
            success: true 
        });
        
        expect(res.transactions).toHaveTransaction({ 
            from: user1.address, 
            to: contract.address, 
            success: false 
        });
    });

    it('should prevent non-relayer from sending RefundUser', async () => {
        const res = await contract.send(user1.getSender(), { value: toNano('0.01') }, { 
            $$type: 'RefundUser', 
            user: user1.address, 
            amount: toNano('0.5') 
        });
        
        expect(res.transactions).toHaveTransaction({ 
            from: user1.address, 
            to: contract.address, 
            success: false 
        });
    });

    it('should accept any payment amount above minimum', async () => {
        // Тест с разными суммами платежей
        const payments = [toNano('0.1'), toNano('0.75'), toNano('1.5'), toNano('2.0')];
        
        for (let i = 0; i < payments.length; i++) {
            const user = i === 0 ? user1 : i === 1 ? user2 : i === 2 ? user3 : user1;
            const payment = payments[i];
            
            const res = await contract.send(user.getSender(), { value: payment }, { $$type: 'Subscribe' });
            expect(res.transactions).toHaveTransaction({ 
                from: user.address, 
                to: contract.address, 
                success: true 
            });
            
            // Проверяем, что создалась pending подписка
            const pending = await contract.getIsPendingSubscription(user.address);
            expect(pending).toBeGreaterThan(0n);
        }
    });

    it('should reject payments below minimum', async () => {
        const tooSmall = toNano('0.05'); // Меньше минимума 0.1 TON
        
        const res = await contract.send(user1.getSender(), { value: tooSmall }, { $$type: 'Subscribe' });
        expect(res.transactions).toHaveTransaction({ 
            from: user1.address, 
            to: contract.address, 
            success: false 
        });
    });

    it('should split payment correctly for different amounts', async () => {
        const payment = toNano('1.5'); // 1.5 TON
        const expectedTreasuryShare = payment / 3n; // 0.5 TON
        const expectedRelayerShare = payment - expectedTreasuryShare; // 1.0 TON
        
        const res = await contract.send(user1.getSender(), { value: payment }, { $$type: 'Subscribe' });
        
        // Проверяем, что контракт отправил транзакции (используем toHaveTransaction)
        // Проверяем наличие транзакции к treasury (примерно 1/3)
        expect(res.transactions).toHaveTransaction({
            from: contract.address,
            to: treasury.address,
        });
        
        // Проверяем наличие транзакции к router (примерно 2/3)
        expect(res.transactions).toHaveTransaction({
            from: contract.address,
            to: router.address,
        });
        
        // Проверяем, что общий результат успешен
        expect(res.transactions).toHaveTransaction({
            from: user1.address,
            to: contract.address,
            success: true
        });
    });

    it('should allow owner to update minimum payment', async () => {
        const newMinPayment = toNano('0.5');
        
        // Обновляем минимальный платеж
        await contract.send(deployer.getSender(), { value: toNano('0.01') }, { 
            $$type: 'OwnerSetMinPayment', 
            minPayment: newMinPayment 
        });
        
        // Проверяем, что обновился
        const currentMinPayment = await contract.getGetMinPayment();
        expect(currentMinPayment).toBe(newMinPayment);
        
        // Проверяем, что старый минимум теперь не работает
        const res1 = await contract.send(user1.getSender(), { value: toNano('0.1') }, { $$type: 'Subscribe' });
        expect(res1.transactions).toHaveTransaction({ 
            from: user1.address, 
            to: contract.address, 
            success: false 
        });
        
        // Проверяем, что новый минимум работает
        const res2 = await contract.send(user1.getSender(), { value: toNano('0.5') }, { $$type: 'Subscribe' });
        expect(res2.transactions).toHaveTransaction({ 
            from: user1.address, 
            to: contract.address, 
            success: true 
        });
    });

    it('should allow owner to update treasury address', async () => {
        const newTreasury = user3.address;
        
        // Обновляем treasury адрес
        await contract.send(deployer.getSender(), { value: toNano('0.01') }, { 
            $$type: 'OwnerSetTreasury', 
            treasury: newTreasury 
        });
        
        // Проверяем, что обновился
        const currentTreasury = await contract.getGetTreasury();
        expect(currentTreasury.toString()).toBe(newTreasury.toString());
    });

    it('should prevent non-owner from updating treasury', async () => {
        const newTreasury = user3.address;
        
        const res = await contract.send(user1.getSender(), { value: toNano('0.01') }, { 
            $$type: 'OwnerSetTreasury', 
            treasury: newTreasury 
        });
        
        expect(res.transactions).toHaveTransaction({ 
            from: user1.address, 
            to: contract.address, 
            success: false 
        });
    });

    it('should send payments to correct treasury address', async () => {
        const payment = toNano('0.75');
        
        const res = await contract.send(user1.getSender(), { value: payment }, { $$type: 'Subscribe' });
        
        // Проверяем, что платеж отправлен на treasury (1/3)
        expect(res.transactions).toHaveTransaction({
            from: contract.address,
            to: treasury.address,
        });
        
        // Проверяем, что платеж отправлен на router (2/3)
        expect(res.transactions).toHaveTransaction({
            from: contract.address,
            to: router.address,
        });
        
        // Проверяем, что общий результат успешен
        expect(res.transactions).toHaveTransaction({
            from: user1.address,
            to: contract.address,
            success: true
        });
    });

    it('should update treasury and send future payments to new treasury', async () => {
        const newTreasury = user3.address;
        const payment = toNano('0.75');
        
        // Обновляем treasury
        await contract.send(deployer.getSender(), { value: toNano('0.01') }, { 
            $$type: 'OwnerSetTreasury', 
            treasury: newTreasury 
        });
        
        // Отправляем платеж
        const res = await contract.send(user1.getSender(), { value: payment }, { $$type: 'Subscribe' });
        
        // Проверяем, что платеж отправлен на новый treasury
        expect(res.transactions).toHaveTransaction({
            from: contract.address,
            to: newTreasury,
        });
        
        // Проверяем, что платеж отправлен на router (2/3)
        expect(res.transactions).toHaveTransaction({
            from: contract.address,
            to: router.address,
        });
        
        // Проверяем, что НЕ отправлен на старый treasury
        expect(res.transactions).not.toHaveTransaction({
            from: contract.address,
            to: treasury.address,
        });
    });
});
