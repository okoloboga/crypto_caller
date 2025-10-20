import "@stdlib/deploy";

message(0x01) Subscribe {}

message(0x02) OwnerSetRouter {
  router: Address;
}

message(0x03) OwnerSetMinPayment {
  minPayment: Int as coins;
}

message(0x04) OwnerPause {
  flag: Bool;
}

message(0x05) OnSwapCallback {
  user: Address;
  jettonAmount: Int as coins;
  success: Bool;
}

message(0x06) RefundUser {
  user: Address;
  amount: Int as coins;
}

message(0x07) OwnerSetTreasury {
  treasury: Address;
}

contract SubscriptionContract {
  // ---- storage ----
  owner: Address;
  treasury: Address;      // кошелек для получения 1/3 от платежей
  minPayment: Int as coins;        // минимальная сумма платежа (вместо фиксированной цены)
  subscribePeriod: Int as uint32;  // seconds
  subscriptions: map<Address, Int as uint64>; // user -> expiry timestamp
  pendingSubscriptions: map<Address, Int as uint64>; // user -> pending expiry timestamp
  stonRouter: Address;   // в MVP — off-chain relayer address (куда пересылаем 2/3)
  jettonMaster: Address; // для информации (можно не использовать в MVP)
  paused: Bool;

  init(ownerAddr: Address, treasuryAddr: Address, stonRouter: Address, jettonMaster: Address, minPayment: Int as coins, period: Int as uint32) {
    self.owner = ownerAddr;
    self.treasury = treasuryAddr;
    self.stonRouter = stonRouter;
    self.jettonMaster = jettonMaster;
    self.minPayment = minPayment;
    self.subscribePeriod = period;
    self.paused = false;
    self.subscriptions = map<Address, Int as uint64> {};
    self.pendingSubscriptions = map<Address, Int as uint64> {};
  }

  // Пользователь платит подписку
  receive(msg: Subscribe) {
    require(!self.paused, "ERR_PAUSED");

    let incoming = context().value;
    require(incoming >= self.minPayment, "ERR_INSUFFICIENT_PAYMENT");

    // Гибкое деление: 1/3 на treasury, 2/3 на relayer от любой суммы
    let tonToTreasury: Int = incoming / 3;
    let tonToSwap: Int = incoming - tonToTreasury;

    // Отправляем 1/3 в treasury. Ошибки игнорируем (чтобы не ломать UX подписки).
    message(MessageParameters{
      to: self.treasury,
      value: tonToTreasury,
      mode: SendIgnoreErrors
    });

    // Отправляем 2/3 на relayer (STON.fi off-chain сервис), передаём в body адрес пользователя
    // relayer должен понимать, что это плата за swap+burn для этого user'а
    message(MessageParameters{
      to: self.stonRouter,
      value: tonToSwap,
      bounce: true,
      mode: SendIgnoreErrors,
      body: beginCell()
        .storeUint(0x7361_6d70, 32) // произвольный op для relayer (например "ramp" — просто маркер)
        .storeAddress(sender())      // адрес плательщика — relayer будет знать, для кого выполнять swap
        .storeCoins(incoming)        // передаём полную сумму платежа для информации
      .endCell()
    });

    // Сдачи нет - используем всю входящую сумму

    // Сохраняем pending subscription - активируем только после успешного OnSwapCallback
    let currentExpiryMaybe = self.subscriptions.get(sender());
    let nowTimestamp = now();
    let newExpiry: Int = 0;
    if currentExpiryMaybe != null && currentExpiryMaybe!! > nowTimestamp {
      newExpiry = currentExpiryMaybe!! + self.subscribePeriod;
    } else {
      newExpiry = nowTimestamp + self.subscribePeriod;
    }
    self.pendingSubscriptions.set(sender(), newExpiry);
  }

  // Callback от relayer'а — принимает только сообщения от self.stonRouter
  receive(msg: OnSwapCallback) {
    require(sender() == self.stonRouter, "ERR_ONLY_ROUTER");
    
    if msg.success {
      // Активируем pending subscription
      let pendingExpiry = self.pendingSubscriptions.get(msg.user);
      if pendingExpiry != null {
        self.subscriptions.set(msg.user, pendingExpiry!!);
        self.pendingSubscriptions.set(msg.user, null);
      }
    } else {
      // Если swap не удался, удаляем pending subscription и отправляем refund
      self.pendingSubscriptions.set(msg.user, null);
      
      // Отправляем уведомление владельцу о неудаче
      message(MessageParameters{
        to: self.owner,
        value: ton("0.001"),
        mode: SendIgnoreErrors,
        bounce: false,
        body: beginCell()
          .storeUint(0xDEAD, 32) // маркер уведомления о неудаче
          .storeAddress(msg.user)
          .storeBit(false)
        .endCell()
      });
    }
  }

  // Refund пользователю (вызывается relayer'ом при неудаче)
  receive(msg: RefundUser) {
    require(sender() == self.stonRouter, "ERR_ONLY_ROUTER");
    
    // Отправляем refund пользователю
    message(MessageParameters{
      to: msg.user,
      value: msg.amount,
      mode: SendIgnoreErrors,
      bounce: false
    });
  }

  // Управляющие методы (only owner)
  receive(msg: OwnerSetRouter) {
    require(sender() == self.owner, "ERR_ONLY_OWNER");
    self.stonRouter = msg.router;
  }

  receive(msg: OwnerSetMinPayment) {
    require(sender() == self.owner, "ERR_ONLY_OWNER");
    self.minPayment = msg.minPayment;
  }

  receive(msg: OwnerPause) {
    require(sender() == self.owner, "ERR_ONLY_OWNER");
    self.paused = msg.flag;
  }

  receive(msg: OwnerSetTreasury) {
    require(sender() == self.owner, "ERR_ONLY_OWNER");
    self.treasury = msg.treasury;
  }

  // Getters
  get fun isSubscribed(user: Address): Int {
    let expiryMaybe = self.subscriptions.get(user);
    if expiryMaybe != null {
      return expiryMaybe!!;
    }
    return 0;
  }

  get fun isPendingSubscription(user: Address): Int {
    let pendingMaybe = self.pendingSubscriptions.get(user);
    if pendingMaybe != null {
      return pendingMaybe!!;
    }
    return 0;
  }

  get fun getOwner(): Address {
    return self.owner;
  }

  get fun getRouter(): Address {
    return self.stonRouter;
  }

  get fun getTreasury(): Address {
    return self.treasury;
  }

  get fun getMinPayment(): Int {
    return self.minPayment;
  }

  get fun isPaused(): Bool {
    return self.paused;
  }
}
