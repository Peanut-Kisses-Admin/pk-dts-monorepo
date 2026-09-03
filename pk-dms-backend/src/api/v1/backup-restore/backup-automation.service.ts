import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import { readFile, rm, stat, writeFile } from "fs/promises";
import { join } from "path";
import { BackupRestoreService } from "./backup-restore.service";
import { StoredBackupFile } from "./backup-restore.types";

interface BackblazeAuthorizeResponse {
  apiInfo?: {
    storageApi?: {
      apiUrl?: string;
      downloadUrl?: string;
    };
  };
  apiUrl?: string;
  authorizationToken: string;
}

interface BackblazeUploadUrlResponse {
  authorizationToken: string;
  uploadUrl: string;
}

interface BackblazeListFilesResponse {
  files?: Array<{
    fileId: string;
    fileName: string;
  }>;
}

interface BackblazeDeleteFileResponse {
  fileId: string;
  fileName: string;
}

interface BackblazeConfig {
  keyId: string;
  applicationKey: string;
  bucketId: string;
  backupPrefix: string;
}

interface SyncStateFileEntry {
  file_name: string;
  remote_file_name: string;
  remote_file_id?: string;
  size_bytes: number;
  updated_at: string;
  synced_at: string;
  attempts: number;
  last_error?: string;
  last_error_at?: string;
}

interface SyncStateFile {
  version: 1;
  files: Record<string, SyncStateFileEntry>;
}

const DEFAULT_AUTO_BACKUP_TIME = "17:00";
const DEFAULT_AUTO_BACKUP_TIMEZONE = "Asia/Manila";
const DEFAULT_SYNC_SCAN_INTERVAL_MS = 60_000;
const DEFAULT_SYNC_RETRY_BASE_MS = 60_000;
const DEFAULT_SYNC_RETRY_MAX_MS = 15 * 60_000;
const DEFAULT_BACKUP_RETRY_MS = 15 * 60_000;
const DEFAULT_RETENTION_DAYS = 30;
const SYNC_STATE_FILE_NAME = "backblaze-b2-sync-state.json";
const BACKUP_WRITE_SETTLE_MS = 10_000;

