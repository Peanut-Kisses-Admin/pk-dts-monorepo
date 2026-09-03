import { SetMetadata } from '@nestjs/common';

export const ALLOW_SELF_KEY = 'allowSelf';
export const AllowSelf = () => SetMetadata(ALLOW_SELF_KEY, true);
