import { PartialType } from "@nestjs/swagger";
import { CreateSoftcopyCategoryDto } from "./create-softcopy-category.dto";

export class UpdateSoftcopyCategoryDto extends PartialType(CreateSoftcopyCategoryDto) {}
