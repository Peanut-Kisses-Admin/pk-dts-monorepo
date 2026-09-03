# Backup, Restore and Reset API

This module manages server-side database snapshots stored under the configured backup directory.

## Endpoints

- `GET /api/v1/backup-restore/backups` list backups
- `POST /api/v1/backup-restore/backups` create a new backup
- `GET /api/v1/backup-restore/backups/:id/download` download a backup file
- `POST /api/v1/backup-restore/backups/:id/restore` restore a backup
- `POST /api/v1/backup-restore/backups/upload-restore` upload and restore a backup file
- `POST /api/v1/backup-restore/reset` create a safety backup, then reset `ALL` data or delete only `SOFTCOPY` or `HARDCOPY` documents using the request `scope`
- `DELETE /api/v1/backup-restore/backups/:id` delete a backup
- `GET /api/v1/backup-restore/logs` view backup activity logs

## Notes

- New backups are stored as `.zip` packages in `BACKUP_RESTORE_DIR` or `backup-store` in the current working directory.
- Each `.zip` package includes `snapshot.json` plus uploaded softcopy revision files under their folders in `uploads/revisions/`.
- Legacy `.json` snapshots are still listed and restorable, but they only contain database metadata.
- Restore is destructive and replaces the current database contents with the selected snapshot.
- Every reset scope creates a new safety backup first and preserves the backup directory. `ALL` clears application data and reseeds defaults; document-only scopes preserve accounts and classifications.
- Automatic local backup scheduling is controlled by `BACKUP_AUTO_ENABLED`, `BACKUP_AUTO_TIME`, `BACKUP_AUTO_TIMEZONE`, and `BACKUP_AUTO_RETRY_MS`.
- Backup retention cleanup is controlled by `BACKUP_RETENTION_ENABLED` and `BACKUP_RETENTION_DAYS`.
- Optional Backblaze B2 background sync is controlled by `BACKBLAZE_B2_ENABLED`, `BACKBLAZE_B2_KEY_ID`, `BACKBLAZE_B2_APPLICATION_KEY`, `BACKBLAZE_B2_BUCKET_ID`, `BACKBLAZE_B2_BACKUP_PREFIX`, `BACKBLAZE_B2_SYNC_INTERVAL_MS`, `BACKBLAZE_B2_RETRY_BASE_MS`, and `BACKBLAZE_B2_RETRY_MAX_MS`.
- When Backblaze B2 sync is enabled, the backend keeps retrying unsynced backup files in the background until they upload successfully.
- When retention is enabled, backups older than the configured number of days are deleted automatically from local storage and, when B2 sync is enabled and configured, from Backblaze B2 as well.
