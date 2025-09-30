import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { SubscriptionContract } from '../build/Caller/Caller_SubscriptionContract';
import '@ton/test-utils';

describe('SubscriptionContract - advanced', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let user3: SandboxContract<TreasuryContract>;
    let contract: SandboxContract<SubscriptionContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        user1 = await blockchain.treasury('user1');
        user2 = await blockchain.treasury('user2');
        user3 = await blockchain.treasury('user3');

        contract = blockchain.openContract(
            await SubscriptionContract.fromInit(
                deployer.address,
                deployer.address,   // mock STON router
                deployer.address,   // mock jetton master
                toNano('0.75'),
                30n * 24n * 3600n   // 30 days
            )
        );

        // Deploy contract by sending initial owner message
        await contract.send(deployer.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerPause', flag: false });
    });

    it('should allow multiple users to subscribe independently', async () => {
        await contract.send(user1.getSender(), { value: toNano('0.75') }, { $$type: 'Subscribe' });
        await contract.send(user2.getSender(), { value: toNano('0.75') }, { $$type: 'Subscribe' });

        const expiry1 = await contract.getIsSubscribed(user1.address);
        const expiry2 = await contract.getIsSubscribed(user2.address);
        expect(expiry1).toBeGreaterThan(0n);
        expect(expiry2).toBeGreaterThan(0n);
    });

    it('should correctly extend subscription if subscribing near expiry', async () => {
        await contract.send(user1.getSender(), { value: toNano('0.75') }, { $$type: 'Subscribe' });
        const firstExpiry = await contract.getIsSubscribed(user1.address);

        // Jump close to expiry (1s before) without going back in time
        blockchain.now = Number(firstExpiry - 1n);

        await contract.send(user1.getSender(), { value: toNano('0.75') }, { $$type: 'Subscribe' });

        const secondExpiry = await contract.getIsSubscribed(user1.address);

        expect(secondExpiry).toBeGreaterThan(firstExpiry);
    });

    it('should prevent non-owner from calling owner functions', async () => {
        const newRouter = user3.address;

        const res1 = await contract.send(user1.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerSetRouter', router: newRouter });
        expect(res1.transactions).toHaveTransaction({ from: user1.address, to: contract.address, success: false });

        const res2 = await contract.send(user1.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerSetPrice', price: toNano('1') });
        expect(res2.transactions).toHaveTransaction({ from: user1.address, to: contract.address, success: false });

        const res3 = await contract.send(user1.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerPause', flag: true });
        expect(res3.transactions).toHaveTransaction({ from: user1.address, to: contract.address, success: false });
    });

    it('should handle multiple successful and failed swap callbacks', async () => {
        // Successful swap for user1
        const res1 = await contract.send(
            deployer.getSender(), 
            { value: toNano('0.1') },
            { $$type: 'OnSwapCallback', user: user1.address, jettonAmount: toNano('10'), success: true });
        expect(res1.transactions).toHaveTransaction({
            from: deployer.address,
            to: contract.address,
            success: true
        });

        // Failed swap for user2
        const res2 = await contract.send(
            deployer.getSender(), 
            { value: toNano('0.01') },
            { $$type: 'OnSwapCallback', user: user2.address, jettonAmount: toNano('10'), success: false });
        expect(res2.transactions).toHaveTransaction({
            from: deployer.address,
            to: contract.address,
            success: false
        });
    });

    it('should correctly update owner-controlled parameters', async () => {
        const newRouter = user2.address;
        const newPrice = toNano('1');

        await contract.send(deployer.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerSetRouter', router: newRouter });
        await contract.send(deployer.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerSetPrice', price: newPrice });
        await contract.send(deployer.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerPause', flag: false });

        const router = await contract.getGetRouter();
        const price = await contract.getGetPrice();
        const paused = await contract.getIsPaused();

        expect(router.toString()).toBe(newRouter.toString());
        expect(price).toBe(newPrice);
        expect(paused).toBe(false);
    });

    it('should return 0 for non-subscribed users', async () => {
        const expiry = await contract.getIsSubscribed(user3.address);
        expect(expiry).toBe(0n);
    });

    it('should handle subscriptions right on expiry boundary', async () => {
        await contract.send(user1.getSender(), { value: toNano('0.75') }, { $$type: 'Subscribe' });
        const firstExpiry = await contract.getIsSubscribed(user1.address);

        // Fast-forward exactly to expiry
        blockchain.now = Number(firstExpiry);

        await contract.send(user1.getSender(), { value: toNano('0.75') }, { $$type: 'Subscribe' });
        const secondExpiry = await contract.getIsSubscribed(user1.address);

        expect(secondExpiry).toBe(firstExpiry + 30n*24n*3600n);
    });

    it('should prevent subscriptions when paused', async () => {
        await contract.send(deployer.getSender(), { value: toNano('0.01') }, { $$type: 'OwnerPause', flag: true });

        const res = await contract.send(user1.getSender(), { value: toNano('0.75') }, { $$type: 'Subscribe' });
        expect(res.transactions).toHaveTransaction({ from: user1.address, to: contract.address, success: false });
    });
});
