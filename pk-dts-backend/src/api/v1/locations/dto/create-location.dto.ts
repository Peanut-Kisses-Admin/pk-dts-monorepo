import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({ example: 'Main Office' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  location_name: string;

  @ApiProperty({ required: false, example: '1' })
  @IsOptional()
  @IsString()
  asset_id?: string;

  @ApiProperty({ required: false, example: '1', description: 'Required when no asset number is assigned.' })
  @IsOptional()
  @IsString()
  specific_id?: string;
}
