import { BadRequestException, Injectable } from "@nestjs/common";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { toBigIntId } from "../../../common/utils/prisma-id.util";
import {
  getPagination,
  paginatedResponse,
} from "../../../common/utils/pagination.util";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.permission.findMany({
        skip,
        take,
        orderBy: [{ module_label: "asc" }, { action_label: "asc" }],
      }),
      this.prisma.permission.count(),
    ]);

    return paginatedResponse(items, total, page, limit);
  }

  findOne(id: string) {
    return this.prisma.permission.findUnique({
      where: { permission_id: toBigIntId(id, "permission_id") },
      include: { role_permissions: { include: { role: true } } },
    });
  }

  create(dto: CreatePermissionDto) {
    void dto;
    throw new BadRequestException(
      "The permission catalog is system-managed and cannot be changed manually.",
    );
  }

  update(id: string, dto: UpdatePermissionDto) {
    void id;
    void dto;
    throw new BadRequestException(
      "The permission catalog is system-managed and cannot be changed manually.",
    );
  }

  remove(id: string) {
    void id;
    throw new BadRequestException(
      "The permission catalog is system-managed and cannot be changed manually.",
    );
  }
}
