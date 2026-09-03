import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class WorkflowActionDto {
  @ApiPropertyOptional({ description: "Reviewer or workflow remarks." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}
