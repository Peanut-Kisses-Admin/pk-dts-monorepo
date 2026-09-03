import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Admin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  role_name: string;

  @ApiPropertyOptional({ example: 'Full access to the system.' })
  @IsOptional()
  @IsString()
  description?: string;
}
