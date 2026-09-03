import { PartialType } from '@nestjs/swagger';
import { CreateSpecificDto } from './create-specific.dto';

export class UpdateSpecificDto extends PartialType(CreateSpecificDto) {}
