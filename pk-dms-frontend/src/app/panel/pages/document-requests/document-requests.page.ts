import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import type { PaginatorState } from 'primeng/types/paginator';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '@/app/auth/auth.service';
import { ConfirmationDialogComponent } from '@/app/shared/components/confirmation-dialog/confirmation-dialog.component';
import { LoadingShimmerComponent } from '@/app/shared/components/loading-shimmer/loading-shimmer.component';
import { PaginationComponent } from '@/app/shared/components/pagination/pagination.component';
import { AlertDialogService } from '@/app/shared/services/alert-dialog.service';
import { SystemSettingsService } from '@/app/shared/services/system-settings.service';
import { DataViewMode, DataViewSwitchComponent } from '@/app/shared/components/data-view-switch/data-view-switch.component';
import { RecordCardComponent, RecordGridComponent } from '@/app/shared/components/record-grid/record-grid.component';
import { DocumentFormDialogComponent } from '../documents/components/document-form-dialog/document-form-dialog.component';
import { RevisionUploadDialogComponent } from '../documents/components/revision-upload-dialog/revision-upload-dialog.component';
import { DocumentsService } from '../documents/documents.service';
import {
    AreaReference,
    AssetReference,
    DocumentFormValue,
    DisposalRequestSummary,
    DocumentSummary,
    LocationReference,
    SequenceReference,
    SoftcopyCategoryReference,
    SpecificReference,
    RevisionFormValue,
    RevisionSummary
} from '../documents/documents.types';

