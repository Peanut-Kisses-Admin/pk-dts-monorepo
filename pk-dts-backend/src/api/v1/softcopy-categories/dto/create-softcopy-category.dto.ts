import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateSoftcopyCategoryDto {
  @ApiProperty({ example: "Policies" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  category_name: string;

  @ApiPropertyOptional({ example: "Approved policies and governance files." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: "1", description: "Main folder ID used when creating a subfolder." })
  @IsOptional()
  @IsString()
  parent_category_id?: string;
}
