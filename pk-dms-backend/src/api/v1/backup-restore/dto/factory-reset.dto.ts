import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

export enum FactoryResetScope {
  ALL = "ALL",
  SOFTCOPY = "SOFTCOPY",
  HARDCOPY = "HARDCOPY",
}

export class FactoryResetDto {
  @ApiProperty({
    enum: FactoryResetScope,
    default: FactoryResetScope.ALL,
    description:
      "Reset the full system, or remove only all softcopy or all hardcopy documents.",
  })
  @IsEnum(FactoryResetScope)
  scope: FactoryResetScope = FactoryResetScope.ALL;
}
