import { ApiProperty } from "@nestjs/swagger";
import { Matches, MaxLength } from "class-validator";

export class RegistrationUsernameDto {
  @ApiProperty() @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._@+-]{0,149}$/) @MaxLength(150) username: string;
}
