import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAssetNumberDto {
  @ApiProperty({ example: 'ASSET-2026-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  asset_number: string;

  @ApiProperty({ required: false, example: '1' })
  @IsOptional()
  @IsString()
  specific_id?: string;
}
