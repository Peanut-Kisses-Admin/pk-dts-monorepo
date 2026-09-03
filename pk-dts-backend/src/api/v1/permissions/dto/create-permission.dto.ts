import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'documents.create' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  permission_name: string;

  @ApiPropertyOptional({ example: 'Can create documents.' })
  @IsOptional()
  @IsString()
  description?: string;
}
