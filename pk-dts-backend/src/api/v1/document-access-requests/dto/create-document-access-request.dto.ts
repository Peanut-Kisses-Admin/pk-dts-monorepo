import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateDocumentAccessRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  document_id: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  request_reason?: string;
}
