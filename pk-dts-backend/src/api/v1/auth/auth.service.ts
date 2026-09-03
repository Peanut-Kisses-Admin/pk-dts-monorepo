import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { SessionTokenService } from "../../../common/auth/session-token.service";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { AuthenticatedUser } from "../../../common/auth/authenticated-user.interface";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: SessionTokenService,
  ) {}

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        role: {
          include: {
            role_permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user) {
      await this.writeLoginAudit(normalizedEmail, false);
      throw new UnauthorizedException("Invalid email or password.");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      await this.writeLoginAudit(normalizedEmail, false, user);
      throw new UnauthorizedException("Invalid email or password.");
    }

    await this.writeLoginAudit(normalizedEmail, true, user);

    return {
      user: this.toAuthenticatedUser(user),
      token: this.tokenService.createToken(user.user_id),
    };
  }

  private async writeLoginAudit(email: string, success: boolean, user?: { user_id: bigint; firstname: string; lastname: string; role: { role_name: string } }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          user_id: user?.user_id,
          user_name: user ? `${user.firstname} ${user.lastname}`.trim() : "Unknown user",
          user_email: email.slice(0, 150),
          role_name: user?.role.role_name || "UNKNOWN",
          action: success ? "LOGIN" : "LOGIN_FAILED",
          module: "auth",
          description: success ? "signed in successfully" : "failed to sign in",
          method: "POST",
          path: "/api/v1/auth/login",
          entity_id: user?.user_id.toString() || null,
          metadata: { email },
          reason: success ? null : "Invalid email or password.",
        },
      });
    } catch { /* audit logging must not prevent authentication */ }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: BigInt(userId) },
      include: {
        role: {
          include: {
            role_permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        "The authenticated user no longer exists.",
      );
    }

    return this.toAuthenticatedUser(user);
  }

  private toAuthenticatedUser(user: {
    user_id: bigint;
    email: string;
    firstname: string;
    lastname: string;
    require_password_change: boolean;
    role: {
      role_id: bigint;
      role_name: string;
      role_permissions: Array<{
        permission: {
          permission_id: bigint;
          permission_name: string;
          module_key: string;
          module_label: string;
          action_key: string;
          action_label: string;
          description: string | null;
        };
      }>;
    };
  }): AuthenticatedUser & {
    role: AuthenticatedUser["role"] & {
      permission_details: Array<{
        permission_id: string;
        permission_name: string;
        module_key: string;
        module_label: string;
        action_key: string;
        action_label: string;
        description: string | null;
      }>;
    };
  } {
    const permissionDetails = user.role.role_permissions.map(
      (rolePermission) => ({
        permission_id: rolePermission.permission.permission_id.toString(),
        permission_name: rolePermission.permission.permission_name,
        module_key: rolePermission.permission.module_key,
        module_label: rolePermission.permission.module_label,
        action_key: rolePermission.permission.action_key,
        action_label: rolePermission.permission.action_label,
        description: rolePermission.permission.description,
      }),
    );

    return {
      user_id: user.user_id.toString(),
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      require_password_change: user.require_password_change,
      role: {
        role_id: user.role.role_id.toString(),
        role_name: user.role.role_name,
        permissions: permissionDetails.map(
          (permission) => permission.permission_name,
        ),
        permission_details: permissionDetails,
      },
    };
  }
}
