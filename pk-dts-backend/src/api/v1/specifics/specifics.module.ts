import { Module } from '@nestjs/common';
import { SpecificsController } from './specifics.controller';
import { SpecificsService } from './specifics.service';

@Module({
  controllers: [SpecificsController],
  providers: [SpecificsService],
})
export class SpecificsModule {}
