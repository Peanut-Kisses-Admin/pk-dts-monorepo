export interface ApiResponseEnvelope<T> {
    success?: boolean;
    path?: string;
    timestamp?: string;
    message?: string;
    data: T;
}

export interface PaginatedMeta {
    total?: number;
    page?: number;
    limit?: number;
    total_pages?: number;
    has_next_page?: boolean;
    has_previous_page?: boolean;
}

export interface PaginatedResponse<T> {
    items: T[];
    meta?: PaginatedMeta;
}

export interface UserRoleSummary {
    role_id: string;
    role_name: string;
    description?: string | null;
}

export interface UserAccountSummary {
    user_id: string;
    firstname: string;
    lastname: string;
    middlename?: string | null;
    age?: number | null;
    address?: string | null;
    phone_number?: string | null;
    email: string;
    position_title?: string | null;
    created_at?: string;
    updated_at?: string;
    role: UserRoleSummary;
    leader_id?: string | null;
    leader?: Pick<UserAccountSummary, 'user_id' | 'firstname' | 'lastname'> | null;
}

export interface UserAccountDetail extends UserAccountSummary {
    created_documents?: unknown[];
    uploaded_revisions?: unknown[];
    applicant_remarks?: string | null;
}

export interface UserDocumentAssignmentOption {
    document_id: string;
    document_number: string | null;
    document_title: string;
    document_type: 'HARDCOPY' | 'SOFTCOPY';
    status: string;
    assigned: boolean;
    hardcopy?: {
        area?: { area_id: string; area_name: string } | null;
        location?: { location_id: string; location_name: string } | null;
        specific?: { specific_id: string; specific_name: string } | null;
        asset?: { asset_id: string; asset_number: string } | null;
        sequence?: { sequence_id: string; sequence_code: string } | null;
    } | null;
    softcopy?: {
        category?: { softcopy_category_id: string; category_name: string; folder_name: string; parent_category_id: string | null } | null;
    } | null;
}

export interface UserAccountFormValue {
    firstname: string;
    lastname: string;
    middlename: string;
    age: string;
    address: string;
    phone_number: string;
    email: string;
    position_title: string;
    password: string;
    role_id: string;
    leader_id: string;
}

export interface RegistrationRequestSummary {
    registration_id: string;
    firstname: string;
    lastname: string;
    middlename?: string | null;
    email: string;
    phone_number?: string | null;
    position_title?: string | null;
    applicant_remarks?: string | null;
    status: 'PENDING';
    created_at: string;
    requested_role: UserRoleSummary;
}
