import { PartialType } from '@nestjs/swagger';
import { CreateAssetNumberDto } from './create-asset-number.dto';

export class UpdateAssetNumberDto extends PartialType(CreateAssetNumberDto) {}
