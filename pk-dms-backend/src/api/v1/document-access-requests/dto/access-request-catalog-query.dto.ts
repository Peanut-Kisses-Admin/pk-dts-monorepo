import { ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationQueryDto } from "../../../../common/dto/pagination-query.dto";

export class AccessRequestCatalogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  query?: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @ApiPropertyOptional({ description: "Filter hardcopy documents by location ID." })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  location_id?: string;
}
