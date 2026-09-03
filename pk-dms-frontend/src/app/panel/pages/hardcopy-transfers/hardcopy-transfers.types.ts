export type HardcopyTransferStatus = 'Draft' | 'ForApproval' | 'Approved' | 'ForTransfer' | 'Transferred' | 'PendingRecipientAcceptance' | 'Completed' | 'Returned' | 'Rejected' | 'Cancelled';

export interface HardcopyTransferRequest {
    transfer_request_id: string;
    document_id: string;
    document_copy_number: string;
    current_holder?: string | null;
    current_holder_user_id?: string | null;
    transfer_to: string;
    from_area_id?: string | null;
    from_specific_id?: string | null;
    from_asset_id?: string | null;
    from_location_id?: string | null;
    from_sequence_id?: string | null;
    destination_area_id: string;
    destination_specific_id?: string | null;
    destination_asset_id?: string | null;
    destination_location_id: string;
    destination_sequence_id?: string | null;
    from_area?: { area_id: string; area_name: string } | null;
    from_specific?: { specific_id: string; specific_name: string } | null;
    from_asset?: { asset_id: string; asset_number: string } | null;
    from_location?: { location_id: string; location_name: string } | null;
    from_sequence?: { sequence_id: string; sequence_code: string } | null;
    destination_area?: { area_id: string; area_name: string } | null;
    destination_specific?: { specific_id: string; specific_name: string } | null;
    destination_asset?: { asset_id: string; asset_number: string } | null;
    destination_location?: { location_id: string; location_name: string } | null;
    destination_sequence?: { sequence_id: string; sequence_code: string } | null;
    reason: string;
    status: HardcopyTransferStatus;
    recipient_acceptance: 'PENDING' | 'ACCEPTED' | 'REFUSED';
    assigned_recipient?: { user_id: string; firstname: string; lastname: string } | null;
    document?: { document_number?: string | null; document_title: string } | null;
    transfer_date?: string | null;
    acceptance_at?: string | null;
}
