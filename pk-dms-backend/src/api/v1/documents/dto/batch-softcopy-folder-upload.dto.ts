import { IsNotEmpty, IsString } from "class-validator";

export class BatchSoftcopyFolderUploadDto {
  @IsString()
  @IsNotEmpty()
  created_by: string;

  @IsString()
  @IsNotEmpty()
  relative_paths: string;
}