@Component({
    selector: 'app-document-requests-page',
    standalone: true,
    imports: [CommonModule, ButtonModule, TableModule, DataViewSwitchComponent, RecordGridComponent, RecordCardComponent, DocumentFormDialogComponent, RevisionUploadDialogComponent, ConfirmationDialogComponent, LoadingShimmerComponent, PaginationComponent],
    template: `
        <app-loading-shimmer *ngIf="loading" label="Loading your document requests" [columns]="6" />
        <section class="requests-page" [style.display]="loading ? 'none' : null">
            <div class="request-heading">
                <div>
                    <span>PERSONAL WORKFLOW</span>
                    <h1>My Requests</h1>
                    <p>Drafts and requests you created, including requests made for another named person.</p>
                </div>
                <p-button
                    *ngIf="canCreateRequest()"
                    label="Create Document Request"
                    icon="pi pi-plus"
                    (onClick)="openCreateDialog()"
                />
            </div>

            <div class="feedback success" *ngIf="successMessage()">{{ successMessage() }}</div>
            <div class="feedback error" *ngIf="errorMessage()">{{ errorMessage() }}</div>

            <nav class="workflow-tabs" aria-label="My request type">
                <button type="button" [class.active]="activeTab === 'documents'" (click)="activeTab = 'documents'"><i class="pi pi-file-edit"></i> Document Requests <span>{{ totalRecords() }}</span></button>
                <button *ngIf="canRequestDisposal()" type="button" [class.active]="activeTab === 'disposals'" (click)="activeTab = 'disposals'"><i class="pi pi-trash"></i> Disposal Requests <span>{{ disposalRequests().length }}</span></button>
            </nav>

            <div class="request-table" *ngIf="activeTab === 'documents'">
                <app-data-view-switch [(mode)]="viewMode" title="Request results" />
                <p-table *ngIf="viewMode === 'list'" [value]="requests()" [loading]="loading" responsiveLayout="scroll">
                    <ng-template pTemplate="header"><tr><th>Document</th><th>Requester</th><th>Status</th><th>Updated</th><th>Reviewer remarks</th><th>Actions</th></tr></ng-template>
                    <ng-template pTemplate="body" let-item><tr>
                        <td><strong>{{ item.document_type === 'HARDCOPY' ? item.document_title : (item.document_number || 'No document number') }}</strong><small>{{ item.document_title }}</small></td>
                        <td>{{ requester(item) }}</td><td><span class="status">{{ statusLabel(item.status) }}</span></td>
                        <td>{{ item.updated_at || item.created_at | date:'medium' }}</td><td>{{ item.reviewer_remarks || 'None' }}</td>
                        <td><div class="row-actions" *ngIf="(item.status === 'Draft' || item.status === 'ForRevision' || item.status === 'ReturnedForCorrection') && (canEditRequest() || canSubmitRequest())">
                            <p-button *ngIf="canEditRequest()" label="Edit" icon="pi pi-pencil" size="small" [outlined]="true" [disabled]="submitting || saving()" (onClick)="openEditDialog(item)" />
                            <p-button *ngIf="canUploadRequestedRevision(item)" label="Upload revision" icon="pi pi-upload" size="small" [outlined]="true" [disabled]="submitting || saving()" (onClick)="openRevisionDialog(item)" />
                            <p-button *ngIf="canSubmitRequest()" [label]="item.status === 'Draft' ? 'Submit' : 'Resubmit'" size="small" [disabled]="submitting || saving()" (onClick)="openSubmitConfirmation(item)" />
                        </div></td>
                    </tr></ng-template>
                    <ng-template pTemplate="emptymessage"><tr><td colspan="6">No requests found.</td></tr></ng-template>
                </p-table>

                <app-record-grid *ngIf="viewMode === 'grid'" [empty]="!requests().length && !loading" emptyTitle="No requests found" emptyMessage="Create a document request to start your workflow.">
                    <app-record-card *ngFor="let item of requests()" icon="pi pi-file-edit" eyebrow="Document request" [title]="item.document_type === 'HARDCOPY' ? item.document_title : (item.document_number || 'No document number')" [subtitle]="item.document_title">
                        <div record-badges><span>{{ statusLabel(item.status) }}</span></div>
                        <div record-details>
                            <div><span>Requester</span><strong>{{ requester(item) }}</strong></div>
                            <div><span>Updated</span><strong>{{ requestUpdatedAt(item) | date:'medium' }}</strong></div>
                            <div class="wide"><span>Reviewer remarks</span><strong>{{ item.reviewer_remarks || 'None' }}</strong></div>
                        </div>
                        <div record-actions *ngIf="(item.status === 'Draft' || item.status === 'ForRevision' || item.status === 'ReturnedForCorrection') && (canEditRequest() || canSubmitRequest())">
                            <p-button *ngIf="canEditRequest()" label="Edit" icon="pi pi-pencil" size="small" [outlined]="true" [disabled]="submitting || saving()" (onClick)="openEditDialog(item)" />
                            <p-button *ngIf="canUploadRequestedRevision(item)" label="Upload revision" icon="pi pi-upload" size="small" [outlined]="true" [disabled]="submitting || saving()" (onClick)="openRevisionDialog(item)" />
                            <p-button *ngIf="canSubmitRequest()" [label]="item.status === 'Draft' ? 'Submit' : 'Resubmit'" size="small" [disabled]="submitting || saving()" (onClick)="openSubmitConfirmation(item)" />
                        </div>
                    </app-record-card>
                </app-record-grid>

                <app-pagination
                    *ngIf="totalRecords() > 0"
                    [first]="(page - 1) * rows"
                    [rows]="rows"
                    [totalRecords]="totalRecords()"
                    [rowsPerPageOptions]="[10, 20, 50, 100]"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} requests"
                    (pageChange)="onPageChange($event)"
                />
            </div>
            <div class="request-table" *ngIf="activeTab === 'disposals'">
                <h2>My Disposal Requests</h2><p class="tab-copy">Track disposal requests separately from new document requests.</p>
                <p-table [value]="disposalRequests()" responsiveLayout="scroll">
                    <ng-template pTemplate="header"><tr><th>Document</th><th>Action</th><th>Reason</th><th>Status</th><th>Requested</th><th>Reviewed by</th><th>Reviewer remarks</th></tr></ng-template>
                    <ng-template pTemplate="body" let-item><tr><td><strong>{{ item.document.document_number || 'No document number' }}</strong><small>{{ item.document.document_title }}</small></td><td><strong>{{ item.disposal_action }}</strong><small *ngIf="item.disposal_action_other">{{ item.disposal_action_other }}</small></td><td>{{ item.disposal_remarks }}</td><td><span class="status disposal-status" [attr.data-status]="item.status">{{ item.status }}</span></td><td>{{ item.created_at | date:'medium' }}</td><td>{{ name(item.reviewer) || (item.status === 'Pending' ? 'Awaiting administrator' : 'N/A') }}</td><td>{{ item.reviewer_remarks || 'None' }}</td></tr></ng-template>
                    <ng-template pTemplate="emptymessage"><tr><td colspan="7">You have not submitted any disposal requests.</td></tr></ng-template>
                </p-table>
            </div>
        </section>

        <app-document-form-dialog
            [(visible)]="createDialogVisible"
            [mode]="documentFormMode"
            [form]="documentForm"
            [areas]="areas()"
            [assets]="assets()"
            [specifics]="specifics()"
            [locations]="locations()"
            [sequences]="sequences()"
            [softcopyCategories]="softcopyCategories()"
            [currentUserName]="currentUserName()"
            [referenceLoading]="referenceLoading()"
            [saving]="saving()"
            (save)="saveRequest($event)"
        />
        <app-confirmation-dialog [(visible)]="submitConfirmationVisible" title="Submit request?" [message]="submitConfirmationMessage()" [confirmLabel]="pendingSubmit?.status === 'ForRevision' ? 'Resubmit' : 'Submit'" tone="primary" (confirm)="confirmSubmit()" (cancel)="clearPendingSubmit()" />
        <app-revision-upload-dialog
            [(visible)]="revisionDialogVisible"
            [form]="revisionForm"
            [saving]="saving()"
            [documentNumber]="revisionDocumentNumber"
            [currentRevision]="revisionCurrent"
            [existingRevisions]="revisionHistory"
            (save)="uploadRequestedRevision($event)"
        />
    `,
    styles: [`
        .requests-page{display:grid;gap:1.25rem}.request-heading,.request-table{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:1.4rem}.request-heading{border-left:6px solid #dc2626;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}.request-heading span{color:#dc2626;font-size:.72rem;font-weight:800;letter-spacing:.14em}.request-heading h1{margin:.25rem 0;color:#111827}.request-heading p,.tab-copy{margin:0;color:#64748b}.request-table h2{margin:0 0 .35rem}.workflow-tabs{display:flex;gap:.65rem;flex-wrap:wrap;padding:.4rem;border-radius:16px;background:#f1f5f9;width:max-content;max-width:100%}.workflow-tabs button{border:0;background:transparent;border-radius:12px;padding:.8rem 1rem;font-weight:800;color:#64748b;cursor:pointer}.workflow-tabs button.active{background:#fff;color:#dc2626;box-shadow:0 4px 14px rgba(15,23,42,.09)}.workflow-tabs button span{margin-left:.45rem;padding:.15rem .45rem;border-radius:999px;background:#e2e8f0;color:#475569;font-size:.72rem}.status{display:inline-block;padding:.35rem .65rem;border-radius:999px;background:#111827;color:#fff;font-size:.75rem;font-weight:700}.disposal-status[data-status="Pending"]{background:#f59e0b}.disposal-status[data-status="Approved"]{background:#15803d}.disposal-status[data-status="Rejected"]{background:#b91c1c}td small{display:block;color:#64748b;margin-top:.25rem}.row-actions{display:flex;gap:.5rem;flex-wrap:wrap}.feedback{border-radius:12px;padding:.85rem 1rem;font-weight:600}.feedback.success{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0}.feedback.error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
    `]
})
export class DocumentRequestsPage implements OnInit {
    private documents = inject(DocumentsService);
    private auth = inject(AuthService);
    private alerts = inject(AlertDialogService);
    private systemSettings = inject(SystemSettingsService);

