import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import { diskStorage } from "multer";
import { CurrentUser } from "../../../common/auth/current-user.decorator";
import { RequirePermissions } from "../../../common/auth/require-permissions.decorator";
import { AuthenticatedUser } from "../../../common/auth/authenticated-user.interface";
import {
  backupRestoreUploadsRoot,
  createBackupImportFilename,
  ensureBackupRestoreUploadsRoot,
} from "../../../config/upload-paths";
import { BackupRestoreService } from "./backup-restore.service";
import { FactoryResetDto } from "./dto/factory-reset.dto";

@ApiTags("Backup, Restore and Reset")
@Controller({
  path: "backup-restore",
  version: "1",
})
export class BackupRestoreController {
  constructor(private readonly backupRestoreService: BackupRestoreService) {}

  @Get("backups")
  @RequirePermissions("backup-restore.view")
  @ApiOperation({ summary: "List available backups" })
  @ApiOkResponse({ description: "Backups retrieved successfully." })
  findAll() {
    return this.backupRestoreService.listBackups();
  }

  @Get("logs")
  @RequirePermissions("backup-restore.view_logs")
  @ApiOperation({ summary: "List backup activity logs" })
  @ApiOkResponse({ description: "Backup logs retrieved successfully." })
  findLogs() {
    return this.backupRestoreService.listLogs();
  }

  @Post("backups")
  @RequirePermissions("backup-restore.create_backup")
  @ApiOperation({ summary: "Create a new backup" })
  @ApiCreatedResponse({ description: "Backup created successfully." })
  create(@CurrentUser() user?: AuthenticatedUser) {
    return this.backupRestoreService.createBackup(user?.email ?? "system");
  }

  @Get("backups/:id/download")
  @RequirePermissions("backup-restore.download_backup")
  @ApiOperation({ summary: "Download a backup file" })
  @ApiOkResponse({ description: "Backup download prepared successfully." })
  async download(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const fileName = await this.backupRestoreService.getBackupFileName(id);
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`,
    );
    response.setHeader(
      "Content-Type",
      fileName.endsWith(".zip") ? "application/zip" : "application/json; charset=utf-8",
    );
    response.setHeader("X-Backup-Requested-By", user?.email ?? "system");

    return this.backupRestoreService.downloadBackup(id, user?.email ?? "system");
  }

  @Post("backups/upload-restore")
  @RequirePermissions("backup-restore.restore_backup")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          ensureBackupRestoreUploadsRoot();
          callback(null, backupRestoreUploadsRoot);
        },
        filename: (_request, file, callback) => {
          callback(null, createBackupImportFilename(file.originalname));
        },
      }),
      fileFilter: (_request, file, callback) => {
        const isBackupFile = /\.(zip|json)$/i.test(file.originalname);
        callback(
          isBackupFile
            ? null
            : new Error("Invalid File Format: choose a .zip backup package or legacy .json snapshot."),
          isBackupFile,
        );
      },
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: "Upload and restore a backup file" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @ApiOkResponse({ description: "Uploaded backup restored successfully." })
  restoreUploadedBackup(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.backupRestoreService.restoreUploadedBackup(file, user?.email ?? "system");
  }

  @Post("backups/:id/restore")
  @RequirePermissions("backup-restore.restore_backup")
  @ApiOperation({ summary: "Restore a backup" })
  @ApiOkResponse({ description: "Backup restored successfully." })
  restore(@Param("id") id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.backupRestoreService.restoreBackup(id, user?.email ?? "system");
  }

  @Post("reset")
  @RequirePermissions("backup-restore.reset")
  @ApiOperation({ summary: "Back up the system, reset data, and reseed defaults" })
  @ApiOkResponse({ description: "Factory reset completed successfully." })
  reset(
    @Body() dto: FactoryResetDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.backupRestoreService.factoryReset(
      user?.email ?? "system",
      dto.scope,
    );
  }

  @Delete("backups/:id")
  @RequirePermissions("backup-restore.delete_backup")
  @ApiOperation({ summary: "Delete a backup file" })
  @ApiOkResponse({ description: "Backup deleted successfully." })
  remove(@Param("id") id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.backupRestoreService.deleteBackup(id, user?.email ?? "system");
  }
}
