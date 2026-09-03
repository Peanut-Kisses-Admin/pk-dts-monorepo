import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RegistrationStatus } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";

export class ReviewRegistrationDto {
  @ApiProperty({ enum: [RegistrationStatus.APPROVED, RegistrationStatus.REJECTED] })
  @IsEnum(RegistrationStatus)
  status: RegistrationStatus;

  @ApiPropertyOptional({ description: "Required when approving." })
  @ValidateIf((dto: ReviewRegistrationDto) => dto.status === RegistrationStatus.APPROVED)
  @IsString()
  @IsNotEmpty()
  assigned_role_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  review_remarks?: string;
}
