почему мы не можем обменять на USDT?
Правильный пул ликвидности USDT это EQCGScrZe1xbyWqWDvdI6mzP-GAcAWFv6ZXuaJOuSqemxku4

наш случай:

Account:
UQCpIGMt…KZtyGI4Y
Interfaces:
wallet_v5r1
Hash:
d87c2cb1…fe9b9fe9
LT:
62583712000001
Value:
0 TON
Bounce:
false
Bounced:
false
Total Fees:
0.003799609 TON
OpCode:
Wallet Signed External V5 R1 · 0x7369676e

B
Account:
EQBTYCx7…YmrIc5gb
Interfaces:
jetton_wallet
Hash:
e7433c11…fa70e416
LT:
62583712000003
Value:
0.889072691 TON
Bounce:
true
Bounced:
false
Total Fees:
0.003453596 TON
OpCode:
Pton Ton Transfer · 0x01f3835d

C
Account:
EQBQ_UBQ…k-HDh_5x
Interfaces:
stonfi_router_v2
Hash:
9fd41696…337b0f15
LT:
62583712000005
Value:
0.305765598 TON
Bounce:
true
Bounced:
false
Total Fees:
0.007860393 TON
OpCode:
Jetton Notify · 0x7362d09c

D
Account:
EQCKwzXt…g__JrDr6
Interfaces:
jetton_master, stonfi_pool_v2_const_product
Hash:
f42fbbd6…6dc61c0f
LT:
62583712000007
Value:
0.296522794 TON
Bounce:
true
Bounced:
false
Total Fees:
0.005870666 TON
OpCode:
Stonfi Swap V2 · 0x6664de2a

Правильный случай

Account:
UQB3uWOn…-Wmdk8DP
Interfaces:
wallet_v5r1
Hash:
cdf7b4e7…c3e9dc13
LT:
62584751000001
Value:
0 TON
Bounce:
false
Bounced:
false
Total Fees:
0.003948411 TON
OpCode:
Wallet Signed External V5 R1 · 0x7369676e

B
Account:
EQCSIMGB…Sz77IBa3
Interfaces:
jetton_wallet
Hash:
a3b2eafa…61858abd
LT:
62584751000003
Value:
134.31 TON
Bounce:
true
Bounced:
false
Total Fees:
0.003489997 TON
OpCode:
Pton Ton Transfer · 0x01f3835d

C
Account:
EQCS4UEa…Bv250cN3
Interfaces:
stonfi_router_v2
Hash:
918b7899…09dd60d1
LT:
62584751000005
Value:
0.305656396 TON
Bounce:
true
Bounced:
false
Total Fees:
0.007907997 TON
OpCode:
Jetton Notify · 0x7362d09c

D
Account:
EQCGScrZ…Sqemxku4
Interfaces:
jetton_master, stonfi_pool_v2_const_product
Hash:
382b0273…e0b4c695
LT:
62584751000007
Value:
0.296293187 TON
Bounce:
true
Bounced:
false
Total Fees:
0.008324529 TON
OpCode:
Stonfi Swap V2 · 0x6664de2a

в нашем случае (неверном):
proxyTon (B) -> EQBTYCx7TGgVgaIr3tuJ3r_91E6FUBBWLtT73lTYYmrIc5gb
роутер (C) -> EQBQ_UBQvR9ryUjKDwijtoiyyga2Wl-yJm6Y8gl0k-HDh_5x
у нас был неправильный в (D) -> EQCKwzXtkJ-UbcQqzN-VkUAqTf5tuYwr5XWN83X0g__JrDr6

в правильном случае
proxyTon (B) -> EQCSIMGBps_qzRG3uPYhON8bucyCtu0mYdL1-u4gSz77IBa3
роутер (C) -> EQCS4UEa5UaJLzOyyKieqQOQ2P9M-7kXpkO5HnP3Bv250cN3
пул usdt (D) -> EQCGScrZe1xbyWqWDvdI6mzP-GAcAWFv6ZXuaJOuSqemxku4