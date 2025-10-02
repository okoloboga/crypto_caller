import { Module } from "@nestjs/common";
import { SwapService } from "./swap.service";
import { TonModule } from "../ton/ton.module";

@Module({
  imports: [TonModule],
  providers: [SwapService],
  exports: [SwapService],
})
export class SwapModule {}
