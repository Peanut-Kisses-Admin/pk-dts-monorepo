import { ApiProperty } from "@nestjs/swagger";
import { ArrayUnique, IsArray, IsString } from "class-validator";

export class AssignDocumentUsersDto {
  @ApiProperty({ type: [String], example: ["2", "7"] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  user_ids: string[];
}
