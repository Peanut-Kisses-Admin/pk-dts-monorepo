import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSpecificDto {
  @ApiProperty({ example: 'Controlled Documents' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  specific_name: string;

  @ApiProperty({ example: '1', description: 'Optional area ID as a string.' })
  @IsOptional()
  @IsString()
  area_id?: string;
}
