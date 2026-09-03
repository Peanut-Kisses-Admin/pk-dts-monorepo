import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class BatchHardcopyUploadDto {
  @ApiProperty({ example: "1" })
  @IsString()
  @IsNotEmpty()
  created_by: string;
}