    requests = signal<DocumentSummary[]>([]);
    disposalRequests = signal<DisposalRequestSummary[]>([]);
    totalRecords = signal(0);
    areas = signal<AreaReference[]>([]);
    assets = signal<AssetReference[]>([]);
    specifics = signal<SpecificReference[]>([]);
    locations = signal<LocationReference[]>([]);
    sequences = signal<SequenceReference[]>([]);
    softcopyCategories = signal<SoftcopyCategoryReference[]>([]);
    referenceLoading = signal(false);
    saving = signal(false);
    successMessage = signal('');
    errorMessage = signal('');
    loading = true;
    createDialogVisible = false;
    submitConfirmationVisible = false;
    submitting = false;
    pendingSubmit: DocumentSummary | null = null;
    documentFormMode: 'create' | 'update' = 'create';
    editingDocumentId = '';
    revisionDialogVisible = false;
    revisionDocumentId = '';
    revisionDocumentNumber = '';
    revisionCurrent: RevisionSummary | null = null;
    revisionHistory: RevisionSummary[] = [];
    revisionForm: RevisionFormValue = this.emptyRevisionForm();
    documentForm = this.emptyDocumentForm();
    viewMode: DataViewMode = 'list';
    page = 1;
    rows = 10;
    activeTab: 'documents' | 'disposals' = 'documents';

