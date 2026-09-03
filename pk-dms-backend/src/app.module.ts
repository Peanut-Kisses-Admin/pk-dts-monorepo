import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AuditLogInterceptor } from "./common/interceptors/audit-log.interceptor";
import { AuditLogsModule } from "./api/v1/audit-logs/audit-logs.module";
import { WorkflowDefinitionsModule } from "./api/v1/workflow-definitions/workflow-definitions.module";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { redisStore } from "cache-manager-redis-yet";
import { AppController } from "./app.controller";
import { AreasModule } from "./api/v1/areas/areas.module";
import { AssetNumbersModule } from "./api/v1/asset-numbers/asset-numbers.module";
import { DashboardModule } from "./api/v1/dashboard/dashboard.module";
import { BackupRestoreModule } from "./api/v1/backup-restore/backup-restore.module";
import { AuthModule } from "./api/v1/auth/auth.module";
import { DocumentsModule } from "./api/v1/documents/documents.module";
import { DocumentAccessRequestsModule } from "./api/v1/document-access-requests/document-access-requests.module";
import { HardcopyTransfersModule } from "./api/v1/hardcopy-transfers/hardcopy-transfers.module";
import { LocationsModule } from "./api/v1/locations/locations.module";
import { PermissionsModule } from "./api/v1/permissions/permissions.module";
import { RolePermissionsModule } from "./api/v1/role-permissions/role-permissions.module";
import { RolesModule } from "./api/v1/roles/roles.module";
import { SequencesModule } from "./api/v1/sequences/sequences.module";
import { SpecificsModule } from "./api/v1/specifics/specifics.module";
import { SoftcopyCategoriesModule } from "./api/v1/softcopy-categories/softcopy-categories.module";
import { UsersModule } from "./api/v1/users/users.module";
import { RegistrationsModule } from "./api/v1/registrations/registrations.module";
import { SystemSettingsModule } from "./api/v1/system-settings/system-settings.module";
import { NotificationsModule } from "./api/v1/notifications/notifications.module";
import { AuthenticationGuard } from "./common/auth/authentication.guard";
import { PermissionsGuard } from "./common/auth/permissions.guard";
import { SessionTokenService } from "./common/auth/session-token.service";
import { UserAwareCacheInterceptor } from "./common/cache/user-aware-cache.interceptor";
import { resolveEnvFilePaths } from "./config/env-files";
import { PrismaModule } from "./core/prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: resolveEnvFilePaths(
        process.env.APP_ENV ?? process.env.NODE_ENV,
      ),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const ttl = positiveInteger(
          config.get<string>("CACHE_TTL_MS"),
          15_000,
        );

        return {
          store: await redisStore({
            url: config.get<string>("REDIS_URL", "redis://redis:6379"),
            ttl,
          }),
          ttl,
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: "default",
          ttl: positiveInteger(
            config.get<string>("RATE_LIMIT_WINDOW_MS"),
            60_000,
          ),
          limit: positiveInteger(config.get<string>("RATE_LIMIT_MAX"), 120),
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RegistrationsModule,
    RolesModule,
    PermissionsModule,
    RolePermissionsModule,
    AreasModule,
    AssetNumbersModule,
    SpecificsModule,
    LocationsModule,
    SequencesModule,
    SoftcopyCategoriesModule,
    DocumentsModule,
    DocumentAccessRequestsModule,
    HardcopyTransfersModule,
    DashboardModule,
    BackupRestoreModule,
    SystemSettingsModule,
    NotificationsModule,
    AuditLogsModule,
    WorkflowDefinitionsModule,
  ],
  controllers: [AppController],
  providers: [
    SessionTokenService,
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: UserAwareCacheInterceptor,
    },
  ],
})
export class AppModule {}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
