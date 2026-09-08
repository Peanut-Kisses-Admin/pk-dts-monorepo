import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { rm, stat } from "fs/promises";
import { BackupRestoreService } from "./backup-restore.service";
import { StoredBackupFile } from "./backup-restore.types";

const DEFAULT_AUTO_BACKUP_TIME = "17:00";
const DEFAULT_AUTO_BACKUP_TIMEZONE = "Asia/Manila";
const DEFAULT_BACKUP_RETRY_MS = 15 * 60_000;
const DEFAULT_RETENTION_DAYS = 30;
const BACKUP_WRITE_SETTLE_MS = 10_000;

@Injectable()
export class BackupAutomationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupAutomationService.name);
  private autoBackupTimer?: NodeJS.Timeout;
  private autoBackupRetryTimer?: NodeJS.Timeout;
  private retentionTimer?: NodeJS.Timeout;
  private destroyed = false;

  constructor(
    private readonly backupRestoreService: BackupRestoreService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (this.isAutoBackupEnabled()) {
      this.scheduleNextAutomaticBackup();
    } else {
      this.logger.log("Automatic local backup scheduling is disabled.");
    }

    this.scheduleNextRetentionPass(15_000);
  }

  onModuleDestroy() {
    this.destroyed = true;

    if (this.autoBackupTimer) {
      clearTimeout(this.autoBackupTimer);
    }

    if (this.autoBackupRetryTimer) {
      clearTimeout(this.autoBackupRetryTimer);
    }

    if (this.retentionTimer) {
      clearTimeout(this.retentionTimer);
    }
  }

  private scheduleNextAutomaticBackup() {
    if (this.destroyed) {
      return;
    }

    if (this.autoBackupTimer) {
      clearTimeout(this.autoBackupTimer);
    }

    const nextRun = this.nextAutomaticBackupDate(new Date());
    const delayMs = Math.max(1_000, nextRun.getTime() - Date.now());

    this.logger.log(
      `Next automatic local backup scheduled for ${nextRun.toISOString()} (${this.getAutomaticBackupTimezone()}).`,
    );

    this.autoBackupTimer = setTimeout(() => {
      void this.runAutomaticBackup();
    }, delayMs);
  }

  private scheduleAutomaticBackupRetry(delayMs: number) {
    if (this.destroyed) {
      return;
    }

    if (this.autoBackupRetryTimer) {
      clearTimeout(this.autoBackupRetryTimer);
    }

    this.logger.warn(
      `Automatic backup will retry in ${Math.round(delayMs / 60_000)} minute(s).`,
    );

    this.autoBackupRetryTimer = setTimeout(() => {
      void this.runAutomaticBackup();
    }, delayMs);
  }

  private async runAutomaticBackup() {
    if (this.destroyed) {
      return;
    }

    if (this.autoBackupRetryTimer) {
      clearTimeout(this.autoBackupRetryTimer);
      this.autoBackupRetryTimer = undefined;
    }

    try {
      const backup = await this.backupRestoreService.createBackup(
        "system:auto-backup",
      );

      this.logger.log(`Automatic local backup created: ${backup.file_name}`);
      this.scheduleNextRetentionPass(5_000);
      this.scheduleNextAutomaticBackup();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown backup error.";
      this.logger.error(`Automatic local backup failed: ${message}`);
      this.scheduleAutomaticBackupRetry(this.getAutomaticBackupRetryMs());
    }
  }

  private scheduleNextRetentionPass(delayMs: number) {
    if (this.destroyed) {
      return;
    }

    if (this.retentionTimer) {
      clearTimeout(this.retentionTimer);
    }

    this.retentionTimer = setTimeout(() => {
      void this.runRetentionCycle();
    }, Math.max(1_000, delayMs));
  }

  private async runRetentionCycle() {
    if (this.destroyed) return;
    try {
      await this.runRetentionPass();
    } catch (error) {
      this.logger.error(`Local backup retention failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (!this.destroyed) this.scheduleNextRetentionPass(60_000);
    }
  }

  private async runRetentionPass() {
    if (!this.isRetentionEnabled()) return;
    const backups = await this.backupRestoreService.listStoredBackupFiles();
    for (const file of backups.filter((entry) => this.isBackupExpired(entry))) {
      if (!(await this.isBackupStable(file))) continue;
      await rm(file.file_path, { force: true });
      await this.backupRestoreService.recordLog({
        timestamp: new Date().toISOString(), action: "deleted",
        backup_id: file.backup_id, file_name: file.file_name,
        performed_by: "system:retention",
        details: `Backup deleted after ${this.getRetentionDays()} day retention from local storage.`,
      });
    }
  }

  private async isBackupStable(file: StoredBackupFile) {
    try {
      const fileStat = await stat(file.file_path);
      return Date.now() - fileStat.mtimeMs >= BACKUP_WRITE_SETTLE_MS;
    } catch {
      return false;
    }
  }

  private isAutoBackupEnabled() {
    return this.booleanConfig("BACKUP_AUTO_ENABLED", true);
  }

  private isRetentionEnabled() {
    return this.booleanConfig("BACKUP_RETENTION_ENABLED", true);
  }

  private booleanConfig(name: string, defaultValue: boolean) {
    const value = this.config.get<string>(name);
    if (!value) {
      return defaultValue;
    }

    return !["false", "0", "no", "off"].includes(value.toLowerCase());
  }

  private getAutomaticBackupTime() {
    return this.config.get<string>("BACKUP_AUTO_TIME") || DEFAULT_AUTO_BACKUP_TIME;
  }

  private getAutomaticBackupTimezone() {
    return (
      this.config.get<string>("BACKUP_AUTO_TIMEZONE") ||
      process.env.TZ ||
      DEFAULT_AUTO_BACKUP_TIMEZONE
    );
  }

  private getAutomaticBackupRetryMs() {
    return this.numberConfig(
      "BACKUP_AUTO_RETRY_MS",
      DEFAULT_BACKUP_RETRY_MS,
      60_000,
    );
  }

  private getRetentionDays() {
    return this.numberConfig(
      "BACKUP_RETENTION_DAYS",
      DEFAULT_RETENTION_DAYS,
      1,
    );
  }

  private numberConfig(name: string, defaultValue: number, minimumValue: number) {
    const rawValue = this.config.get<string>(name);
    const parsedValue = rawValue ? Number(rawValue) : defaultValue;

    if (!Number.isFinite(parsedValue)) {
      return defaultValue;
    }

    return Math.max(minimumValue, parsedValue);
  }

  private isBackupExpired(file: StoredBackupFile) {
    const createdAt = new Date(file.created_at);
    if (Number.isNaN(createdAt.getTime())) {
      return false;
    }

    const ageMs = Date.now() - createdAt.getTime();
    return ageMs >= this.getRetentionDays() * 24 * 60 * 60 * 1_000;
  }

  private nextAutomaticBackupDate(referenceDate: Date) {
    const timezone = this.getAutomaticBackupTimezone();
    const [hours, minutes] = this.parseScheduledTime(this.getAutomaticBackupTime());
    const nowParts = this.timeParts(referenceDate, timezone);

    let targetYear = nowParts.year;
    let targetMonth = nowParts.month;
    let targetDay = nowParts.day;

    const todayTarget = this.zonedDateToUtc(
      timezone,
      targetYear,
      targetMonth,
      targetDay,
      hours,
      minutes,
    );

    if (todayTarget.getTime() <= referenceDate.getTime()) {
      const tomorrowReference = new Date(referenceDate.getTime() + 24 * 60 * 60 * 1_000);
      const tomorrowParts = this.timeParts(tomorrowReference, timezone);
      targetYear = tomorrowParts.year;
      targetMonth = tomorrowParts.month;
      targetDay = tomorrowParts.day;
    }

    return this.zonedDateToUtc(
      timezone,
      targetYear,
      targetMonth,
      targetDay,
      hours,
      minutes,
    );
  }

  private parseScheduledTime(value: string) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!match) {
      return [17, 0] as const;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return [17, 0] as const;
    }

    return [hours, minutes] as const;
  }

  private zonedDateToUtc(
    timezone: string,
    year: number,
    month: number,
    day: number,
    hours: number,
    minutes: number,
  ) {
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    const offset = this.timezoneOffsetMs(utcGuess, timezone);
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0) - offset);
  }

  private timezoneOffsetMs(referenceDate: Date, timezone: string) {
    const parts = this.timeParts(referenceDate, timezone);
    const timezoneAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );

    return timezoneAsUtc - referenceDate.getTime();
  }

  private timeParts(referenceDate: Date, timezone: string) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(referenceDate);
    const pick = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value || "0");

    return {
      year: pick("year"),
      month: pick("month"),
      day: pick("day"),
      hour: pick("hour"),
      minute: pick("minute"),
      second: pick("second"),
    };
  }
}
