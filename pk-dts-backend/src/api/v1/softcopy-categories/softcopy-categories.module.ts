import { Module } from "@nestjs/common";
import { SoftcopyCategoriesController } from "./softcopy-categories.controller";
import { SoftcopyCategoriesService } from "./softcopy-categories.service";

@Module({
  controllers: [SoftcopyCategoriesController],
  providers: [SoftcopyCategoriesService],
})
export class SoftcopyCategoriesModule {}
