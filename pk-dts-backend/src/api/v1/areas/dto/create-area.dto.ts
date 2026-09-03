import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAreaDto {
  @ApiProperty({ example: 'Quality Assurance' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  area_name: string;
}
