import { ApiProperty } from "@nestjs/swagger";
import { IsObject } from "class-validator";

export class UpdateWorkflowVersionDto {
  @ApiProperty()
  @IsObject()
  graph: Record<string, unknown>;
}
