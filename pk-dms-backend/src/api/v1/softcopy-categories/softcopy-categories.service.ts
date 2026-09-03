import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { getPagination, paginatedResponse } from "../../../common/utils/pagination.util";
import { toBigIntId } from "../../../common/utils/prisma-id.util";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { CreateSoftcopyCategoryDto } from "./dto/create-softcopy-category.dto";
import { UpdateSoftcopyCategoryDto } from "./dto/update-softcopy-category.dto";
import { AuthenticatedUser } from "../../../common/auth/authenticated-user.interface";

@Injectable()
export class SoftcopyCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto, user: AuthenticatedUser) {
    const { page, limit, skip } = getPagination(query);
    const categories = await this.prisma.softcopyCategory.findMany({
        orderBy: { category_name: "asc" },
        include: {
          parent: { select: { softcopy_category_id: true, category_name: true, folder_name: true } },
          _count: { select: { softcopies: true, subcategories: true } },
          softcopies: {
            select: {
              document: { select: { assignments: { select: { user_id: true } } } },
            },
          },
        },
      });
    const visible = this.visibleCategories(categories, user);
    const total = visible.length;
    const items = visible.slice(skip, skip + limit).map(({ softcopies, ...category }) => ({
      ...category,
      _count: {
        ...category._count,
        softcopies: this.isAdministrator(user)
          ? category._count.softcopies
          : softcopies.filter((softcopy) => softcopy.document.assignments.some(
              (assignment) => String(assignment.user_id) === String(user.user_id),
            )).length,
      },
    }));
    return paginatedResponse(items, total, page, limit);
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const category = await this.prisma.softcopyCategory.findUnique({
      where: { softcopy_category_id: toBigIntId(id, "softcopy_category_id") },
      include: {
        parent: true,
        subcategories: { orderBy: { category_name: "asc" } },
        softcopies: { include: { document: { include: { assignments: true } } } },
      },
    });
    if (!category) throw new NotFoundException("Softcopy folder was not found.");
    if (!this.canManageAll(user) && category.created_by_user_id !== toBigIntId(user.user_id, "current_user_id") && !category.softcopies.some((softcopy) =>
      softcopy.document.assignments.some((assignment) => String(assignment.user_id) === String(user.user_id)),
    )) throw new NotFoundException("Softcopy folder was not found.");
    return category;
  }

  private visibleCategories<T extends {
    softcopy_category_id: bigint;
    parent_category_id: bigint | null;
    created_by_user_id: bigint | null;
    softcopies: Array<{ document: { assignments: Array<{ user_id: bigint }> } }>;
  }>(categories: T[], user: AuthenticatedUser) {
    if (this.canManageAll(user)) return categories;
    const visibleIds = new Set<bigint>();
    const byId = new Map(categories.map((category) => [category.softcopy_category_id, category]));
    for (const category of categories) {
      const hasAssignedDocument = category.created_by_user_id === toBigIntId(user.user_id, "current_user_id") || category.softcopies.some((softcopy) =>
        softcopy.document.assignments.some((assignment) => String(assignment.user_id) === String(user.user_id)),
      );
      if (!hasAssignedDocument) continue;
      let current: T | undefined = category;
      while (current && !visibleIds.has(current.softcopy_category_id)) {
        visibleIds.add(current.softcopy_category_id);
        current = current.parent_category_id ? byId.get(current.parent_category_id) : undefined;
      }
    }
    return categories.filter((category) => visibleIds.has(category.softcopy_category_id));
  }

  private isAdministrator(user: AuthenticatedUser) {
    const role = user.role.role_name.trim().toLowerCase();
    return ["admin", "administrator", "super admin", "superadmin", "super-admin"].includes(role);
  }

  private canManageAll(user: AuthenticatedUser) {
    return this.isAdministrator(user) || user.role.permissions.includes("softcopy-folders.manage");
  }

  async create(dto: CreateSoftcopyCategoryDto, user: AuthenticatedUser) {
    const categoryName = dto.category_name.trim();
    if (!categoryName) throw new BadRequestException("Folder name is required.");
    const parent = dto.parent_category_id
      ? await this.prisma.softcopyCategory.findUnique({ where: { softcopy_category_id: toBigIntId(dto.parent_category_id, "parent_category_id") } })
      : null;
    if (dto.parent_category_id && !parent) throw new NotFoundException("Main softcopy folder was not found.");
    const folderName = await this.uniqueFolderName(
      parent ? `${parent.folder_name}/${this.slugify(categoryName)}` : this.slugify(categoryName),
    );
    try {
      return await this.prisma.softcopyCategory.create({
        data: {
          category_name: categoryName,
          folder_name: folderName,
          description: dto.description?.trim() || null,
          parent_category_id: parent?.softcopy_category_id ?? null,
          created_by_user_id: toBigIntId(user.user_id, "current_user_id"),
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        throw new ConflictException("A softcopy folder with that name already exists.");
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateSoftcopyCategoryDto, user: AuthenticatedUser) {
    const categoryId = toBigIntId(id, "softcopy_category_id");
    const categories = await this.prisma.softcopyCategory.findMany();
    const existing = categories.find((category) => category.softcopy_category_id === categoryId);
    if (!existing) throw new NotFoundException("Softcopy folder was not found.");
    if (!this.isAdministrator(user) && existing.created_by_user_id !== toBigIntId(user.user_id, "current_user_id"))
      throw new NotFoundException("Softcopy folder was not found.");
    const parentId = dto.parent_category_id === undefined
      ? undefined
      : dto.parent_category_id
        ? toBigIntId(dto.parent_category_id, "parent_category_id")
        : null;
    if (parentId === categoryId) throw new BadRequestException("A folder cannot be its own parent.");
    const nextParent = typeof parentId === "bigint"
      ? categories.find((category) => category.softcopy_category_id === parentId)
      : parentId === null
        ? null
        : categories.find((category) => category.softcopy_category_id === existing.parent_category_id) ?? null;
    if (typeof parentId === "bigint" && !nextParent) throw new NotFoundException("Parent softcopy folder was not found.");

    const subtreeIds = new Set<bigint>([categoryId]);
    let added = true;
    while (added) {
      added = false;
      for (const category of categories) {
        if (category.parent_category_id && subtreeIds.has(category.parent_category_id) && !subtreeIds.has(category.softcopy_category_id)) {
          subtreeIds.add(category.softcopy_category_id);
          added = true;
        }
      }
    }
    if (nextParent && subtreeIds.has(nextParent.softcopy_category_id)) {
      throw new BadRequestException("A folder cannot be moved inside itself or one of its subfolders.");
    }

    const categoryName = dto.category_name?.trim() || existing.category_name;
    const basePath = nextParent
      ? `${nextParent.folder_name}/${this.slugify(categoryName)}`
      : this.slugify(categoryName);
    const subtree = categories.filter((category) => subtreeIds.has(category.softcopy_category_id));
    const outsidePaths = new Set(categories.filter((category) => !subtreeIds.has(category.softcopy_category_id)).map((category) => category.folder_name));
    let nextRootPath = basePath;
    let suffix = 2;
    const hasPathConflict = (rootPath: string) => subtree.some((category) => outsidePaths.has(`${rootPath}${category.folder_name.slice(existing.folder_name.length)}`));
    while (hasPathConflict(nextRootPath)) nextRootPath = `${basePath}-${suffix++}`;
    try {
      return await this.prisma.$transaction(async (tx) => {
        for (const category of subtree.filter((item) => item.softcopy_category_id !== categoryId)) {
          await tx.softcopyCategory.update({
            where: { softcopy_category_id: category.softcopy_category_id },
            data: { folder_name: `${nextRootPath}${category.folder_name.slice(existing.folder_name.length)}` },
          });
        }
        return tx.softcopyCategory.update({
          where: { softcopy_category_id: categoryId },
          data: {
            ...(dto.category_name !== undefined ? { category_name: categoryName } : {}),
            ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
            ...(parentId !== undefined ? { parent_category_id: parentId } : {}),
            folder_name: nextRootPath,
          },
        });
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        throw new ConflictException("A softcopy folder with that name already exists.");
      }
      throw error;
    }
  }

  async delete(id: string, user: AuthenticatedUser) {
    const categoryId = toBigIntId(id, "softcopy_category_id");
    const category = await this.prisma.softcopyCategory.findUnique({
      where: { softcopy_category_id: categoryId },
      include: { _count: { select: { softcopies: true, subcategories: true } } },
    });
    if (!category) throw new NotFoundException("Softcopy folder was not found.");
    if (!this.canManageAll(user) && category.created_by_user_id !== toBigIntId(user.user_id, "current_user_id")) {
      throw new NotFoundException("Softcopy folder was not found.");
    }
    if (category.folder_name === "uncategorized") {
      throw new ConflictException("The default Uncategorized category cannot be deleted.");
    }
    if (category._count.softcopies > 0) {
      throw new ConflictException("Move the category's softcopy documents before deleting it.");
    }
    if (category._count.subcategories > 0) {
      throw new ConflictException("Move or delete this folder's subfolders first.");
    }
    return this.prisma.softcopyCategory.delete({ where: { softcopy_category_id: categoryId } });
  }

  private slugify(value: string) {
    return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120) || "category";
  }

  private async uniqueFolderName(base: string) {
    let candidate = base;
    let suffix = 2;
    while (await this.prisma.softcopyCategory.findUnique({ where: { folder_name: candidate } })) {
      candidate = `${base}-${suffix++}`;
    }
    return candidate;
  }
}
