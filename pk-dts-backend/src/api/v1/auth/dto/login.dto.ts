import { ApiProperty } from '@nestjs/swagger';
import { Matches, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._@+-]{0,149}$/)
  username: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(1)
  password: string;
}
