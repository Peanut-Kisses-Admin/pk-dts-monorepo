import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { rm } from "fs/promises";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { BackupRestoreSnapshot } from "./backup-restore.types";
import { BackupRestoreService as BackupRestoreBaseService } from "./backup-restore.base";

const CURRENT_BACKUP_SCHEMA_VERSION = 3;
const RESTORE_MAX_WAIT_MS = 30_000;
const RESTORE_TRANSACTION_TIMEOUT_MS = 10 * 60_000;

interface BackupPackageLike {
  snapshot: BackupRestoreSnapshot;
  filePath: string;
  fileName: string;
  isArchive: boolean;
}

interface RestoreContextLike {
  roleIds: Map<string, bigint>;
  userIds: Map<string, bigint>;
}

interface BackupRestoreInternals {
  readBackupById(backupId: string): Promise<BackupPackageLike>;
  readBackupPackage(filePath: string): Promise<BackupPackageLike>;
  clearDatabase(tx: Prisma.TransactionClient): Promise<void>;
  restoreCatalog(
    tx: Prisma.TransactionClient,
    snapshot: BackupRestoreSnapshot,
  ): Promise<RestoreContextLike>;
  restoreUsers(
    tx: Prisma.TransactionClient,
    snapshot: BackupRestoreSnapshot,
    context: RestoreContextLike,
  ): Promise<void>;
  restoreDocuments(
    tx: Prisma.TransactionClient,
    snapshot: BackupRestoreSnapshot,
    context: RestoreContextLike,
  ): Promise<void>;
  restoreRevisions(
    tx: Prisma.TransactionClient,
    snapshot: BackupRestoreSnapshot,
    context: RestoreContextLike,
  ): Promise<void>;
  restoreSequenceStates(
    tx: Prisma.TransactionClient,
    snapshot: BackupRestoreSnapshot,
  ): Promise<void>;
  restoreRolePermissions(
    tx: Prisma.TransactionClient,
    snapshot: BackupRestoreSnapshot,
    context: RestoreContextLike,
  ): Promise<void>;
  restoreRevisionUploads(filePath: string): Promise<void>;
  appendLog(entry: {
    timestamp: string;
    action: "restored";
    backup_id: string;
    file_name: string;
    performed_by: string;
    details: string;
  }): Promise<void>;
  backupIdFromFileName(fileName: string): string;
}

/**
 * Compatibility layer around the established backup service.
 *
 * The original restore implementation predates workflow definitions/versions,
 * whose creator foreign keys now prevent a full database clear. It also used a
 * two-minute interactive transaction, which is too short for larger snapshots.
 * This class keeps all existing backup/list/download behavior while making full
 * restores aware of those newer dependencies.
 */
@Injectable()
export class BackupRestoreService extends BackupRestoreBaseService {
  private readonly logger = new Logger(BackupRestoreService.name);

  constructor(
    private readonly restorePrisma: PrismaService,
    config: ConfigService,
  ) {
    super(restorePrisma, config);
  }

  override async restoreBackup(backupId: string, performedBy = "system") {
    const backupPackage = await this.internals().readBackupById(backupId);
    return this.restoreBackupPackageSafely(backupPackage, performedBy);
  }

  override async restoreUploadedBackup(
    file: Express.Multer.File | undefined,
    performedBy = "system",
  ) {
    if (!file) {
      throw new BadRequestException(
        "Choose a backup .zip or legacy .json file to restore.",
      );
    }

    try {
      const backupPackage = await this.internals().readBackupPackage(file.path);
      return await this.restoreBackupPackageSafely(backupPackage, performedBy);
    } finally {
      await rm(file.path, { force: true }).catch(() => undefined);
    }
  }

