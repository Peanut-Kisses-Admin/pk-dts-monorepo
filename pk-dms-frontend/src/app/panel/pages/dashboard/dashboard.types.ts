export interface ApiResponseEnvelope<T> {
    success?: boolean;
    path?: string;
    timestamp?: string;
    message?: string;
    data: T;
}

export interface DashboardCounterSet {
    documents: number;
    approved_documents: number;
    disposed_documents: number;
    users: number;
    roles: number;
    permissions: number;
    areas: number;
    specifics: number;
    locations: number;
    sequences: number;
    asset_numbers: number;
    hardcopies: number;
    softcopies: number;
    revisions: number;
}

export interface DashboardRecentDocumentItem {
    document_id: string;
    document_number: string | null;
    document_title: string;
    document_type: 'HARDCOPY' | 'SOFTCOPY';
    status: 'Draft' | 'PendingApproval' | 'Approved' | 'Rejected' | 'Revised' | 'Disposed';
    created_at: string;
    creator_name: string;
    current_revision_number: string | null;
    storage_summary: string;
}

export interface DashboardRecentUserItem {
    user_id: string;
    full_name: string;
    email: string;
    role_name: string;
    created_at: string;
}

export interface DashboardSummary {
    counters: DashboardCounterSet;
    recent_documents: DashboardRecentDocumentItem[];
    recent_users: DashboardRecentUserItem[];
    generated_at: string;
}

export interface NavigationNotificationCounts {
    approval_review: number;
    document_requests: number;
    disposal_requests: number;
    access_requests: number;
    hardcopy_transfers: number;
    user_accounts: number;
}
