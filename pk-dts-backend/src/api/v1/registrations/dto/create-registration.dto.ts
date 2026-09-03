import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateRegistrationDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) firstname: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) lastname: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) middlename?: string;
  @ApiProperty() @IsEmail() @MaxLength(150) email: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) phone_number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) position_title?: string;
  @ApiPropertyOptional({ description: "Optional message for the account manager." })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  applicant_remarks?: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) @MaxLength(72) password: string;
  @ApiProperty() @IsString() @IsNotEmpty() requested_role_id: string;
}
