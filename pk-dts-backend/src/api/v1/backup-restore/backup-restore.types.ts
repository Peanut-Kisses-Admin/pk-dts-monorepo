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
  action:
    | "created"
    | "downloaded"
    | "restored"
    | "deleted"
    | "reset"
    | "synced"
    | "sync_failed";
  backup_id: string;
  file_name: string;
  performed_by: string;
  details?: string;
}

export interface StoredBackupFile {
  backup_id: string;
  file_name: string;
  file_path: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface BackupRestoreSnapshot {
  schema_version: number;
  created_at: string;
  created_by: string;
  summary: {
    permissions: number;
    roles: number;
    role_permissions: number;
    areas: number;
    specifics: number;
    locations: number;
    sequences: number;
    system_sequence_states: number;
    asset_numbers: number;
    users: number;
    documents: number;
    hardcopies: number;
    softcopy_categories?: number;
    softcopies: number;
    revisions: number;
  };
  data: {
    permissions: Array<{
      permission_name: string;
      module_key: string;
      module_label: string;
      action_key: string;
      action_label: string;
      description: string | null;
    }>;
    roles: Array<{
      role_name: string;
      description: string | null;
    }>;
    role_permissions: Array<{
      role_name: string;
      permission_name: string;
    }>;
    areas: Array<{
      area_name: string;
    }>;
    specifics: Array<{
      specific_name: string;
      area_name: string | null;
    }>;
    locations: Array<{
      location_name: string;
      location_code: string | null;
      is_active: boolean;
      archived_at: string | null;
      created_at: string;
      updated_at: string;
    }>;
    sequences: Array<{
      sequence_code: string;
    }>;
    system_sequence_states: Array<{
      sequence_key: string;
      next_value: string;
    }>;
    asset_numbers: Array<{
      asset_number: string;
      created_at: string;
    }>;
    users: Array<{
      email: string;
      firstname: string;
      lastname: string;
      middlename: string | null;
      age: number | null;
      address: string | null;
      phone_number: string | null;
      position_title: string | null;
      password: string;
      require_password_change: boolean;
      role_name: string;
      created_at: string;
      updated_at: string;
    }>;
    documents: Array<{
      document_key?: string;
      document_number: string | null;
      document_title: string;
      document_type: "SOFTCOPY" | "HARDCOPY";
      status: string;
      request_date?: string;
      department?: string | null;
      business_document_type?: string | null;
      action_requested?: string;
      from_party?: string | null;
      to_party?: string | null;
      reason_for_change?: string | null;
      brief_description?: string | null;
      proposed_change?: string | null;
      revision_level_from?: string | null;
      revision_level_to?: string | null;
      previous_effective_date?: string | null;
      new_effective_date?: string | null;
      date_received?: string | null;
      date_released?: string | null;
      approval_date?: string | null;
      legacy_imported?: boolean;
      legacy_import_note?: string | null;
      status_before_disposal: string | null;
      requested_by_name: string | null;
      disposal_remarks: string | null;
      disposed_at: string | null;
      disposed_by_name: string | null;
      created_by_email: string;
      requested_by_email: string | null;
      disposed_by_email: string | null;
      created_at: string;
      updated_at: string;
    }>;
    hardcopies: Array<{
      document_key?: string;
      document_number: string | null;
      asset_number: string | null;
      area_name: string;
      specific_name: string | null;
      location_name: string;
      sequence_code: string | null;
      created_at: string;
    }>;
    softcopy_categories?: Array<{
      category_name: string;
      folder_name: string;
      parent_folder_name?: string | null;
      description: string | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>;
    softcopies: Array<{
      document_key?: string;
      document_number: string | null;
      category_name?: string;
      category_folder_name?: string;
      current_revision_number: string | null;
      created_at: string;
    }>;
      revisions: Array<{
      document_key?: string;
      document_number: string | null;
      revision_number: string;
      reason_of_revision: string | null;
      effective_date: string | null;
      page_number: string | null;
      series_number?: string | null;
      revision_level_from?: string | null;
      revision_level_to?: string | null;
      previous_effective_date?: string | null;
      new_effective_date?: string | null;
      date_received?: string | null;
      date_released?: string | null;
      approval_date?: string | null;
      is_current?: boolean;
      is_historical?: boolean;
      approved_by_email?: string | null;
      approved_at?: string | null;
      file_name: string;
      file_path: string;
      file_size: string | null;
      mime_type: string | null;
      uploaded_by_email: string;
        created_at: string;
        document_title?: string;
      }>;
  };
}
