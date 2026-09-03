import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentType } from "@prisma/client";
import { IsEnum, IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateWorkflowDefinitionDto {
  @ApiProperty({ example: "standard-softcopy" })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  workflow_key: string;

  @ApiProperty({ example: "Standard Softcopy Approval" })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  document_type?: DocumentType;

  @ApiProperty()
  @IsObject()
  graph: Record<string, unknown>;
}