@Injectable()
export class BackupAutomationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupAutomationService.name);
  private autoBackupTimer?: NodeJS.Timeout;
  private autoBackupRetryTimer?: NodeJS.Timeout;
  private syncTimer?: NodeJS.Timeout;
  private destroyed = false;
  private syncInProgress = false;
  private syncFailureCount = 0;
  private b2ConfigWarningLogged = false;

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

    this.scheduleNextSyncAttempt(15_000);
  }

  onModuleDestroy() {
    this.destroyed = true;

    if (this.autoBackupTimer) {
      clearTimeout(this.autoBackupTimer);
    }

    if (this.autoBackupRetryTimer) {
      clearTimeout(this.autoBackupRetryTimer);
    }

    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
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
      this.syncFailureCount = 0;
      this.scheduleNextSyncAttempt(5_000);
      this.scheduleNextAutomaticBackup();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown backup error.";
      this.logger.error(`Automatic local backup failed: ${message}`);
      this.scheduleAutomaticBackupRetry(this.getAutomaticBackupRetryMs());
    }
  }

  private scheduleNextSyncAttempt(delayMs: number) {
    if (this.destroyed) {
      return;
    }

    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    this.syncTimer = setTimeout(() => {
      void this.runSyncPass();
    }, Math.max(1_000, delayMs));
  }

  private async runSyncPass() {
    if (this.destroyed) {
      return;
    }

    if (this.syncInProgress) {
      this.scheduleNextSyncAttempt(this.getSyncScanIntervalMs());
      return;
    }

    await this.runRetentionPass();

    if (!this.isB2Enabled()) {
      this.scheduleNextSyncAttempt(this.getSyncScanIntervalMs());
      return;
    }

    const b2Config = this.getB2Config();
    if (!b2Config) {
      if (!this.b2ConfigWarningLogged) {
        this.logger.warn(
          "Backblaze B2 sync is enabled, but one or more required credentials are missing.",
        );
        this.b2ConfigWarningLogged = true;
      }

      this.scheduleNextSyncAttempt(this.getSyncRetryDelayMs());
      return;
    }

    this.b2ConfigWarningLogged = false;
    this.syncInProgress = true;

    try {
      const syncedCount = await this.syncPendingBackups(b2Config);
      if (syncedCount > 0) {
        this.logger.log(`Backblaze B2 sync uploaded ${syncedCount} backup file(s).`);
      }

      this.syncFailureCount = 0;
      this.scheduleNextSyncAttempt(this.getSyncScanIntervalMs());
    } catch (error) {
      this.syncFailureCount += 1;
      const message =
        error instanceof Error ? error.message : "Unknown sync error.";
      const retryDelay = this.getSyncRetryDelayMs();

      this.logger.warn(
        `Backblaze B2 sync failed (${message}). Retrying in ${Math.round(retryDelay / 1_000)} second(s).`,
      );

      this.scheduleNextSyncAttempt(retryDelay);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncPendingBackups(b2Config: BackblazeConfig) {
    const allBackups = await this.backupRestoreService.listStoredBackupFiles();
    const pendingBackups = (
      await Promise.all(
        allBackups.map(async (file) =>
          (await this.isBackupStable(file)) ? file : null,
        ),
      )
    ).filter((file): file is StoredBackupFile => !!file);

    if (!pendingBackups.length) {
      return 0;
    }

    const state = await this.readSyncState();
    const auth = await this.authorizeBackblaze(b2Config);
    const uploadTarget = await this.getUploadTarget(auth.apiUrl, auth.authorizationToken, b2Config.bucketId);

    let syncedCount = 0;

    for (const backupFile of pendingBackups) {
      const remoteFileName = this.remoteFileName(b2Config.backupPrefix, backupFile.file_name);
      const existingState = state.files[backupFile.file_name];

      try {
        if (
          existingState &&
          existingState.size_bytes === backupFile.size_bytes &&
          existingState.updated_at === backupFile.updated_at
        ) {
          continue;
        }

        const existingRemoteFileId = await this.findRemoteFileId(
          auth.apiUrl,
          auth.authorizationToken,
          b2Config.bucketId,
          remoteFileName,
        );

        if (existingRemoteFileId) {
          state.files[backupFile.file_name] = {
            file_name: backupFile.file_name,
            remote_file_name: remoteFileName,
            remote_file_id: existingRemoteFileId,
            size_bytes: backupFile.size_bytes,
            updated_at: backupFile.updated_at,
            synced_at: new Date().toISOString(),
            attempts: (existingState?.attempts ?? 0) + 1,
          };
          await this.writeSyncState(state);
          continue;
        }

        const fileBuffer = await readFile(backupFile.file_path);
        const sha1 = createHash("sha1").update(fileBuffer).digest("hex");
        const uploaded = await this.uploadFileToBackblaze(
          uploadTarget.uploadUrl,
          uploadTarget.authorizationToken,
          remoteFileName,
          fileBuffer,
          sha1,
          this.contentTypeForFile(backupFile.file_name),
        );

        state.files[backupFile.file_name] = {
          file_name: backupFile.file_name,
          remote_file_name: remoteFileName,
          remote_file_id: uploaded.fileId,
          size_bytes: backupFile.size_bytes,
          updated_at: backupFile.updated_at,
          synced_at: new Date().toISOString(),
          attempts: (existingState?.attempts ?? 0) + 1,
        };
        await this.writeSyncState(state);
        await this.backupRestoreService.recordLog({
          timestamp: new Date().toISOString(),
          action: "synced",
          backup_id: backupFile.backup_id,
          file_name: backupFile.file_name,
          performed_by: "system:backblaze-sync",
          details: `Backup synchronized to Backblaze B2 as ${remoteFileName}.`,
        });
        syncedCount += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown sync error.";

        state.files[backupFile.file_name] = {
          file_name: backupFile.file_name,
          remote_file_name: remoteFileName,
          remote_file_id: existingState?.remote_file_id,
          size_bytes: backupFile.size_bytes,
          updated_at: backupFile.updated_at,
          synced_at: existingState?.synced_at || "",
          attempts: (existingState?.attempts ?? 0) + 1,
          last_error: message,
          last_error_at: new Date().toISOString(),
        };
        await this.writeSyncState(state);
        await this.backupRestoreService.recordLog({
          timestamp: new Date().toISOString(),
          action: "sync_failed",
          backup_id: backupFile.backup_id,
          file_name: backupFile.file_name,
          performed_by: "system:backblaze-sync",
          details: message,
        });
        throw error;
      }
    }

    return syncedCount;
  }

  private async runRetentionPass() {
    if (!this.isRetentionEnabled()) {
      return;
    }

    const allBackups = await this.backupRestoreService.listStoredBackupFiles();
    const expiredBackups = allBackups.filter((file) => this.isBackupExpired(file));

    if (!expiredBackups.length) {
      return;
    }

    const state = await this.readSyncState();
    const shouldDeleteRemote = this.isB2Enabled();
    const b2Config = shouldDeleteRemote ? this.getB2Config() : null;
    let auth: { apiUrl: string; authorizationToken: string } | null = null;

    if (shouldDeleteRemote && b2Config) {
      auth = await this.authorizeBackblaze(b2Config);
    } else if (shouldDeleteRemote && !b2Config) {
      this.logger.warn(
        "Backup retention found expired local backups, but Backblaze B2 credentials are incomplete. Remote deletions will be retried later.",
      );
    }

    let deletedCount = 0;

    for (const backupFile of expiredBackups) {
      if (!(await this.isBackupStable(backupFile))) {
        continue;
      }

      const stateEntry = state.files[backupFile.file_name];
      const remoteFileName = this.remoteFileName(
        this.getB2Config()?.backupPrefix || "",
        backupFile.file_name,
      );

      if (shouldDeleteRemote) {
        if (!b2Config || !auth) {
          continue;
        }

        const remoteFileId =
          stateEntry?.remote_file_id ||
          (await this.findRemoteFileId(
            auth.apiUrl,
            auth.authorizationToken,
            b2Config.bucketId,
            remoteFileName,
          ));

        if (remoteFileId) {
          await this.deleteRemoteFile(
            auth.apiUrl,
            auth.authorizationToken,
            remoteFileId,
            remoteFileName,
          );
        }
      }

      await rm(backupFile.file_path, { force: true });
      delete state.files[backupFile.file_name];
      await this.writeSyncState(state);
      await this.backupRestoreService.recordLog({
        timestamp: new Date().toISOString(),
        action: "deleted",
        backup_id: backupFile.backup_id,
        file_name: backupFile.file_name,
        performed_by: "system:retention",
        details: `Backup deleted after ${this.getRetentionDays()} day retention from local storage${shouldDeleteRemote ? " and Backblaze B2" : ""}.`,
      });
      deletedCount += 1;
    }

    if (deletedCount > 0) {
      this.logger.log(
        `Backup retention deleted ${deletedCount} expired backup file(s).`,
      );
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

  private async authorizeBackblaze(b2Config: BackblazeConfig) {
    const response = await fetch(
      "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${b2Config.keyId}:${b2Config.applicationKey}`,
          ).toString("base64")}`,
        },
      },
    );

    const data = (await this.readJsonResponse(
      response,
      "Backblaze B2 account authorization failed.",
    )) as unknown as BackblazeAuthorizeResponse;

    const apiUrl = data.apiUrl || data.apiInfo?.storageApi?.apiUrl;
    if (!apiUrl || !data.authorizationToken) {
      throw new Error("Backblaze B2 authorization response is missing apiUrl or authorizationToken.");
    }

    return {
      apiUrl,
      authorizationToken: data.authorizationToken,
    };
  }

  private async getUploadTarget(
    apiUrl: string,
    authorizationToken: string,
    bucketId: string,
  ) {
    const response = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: "POST",
      headers: {
        Authorization: authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bucketId }),
    });

    return (await this.readJsonResponse(
      response,
      "Backblaze B2 upload URL request failed.",
    )) as unknown as BackblazeUploadUrlResponse;
  }

  private async findRemoteFileId(
    apiUrl: string,
    authorizationToken: string,
    bucketId: string,
    remoteFileName: string,
  ) {
    const response = await fetch(`${apiUrl}/b2api/v2/b2_list_file_names`, {
      method: "POST",
      headers: {
        Authorization: authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucketId,
        prefix: remoteFileName,
        maxFileCount: 1,
      }),
    });

    const data = (await this.readJsonResponse(
      response,
      "Backblaze B2 file listing failed.",
    )) as BackblazeListFilesResponse;

    return data.files?.find((file) => file.fileName === remoteFileName)?.fileId;
  }

  private async uploadFileToBackblaze(
    uploadUrl: string,
    authorizationToken: string,
    remoteFileName: string,
    fileBuffer: Buffer,
    sha1: string,
    contentType: string,
  ) {
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: authorizationToken,
        "Content-Type": contentType,
        "Content-Length": String(fileBuffer.byteLength),
        "X-Bz-Content-Sha1": sha1,
        "X-Bz-File-Name": encodeURIComponent(remoteFileName),
      },
      body: new Uint8Array(fileBuffer),
    });

    return (await this.readJsonResponse(
      response,
      `Backblaze B2 upload failed for ${remoteFileName}.`,
    )) as { fileId: string };
  }

  private async deleteRemoteFile(
    apiUrl: string,
    authorizationToken: string,
    fileId: string,
    remoteFileName: string,
  ) {
    const response = await fetch(`${apiUrl}/b2api/v2/b2_delete_file_version`, {
      method: "POST",
      headers: {
        Authorization: authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileId,
        fileName: remoteFileName,
      }),
    });

    return (await this.readJsonResponse(
      response,
      `Backblaze B2 delete failed for ${remoteFileName}.`,
    )) as unknown as BackblazeDeleteFileResponse;
  }

  private async readJsonResponse(response: Response, fallbackMessage: string) {
    const raw = await response.text();
    let body: Record<string, unknown> = {};

    if (raw) {
      try {
        body = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        body = {};
      }
    }

    if (!response.ok) {
      const detail =
        typeof body?.message === "string"
          ? body.message
          : typeof body?.code === "string"
            ? body.code
            : raw || response.statusText;

      throw new Error(`${fallbackMessage} ${detail}`.trim());
    }

    return body;
  }

  private async readSyncState(): Promise<SyncStateFile> {
    try {
      const raw = await readFile(this.syncStatePath(), "utf-8");
      const parsed = JSON.parse(raw) as Partial<SyncStateFile>;
      return {
        version: 1,
        files: parsed.files ?? {},
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          version: 1,
          files: {},
        };
      }

      throw error;
    }
  }

  private async writeSyncState(state: SyncStateFile) {
    await writeFile(this.syncStatePath(), JSON.stringify(state, null, 2), "utf-8");
  }

  private syncStatePath() {
    return join(this.getBackupRoot(), SYNC_STATE_FILE_NAME);
  }

  private getBackupRoot() {
    return (
      this.config.get<string>("BACKUP_RESTORE_DIR") ||
      join(process.cwd(), "backup-store")
    );
  }

  private isAutoBackupEnabled() {
    return this.booleanConfig("BACKUP_AUTO_ENABLED", true);
  }

  private isB2Enabled() {
    return this.booleanConfig("BACKBLAZE_B2_ENABLED", false);
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

  private getSyncScanIntervalMs() {
    return this.numberConfig(
      "BACKBLAZE_B2_SYNC_INTERVAL_MS",
      DEFAULT_SYNC_SCAN_INTERVAL_MS,
      10_000,
    );
  }

  private getSyncRetryDelayMs() {
    const baseDelay = this.numberConfig(
      "BACKBLAZE_B2_RETRY_BASE_MS",
      DEFAULT_SYNC_RETRY_BASE_MS,
      10_000,
    );
    const maxDelay = this.numberConfig(
      "BACKBLAZE_B2_RETRY_MAX_MS",
      DEFAULT_SYNC_RETRY_MAX_MS,
      baseDelay,
    );

    return Math.min(
      maxDelay,
      baseDelay * 2 ** Math.max(0, this.syncFailureCount - 1),
    );
  }

  private getRetentionDays() {
    return this.numberConfig(
      "BACKUP_RETENTION_DAYS",
      DEFAULT_RETENTION_DAYS,
      1,
    );
  }

  private getB2Config() {
    const keyId = this.config.get<string>("BACKBLAZE_B2_KEY_ID")?.trim();
    const applicationKey = this.config
      .get<string>("BACKBLAZE_B2_APPLICATION_KEY")
      ?.trim();
    const bucketId = this.config.get<string>("BACKBLAZE_B2_BUCKET_ID")?.trim();
    const backupPrefix =
      this.config.get<string>("BACKBLAZE_B2_BACKUP_PREFIX")?.trim() || "dms-backups";

    if (!keyId || !applicationKey || !bucketId) {
      return null;
    }

    return {
      keyId,
      applicationKey,
      bucketId,
      backupPrefix,
    };
  }

  private numberConfig(name: string, defaultValue: number, minimumValue: number) {
    const rawValue = this.config.get<string>(name);
    const parsedValue = rawValue ? Number(rawValue) : defaultValue;

    if (!Number.isFinite(parsedValue)) {
      return defaultValue;
    }

    return Math.max(minimumValue, parsedValue);
  }

  private remoteFileName(prefix: string, fileName: string) {
    const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");
    return cleanPrefix ? `${cleanPrefix}/${fileName}` : fileName;
  }

  private isBackupExpired(file: StoredBackupFile) {
    const createdAt = new Date(file.created_at);
    if (Number.isNaN(createdAt.getTime())) {
      return false;
    }

    const ageMs = Date.now() - createdAt.getTime();
    return ageMs >= this.getRetentionDays() * 24 * 60 * 60 * 1_000;
  }

  private contentTypeForFile(fileName: string) {
    return fileName.toLowerCase().endsWith(".zip")
      ? "application/zip"
      : "application/json; charset=utf-8";
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
