import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { RegistrationStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { toBigIntId } from "../../../common/utils/prisma-id.util";
import {
  getPagination,
  paginatedResponse,
} from "../../../common/utils/pagination.util";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { CreateRegistrationDto } from "./dto/create-registration.dto";
import { RegistrationEmailDto } from "./dto/registration-email.dto";
import { RegistrationStatusDto } from "./dto/registration-status.dto";
import { ReviewRegistrationDto } from "./dto/review-registration.dto";
import { isAdministrativeRole } from "../../../common/auth/administrative-role.util";

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async publicRoles() {
    const roles = await this.prisma.role.findMany({
      select: { role_id: true, role_name: true, description: true },
      orderBy: { role_name: "asc" },
    });

    return roles.filter((role) => !isAdministrativeRole(role.role_name));
  }

  async create(dto: CreateRegistrationDto) {
    const email = dto.email.trim().toLowerCase();
    const [existingUser, existingRequest, requestedRole] = await Promise.all([
      this.prisma.user.findUnique({
        where: { email },
        select: { user_id: true },
      }),
      this.prisma.accountRegistrationRequest.findFirst({
        where: { email, status: RegistrationStatus.PENDING },
        select: { registration_id: true },
      }),
      this.prisma.role.findUnique({
        where: {
          role_id: toBigIntId(dto.requested_role_id, "requested_role_id"),
        },
        select: { role_id: true, role_name: true },
      }),
    ]);

    if (existingUser)
      throw new ConflictException("An account with this email already exists.");
    if (existingRequest)
      throw new ConflictException(
        "A pending registration already exists for this email.",
      );
    if (!requestedRole || isAdministrativeRole(requestedRole.role_name)) {
      throw new BadRequestException(
        "The requested role is not available for public registration.",
      );
    }

    const referenceCode = `REG-${randomBytes(8).toString("hex").toUpperCase()}`;
    const registration = await this.prisma.accountRegistrationRequest.create({
      data: {
        reference_code: referenceCode,
        firstname: dto.firstname.trim(),
        lastname: dto.lastname.trim(),
        middlename: dto.middlename?.trim() || null,
        email,
        phone_number: dto.phone_number?.trim() || null,
        position_title: dto.position_title?.trim() || null,
        applicant_remarks: dto.applicant_remarks?.trim() || null,
        password_hash: await bcrypt.hash(dto.password, 10),
        requested_role_id: requestedRole.role_id,
      },
      select: {
        reference_code: true,
        status: true,
        created_at: true,
        requested_role: { select: { role_name: true } },
      },
    });

    return {
      ...registration,
      message:
        "Registration submitted. Save the reference code to check the approval status.",
    };
  }

  async status(dto: RegistrationStatusDto) {
    const registration = await this.prisma.accountRegistrationRequest.findFirst(
      {
        where: {
          email: dto.email.trim().toLowerCase(),
          reference_code: dto.reference_code.trim().toUpperCase(),
        },
        select: {
          reference_code: true,
          firstname: true,
          lastname: true,
          status: true,
          review_remarks: true,
          created_at: true,
          reviewed_at: true,
          requested_role: { select: { role_name: true } },
          assigned_role: { select: { role_name: true } },
        },
      },
    );

    if (!registration)
      throw new NotFoundException(
        "No registration matches that email and reference code.",
      );
    return registration;
  }

  async findReference(dto: RegistrationEmailDto) {
    const registration = await this.prisma.accountRegistrationRequest.findFirst(
      {
        where: { email: dto.email.trim().toLowerCase() },
        select: { reference_code: true, status: true, created_at: true },
        orderBy: { created_at: "desc" },
      },
    );

    if (!registration)
      throw new NotFoundException(
        "No registration request was found for this email.",
      );
    return registration;
  }

  async findAll(query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where = { status: RegistrationStatus.PENDING };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.accountRegistrationRequest.findMany({
        where,
        skip,
        take,
        select: {
          registration_id: true,
          firstname: true,
          lastname: true,
          middlename: true,
          email: true,
          phone_number: true,
          position_title: true,
          applicant_remarks: true,
          status: true,
          created_at: true,
          requested_role: {
            select: { role_id: true, role_name: true, description: true },
          },
        },
        orderBy: { created_at: "asc" },
      }),
      this.prisma.accountRegistrationRequest.count({ where }),
    ]);
    return paginatedResponse(items, total, page, limit);
  }

  async review(id: string, dto: ReviewRegistrationDto, reviewerId: string) {
    if (
      dto.status !== RegistrationStatus.APPROVED &&
      dto.status !== RegistrationStatus.REJECTED
    ) {
      throw new BadRequestException(
        "Registration can only be approved or rejected.",
      );
    }

    const registrationId = toBigIntId(id, "registration_id");
    return this.prisma.$transaction(async (tx) => {
      const registration = await tx.accountRegistrationRequest.findUnique({
        where: { registration_id: registrationId },
      });
      if (!registration)
        throw new NotFoundException("Registration request not found.");
      if (registration.status !== RegistrationStatus.PENDING)
        throw new ConflictException(
          "This registration request was already reviewed.",
        );

      let assignedRoleId: bigint | null = null;
      if (dto.status === RegistrationStatus.APPROVED) {
        assignedRoleId = toBigIntId(
          dto.assigned_role_id ?? "",
          "assigned_role_id",
        );
        const [role, existingUser] = await Promise.all([
          tx.role.findUnique({
            where: { role_id: assignedRoleId },
            select: { role_id: true, role_name: true },
          }),
          tx.user.findUnique({
            where: { email: registration.email },
            select: { user_id: true },
          }),
        ]);
        if (!role)
          throw new BadRequestException("The assigned role no longer exists.");
        if (isAdministrativeRole(role.role_name)) {
          throw new BadRequestException(
            "Administrative roles cannot be assigned through account registration approval.",
          );
        }
        if (existingUser)
          throw new ConflictException(
            "An account with this email already exists.",
          );

        await tx.user.create({
          data: {
            firstname: registration.firstname,
            lastname: registration.lastname,
            middlename: registration.middlename,
            email: registration.email,
            phone_number: registration.phone_number,
            position_title: registration.position_title,
            password: registration.password_hash,
            role_id: assignedRoleId,
          },
        });
      }

      return tx.accountRegistrationRequest.update({
        where: { registration_id: registrationId },
        data: {
          status: dto.status,
          assigned_role_id: assignedRoleId,
          review_remarks: dto.review_remarks?.trim() || null,
          reviewed_by_user_id: toBigIntId(reviewerId, "reviewed_by_user_id"),
          reviewed_at: new Date(),
        },
        select: { registration_id: true, status: true, reviewed_at: true },
      });
    });
  }
}
