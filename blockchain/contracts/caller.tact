import "@stdlib/deploy";

message(0x01) Subscribe {}

message(0x02) OwnerSetRouter {
  router: Address;
}

message(0x03) OwnerSetPrice {
  price: Int as coins;
}

message(0x04) OwnerPause {
  flag: Bool;
}

message(0x05) OnSwapCallback {
  user: Address;
  jettonAmount: Int as coins;
  success: Bool;
}

contract SubscriptionContract {
  owner: Address;
  subscriptionPrice: Int as coins;
  subscribePeriod: Int as uint32; // seconds
  subscriptions: map<Address, Int as uint64>; // timestamp
  stonRouter: Address;
  jettonMaster: Address;
  paused: Bool;

  init(ownerAddr: Address, stonRouter: Address, jettonMaster: Address, price: Int as coins, period: Int as uint32) {
    self.owner = ownerAddr;
    self.stonRouter = stonRouter;
    self.jettonMaster = jettonMaster;
    self.subscriptionPrice = price;
    self.subscribePeriod = period;
    self.paused = false;
    self.subscriptions = map<Address, Int as uint64> {};
  }

  receive(msg: Subscribe) {
    require(!self.paused, "ERR_PAUSED");

    let incoming = context().value;
    require(incoming >= self.subscriptionPrice, "ERR_INSUFFICIENT_VALUE");

    let tonToOwner: Int = (self.subscriptionPrice * 25)/75; // 0.25 of 0.75
    let tonToSwap: Int = self.subscriptionPrice - tonToOwner;

    // Send TON to owner
    message(MessageParameters{ to: self.owner, value: tonToOwner, mode: SendIgnoreErrors });

    // Call STON.fi router to swap 0.5 TON -> jetton
    message(MessageParameters{
      to: self.stonRouter,
      value: tonToSwap,
      bounce: true,
      body: beginCell()
        .storeAddress(sender())         // user address
        .storeAddress(self.jettonMaster) // jetton master
      .endCell()
    });

    // Extend subscription
    let currentExpiryMaybe = self.subscriptions.get(sender());
    let nowTimestamp = now();
    let newExpiry: Int = 0;
    if currentExpiryMaybe != null && currentExpiryMaybe!! > nowTimestamp {
      newExpiry = currentExpiryMaybe!! + self.subscribePeriod;
    } else {
      newExpiry = nowTimestamp + self.subscribePeriod;
    }
    self.subscriptions.set(sender(), newExpiry);
  }

  receive(msg: OnSwapCallback) {
    require(msg.success, "ERR_SWAP_FAILED");

    // Burn the jettons received from swap
    // Sending back to jetton master as burn
    message(MessageParameters{
      to: self.jettonMaster,
      value: ton("0.05"), // gas for internal call
      bounce: true,
      body: beginCell()
        .storeUint(0xf8a7ea5, 32)   // selector transfer/burn
        .storeAddress(msg.user)
        .storeCoins(msg.jettonAmount)
        .storeCoins(0)
        .storeAddress(msg.user)
        .storeBit(true)
        .storeRef(beginCell().endCell())
      .endCell()
    });
  }

  receive(msg: OwnerSetRouter) {
    require(sender() == self.owner, "ERR_ONLY_OWNER");
    self.stonRouter = msg.router;
  }

  receive(msg: OwnerSetPrice) {
    require(sender() == self.owner, "ERR_ONLY_OWNER");
    self.subscriptionPrice = msg.price;
  }

  receive(msg: OwnerPause) {
    require(sender() == self.owner, "ERR_ONLY_OWNER");
    self.paused = msg.flag;
  }

  get fun isSubscribed(user: Address): Int {
    let expiryMaybe = self.subscriptions.get(user);
    if expiryMaybe != null {
      return expiryMaybe!!;
    }
    return 0;
  }

  get fun getOwner(): Address {
    return self.owner;
  }

  get fun getRouter(): Address {
    return self.stonRouter;
  }

  get fun getPrice(): Int {
    return self.subscriptionPrice;
  }

  get fun isPaused(): Bool {
    return self.paused;
  }
}
