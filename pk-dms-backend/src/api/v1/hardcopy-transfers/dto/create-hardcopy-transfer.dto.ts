import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateHardcopyTransferDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  document_id: string;

  @ApiPropertyOptional({ description: "Destination Area ID. Derived from the selected storage location." })
  @IsOptional()
  @IsString()
  destination_area_id?: string;

  @ApiPropertyOptional({ description: "Destination Specific/classification ID." })
  @IsOptional()
  @IsString()
  destination_specific_id?: string;

  @ApiPropertyOptional({ description: "Destination Asset Number ID." })
  @IsOptional()
  @IsString()
  destination_asset_id?: string;

  @ApiProperty({ description: "Destination storage Location ID." })
  @IsString()
  @IsNotEmpty()
  destination_location_id: string;

  @ApiPropertyOptional({ description: "Destination document Sequence ID." })
  @IsOptional()
  @IsString()
  destination_sequence_id?: string;

  @ApiPropertyOptional({ description: "Legacy field retained for older integrations; storage transfers do not require a copy number." })
  @IsOptional()
  @IsString()
  document_copy_number?: string;

  @ApiPropertyOptional({ description: "Current holder user ID. Used only by administrators when the document has no assigned holder." })
  @IsOptional()
  @IsString()
  current_holder_user_id?: string;

  @ApiPropertyOptional({ description: "Legacy field retained for older integrations; the destination is a storage classification." })
  @IsOptional()
  @IsString()
  transfer_to?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;
}
