import {
  Inject,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Reflector } from "@nestjs/core";
import { Cache } from "cache-manager";
import { PrismaService } from "../../core/prisma/prisma.service";
import { AuthenticatedUser } from "./authenticated-user.interface";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { SessionTokenService } from "./session-token.service";

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: SessionTokenService,
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers.authorization as
      string | undefined;

    if (!authorizationHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Authentication is required.");
    }

    const token = authorizationHeader.slice("Bearer ".length).trim();
    const payload = this.tokenService.verifyToken(token);
    const cacheKey = `auth:user:${payload.sub}`;
    const cachedUser = await this.cacheManager.get<AuthenticatedUser>(cacheKey);

    if (cachedUser) {
      request.user = cachedUser;
      return true;
    }

    const user = await this.prisma.user.findUnique({
      where: { user_id: BigInt(payload.sub) },
      include: {
        role: {
          include: {
            role_permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        "The authenticated user no longer exists.",
      );
    }

    const permissionNames = user.role.role_permissions.map(
      (rolePermission) => rolePermission.permission.permission_name,
    );

    const authenticatedUser = {
      user_id: user.user_id.toString(),
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      require_password_change: user.require_password_change,
      role: {
        role_id: user.role.role_id.toString(),
        role_name: user.role.role_name,
        permissions: permissionNames,
      },
    } satisfies AuthenticatedUser;

    request.user = authenticatedUser;
    await this.cacheManager.set(cacheKey, authenticatedUser);

    return true;
  }
}
