import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BatchHardcopyImportRowDto {
  @ApiProperty({ example: 'master list' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sheet_name: string;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  row_number: number;

  @ApiProperty({ example: '01' })
  @IsString()
  sequence: string;

  @ApiProperty({ example: 'EXTERNAL MEMO' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  document_name: string;

  @ApiProperty({ example: 'A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  location_name: string;

  @ApiProperty({ example: 'PK-PNK-00106945' })
  @IsString()
  asset_number: string;

  @ApiProperty({ example: 'ADMIN OFFICE' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  area_name: string;

  @ApiProperty({ example: "PM'S MOBILE CABINET 01" })
  @IsString()
  specific_name: string;
}

export class BatchHardcopyImportDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @IsNotEmpty()
  created_by: string;

  @ApiProperty({ type: [BatchHardcopyImportRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchHardcopyImportRowDto)
  rows: BatchHardcopyImportRowDto[];
}
