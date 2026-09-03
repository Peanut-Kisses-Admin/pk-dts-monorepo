import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class DocumentAssistantQueryDto {
  @ApiProperty({ example: "Find approved safety manuals" })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  query!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 20, default: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;

  @ApiPropertyOptional({ enum: ["online", "local"], default: "online" })
  @IsOptional()
  @IsIn(["online", "local"])
  mode?: "online" | "local";
}
