import { Module } from '@nestjs/common';
import { AssetNumbersController } from './asset-numbers.controller';
import { AssetNumbersService } from './asset-numbers.service';

@Module({
  controllers: [AssetNumbersController],
  providers: [AssetNumbersService],
})
export class AssetNumbersModule {}
