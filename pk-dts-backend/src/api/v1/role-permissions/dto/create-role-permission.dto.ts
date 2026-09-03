import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateRolePermissionDto {
  @ApiProperty({ example: '1', description: 'Role ID as a string.' })
  @IsString()
  role_id: string;

  @ApiProperty({ example: '1', description: 'Permission ID as a string.' })
  @IsString()
  permission_id: string;
}