    ngOnInit() { this.viewMode = this.systemSettings.defaultDataView(); this.rows = this.systemSettings.defaultRowsPerPage(); this.load(); }

    load() {
        this.loading = true;
        this.documents.listMyRequestsPage(this.page, this.rows).subscribe({
            next: (response) => {
                this.requests.set(response.items ?? []);
                this.totalRecords.set(response.meta?.total ?? response.items?.length ?? 0);
                this.page = response.meta?.page ?? this.page;
                this.loading = false;
            },
            error: () => { this.errorMessage.set('Unable to load your document requests.'); this.loading = false; }
        });
        if (this.canRequestDisposal()) {
            this.documents.listMyDisposalRequests().subscribe({
                next: (items) => this.disposalRequests.set(items ?? []),
                error: () => this.disposalRequests.set([])
            });
        }
    }

    onPageChange(event: PaginatorState) {
        this.page = (event.page ?? 0) + 1;
        this.rows = event.rows ?? this.rows;
        this.load();
    }

    openCreateDialog() {
        this.documentFormMode = 'create';
        this.editingDocumentId = '';
        this.documentForm = this.emptyDocumentForm();
        this.successMessage.set('');
        this.errorMessage.set('');
        this.createDialogVisible = true;
        this.loadReferences();
    }

    openEditDialog(item: DocumentSummary) {
        this.documentFormMode = 'update';
        this.editingDocumentId = item.document_id;
        this.documentForm = {
            document_number: item.document_number || '',
            document_title: item.document_title,
            document_type: item.document_type,
            action: 'DRAFT',
            requester_type: item.requested_by_name ? 'MANUAL_NAME' : 'CURRENT_USER',
            requested_by_name: item.requested_by_name || '',
            asset_id: item.hardcopy?.asset?.asset_id || '',
            area_id: item.hardcopy?.area?.area_id || '',
            specific_id: item.hardcopy?.specific?.specific_id || '',
            location_id: item.hardcopy?.location?.location_id || '',
            sequence_id: item.hardcopy?.sequence?.sequence_id || '',
            softcopy_category_id: item.softcopy?.category?.softcopy_category_id || '',
            initial_revision_number: item.softcopy?.current_revision?.revision_number || '',
            initial_file: null,
            attached_scan_files: [], assigned_user_ids: [],
            workflow_name: item.approver_configuration?.workflow_name || '',
            workflow_version: item.approver_configuration?.workflow_version || 1,
            workflow_steps: (item.workflow_steps || []).map((step) => ({ stage: step.stage, assigned_user_id: step.assignee?.user_id || '' })),
            retention_enabled: item.hardcopy?.retention_enabled ?? false,
            retention_start_date: item.hardcopy?.retention_start_date?.slice(0, 10) || '', retention_end_date: item.hardcopy?.retention_end_date?.slice(0, 10) || ''
        };
        this.successMessage.set('');
        this.errorMessage.set('');
        this.createDialogVisible = true;
        this.loadReferences();
    }

    saveRequest(form: DocumentFormValue) {
        if (this.documentFormMode === 'update' && this.editingDocumentId) {
            this.updateRequest(form);
            return;
        }
        this.createRequest(form);
    }