  private async restoreBackupPackageSafely(
    backupPackage: BackupPackageLike,
    performedBy: string,
  ) {
    const snapshot = backupPackage.snapshot;

    if (![1, CURRENT_BACKUP_SCHEMA_VERSION].includes(snapshot.schema_version)) {
      throw new BadRequestException(
        `Unsupported backup schema version ${snapshot.schema_version}.`,
      );
    }

    const internals = this.internals();

    try {
      await this.restorePrisma.$transaction(
        async (tx) => {
          // Workflow definitions are system configuration and are not part of
          // schema-v3 backup snapshots. Preserve them before replacing users,
          // roles, documents, and catalog records.
          const workflowState = await this.captureWorkflowState(tx);

          // These rows contain Restrict foreign keys to users/definitions and
          // are the primary reason the legacy clearDatabase() now fails.
          await tx.workflowVersion.deleteMany({});
          await tx.workflowDefinition.deleteMany({});

          await internals.clearDatabase(tx);
          const context = await internals.restoreCatalog(tx, snapshot);
          await internals.restoreUsers(tx, snapshot, context);
          await internals.restoreDocuments(tx, snapshot, context);
          await internals.restoreRevisions(tx, snapshot, context);
          await internals.restoreSequenceStates(tx, snapshot);
          await internals.restoreRolePermissions(tx, snapshot, context);

          await this.restoreWorkflowState(tx, workflowState, context);
        },
        {
          maxWait: RESTORE_MAX_WAIT_MS,
          timeout: RESTORE_TRANSACTION_TIMEOUT_MS,
        },
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Backup restore transaction failed for ${backupPackage.fileName}: ${this.loggableError(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException(this.restoreFailureMessage(error));
    }

    if (backupPackage.isArchive) {
      try {
        await internals.restoreRevisionUploads(backupPackage.filePath);
      } catch (error) {
        this.logger.error(
          `Backup database restore succeeded but revision extraction failed for ${backupPackage.fileName}: ${this.loggableError(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw new BadRequestException(
          "Database records were restored, but one or more revision files could not be extracted from the backup package. Check the backend log for details.",
        );
      }
    }

    const backupId = internals.backupIdFromFileName(backupPackage.fileName);
    await internals.appendLog({
      timestamp: new Date().toISOString(),
      action: "restored",
      backup_id: backupId,
      file_name: backupPackage.fileName,
      performed_by: performedBy,
      details: `Restored ${snapshot.summary.documents} documents, ${snapshot.summary.users} users, and ${snapshot.summary.revisions} revision upload file references.`,
    });

    return {
      restored: true,
      backup_id: backupId,
      file_name: backupPackage.fileName,
      restored_at: new Date().toISOString(),
    };
  }

  private async captureWorkflowState(tx: Prisma.TransactionClient) {
    const [roles, definitions] = await Promise.all([
      tx.role.findMany({
        select: { role_id: true, role_name: true },
      }),
      tx.workflowDefinition.findMany({
        orderBy: { workflow_definition_id: "asc" },
        include: {
          created_by: { select: { username: true } },
          versions: {
            orderBy: { version_number: "asc" },
            include: {
              created_by: { select: { username: true } },
              published_by: { select: { username: true } },
            },
          },
        },
      }),
    ]);

    return {
      roleNamesById: new Map(
        roles.map((role) => [role.role_id.toString(), role.role_name] as const),
      ),
      definitions,
    };
  }

  private async restoreWorkflowState(
    tx: Prisma.TransactionClient,
    workflowState: Awaited<ReturnType<BackupRestoreService["captureWorkflowState"]>>,
    context: RestoreContextLike,
  ) {
    if (!workflowState.definitions.length) {
      return;
    }

    const fallbackUserId = context.userIds.values().next().value as
      | bigint
      | undefined;
    if (!fallbackUserId) {
      throw new BadRequestException(
        "The backup has no user that can own the restored workflow definitions.",
      );
    }

    for (const definition of workflowState.definitions) {
      const definitionCreatorId =
        context.userIds.get(definition.created_by.username) ?? fallbackUserId;
      const restoredDefinition = await tx.workflowDefinition.create({
        data: {
          workflow_key: definition.workflow_key,
          name: definition.name,
          description: definition.description,
          document_type: definition.document_type,
          is_active: definition.is_active,
          created_by_user_id: definitionCreatorId,
          created_at: definition.created_at,
          updated_at: definition.updated_at,
        },
      });

      for (const version of definition.versions) {
        const createdById =
          context.userIds.get(version.created_by.username) ?? definitionCreatorId;
        const publishedById = version.published_by
          ? context.userIds.get(version.published_by.username) ?? null
          : null;

        await tx.workflowVersion.create({
          data: {
            workflow_definition_id:
              restoredDefinition.workflow_definition_id,
            version_number: version.version_number,
            status: version.status,
            graph: this.remapWorkflowRoleIds(
              version.graph,
              workflowState.roleNamesById,
              context.roleIds,
            ) as Prisma.InputJsonValue,
            created_by_user_id: createdById,
            published_by_user_id: publishedById,
            published_at: version.published_at,
            created_at: version.created_at,
            updated_at: version.updated_at,
          },
        });
      }
    }
  }

  private remapWorkflowRoleIds(
    value: unknown,
    oldRoleNamesById: Map<string, string>,
    newRoleIds: Map<string, bigint>,
  ): unknown {
    if (Array.isArray(value)) {
      return value.map((item) =>
        this.remapWorkflowRoleIds(item, oldRoleNamesById, newRoleIds),
      );
    }

    if (!value || typeof value !== "object") {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        if (key === "role_id" || key === "assigned_role_id") {
          const oldRoleName = oldRoleNamesById.get(String(item));
          const newRoleId = oldRoleName ? newRoleIds.get(oldRoleName) : undefined;
          if (newRoleId) {
            return [key, newRoleId.toString()];
          }
        }

        return [
          key,
          this.remapWorkflowRoleIds(item, oldRoleNamesById, newRoleIds),
        ];
      }),
    );
  }

  private restoreFailureMessage(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return "Backup restore was blocked by a related database record. The transaction was rolled back safely; no partial restore was committed.";
      }
      if (error.code === "P2024" || error.code === "P2028") {
        return "Backup restore could not finish its database transaction. The transaction was rolled back safely. Try the restore again after confirming the database container is healthy.";
      }
      return `Backup restore failed with database error ${error.code}. The transaction was rolled back safely.`;
    }

    return "Backup restore could not complete. The database transaction was rolled back safely. Check the backend log for the underlying error.";
  }

  private loggableError(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private internals() {
    return this as unknown as BackupRestoreInternals;
  }
}
