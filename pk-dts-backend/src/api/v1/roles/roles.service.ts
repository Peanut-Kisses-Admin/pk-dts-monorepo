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
        users: true,
        role_permissions: { include: { permission: true } },
      },
    });
  }

  create(dto: CreateRoleDto) {
    return this.prisma.role.create({ data: dto });
  }

  update(id: string, dto: UpdateRoleDto) {
    return this.prisma.role.update({
      where: { role_id: toBigIntId(id, 'role_id') },
      data: dto,
    });
  }

  async remove(id: string) {
    const roleId = toBigIntId(id, 'role_id');
    const role = await this.prisma.role.findUnique({
      where: { role_id: roleId },
      select: {
        role_id: true,
        role_name: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    if (role._count.users > 0) {
      throw new BadRequestException(
        'Role cannot be deleted while users are assigned to it.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { role_id: roleId },
      });

      return tx.role.delete({
        where: { role_id: roleId },
      });
    });
  }
}
