import { Module } from "@nestjs/common";
import { BackupAutomationService } from "./backup-automation.service";
import { BackupRestoreController } from "./backup-restore.controller";
import { BackupRestoreService } from "./backup-restore.service";

@Module({
  controllers: [BackupRestoreController],
  providers: [BackupRestoreService, BackupAutomationService],
})
export class BackupRestoreModule {}
