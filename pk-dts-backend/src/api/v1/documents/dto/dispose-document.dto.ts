import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisposalAction } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class DisposeDocumentDto {
  @ApiPropertyOptional({ enum: DisposalAction, example: DisposalAction.Shred, default: DisposalAction.Other })
  @IsOptional()
  @IsEnum(DisposalAction)
  disposal_action?: DisposalAction;

  @ApiPropertyOptional({ example: 'Recycled through the approved vendor.' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  disposal_action_other?: string;

  @ApiProperty({
    example: 'Archived after disposal approval.',
    description: 'Reason or remarks for disposing the document.',
  })
  @IsString()
  @IsNotEmpty()
  disposal_remarks: string;

  @ApiProperty({
    example: '1',
    description: 'Disposal user ID. Administrators may select another user; other roles are forced to the authenticated account.',
  })
  @IsString()
  @IsNotEmpty()
  disposed_by_user_id: string;

  @ApiPropertyOptional({
    example: 'Juan Dela Cruz',
    description: 'Optional manual responsible-person name for disposal records.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  disposed_by_name?: string;
}
