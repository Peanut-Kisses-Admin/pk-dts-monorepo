import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { toBigIntId } from '../../../common/utils/prisma-id.util';
import {
  getPagination,
  paginatedResponse,
} from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateAssetNumberDto } from './dto/create-asset-number.dto';
import { UpdateAssetNumberDto } from './dto/update-asset-number.dto';

@Injectable()
export class AssetNumbersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.assetNumber.findMany({
        skip,
        take,
        select: {
          asset_id: true,
          asset_number: true,
          created_at: true,
          specific_id: true,
          specific: { include: { area: true } },
          locations: { select: { location_id: true, location_name: true, location_code: true } },
          hardcopies: {
            select: {
              hardcopy_id: true,
              document_id: true,
              created_at: true,
              document: {
                select: {
                  document_id: true,
                  document_title: true,
                  document_type: true,
                  status: true,
                },
              },
              area: {
                select: {
                  area_id: true,
                  area_name: true,
                },
              },
              specific: {
                select: {
                  specific_id: true,
                  specific_name: true,
                  area_id: true,
                },
              },
              location: {
                select: {
                  location_id: true,
                  location_name: true,
                },
              },
              sequence: {
                select: {
                  sequence_id: true,
                  sequence_code: true,
                },
              },
            },
          },
        },
        orderBy: { asset_number: 'asc' },
      }),
      this.prisma.assetNumber.count(),
    ]);

    return paginatedResponse(items, total, page, limit);
  }

  findOne(id: string) {
    return this.prisma.assetNumber.findUnique({
      where: { asset_id: toBigIntId(id, 'asset_id') },
      include: {
        specific: { include: { area: true } },
        locations: true,
        hardcopies: {
          include: {
            document: true,
            area: true,
            specific: true,
            location: true,
            sequence: true,
          },
        },
      },
    });
  }

  create(dto: CreateAssetNumberDto) {
    return this.prisma.assetNumber.create({
      data: {
        asset_number: dto.asset_number,
        ...(dto.specific_id ? { specific_id: toBigIntId(dto.specific_id, 'specific_id') } : {}),
      },
    });
  }

  update(id: string, dto: UpdateAssetNumberDto) {
    const assetId = toBigIntId(id, 'asset_id');
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.assetNumber.update({
        where: { asset_id: assetId },
        data: {
          asset_number: dto.asset_number,
          ...(dto.specific_id !== undefined ? { specific_id: dto.specific_id ? toBigIntId(dto.specific_id, 'specific_id') : null } : {}),
        },
        include: { specific: true },
      });

      if (dto.specific_id !== undefined && asset.specific?.area_id) {
        await tx.location.updateMany({
          where: { asset_id: assetId },
          data: { specific_id: asset.specific_id },
        });
        await tx.hardcopyDocument.updateMany({
          where: { OR: [{ asset_id: assetId }, { location: { asset_id: assetId } }] },
          data: { asset_id: assetId, specific_id: asset.specific_id, area_id: asset.specific.area_id },
        });
      }

      return asset;
    });
  }

  remove(id: string) {
    return this.prisma.assetNumber.delete({
      where: { asset_id: toBigIntId(id, 'asset_id') },
    });
  }
}
