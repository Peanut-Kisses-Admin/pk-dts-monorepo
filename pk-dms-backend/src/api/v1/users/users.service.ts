import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RegistrationStatus, User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { toBigIntId } from "../../../common/utils/prisma-id.util";
import {
  getPagination,
  paginatedResponse,
} from "../../../common/utils/pagination.util";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { isAdministrativeRole } from "../../../common/auth/administrative-role.util";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take,
        select: {
          user_id: true,
          firstname: true,
          lastname: true,
          middlename: true,
          age: true,
          address: true,
          phone_number: true,
          email: true,
          position_title: true,
          leader_id: true,
          leader: { select: { user_id: true, firstname: true, lastname: true } },
          created_at: true,
          updated_at: true,
          role: {
            select: {
              role_id: true,
              role_name: true,
              description: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      }),
      this.prisma.user.count(),
    ]);

    return paginatedResponse(users, total, page, limit);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: toBigIntId(id, "user_id") },
      include: {
        role: true,
        created_documents: true,
          uploaded_revisions: true,
        leader: { select: { user_id: true, firstname: true, lastname: true } },
      },
    });

    if (!user) return null;

    const registration = await this.prisma.accountRegistrationRequest.findFirst({
      where: {
        email: user.email,
        status: RegistrationStatus.APPROVED,
      },
      select: { applicant_remarks: true },
      orderBy: { reviewed_at: "desc" },
    });

    return {
      ...this.withoutPassword(user),
      applicant_remarks: registration?.applicant_remarks ?? null,
    };
  }

  async create(dto: CreateUserDto) {
    try {
      const user = await this.prisma.user.create({
        data: {
          firstname: dto.firstname,
          lastname: dto.lastname,
          middlename: dto.middlename,
          age: dto.age,
          address: dto.address,
          phone_number: dto.phone_number,
          email: dto.email.trim().toLowerCase(),
          position_title: dto.position_title,
          password: await bcrypt.hash(dto.password, 10),
          role_id: toBigIntId(dto.role_id, "role_id"),
          leader_id: dto.leader_id ? toBigIntId(dto.leader_id, "leader_id") : undefined,
        },
        include: { role: true },
      });

      return this.withoutPassword(user);
    } catch (error) {
      this.handleUserWriteError(error);
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    try {
      const user = await this.prisma.user.update({
        where: { user_id: toBigIntId(id, "user_id") },
        data: {
          firstname: dto.firstname,
          lastname: dto.lastname,
          middlename: dto.middlename,
          age: dto.age,
          address: dto.address,
          phone_number: dto.phone_number,
          email: dto.email?.trim().toLowerCase(),
          position_title: dto.position_title,
          password: dto.password
            ? await bcrypt.hash(dto.password, 10)
            : undefined,
          role_id: dto.role_id ? toBigIntId(dto.role_id, "role_id") : undefined,
          leader_id: dto.leader_id !== undefined
            ? dto.leader_id
              ? toBigIntId(dto.leader_id, "leader_id")
              : null
            : undefined,
        },
        include: { role: true },
      });

      return this.withoutPassword(user);
    } catch (error) {
      this.handleUserWriteError(error);
    }
  }

  async remove(id: string) {
    const userId = toBigIntId(id, "user_id");
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        role: true,
        _count: {
          select: {
            created_documents: true,
            uploaded_revisions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    if (
      user._count.created_documents > 0 ||
      user._count.uploaded_revisions > 0
    ) {
      throw new BadRequestException(
        "User cannot be deleted because they are linked to document history.",
      );
    }

    if (isAdministrativeRole(user.role.role_name)) {
      const roles = await this.prisma.role.findMany({
        select: { role_id: true, role_name: true },
      });
      const administrativeRoleIds = roles
        .filter((role) => isAdministrativeRole(role.role_name))
        .map((role) => role.role_id);
      const administratorCount = await this.prisma.user.count({
        where: {
          role_id: { in: administrativeRoleIds },
        },
      });

      if (administratorCount <= 1) {
        throw new BadRequestException(
          "The last administrator cannot be deleted.",
        );
      }
    }

    const deletedUser = await this.prisma.user.delete({
      where: { user_id: userId },
    });

    return this.withoutPassword(deletedUser);
  }

  private withoutPassword<T extends User>(user: T): Omit<T, "password"> {
    const { password, ...safeUser } = user;
    void password;
    return safeUser;
  }

  private handleUserWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("A user with this email already exists.");
    }

    throw error;
  }
}
