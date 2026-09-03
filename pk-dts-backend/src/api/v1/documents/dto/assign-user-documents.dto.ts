import { ApiProperty } from "@nestjs/swagger";
import { ArrayUnique, IsArray, IsString } from "class-validator";

export class AssignUserDocumentsDto {
  @ApiProperty({ type: [String], example: ["12", "18"] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  document_ids: string[];
}
