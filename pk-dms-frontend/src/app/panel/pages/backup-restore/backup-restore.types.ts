export interface ApiResponseEnvelope<T> {
    success?: boolean;
    path?: string;
    timestamp?: string;
    message?: string;
    data: T;
}

export interface BackupListItem {
    backup_id: string;
    file_name: string;
    created_at: string;
    created_by: string;
    size_bytes: number;
    record_count: number;
    schema_version: number;
}

export interface BackupLogItem {
    timestamp: string;
    action: 'created' | 'downloaded' | 'restored' | 'deleted' | 'reset';
    backup_id: string;
    file_name: string;
    performed_by: string;
    details?: string;
}

export interface BackupActionResponse {
    backup_id: string;
    file_name?: string;
    restored?: boolean;
    deleted?: boolean;
    reset?: boolean;
    scope?: FactoryResetScope;
    deleted_documents?: number;
    restored_at?: string;
}

export type FactoryResetScope = 'ALL' | 'SOFTCOPY' | 'HARDCOPY';
