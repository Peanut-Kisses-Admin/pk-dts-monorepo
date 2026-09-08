import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { toBigIntId } from '../../../common/utils/prisma-id.util';
import {
  getPagination,
  paginatedResponse,
} from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        skip,
        take,
        select: {
          role_id: true,
          role_name: true,
          description: true,
          role_permissions: {
            select: {
              role_permission_id: true,
              permission_id: true,
              permission: {
                select: {
                  permission_id: true,
                  permission_name: true,
                  description: true,
                },
              },
            },
          },
          _count: {
            select: {
              users: true,
            },
          },
        },
        orderBy: { role_name: 'asc' },
      }),
      this.prisma.role.count(),
    ]);

    return paginatedResponse(items, total, page, limit);
  }

  findOne(id: string) {
    return this.prisma.role.findUnique({
      where: { role_id: toBigIntId(id, 'role_id') },
      include: {
        users: { select: { user_id: true, firstname: true, lastname: true, username: true } },
        role_permissions: { include: { permission: true } },
      },
    });
  }

  create(_dto: CreateRoleDto) {
    throw new BadRequestException('The five system roles are fixed. Additional roles cannot be created.');
  }

  update(_id: string, _dto: UpdateRoleDto) {
    throw new BadRequestException('System roles cannot be renamed. Manage their permissions instead.');
  }

  async remove(_id: string) {
    throw new BadRequestException('System roles cannot be deleted.');
  }
}
