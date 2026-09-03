export type DocumentAccessRequestStatus = 'PENDING' | 'ForAccessApproval' | 'APPROVED' | 'AccessGranted' | 'RETURNED' | 'REJECTED' | 'CANCELLED' | 'REVOKED' | 'EXPIRED';

export interface AccessRequestLocation {
    location_id: string;
    location_name: string;
    location_code?: string | null;
}

export interface AccessRequestDocument {
    document_id: string;
    document_number?: string | null;
    document_title: string;
    document_type: 'SOFTCOPY' | 'HARDCOPY';
    status: string;
    hardcopy?: { area?: { area_name: string } | null; location?: { location_name: string } | null } | null;
    softcopy?: { category?: { category_name: string; folder_name: string } | null } | null;
    access_request?: Pick<DocumentAccessRequest, 'access_request_id' | 'status' | 'request_reason' | 'reviewer_remarks' | 'created_at' | 'reviewed_at'> | null;
}

export interface AccessRequestUser {
    user_id: string;
    firstname: string;
    lastname: string;
    email: string;
    position_title?: string | null;
}

export interface DocumentAccessRequest {
    access_request_id: string;
    document_id: string;
    requested_by_user_id: string;
    request_reason?: string | null;
    status: DocumentAccessRequestStatus;
    reviewer_remarks?: string | null;
    reviewed_at?: string | null;
    created_at: string;
    updated_at: string;
    document: AccessRequestDocument;
    requester: AccessRequestUser;
    reviewer?: AccessRequestUser | null;
    approver?: AccessRequestUser | null;
    approval_stage?: string | null;
    granted_at?: string | null;
    revoked_at?: string | null;
    expires_at?: string | null;
}

export interface AccessRequestPage<T> {
    items: T[];
    meta?: { total?: number; page?: number; limit?: number; total_pages?: number };
}
