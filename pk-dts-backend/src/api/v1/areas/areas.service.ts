import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { toBigIntId } from '../../../common/utils/prisma-id.util';
import {
  getPagination,
  paginatedResponse,
} from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.area.findMany({
        skip,
        take,
        select: {
          area_id: true,
          area_name: true,
          specifics: {
            select: {
              specific_id: true,
              specific_name: true,
              area_id: true,
            },
          },
        },
        orderBy: { area_name: 'asc' },
      }),
      this.prisma.area.count(),
    ]);

    return paginatedResponse(items, total, page, limit);
  }

  findOne(id: string) {
    return this.prisma.area.findUnique({
      where: { area_id: toBigIntId(id, 'area_id') },
      include: { specifics: true, hardcopies: true },
    });
  }

  create(dto: CreateAreaDto) {
    return this.prisma.area.create({ data: dto });
  }

  update(id: string, dto: UpdateAreaDto) {
    return this.prisma.area.update({
      where: { area_id: toBigIntId(id, 'area_id') },
      data: dto,
    });
  }

  remove(id: string) {
    return this.prisma.area.delete({
      where: { area_id: toBigIntId(id, 'area_id') },
    });
  }
}
