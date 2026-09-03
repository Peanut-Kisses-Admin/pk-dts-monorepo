import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class ConfigureDocumentApproversDto {
  @ApiPropertyOptional({ description: "Human-readable name for this request's workflow." })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  workflow_name?: string;

  @ApiPropertyOptional({ description: "Version of the workflow definition." })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  workflow_version?: number;

  @ApiPropertyOptional({ description: "JSON workflow plan with ordered approval stages and optional named assignees." })
  @IsOptional()
  @IsString()
  workflow_plan?: string;

  @ApiPropertyOptional({ description: "Leader/Noted By user ID." })
  @IsOptional()
  @IsString()
  noted_by_user_id?: string;

  @ApiPropertyOptional({ description: "Plant Manager user ID." })
  @IsOptional()
  @IsString()
  plant_manager_user_id?: string;

  @ApiPropertyOptional({ description: "Document Controller/Admin user ID." })
  @IsOptional()
  @IsString()
  document_controller_user_id?: string;

  @ApiPropertyOptional({ description: "Hardcopy approval user ID." })
  @IsOptional()
  @IsString()
  hardcopy_approver_user_id?: string;

  @ApiPropertyOptional({ description: "Document access approval user ID." })
  @IsOptional()
  @IsString()
  access_approver_user_id?: string;

  @ApiPropertyOptional({ description: "Document owner/approver user ID." })
  @IsOptional()
  @IsString()
  document_owner_user_id?: string;
}
