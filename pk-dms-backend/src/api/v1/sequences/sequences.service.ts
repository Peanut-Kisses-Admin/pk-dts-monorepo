import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { toBigIntId } from '../../../common/utils/prisma-id.util';
import {
  getPagination,
  paginatedResponse,
} from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';

@Injectable()
export class SequencesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.sequence.findMany({
        skip,
        take,
        orderBy: { sequence_code: 'asc' },
      }),
      this.prisma.sequence.count(),
    ]);

    return paginatedResponse(items, total, page, limit);
  }

  findOne(id: string) {
    return this.prisma.sequence.findUnique({
      where: { sequence_id: toBigIntId(id, 'sequence_id') },
      include: { hardcopies: true },
    });
  }

  create(dto: CreateSequenceDto) {
    return this.prisma.sequence.create({ data: dto });
  }

  update(id: string, dto: UpdateSequenceDto) {
    return this.prisma.sequence.update({
      where: { sequence_id: toBigIntId(id, 'sequence_id') },
      data: dto,
    });
  }

  remove(id: string) {
    return this.prisma.sequence.delete({
      where: { sequence_id: toBigIntId(id, 'sequence_id') },
    });
  }
}
