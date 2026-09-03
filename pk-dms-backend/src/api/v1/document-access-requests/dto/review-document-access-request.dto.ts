import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentAccessRequestStatus } from "@prisma/client";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewDocumentAccessRequestDto {
  @ApiProperty({ enum: ["APPROVED", "REJECTED", "RETURNED"] })
  @IsIn([
    DocumentAccessRequestStatus.APPROVED,
    DocumentAccessRequestStatus.REJECTED,
    DocumentAccessRequestStatus.RETURNED,
  ])
  status: DocumentAccessRequestStatus;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewer_remarks?: string;
}
