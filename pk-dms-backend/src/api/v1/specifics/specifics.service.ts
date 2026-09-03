import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { toBigIntId } from '../../../common/utils/prisma-id.util';
import {
  getPagination,
  paginatedResponse,
} from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateSpecificDto } from './dto/create-specific.dto';
import { UpdateSpecificDto } from './dto/update-specific.dto';

@Injectable()
export class SpecificsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.specific.findMany({
        skip,
        take,
        include: { area: true },
        orderBy: { specific_name: 'asc' },
      }),
      this.prisma.specific.count(),
    ]);

    return paginatedResponse(items, total, page, limit);
  }

  findOne(id: string) {
    return this.prisma.specific.findUnique({
      where: { specific_id: toBigIntId(id, 'specific_id') },
      include: { area: true, hardcopies: true },
    });
  }

  create(dto: CreateSpecificDto) {
    const data: Prisma.SpecificUncheckedCreateInput = {
      specific_name: dto.specific_name,
      ...(dto.area_id ? { area_id: toBigIntId(dto.area_id, 'area_id') } : {}),
    };

    return this.prisma.specific.create({
      data,
    });
  }

  update(id: string, dto: UpdateSpecificDto) {
    const specificId = toBigIntId(id, 'specific_id');
    const data: Prisma.SpecificUncheckedUpdateInput = {
      specific_name: dto.specific_name,
      ...(dto.area_id !== undefined
        ? { area_id: dto.area_id ? toBigIntId(dto.area_id, 'area_id') : null }
        : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const specific = await tx.specific.update({
        where: { specific_id: specificId },
        data,
      });

      if (dto.area_id !== undefined && specific.area_id) {
        await tx.hardcopyDocument.updateMany({
          where: {
            OR: [
              { specific_id: specificId },
              { asset: { specific_id: specificId } },
              { location: { asset: { specific_id: specificId } } },
            ],
          },
          data: { specific_id: specificId, area_id: specific.area_id },
        });
      }

      return specific;
    });
  }

  remove(id: string) {
    return this.prisma.specific.delete({
      where: { specific_id: toBigIntId(id, 'specific_id') },
    });
  }
}
