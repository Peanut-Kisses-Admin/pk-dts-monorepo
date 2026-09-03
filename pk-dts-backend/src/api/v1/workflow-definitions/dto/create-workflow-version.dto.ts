import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsOptional } from "class-validator";

export class CreateWorkflowVersionDto {
  @ApiPropertyOptional({ description: "Omit to copy the latest version into a new draft." })
  @IsOptional()
  @IsObject()
  graph?: Record<string, unknown>;
}
