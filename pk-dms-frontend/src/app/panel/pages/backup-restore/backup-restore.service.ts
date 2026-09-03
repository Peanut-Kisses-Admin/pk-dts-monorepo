import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { BACKEND_API_BASE_URL } from '@/app/config/api-config';
import { ApiResponseEnvelope, BackupActionResponse, BackupListItem, BackupLogItem, FactoryResetScope } from './backup-restore.types';

const BACKUP_RESTORE_API = `${BACKEND_API_BASE_URL}/backup-restore`;

@Injectable({ providedIn: 'root' })
export class BackupRestoreService {
    private http = inject(HttpClient);

    listBackups() {
        return this.http.get<ApiResponseEnvelope<BackupListItem[]> | BackupListItem[]>(`${BACKUP_RESTORE_API}/backups`).pipe(map((response) => this.unwrapList(response)));
    }

    listLogs() {
        return this.http.get<ApiResponseEnvelope<BackupLogItem[]> | BackupLogItem[]>(`${BACKUP_RESTORE_API}/logs`).pipe(map((response) => this.unwrapList(response)));
    }

    createBackup() {
        return this.http.post<ApiResponseEnvelope<BackupListItem> | BackupListItem>(`${BACKUP_RESTORE_API}/backups`, {}).pipe(map((response) => this.unwrapItem(response)));
    }

    restoreBackup(backupId: string) {
        return this.http.post<ApiResponseEnvelope<BackupActionResponse> | BackupActionResponse>(`${BACKUP_RESTORE_API}/backups/${backupId}/restore`, {}).pipe(map((response) => this.unwrapItem(response)));
    }

    restoreUploadedBackup(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<ApiResponseEnvelope<BackupActionResponse> | BackupActionResponse>(`${BACKUP_RESTORE_API}/backups/upload-restore`, formData).pipe(map((response) => this.unwrapItem(response)));
    }

    factoryReset(scope: FactoryResetScope) {
        return this.http.post<ApiResponseEnvelope<BackupActionResponse> | BackupActionResponse>(`${BACKUP_RESTORE_API}/reset`, { scope }).pipe(map((response) => this.unwrapItem(response)));
    }

    deleteBackup(backupId: string) {
        return this.http.delete<ApiResponseEnvelope<BackupActionResponse> | BackupActionResponse>(`${BACKUP_RESTORE_API}/backups/${backupId}`).pipe(map((response) => this.unwrapItem(response)));
    }

    private unwrapItem<T>(response: ApiResponseEnvelope<T> | T): T {
        if (this.isEnvelope(response)) {
            return response.data;
        }

        return response;
    }

    private unwrapList<T>(response: ApiResponseEnvelope<T[]> | T[]): T[] {
        if (this.isEnvelope(response)) {
            return response.data ?? [];
        }

        return response ?? [];
    }

    private isEnvelope<T>(response: ApiResponseEnvelope<T> | T): response is ApiResponseEnvelope<T> {
        return !!response && typeof response === 'object' && 'data' in response;
    }
}
