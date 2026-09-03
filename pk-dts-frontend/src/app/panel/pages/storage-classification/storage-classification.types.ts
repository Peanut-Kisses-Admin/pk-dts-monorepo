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

export interface AreaSummary {
    area_id: string;
    area_name: string;
    specifics?: SpecificSummary[];
}

export interface SpecificSummary {
    specific_id: string;
    specific_name: string;
    area_id?: string | null;
    area?: AreaSummary | null;
}

export interface AssetNumberSummary {
    asset_id: string;
    asset_number: string;
    created_at?: string;
    specific_id?: string | null;
    specific?: SpecificSummary | null;
    locations?: LocationSummary[];
    hardcopy?: {
        hardcopy_id?: string;
        document_id?: string;
        created_at?: string;
        document?: {
            document_id?: string;
            document_number?: string;
            document_title?: string;
            document_type?: string;
            status?: string;
        } | null;
        area?: AreaSummary | null;
        specific?: SpecificSummary | null;
        location?: LocationSummary | null;
        sequence?: SequenceSummary | null;
    } | null;
}

export interface LocationSummary {
    location_id: string;
    location_name: string;
    location_code?: string | null;
    is_active?: boolean;
    archived_at?: string | null;
    asset_id?: string | null;
    asset?: AssetNumberSummary | null;
    specific_id?: string | null;
    specific?: SpecificSummary | null;
}

export interface SequenceSummary {
    sequence_id: string;
    sequence_code: string;
}

export interface AreaDetail extends AreaSummary {
    hardcopies?: unknown[];
}

export interface SpecificDetail extends SpecificSummary {
    hardcopies?: unknown[];
}

export interface AssetNumberDetail extends AssetNumberSummary {}

export interface LocationDetail extends LocationSummary {
    hardcopies?: unknown[];
}

export interface SequenceDetail extends SequenceSummary {
    hardcopies?: unknown[];
}

export interface SoftcopyCategorySummary {
    softcopy_category_id: string;
    category_name: string;
    folder_name: string;
    description?: string | null;
    is_active?: boolean;
    parent_category_id?: string | null;
    parent?: Pick<SoftcopyCategorySummary, 'softcopy_category_id' | 'category_name' | 'folder_name'> | null;
    subcategories?: SoftcopyCategorySummary[];
    created_at?: string;
    _count?: { softcopies?: number; subcategories?: number };
}

export interface SoftcopyCategoryDetail extends SoftcopyCategorySummary {
    softcopies?: Array<{ document?: { document_number?: string; document_title?: string } }>;
}

export type StorageResourceKey = 'areas' | 'assetNumbers' | 'specifics' | 'locations' | 'sequences' | 'softcopyCategories';

export interface StorageResourceFormValue {
    primary: string;
    area_id: string;
    specific_id?: string;
    asset_id?: string;
    parent_category_id?: string;
}
