import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentActionRequested, DocumentBusinessType, DocumentChangeReason, DocumentType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateDocumentDto {
  @ApiPropertyOptional({ example: 'Quality Assurance' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  department?: string;
  @ApiPropertyOptional({
    example: '1',
    description: 'Asset number ID for hardcopy documents.',
  })
  @IsOptional()
  @IsString()
  asset_id?: string;

  @ApiPropertyOptional({ example: 'DOC-2026-001', description: 'Softcopy only. Hardcopy records use the document title and storage classification instead.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  document_number?: string;

  @ApiProperty({ example: 'Quality Manual' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  document_title: string;

  @ApiProperty({ enum: DocumentType, example: DocumentType.HARDCOPY })
  @IsEnum(DocumentType)
  document_type: DocumentType;

  @ApiPropertyOptional({ enum: DocumentBusinessType })
  @IsOptional()
  @IsEnum(DocumentBusinessType)
  business_document_type?: DocumentBusinessType;

  @ApiPropertyOptional({ enum: DocumentActionRequested, default: DocumentActionRequested.CREATE_REVISE })
  @IsOptional()
  @IsEnum(DocumentActionRequested)
  action_requested?: DocumentActionRequested;

  @ApiPropertyOptional({ example: 'Document owner' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  from_party?: string;

  @ApiPropertyOptional({ example: 'Document Control' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  to_party?: string;

  @ApiPropertyOptional({ enum: DocumentChangeReason })
  @IsOptional()
  @IsEnum(DocumentChangeReason)
  reason_for_change?: DocumentChangeReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brief_description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proposed_change?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  revision_level_from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  revision_level_to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  previous_effective_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  new_effective_date?: string;

  @ApiPropertyOptional({
    example: '1',
    description: 'Softcopy folder or subfolder ID for softcopy documents.',
  })
  @IsOptional()
  @IsString()
  softcopy_category_id?: string;

  @ApiPropertyOptional({
    example: '005',
    description: 'Optional revision number for the uploaded initial softcopy file.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  initial_revision_number?: string;

  @ApiPropertyOptional({ example: 'SERIES-2026-01' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  series_number?: string;

  @ApiPropertyOptional({ example: '1-5' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  page_number?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'SUBMIT'], default: 'DRAFT' })
  @IsOptional()
  @IsEnum({ DRAFT: 'DRAFT', SUBMIT: 'SUBMIT' })
  action?: 'DRAFT' | 'SUBMIT';

  @ApiPropertyOptional({ example: '1', description: 'Area ID as a string.' })
  @IsOptional()
  @IsString()
  area_id?: string;

  @ApiPropertyOptional({
    example: '1',
    description: 'Specific ID as a string.',
  })
  @IsOptional()
  @IsString()
  specific_id?: string;

  @ApiPropertyOptional({
    example: '1',
    description: 'Location ID as a string.',
  })
  @IsOptional()
  @IsString()
  location_id?: string;

  @ApiPropertyOptional({
    example: '1',
    description: 'Sequence ID as a string.',
  })
  @IsOptional()
  @IsString()
  sequence_id?: string;

  @ApiPropertyOptional({ enum: ['CURRENT_USER', 'MANUAL_NAME'], default: 'CURRENT_USER' })
  @IsOptional()
  @IsEnum({ CURRENT_USER: 'CURRENT_USER', MANUAL_NAME: 'MANUAL_NAME' })
  requester_type?: 'CURRENT_USER' | 'MANUAL_NAME';

  @ApiPropertyOptional({
    example: 'Quality Assurance Team',
    description: 'Optional manual requestor name override.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  requested_by_name?: string;

  @ApiPropertyOptional({ description: 'JSON array of user IDs selected by an administrator.' })
  @IsOptional()
  @IsString()
  assigned_user_ids?: string;

  @ApiPropertyOptional({ description: 'Versioned JSON workflow plan containing an ordered list of approval stages and optional named assignees.' })
  @IsOptional()
  @IsString()
  workflow_plan?: string;

  @ApiPropertyOptional({ example: 'Standard Softcopy Approval' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  workflow_name?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  workflow_version?: string;

  @ApiPropertyOptional({ description: 'Published workflow version ID. The server snapshots this immutable version onto the request.' })
  @IsOptional()
  @IsString()
  workflow_version_id?: string;

  @ApiPropertyOptional({ description: 'Create a Softcopy directly without a DCR. Requires documents.create-direct.' })
  @IsOptional()
  @IsString()
  direct_create?: string | boolean;

  @ApiPropertyOptional({ description: 'Required reason for a direct Softcopy creation.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  direct_creation_reason?: string;

  @ApiPropertyOptional({ description: 'Whether this hardcopy has a defined retention period. Defaults to no retention.' })
  @IsOptional()
  @IsString()
  retention_enabled?: string | boolean;

  @ApiPropertyOptional({ example: '2026-08-29', description: 'Start date of the hardcopy retention period.' })
  @IsOptional()
  @IsDateString()
  retention_start_date?: string;

  @ApiPropertyOptional({ example: '2031-08-29', description: 'End date of the hardcopy retention period.' })
  @IsOptional()
  @IsDateString()
  retention_end_date?: string;

}