    createRequest(form: DocumentFormValue) {
        const currentUserId = this.auth.user()?.user_id || '';
        if (!currentUserId) {
            this.errorMessage.set('Your login session could not be identified. Please sign in again.');
            this.alerts.error('Missing session', this.errorMessage());
            return;
        }

        this.saving.set(true);
        this.documents.createDocument(form, currentUserId).subscribe({
            next: () => {
                this.saving.set(false);
                this.createDialogVisible = false;
                this.documentForm = this.emptyDocumentForm();
                this.successMessage.set(form.action === 'DRAFT' ? 'Document request saved as draft.' : 'Document request submitted for approval.');
                this.alerts.success('Document request saved', this.successMessage());
                this.load();
            },
            error: () => {
                this.saving.set(false);
                this.errorMessage.set('Unable to create the document request. Please review the form and try again.');
                this.alerts.error('Unable to create request', this.errorMessage());
            }
        });
    }

    private updateRequest(form: DocumentFormValue) {
        const documentId = this.editingDocumentId;
        this.saving.set(true);
        this.documents.updateDocument(documentId, form).subscribe({
            next: () => {
                this.saving.set(false);
                this.createDialogVisible = false;
                this.editingDocumentId = '';
                this.documentForm = this.emptyDocumentForm();
                this.successMessage.set('Document request changes saved. You can now resubmit it for approval.');
                this.alerts.success('Document request updated', this.successMessage());
                this.load();
            },
            error: () => {
                this.saving.set(false);
                this.errorMessage.set('Unable to save changes to this document request.');
                this.alerts.error('Unable to save request', this.errorMessage());
            }
        });
    }

    openSubmitConfirmation(item: DocumentSummary) {
        this.errorMessage.set('');
        this.pendingSubmit = item;
        this.submitConfirmationVisible = true;
    }

    submitConfirmationMessage() {
        const verb = this.pendingSubmit?.status === 'ForRevision' ? 'resubmit' : 'submit';
        return `Confirm that you want to ${verb} ${this.pendingSubmit?.document_number || 'this document request'} for approval.`;
    }

    confirmSubmit() {
        const item = this.pendingSubmit;
        if (!item || this.submitting) return;
        this.submitting = true;
        this.documents.workflowAction(item.document_id, 'submit').subscribe({
            next: () => {
                this.requests.update((items) => items.map((request) => request.document_id === item.document_id ? { ...request, status: request.document_type === 'SOFTCOPY' ? 'ForNotedBy' : 'ForApproval' } : request));
                this.submitting = false;
                this.clearPendingSubmit();
                this.successMessage.set('Document request submitted for approval.');
                this.alerts.success('Document request submitted', this.successMessage());
                this.load();
            },
            error: () => { this.submitting = false; this.errorMessage.set('Unable to submit this document request.'); this.alerts.error('Unable to submit request', this.errorMessage()); }
        });
    }

    clearPendingSubmit() { this.pendingSubmit = null; this.submitConfirmationVisible = false; }

    canUploadRequestedRevision(item: DocumentSummary) {
        return this.canEditRequest() && (item.status === 'ForRevision' || item.status === 'ReturnedForCorrection') && item.document_type === 'SOFTCOPY';
    }

    openRevisionDialog(item: DocumentSummary) {
        if (!this.canUploadRequestedRevision(item)) return;
        this.saving.set(true);
        forkJoin({
            detail: this.documents.getDocument(item.document_id),
            revisions: this.documents.listRevisions(item.document_id)
        }).subscribe({
            next: ({ detail, revisions }) => {
                this.revisionDocumentId = item.document_id;
                this.revisionDocumentNumber = detail?.document_number || item.document_number || 'No document number';
                this.revisionCurrent = detail?.softcopy?.current_revision || null;
                this.revisionHistory = revisions || [];
                this.revisionForm = this.emptyRevisionForm();
                this.revisionDialogVisible = true;
                this.saving.set(false);
            },
            error: () => {
                this.saving.set(false);
                this.alerts.error('Unable to load revisions', 'The revision history could not be loaded.');
            }
        });
    }

