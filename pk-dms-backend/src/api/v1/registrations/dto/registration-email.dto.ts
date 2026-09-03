import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, MaxLength } from "class-validator";

export class RegistrationEmailDto {
  @ApiProperty() @IsEmail() @MaxLength(150) email: string;
}
