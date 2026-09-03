import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/auth/auth.service';
import { SearchableDropdownComponent, SearchableDropdownOption } from '@/app/shared/components/searchable-dropdown/searchable-dropdown.component';
import { DocumentsService } from '../documents/documents.service';
import { AreaReference, AssetReference, DocumentSummary, DocumentUserSummary, LocationReference, SequenceReference, SpecificReference } from '../documents/documents.types';
import { HardcopyTransfersService } from './hardcopy-transfers.service';
import { HardcopyTransferRequest } from './hardcopy-transfers.types';

@Component({
    selector: 'app-hardcopy-transfers-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, SearchableDropdownComponent],
    template: `
        <section class="space-y-6">
            <header class="page-header flex items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-slate-950 via-stone-900 to-red-900 p-6 text-white shadow-xl"><div><h1>Hardcopy Transfers</h1><p>Move a physical document to a new storage location or classification with a clear approval trail.</p></div><div class="header-mark"><i class="pi pi-box"></i></div></header>
            <article *ngIf="canCreate()" class="transfer-composer overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
                <div class="composer-heading flex items-center justify-between gap-4 border-b border-slate-100 p-6"><div><span class="eyebrow">New request</span><h2>Move a hardcopy</h2><p>Select the document and destination. The current storage route is captured automatically.</p></div><span class="step-chip"><i class="pi pi-shield"></i> Approval required</span></div>
                <div class="form-section border-b border-slate-100 p-6"><div class="section-heading"><span class="section-number">01</span><div><h3>Choose the document</h3><p>Only approved hardcopy documents can be transferred.</p></div></div>
                <div class="grid gap-4 md:grid-cols-2">
                    <app-searchable-dropdown inputId="transfer-document" [value]="form.document_id" [options]="documentOptions()" placeholder="Select approved Hardcopy document" filterPlaceholder="Search Hardcopy documents" (valueChange)="documentChanged($event)" />
                    <div class="field-block">
                        <label for="current-holder">Current Holder</label>
                        <div *ngIf="isHolderAuto()" id="current-holder" class="auto-field"><i class="pi pi-user"></i><span>{{ form.current_holder || 'Current user' }}</span><small>Automatically selected</small></div>
                        <app-searchable-dropdown *ngIf="requiresManualHolder()" inputId="current-holder" [value]="form.current_holder_user_id" [options]="holderOptions()" placeholder="Select Current Holder" filterPlaceholder="Search users" (valueChange)="holderChanged($event)" />
                        <small *ngIf="requiresManualHolder()" class="field-hint">No holder is assigned to this document. Select another user; your own account is excluded.</small>
                    </div>
                </div>
                </div><div class="form-section border-b border-slate-100 p-6"><div class="section-heading"><span class="section-number">02</span><div><h3>Set the destination</h3><p>The selected location determines the destination classification.</p></div></div>
                <div class="grid gap-4 md:grid-cols-2">
                    <app-searchable-dropdown inputId="destination-location" [value]="form.destination_location_id" [options]="locationOptions()" placeholder="Select destination storage location" filterPlaceholder="Search storage locations" (valueChange)="locationChanged($event)" />
                    <div class="storage-summary" *ngIf="form.destination_location_id"><span><i class="pi pi-sitemap"></i> Destination classification</span><strong>{{ storagePath() }}</strong></div>
                    <select [(ngModel)]="form.destination_sequence_id" class="select-field"><option value="">Destination Series / Sequence (optional)</option><option *ngFor="let sequence of sequences" [value]="sequence.sequence_id">{{ sequence.sequence_code }}</option></select>
                </div></div><div class="form-section border-b border-slate-100 p-6"><div class="section-heading"><span class="section-number">03</span><div><h3>Add transfer details</h3><p>Give the approver context for this storage move.</p></div></div><textarea [(ngModel)]="form.reason" class="select-field" rows="3" placeholder="Why is this hardcopy being moved?"></textarea></div>
                <div class="composer-footer flex items-center justify-between gap-4 bg-slate-50 p-4"><p><i class="pi pi-info-circle"></i> After approval and dispatch, the assigned holder confirms physical receipt.</p><p-button label="Submit transfer request" icon="pi pi-send" (onClick)="create()" /></div>
            </article>
            <article *ngIf="canViewOwn()" class="request-panel rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div class="panel-heading"><div><span class="eyebrow">Your activity</span><h2>My transfer requests</h2></div><span class="count-badge">{{ transfers.length }}</span></div>
                <div *ngFor="let transfer of transfers" class="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
                    <div><strong>{{ transfer.document?.document_title || transfer.document_id }}</strong><div class="route-summary"><i class="pi pi-map-marker"></i> {{ destinationLabel(transfer) }}</div></div>
                    <div class="route-summary"><i class="pi pi-map-marker"></i> {{ destinationLabel(transfer) }}</div><div class="flex items-center gap-2"><span class="status">{{ statusLabel(transfer.status) }}</span><p-button *ngIf="transfer.status === 'Draft' && canCreate()" size="small" label="Submit" (onClick)="submit(transfer)" /><p-button *ngIf="transfer.status === 'Returned' && canCreate()" size="small" label="Resubmit" (onClick)="resubmit(transfer)" /><p-button *ngIf="['Draft','ForApproval','Returned'].includes(transfer.status) && canCreate()" size="small" label="Cancel" severity="danger" [outlined]="true" (onClick)="cancel(transfer)" /><p-button *ngIf="transfer.status === 'PendingRecipientAcceptance' && canAccept()" size="small" label="Confirm receipt" severity="success" (onClick)="accept(transfer)" /></div>
                </div>
                <p *ngIf="!transfers.length" class="text-slate-500">No transfer requests yet.</p>
            </article>
            <article *ngIf="canReview()" class="request-panel rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div class="panel-heading"><div><span class="eyebrow">Review queue</span><h2>Transfers awaiting your action</h2></div><span class="count-badge">{{ pendingTransfers.length }}</span></div>
                <div *ngFor="let transfer of pendingTransfers" class="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
                    <div><strong>{{ transfer.document?.document_title || transfer.document_id }}</strong><div class="route-summary"><i class="pi pi-map-marker"></i> {{ destinationLabel(transfer) }}</div></div>
                    <div class="route-summary"><i class="pi pi-map-marker"></i> {{ destinationLabel(transfer) }}</div><div class="transfer-actions"><span class="status">{{ statusLabel(transfer.status) }}</span><input *ngIf="transfer.status === 'ForApproval'" [(ngModel)]="actionComments[transfer.transfer_request_id]" class="action-note" placeholder="Decision remarks" /><p-button *ngIf="transfer.status === 'ForApproval' && canApprove()" size="small" label="Approve" (onClick)="approve(transfer)" /><p-button *ngIf="transfer.status === 'ForApproval' && canApprove()" size="small" label="Return" severity="warn" [outlined]="true" (onClick)="returnForCorrection(transfer)" /><p-button *ngIf="transfer.status === 'ForApproval' && canApprove()" size="small" label="Reject" severity="danger" [outlined]="true" (onClick)="reject(transfer)" /><p-button *ngIf="transfer.status === 'Approved' && canDispatch()" size="small" label="Prepare for transfer" (onClick)="forTransfer(transfer)" /><p-button *ngIf="transfer.status === 'ForTransfer' && canDispatch()" size="small" label="Dispatch" (onClick)="dispatch(transfer)" /></div>
                </div>
                <p *ngIf="!pendingTransfers.length" class="text-slate-500">No transfers are awaiting your action.</p>
            </article>
        </section>
    `,
    styles: [`.select-field{min-height:2.75rem;width:100%;border:1px solid #cbd5e1;border-radius:.75rem;padding:.7rem;background:#fff}.field-block{display:grid;gap:.45rem}.field-block label{font-size:.78rem;font-weight:800;color:#334155}.auto-field{display:flex;align-items:center;gap:.55rem;min-height:2.75rem;border:1px solid #dbeafe;border-radius:.75rem;background:#f8fbff;padding:.7rem .8rem;color:#1e3a8a}.auto-field i{color:#2563eb}.auto-field span{font-weight:700}.auto-field small{margin-left:auto;color:#64748b;font-size:.7rem}.field-hint{color:#64748b;font-size:.72rem;line-height:1.4}.storage-summary{display:grid;gap:.3rem;border:1px solid #dbeafe;border-radius:.85rem;background:#f8fbff;padding:.75rem .85rem;color:#475569}.storage-summary span{font-size:.72rem;font-weight:700}.storage-summary span i{margin-right:.3rem;color:#2563eb}.storage-summary strong{color:#0f172a;font-size:.82rem}.status{border-radius:999px;background:#eff6ff;padding:.35rem .7rem;font-size:.8rem;font-weight:700}.transfer-actions{display:flex;align-items:center;justify-content:flex-end;gap:.45rem;flex-wrap:wrap}.action-note{min-height:2.35rem;min-width:12rem;border:1px solid #cbd5e1;border-radius:.65rem;padding:.5rem .65rem}`]
})
export class HardcopyTransfersPage implements OnInit {
    private documentsService = inject(DocumentsService);
    private service = inject(HardcopyTransfersService);
    private auth = inject(AuthService);
    hardcopies: DocumentSummary[] = [];
    users: DocumentUserSummary[] = [];
    areas: AreaReference[] = [];
    specifics: SpecificReference[] = [];
    assets: AssetReference[] = [];
    locations: LocationReference[] = [];
    sequences: SequenceReference[] = [];
    transfers: HardcopyTransferRequest[] = [];
    pendingTransfers: HardcopyTransferRequest[] = [];
    actionComments: Record<string, string> = {};
    form = { document_id: '', current_holder: '', current_holder_user_id: '', destination_area_id: '', destination_specific_id: '', destination_asset_id: '', destination_location_id: '', destination_sequence_id: '', reason: '' };
    ngOnInit() { if (this.canCreate()) { forkJoin({ documents: this.documentsService.listDocuments(), users: this.documentsService.listUsers(), areas: this.documentsService.listAreas(), specifics: this.documentsService.listSpecifics(), assets: this.documentsService.listAssetNumbers(), locations: this.documentsService.listLocations(), sequences: this.documentsService.listSequences() }).subscribe(({ documents, users, areas, specifics, assets, locations, sequences }) => { this.hardcopies = documents.filter((item) => item.document_type === 'HARDCOPY' && ['Approved', 'Completed'].includes(item.status || '')); this.users = users; this.areas = areas; this.specifics = specifics; this.assets = assets; this.locations = locations; this.sequences = sequences; }); } this.load(); }
    load() { if (this.canViewOwn()) this.service.mine().subscribe((items) => this.transfers = items); if (this.canReview()) this.service.pending().subscribe((items) => this.pendingTransfers = items); }
    create() {
        if (!this.form.document_id || !this.form.destination_location_id || !this.form.reason.trim()) return;
        if (this.requiresManualHolder() && !this.form.current_holder_user_id) return;
        const { current_holder: _currentHolder, ...payload } = this.form;
        this.service.create(payload).subscribe((transfer) => {
            this.service.submit(transfer.transfer_request_id).subscribe(() => {
                this.form = { document_id: '', current_holder: '', current_holder_user_id: '', destination_area_id: '', destination_specific_id: '', destination_asset_id: '', destination_location_id: '', destination_sequence_id: '', reason: '' };
                this.load();
            });
        });
    }
    submit(transfer: HardcopyTransferRequest) { this.service.submit(transfer.transfer_request_id).subscribe(() => this.load()); }
    accept(transfer: HardcopyTransferRequest) { this.service.accept(transfer.transfer_request_id).subscribe(() => this.load()); }
    approve(transfer: HardcopyTransferRequest) { this.service.approve(transfer.transfer_request_id, this.actionComments[transfer.transfer_request_id] || '').subscribe(() => this.load()); }
    returnForCorrection(transfer: HardcopyTransferRequest) { const remarks=this.actionComments[transfer.transfer_request_id]?.trim(); if(!remarks)return; this.service.returnForCorrection(transfer.transfer_request_id,remarks).subscribe(()=>this.load()); }
    reject(transfer: HardcopyTransferRequest) { const remarks=this.actionComments[transfer.transfer_request_id]?.trim(); if(!remarks)return; this.service.reject(transfer.transfer_request_id,remarks).subscribe(()=>this.load()); }
    resubmit(transfer: HardcopyTransferRequest) { this.service.resubmit(transfer.transfer_request_id).subscribe(()=>this.load()); }
    cancel(transfer: HardcopyTransferRequest) { this.service.cancel(transfer.transfer_request_id).subscribe(()=>this.load()); }
    forTransfer(transfer: HardcopyTransferRequest) { this.service.forTransfer(transfer.transfer_request_id).subscribe(() => this.load()); }
    dispatch(transfer: HardcopyTransferRequest) { this.service.dispatch(transfer.transfer_request_id).subscribe(() => this.service.awaitAcceptance(transfer.transfer_request_id).subscribe(() => this.load())); }
    canCreate() { return this.auth.hasPermission('hardcopy-transfers.create'); }
    canViewOwn() { return this.auth.hasPermission('hardcopy-transfers.view-own'); }
    canReview() { return this.auth.hasPermission('hardcopy-transfers.review'); }
    canApprove() { return this.auth.hasPermission('hardcopy-transfers.approve'); }
    canDispatch() { return this.auth.hasPermission('hardcopy-transfers.dispatch'); }
    canAccept() { return this.auth.hasPermission('hardcopy-transfers.accept'); }
    fullName(user: DocumentUserSummary) { return [user.firstname, user.lastname].filter(Boolean).join(' '); }
    currentUserId() { return this.auth.user()?.user_id || ''; }
    documentOptions(): SearchableDropdownOption[] { return this.hardcopies.map((document) => ({ value: document.document_id, label: document.document_title })); }
    locationOptions(): SearchableDropdownOption[] { return this.locations.map((location) => ({ value: location.location_id, label: `${location.location_name}${location.location_code ? ` · ${location.location_code}` : ''}` })); }
    holderOptions(): SearchableDropdownOption[] { return this.users.filter((user) => user.user_id !== this.currentUserId()).map((user) => ({ value: user.user_id, label: this.fullName(user) || user.email || user.user_id })); }
    selectedDocument() { return this.hardcopies.find((document) => document.document_id === this.form.document_id); }
    assignedHolder() { return this.selectedDocument()?.assignments?.find((assignment) => assignment.user.user_id !== this.currentUserId())?.user || null; }
    isHolderAuto() { return !this.auth.isAdministrator() || !!this.assignedHolder(); }
    requiresManualHolder() { return this.auth.isAdministrator() && !!this.form.document_id && !this.assignedHolder(); }
    documentChanged(value: string | number | null) {
        this.form.document_id = String(value || '');
        const assigned = this.assignedHolder();
        if (this.auth.isAdministrator() && assigned && assigned.user_id !== this.currentUserId()) {
            this.form.current_holder_user_id = assigned.user_id;
            this.form.current_holder = this.fullName(assigned);
        } else if (!this.auth.isAdministrator()) {
            const current = this.auth.user();
            this.form.current_holder_user_id = current?.user_id || '';
            this.form.current_holder = current ? this.fullName(current) : '';
        } else {
            this.form.current_holder_user_id = '';
            this.form.current_holder = '';
        }
    }
    holderChanged(value: string | number | null) {
        this.form.current_holder_user_id = String(value || '');
        const holder = this.users.find((user) => user.user_id === this.form.current_holder_user_id);
        this.form.current_holder = holder ? this.fullName(holder) : '';
    }
    locationChanged(value: string | number | null) {
        this.form.destination_location_id = String(value || '');
        const location = this.locations.find((item) => item.location_id === this.form.destination_location_id);
        if (!location) {
            this.form.destination_area_id = '';
            this.form.destination_specific_id = '';
            this.form.destination_asset_id = '';
            return;
        }
        this.form.destination_asset_id = location.asset_id || '';
        this.form.destination_specific_id = location.specific_id || location.asset?.specific_id || '';
        this.form.destination_area_id = location.specific?.area_id || location.asset?.specific?.area_id || '';
    }
    storagePath() {
        const location = this.locations.find((item) => item.location_id === this.form.destination_location_id);
        const area = this.areas.find((item) => item.area_id === this.form.destination_area_id)?.area_name;
        const specific = this.specifics.find((item) => item.specific_id === this.form.destination_specific_id)?.specific_name;
        const asset = this.assets.find((item) => item.asset_id === this.form.destination_asset_id)?.asset_number;
        return [area, specific, asset, location?.location_name].filter(Boolean).join(' / ');
    }
    destinationLabel(transfer: HardcopyTransferRequest) { return [transfer.destination_area?.area_name, transfer.destination_specific?.specific_name, transfer.destination_asset?.asset_number, transfer.destination_location?.location_name].filter(Boolean).join(' / ') || 'Destination storage'; }
    statusLabel(status: string) { return ({ Draft: 'Draft', ForApproval: 'For Approval', Approved: 'Approved', ForTransfer: 'For Transfer', Transferred: 'Transferred', PendingRecipientAcceptance: 'Pending Recipient Acceptance', Completed: 'Completed', Returned: 'Returned for Correction', Rejected: 'Rejected', Cancelled: 'Cancelled' } as Record<string, string>)[status] || status.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' '); }
}
