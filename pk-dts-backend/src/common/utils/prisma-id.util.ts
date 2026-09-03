import { BadRequestException } from '@nestjs/common';

export function toBigIntId(value: string, field = 'id'): bigint {
  try {
    return BigInt(value);
  } catch {
    throw new BadRequestException(`${field} must be a valid integer string`);
  }
}
