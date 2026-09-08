import { ApiProperty } from "@nestjs/swagger";
import { Matches, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class RegistrationStatusDto {
  @ApiProperty() @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._@+-]{0,149}$/) @MaxLength(150) username: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(40) reference_code: string;
}
