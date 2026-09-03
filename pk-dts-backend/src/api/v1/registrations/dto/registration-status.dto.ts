import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class RegistrationStatusDto {
  @ApiProperty() @IsEmail() @MaxLength(150) email: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(40) reference_code: string;
}
