import { toNano } from '@ton/core';
import { Caller } from '../build/Caller/Caller_Caller';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const caller = provider.open(await Caller.fromInit());

    await caller.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(caller.address);

    // run methods on `caller`
}
