import { Module } from "@nestjs/common";
import { BurnService } from "./burn.service";
import { TonModule } from "../ton/ton.module";

@Module({
  imports: [TonModule],
  providers: [BurnService],
  exports: [BurnService],
})
export class BurnModule {}
