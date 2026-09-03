import { Module } from "@nestjs/common";
import { HardcopyTransfersController } from "./hardcopy-transfers.controller";
import { HardcopyTransfersService } from "./hardcopy-transfers.service";

@Module({ controllers: [HardcopyTransfersController], providers: [HardcopyTransfersService] })
export class HardcopyTransfersModule {}