    uploadRequestedRevision(form: RevisionFormValue) {
        if (!this.revisionDocumentId) return;
        this.saving.set(true);
        this.documents.uploadRevision(this.revisionDocumentId, form).subscribe({
            next: () => {
                this.saving.set(false);
                this.revisionDialogVisible = false;
                this.successMessage.set('The revised file was uploaded. You can now resubmit the request for approval.');
                this.alerts.success('Revision uploaded', this.successMessage());
                this.load();
            },
            error: () => {
                this.saving.set(false);
                this.alerts.error('Unable to upload revision', 'Confirm the request is still marked For Revision and try again.');
            }
        });
    }

    canCreateRequest() { return this.auth.hasPermission('document-requests.create'); }
    canEditRequest() { return this.auth.hasPermission('document-requests.edit'); }
    canSubmitRequest() { return this.auth.hasPermission('document-requests.submit'); }
    canRequestDisposal() { return this.auth.hasPermission('document-disposal.request'); }
    currentUserName() { const user = this.auth.user(); return [user?.firstname, user?.lastname].filter(Boolean).join(' ') || user?.email || ''; }
    requester(item: DocumentSummary) { return item.requested_by_name || [item.requester?.firstname, item.requester?.lastname].filter(Boolean).join(' ') || 'Current user'; }
    name(user?: { firstname?: string; lastname?: string } | null) { return [user?.firstname, user?.lastname].filter(Boolean).join(' '); }
    statusLabel(status: DocumentSummary['status']) {
        const labels: Record<string, string> = { Draft: 'Draft', PendingApproval: 'Pending Approval', ForNotedBy: 'For Noted By', ForPlantManagerApproval: 'For Plant Manager Approval', ForDocumentControllerAdmin: 'For Document Controller/Admin Approval', ForApproval: 'For Approval', Approved: 'Approved — Pending Release', Completed: 'Completed / Released', ReturnedForCorrection: 'For Revision', ForRevision: 'For Revision', Rejected: 'Rejected', Cancelled: 'Cancelled', Disposed: 'Disposed' };
        return status ? (labels[status] || status.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')) : 'N/A';
    }
    requestUpdatedAt(item: DocumentSummary) { return (item as DocumentSummary & { updated_at?: string }).updated_at || item.created_at; }

    private loadReferences() {
        this.referenceLoading.set(true);
        forkJoin({
            areas: this.documents.listAreas().pipe(catchError(() => of([] as AreaReference[]))),
            assets: this.documents.listAssetNumbers().pipe(catchError(() => of([] as AssetReference[]))),
            specifics: this.documents.listSpecifics().pipe(catchError(() => of([] as SpecificReference[]))),
            locations: this.documents.listLocations().pipe(catchError(() => of([] as LocationReference[]))),
            sequences: this.documents.listSequences().pipe(catchError(() => of([] as SequenceReference[]))),
            softcopyCategories: this.documents.listSoftcopyCategories().pipe(catchError(() => of([] as SoftcopyCategoryReference[])))
        }).subscribe(({ areas, assets, specifics, locations, sequences, softcopyCategories }) => {
            this.areas.set(areas);
            this.assets.set(assets);
            this.specifics.set(specifics);
            this.locations.set(locations);
            this.sequences.set(sequences);
            this.softcopyCategories.set(softcopyCategories.filter((category) => category.is_active !== false));
            this.referenceLoading.set(false);
        });
    }

    private emptyDocumentForm(): DocumentFormValue {
        return {
            document_number: '', document_title: '', document_type: 'HARDCOPY', action: 'DRAFT',
            requester_type: 'CURRENT_USER', requested_by_name: '', asset_id: '', area_id: '',
            specific_id: '', location_id: '', sequence_id: '', softcopy_category_id: '',
            initial_revision_number: '', initial_file: null, attached_scan_files: [], assigned_user_ids: [],
            workflow_name: 'Direct Hardcopy Approval', workflow_version: 1,
            workflow_steps: [{ stage: 'HARDCOPY_APPROVAL', assigned_user_id: '' }], retention_enabled: false,
            retention_start_date: '', retention_end_date: ''
        };
    }

    private emptyRevisionForm(): RevisionFormValue {
        return { revision_number: '', reason_of_revision: '', effective_date: '', page_number: '', uploaded_by: this.auth.user()?.user_id || '', set_as_current: true, file: null };
    }
}
