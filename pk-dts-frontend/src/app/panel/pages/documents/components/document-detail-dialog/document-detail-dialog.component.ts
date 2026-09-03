import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { firstValueFrom } from 'rxjs';
import { SystemSettingsService } from '@/app/shared/services/system-settings.service';
import { DocumentDetail, DocumentUserSummary, DocumentWorkflowStepSummary, RevisionSummary } from '../../documents.types';
import { DocumentsService } from '../../documents.service';

type PreviewKind = 'idle' | 'loading' | 'image' | 'pdf' | 'office' | 'unsupported' | 'error';

@Component({
    selector: 'app-document-detail-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule],
    template: `
        <p-dialog
            [(visible)]="visible"
            [modal]="true"
            [draggable]="false"
            [resizable]="false"
            [dismissableMask]="true"
            [blockScroll]="true"
            [focusOnShow]="false"
            [appendTo]="'body'"
            [style]="{ width: '78rem', maxWidth: '97vw' }"
            [breakpoints]="{ '1100px': '95vw', '640px': '98vw' }"
            header="Document Details"
            (onShow)="handleShow()"
            (onHide)="handleHide()"
        >
            <ng-container *ngIf="document">
                <div class="document-detail-shell" [class.document-detail-softcopy]="document.document_type === 'SOFTCOPY'">
                <div class="document-hero" [class.hardcopy]="document.document_type === 'HARDCOPY'">
                    <div class="hero-icon"><i [class]="document.document_type === 'SOFTCOPY' ? 'pi pi-file' : 'pi pi-box'"></i></div>
                    <div class="hero-copy">
                        <div class="hero-kicker">{{ document.document_type === 'SOFTCOPY' ? 'Digital document' : 'Physical document' }}</div>
                        <h2>{{ document.document_title }}</h2>
                        <div class="hero-meta">
                            <span *ngIf="document.document_type === 'SOFTCOPY'"><i class="pi pi-hashtag"></i>{{ document.document_number || 'No document number' }}</span>
                            <span><i class="pi pi-calendar"></i>{{ formatDate(document.created_at) }}</span>
                        </div>
                    </div>
                    <div class="hero-badges">
                        <span class="type-badge">{{ document.document_type }}</span>
                        <span class="status-badge">{{ statusLabel(document.status) }}</span>
                    </div>
                </div>

                <div class="summary-strip" aria-label="Document ownership and access">
                    <div class="summary-card"><span class="summary-card-icon"><i class="pi pi-user"></i></span><div><span>Created by</span><strong>{{ fullName(document.creator) || 'Unknown' }}</strong></div></div>
                    <div *ngIf="hasRequester()" class="summary-card"><span class="summary-card-icon"><i class="pi pi-send"></i></span><div><span>Requested by</span><strong>{{ document.requested_by_name || fullName(document.requester) }}</strong></div></div>
                    <div *ngIf="document.assignments?.length" class="summary-card"><span class="summary-card-icon"><i class="pi pi-users"></i></span><div><span>Access assignment</span><strong [title]="assignmentUsersLabel()">{{ assignmentUsersLabel() }}</strong><small>{{ assignmentActorLabel() }}</small></div></div>
                    <div *ngIf="document.document_type === 'SOFTCOPY' && document.softcopy?.current_revision?.revision_number" class="summary-card"><span class="summary-card-icon accent"><i class="pi pi-history"></i></span><div><span>Current revision</span><strong>{{ document.softcopy?.current_revision?.revision_number }}</strong></div></div>
                </div>

                <div *ngIf="document.document_type === 'SOFTCOPY'" class="softcopy-view-hint">
                    <span class="softcopy-view-hint-icon"><i class="pi pi-shield"></i></span>
                    <div><strong>Controlled softcopy record</strong><span>Review the approval path, request information, and preserved revision history in one place.</span></div>
                    <span class="softcopy-view-only"><i class="pi pi-lock"></i> View only</span>
                </div>

                <section *ngIf="document.workflow_steps?.length" class="approval-route-panel">
                    <div class="approval-route-heading">
                        <span class="section-icon"><i class="pi pi-sitemap"></i></span>
                        <div><span>Approval workflow</span><h3>{{ document.approver_configuration?.workflow_name || 'Document approval route' }}</h3><small>Version {{ document.approver_configuration?.workflow_version || 1 }} · named assignees and actual actors are preserved separately</small></div>
                    </div>
                    <div class="approval-route-list">
                        <article *ngFor="let step of document.workflow_steps; let index = index" class="approval-route-step" [class.completed]="step.status === 'APPROVED'" [class.current]="step.status === 'PENDING' && isCurrentWorkflowStep(step)">
                            <span class="approval-step-number"><i *ngIf="step.status === 'APPROVED'" class="pi pi-check"></i><ng-container *ngIf="step.status !== 'APPROVED'">{{ index + 1 }}</ng-container></span>
                            <div class="approval-step-copy">
                                <span>{{ step.stage_label || workflowStepLabel(step) }}</span>
                                <strong>{{ workflowStepPerson(step) }}</strong>
                                <small>{{ workflowStepPosition(step) }} · {{ workflowStepStatusLabel(step) }}</small>
                                <small *ngIf="step.acted_at">Acted {{ formatDate(step.acted_at) }}</small>
                            </div>
                            <div *ngIf="canConfigureWorkflow && step.status === 'PENDING'" class="workflow-reassign-controls">
                                <select [ngModel]="workflowReassignments[step.workflow_step_id]?.user_id || ''" (ngModelChange)="setWorkflowReassignment(step.workflow_step_id, 'user_id', $event)" class="workflow-select" [disabled]="!!workflowReassignments[step.workflow_step_id]?.saving">
                                    <option value="">Select replacement approver</option>
                                    <option *ngFor="let user of users" [value]="user.user_id">{{ workflowUserOptionLabel(user) }}</option>
                                </select>
                                <input [ngModel]="workflowReassignments[step.workflow_step_id]?.reason || ''" (ngModelChange)="setWorkflowReassignment(step.workflow_step_id, 'reason', $event)" placeholder="Reason for reassignment" maxlength="1000" [disabled]="!!workflowReassignments[step.workflow_step_id]?.saving" />
                                <button type="button" [disabled]="!canSubmitWorkflowReassignment(step)" (click)="reassignWorkflowStep(step)"><i class="pi pi-user-edit"></i>{{ workflowReassignments[step.workflow_step_id]?.saving ? 'Saving...' : 'Reassign' }}</button>
                                <small *ngIf="workflowReassignments[step.workflow_step_id]?.error" class="workflow-reassign-error">{{ workflowReassignments[step.workflow_step_id]?.error }}</small>
                            </div>
                        </article>
                    </div>
                </section>

                <div class="workspace-grid single-column">
                    <section class="info-panel storage-panel">
                        <div class="section-heading">
                            <span class="section-icon"><i class="pi pi-info-circle"></i></span>
                            <div><span>Record overview</span><h3>{{ document.document_type === 'SOFTCOPY' ? 'Digital file journey' : 'Hardcopy location' }}</h3><small class="section-subtitle">{{ document.document_type === 'SOFTCOPY' ? 'Follow where this controlled file is stored and approved.' : 'Follow the current physical storage route.' }}</small></div>
                        </div>

                        <div *ngIf="document.document_type === 'SOFTCOPY'; else hardcopyInformation" class="digital-visual">
                            <div class="digital-route-heading"><i [class]="digitalJourneyComplete ? 'pi pi-check-circle' : 'pi pi-cloud'"></i><div><span>Digital document path</span><strong>{{ digitalJourneyStatus() }}</strong></div><button type="button" (click)="replayDigitalJourney()" [disabled]="!softcopyJourneySteps().length"><i class="pi pi-replay"></i> Replay journey</button></div>
                            <div class="digital-live-progress" role="progressbar" [attr.aria-label]="digitalJourneyStatus()" [attr.aria-valuenow]="digitalJourneyProgress()" aria-valuemin="0" aria-valuemax="100"><span [style.width.%]="digitalJourneyProgress()"><i class="pi pi-file"></i></span></div>
                            <div *ngIf="digitalJourneyVisible" class="digital-route" [class.digital-journey-complete]="digitalJourneyComplete" aria-label="Digital document path">
                                <ng-container *ngFor="let step of softcopyJourneySteps(); let last = last; let index = index">
                                    <div class="digital-node" [class.current-file-node]="last" [class.digital-node-visited]="index < digitalJourneyStage" [class.digital-node-active]="index === digitalJourneyStage"><i [class]="step.icon"></i><span>{{ index === 0 ? 'Start · ' + step.label : last ? 'Current · ' + step.label : step.label }}</span><strong>{{ step.value }}</strong></div>
                                    <span *ngIf="!last" class="digital-connector" [class.digital-connector-complete]="index < digitalJourneyStage" [class.digital-connector-active]="index === digitalJourneyStage" aria-hidden="true"><i class="pi pi-file digital-traveler"></i><i class="pi pi-angle-right"></i></span>
                                </ng-container>
                            </div>
                            <div *ngIf="document.softcopy?.current_revision as current" class="digital-file-actions">
                                <div><span>Ready to use</span><strong>{{ current.file_name }}</strong></div>
                                <button *ngIf="canAccessFiles" type="button" (click)="openRevision(current)"><i class="pi pi-external-link"></i>Open file</button>
                                <button *ngIf="canAccessFiles && isStampableOfficeRevision(current)" type="button" [disabled]="downloadInProgress" (click)="downloadRevision(current, 'controlled')"><i class="pi pi-shield"></i>{{ downloadInProgress ? 'Preparing copy...' : 'Download controlled copy' }}</button>
                                <button *ngIf="canAccessFiles" type="button" [disabled]="downloadInProgress" (click)="downloadRevision(current, 'uncontrolled')"><i class="pi pi-download"></i>{{ downloadInProgress ? 'Preparing copy...' : 'Download uncontrolled copy' }}</button>
                                <small *ngIf="isStampableOfficeRevision(current)" class="controlled-file-note">DOCX and Excel downloads include an embedded controlled or uncontrolled stamp. The original revision remains unchanged.</small>
                                <small *ngIf="!isStampableOfficeRevision(current)" class="controlled-file-note">This file is downloaded from the original revision. The original revision remains unchanged.</small>
                                <small *ngIf="downloadError" class="download-error"><i class="pi pi-exclamation-triangle"></i>{{ downloadError }}</small>
                            </div>
                        </div>

                        <ng-template #hardcopyInformation>
                            <div class="physical-visual">
                                <div class="shelf-icon"><i class="pi pi-map-marker"></i></div>
                                <div class="route-content">
                                    <div class="route-guide-head">
                                        <div><span>Physical storage route</span><strong><i [class]="routeJourneyComplete ? 'pi pi-check-circle' : 'pi pi-compass'"></i> {{ routeJourneyStatus() }}</strong></div>
                                        <button type="button" (click)="replayPhysicalRoute()" [disabled]="!hasHardcopyRoute()"><i class="pi pi-replay"></i> Replay journey</button>
                                    </div>
                                    <div *ngIf="hasHardcopyRoute()" class="route-live-progress" role="progressbar" [attr.aria-label]="routeJourneyStatus()" [attr.aria-valuenow]="routeJourneyProgress()" aria-valuemin="0" aria-valuemax="100"><span [style.width.%]="routeJourneyProgress()"><i class="pi pi-map-marker"></i></span></div>
                                    <div *ngIf="hasHardcopyRoute()" class="route-steps" [class.route-journey-complete]="routeJourneyComplete" aria-label="Physical storage route">
                                        <ng-container *ngFor="let step of hardcopyRouteSteps(); let last = last; let index = index">
                                            <div class="route-node" [class.route-destination]="last" [class.route-visited]="index < routeJourneyStage" [class.route-current]="index === routeJourneyStage" [style.--route-delay]="(index * 1.45) + 's'">
                                                <i [class]="step.icon"></i><span>{{ index === 0 ? 'Start · ' + step.label : last ? 'Destination · ' + step.label : 'Stop ' + (index + 1) + ' · ' + step.label }}</span><strong>{{ step.value }}</strong>
                                                <small *ngIf="last"><i class="pi pi-flag-fill"></i> Final mapped point</small>
                                            </div>
                                            <span *ngIf="!last" class="route-connector" [class.route-connector-complete]="index < routeJourneyStage" [class.route-connector-active]="index === routeJourneyStage" aria-hidden="true">
                                                <i class="pi pi-user route-walker"></i><i class="pi pi-angle-right route-arrow"></i>
                                            </span>
                                        </ng-container>
                                    </div>
                                    <small *ngIf="hasHardcopyRoute()">Follow the connected path from the first available storage point to the final reference.</small>
                                    <small *ngIf="!hasHardcopyRoute()">No physical storage route has been mapped.</small>
                                    <div *ngIf="document.hardcopy?.retention" class="retention-detail" [class.retention-detail-alert]="(document.hardcopy?.retention?.days_remaining ?? 999999) <= 30">
                                        <i class="pi pi-clock"></i>
                                        <div><strong>{{ document.hardcopy?.retention?.label }}</strong><span>{{ document.hardcopy?.retention?.guidance }}</span><small *ngIf="document.hardcopy?.retention?.enabled">{{ formatDate(document.hardcopy?.retention?.start_date || undefined) }} to {{ formatDate(document.hardcopy?.retention?.end_date || undefined) }}</small></div>
                                    </div>
                                </div>
                            </div>
                        </ng-template>

                        <div *ngIf="document.status === 'Disposed'" class="disposal-note">
                            <i class="pi pi-exclamation-triangle"></i>
                            <div><strong>Disposed record</strong><span>{{ document.disposal_remarks || 'No remarks recorded' }}</span><small>{{ document.disposed_by_name || fullName(document.disposer) || 'Unknown' }} · {{ formatDate(document.disposed_at || undefined) }}</small></div>
                        </div>
                    </section>

                </div>

                <details *ngIf="document.document_type === 'SOFTCOPY'" class="softcopy-record-section">
                    <summary class="metadata-section-heading">
                        <div class="section-heading">
                            <span class="section-icon"><i class="pi pi-file-edit"></i></span>
                            <div><span>Complete record</span><h3>Document Control Request information</h3><small class="section-subtitle">Request fields and system-recorded control dates</small></div>
                        </div>
                        <span class="metadata-section-caption"><i class="pi pi-lock"></i> View only</span>
                    </summary>
                    <div class="metadata-grid">
                        <div *ngFor="let item of softcopyDocumentRows()" class="metadata-item" [class.metadata-item-wide]="item.wide">
                            <span>{{ item.label }}</span><strong [class.breakable]="item.breakable">{{ item.value || 'Not recorded' }}</strong>
                        </div>
                    </div>
                </details>

                <section *ngIf="supportingEvidenceCount() || document.document_type === 'SOFTCOPY'" class="revisions-section">
                    <ng-container *ngIf="supportingEvidenceCount()">
                    <div class="revisions-title"><div class="evidence-heading"><span class="section-icon"><i class="pi pi-paperclip"></i></span><div><span>Supporting evidence</span><h3>Attached scan documents</h3></div></div><strong>{{ supportingEvidenceCount() }} file{{ supportingEvidenceCount() === 1 ? '' : 's' }}</strong></div>
                    <div *ngIf="supportingEvidenceCount(); else noAttachments" class="attachment-list">
                        <a *ngIf="document.softcopy?.current_revision as currentFile" [href]="canAccessFiles && !isStampableOfficeRevision(currentFile) ? revisionLink(currentFile) : null" target="_blank" rel="noopener" [class.disabled]="!canAccessFiles" (click)="openRevisionLink($event, currentFile)">
                            <i [class]="revisionIcon(currentFile)"></i><span><strong>{{ currentFile.file_name || 'Current softcopy file' }}</strong><small>Current softcopy file · Revision {{ currentFile.revision_number }}</small></span><i class="pi pi-external-link"></i>
                        </a>
                        <a *ngFor="let attachment of documentAttachments()" [href]="canAccessFiles ? attachment.file_url : null" target="_blank" rel="noopener" [class.disabled]="!canAccessFiles">
                            <i class="pi pi-paperclip"></i><span><strong>{{ attachment.file_name }}</strong><small>{{ attachment.mime_type || 'File' }} · {{ formatDate(attachment.created_at) }}</small></span><i class="pi pi-external-link"></i><button *ngIf="canDeleteAttachments" type="button" title="Delete attachment" (click)="$event.preventDefault(); $event.stopPropagation(); attachmentDelete.emit(attachment.attachment_id)"><i class="pi pi-trash"></i></button>
                            <small class="attachment-approval-status">{{ attachmentApprovalLabel(attachment) }}</small>
                        </a>
                    </div>
                    <ng-template #noAttachments></ng-template>
                    </ng-container>

                    <ng-container *ngIf="document.document_type === 'SOFTCOPY'">
                    <div class="revisions-title revision-heading"><div><span>Controlled files</span><h3>Revision history</h3><small class="section-subtitle">Approved versions stay preserved for traceability.</small></div><strong>{{ revisions.length }} file{{ revisions.length === 1 ? '' : 's' }}</strong></div>

                    <div *ngIf="revisions.length; else noRevisions" class="revision-list">
                        <details *ngFor="let revision of revisions; trackBy: trackRevision" class="revision-card">
                            <summary class="revision-summary" [attr.aria-label]="'Open details for revision ' + revision.revision_number">
                            <div class="file-thumbnail" [ngClass]="fileTone(revision)"><i [class]="revisionIcon(revision)"></i><span>{{ fileExtension(revision) }}</span></div>
                            <div class="revision-copy">
                                <div class="revision-title-row">
                                    <div><span>Revision</span><strong>{{ revision.revision_number }}</strong></div>
                                    <span class="revision-state-badge" [class.current]="document.softcopy?.current_revision?.revision_id === revision.revision_id || revision.is_current">{{ revisionStatusLabel(revision) }}</span>
                                </div>
                                <h4>{{ revision.file_name || 'Unnamed file' }}</h4>
                                <div class="revision-meta"><span><i class="pi pi-user"></i>{{ fullName(revision.uploader) || 'Unknown' }}</span><span><i class="pi pi-clock"></i>{{ formatDate(revision.created_at) }}</span></div>
                                <p><i class="pi pi-comment"></i>{{ revision.reason_of_revision || 'No reason provided' }}</p>
                            </div>
                            </summary>
                            <div class="revision-expanded">
                                <div class="revision-detail-grid">
                                    <div *ngFor="let item of revisionRows(revision)" class="revision-detail-item" [class.revision-detail-wide]="item.wide"><span>{{ item.label }}</span><strong [class.breakable]="item.breakable">{{ item.value || 'Not recorded' }}</strong></div>
                                </div>
                                <div *ngIf="canAccessFiles" class="revision-actions" (click)="$event.stopPropagation()">
                                    <button type="button" title="Open" (click)="openRevision(revision)"><i class="pi pi-external-link"></i></button>
                                <button *ngIf="isStampableOfficeRevision(revision)" type="button" title="Download controlled copy" [disabled]="downloadInProgress" (click)="downloadRevision(revision, 'controlled')"><i class="pi pi-shield"></i></button>
                                <button type="button" title="Download uncontrolled copy" [disabled]="downloadInProgress" (click)="downloadRevision(revision, 'uncontrolled')"><i class="pi pi-download"></i></button>
                                </div>
                            </div>
                        </details>
                    </div>
                    <ng-template #noRevisions><div class="no-revisions"><i class="pi pi-file-plus"></i><strong>No revisions uploaded</strong><span>The first uploaded softcopy will appear here with its preview and actions.</span></div></ng-template>
                    </ng-container>
                </section>
                </div>
            </ng-container>

            <ng-template pTemplate="footer"><p-button label="Close" severity="secondary" [outlined]="true" (onClick)="close()" /></ng-template>
        </p-dialog>
    `,
    styles: [`
        :host{display:block}.document-hero{position:relative;overflow:hidden;display:flex;align-items:center;gap:1rem;border:1px solid #fecaca;border-radius:1.25rem;background:linear-gradient(135deg,#fff 0%,#fff7f7 58%,#fee2e2 100%);padding:1.25rem;color:#111827;box-shadow:0 10px 26px rgba(153,27,27,.08)}.document-hero::after{content:"";position:absolute;right:-3rem;top:-5rem;width:13rem;height:13rem;border:1px solid rgba(153,27,27,.1);border-radius:50%}.document-hero.hardcopy{background:linear-gradient(135deg,#fff 0%,#f8fafc 58%,#e5e7eb 100%);border-color:#d1d5db}.hero-icon{display:grid;place-items:center;width:3.6rem;height:3.6rem;flex:0 0 auto;border:1px solid #fecaca;border-radius:1rem;background:#991b1b;color:#fff;box-shadow:0 8px 18px rgba(153,27,27,.18);font-size:1.4rem}.hero-copy{position:relative;z-index:1;min-width:0;flex:1}.hero-kicker{font-size:.7rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#991b1b}.hero-copy h2{overflow:hidden;margin:.25rem 0 .5rem;color:#111827;font-size:1.4rem;font-weight:900;text-overflow:ellipsis;white-space:nowrap}.hero-meta,.hero-badges{display:flex;flex-wrap:wrap;gap:.55rem}.hero-meta span{display:inline-flex;align-items:center;gap:.35rem;color:#374151;font-size:.78rem;font-weight:700}.hero-meta i{color:#991b1b}.hero-badges{position:relative;z-index:1;justify-content:flex-end}.type-badge,.status-badge{border:1px solid #fecaca;border-radius:999px;background:#fff;padding:.45rem .7rem;color:#7f1d1d;font-size:.7rem;font-weight:900;letter-spacing:.08em;box-shadow:0 3px 8px rgba(17,24,39,.06)}.status-badge{border-color:#86efac;background:#f0fdf4;color:#166534}
        .summary-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.7rem;margin-top:.85rem}.summary-strip>div{min-width:0;border:1px solid #e5e7eb;border-radius:.9rem;background:#fff;padding:.75rem .85rem}.summary-strip span,.section-heading>div>span,.revisions-title span,.asset-callout span,.physical-visual span{display:block;color:#9ca3af;font-size:.64rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.summary-strip strong{display:block;overflow:hidden;margin-top:.25rem;color:#111827;font-size:.78rem;text-overflow:ellipsis;white-space:nowrap}.summary-strip small{display:block;overflow:hidden;margin-top:.2rem;color:#6b7280;font-size:.62rem;text-overflow:ellipsis;white-space:nowrap}.workspace-grid{display:grid;grid-template-columns:minmax(17rem,.75fr) minmax(0,1.4fr);gap:1rem;margin-top:1rem}.workspace-grid.single-column{grid-template-columns:1fr}.info-panel,.preview-panel,.revisions-section{border:1px solid #e5e7eb;border-radius:1.15rem;background:#fff}.info-panel{padding:1rem}.section-heading{display:flex;align-items:center;gap:.7rem}.section-heading.compact{min-width:0}.section-heading.compact>div{min-width:0}.section-heading.compact h3{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.section-icon{display:grid;place-items:center;width:2.35rem;height:2.35rem;flex:0 0 auto;border-radius:.75rem;background:#111827;color:#fff}.section-heading h3,.revisions-title h3{margin:.15rem 0 0;color:#111827;font-size:.95rem}.info-list{display:grid;gap:.35rem;margin-top:1rem}.info-row{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;border-bottom:1px solid #f3f4f6;padding:.65rem 0}.info-row:last-child{border-bottom:0}.info-row span{display:flex;align-items:center;gap:.45rem;color:#6b7280;font-size:.75rem}.info-row span i{color:#dc2626}.info-row strong{max-width:55%;color:#111827;font-size:.78rem;text-align:right}.breakable{overflow-wrap:anywhere}.physical-visual{display:grid;grid-template-columns:2.8rem minmax(0,1fr);gap:.75rem;align-items:center;margin-top:1rem;border-radius:.9rem;background:#111827;padding:.8rem;color:#fff}.shelf-icon{display:grid;place-items:center;width:2.8rem;height:2.8rem;border-radius:.75rem;background:#dc2626}.physical-visual strong{display:block;margin-top:.25rem;font-size:.78rem;line-height:1.45}.retention-detail{display:flex;align-items:flex-start;gap:.55rem;margin-top:.75rem;border:1px solid #bbf7d0;border-radius:.75rem;background:#f0fdf4;padding:.65rem;color:#166534}.retention-detail-alert{border-color:#fecaca;background:#fff1f2;color:#991b1b}.retention-detail>i{margin-top:.1rem}.retention-detail div{display:grid;gap:.15rem}.retention-detail strong{font-size:.75rem}.retention-detail span,.retention-detail small{font-size:.66rem;line-height:1.4}.disposal-note{display:flex;gap:.65rem;margin-top:1rem;border:1px solid #fecaca;border-radius:.85rem;background:#fff1f2;padding:.75rem;color:#991b1b}.disposal-note div{display:grid;gap:.2rem}.disposal-note span,.disposal-note small{font-size:.72rem}
        .revisions-section{margin-top:1rem;padding:1rem}.revisions-title{display:flex;align-items:center;justify-content:space-between;gap:1rem}.revisions-title>strong{border-radius:999px;background:#111827;padding:.35rem .65rem;color:#fff;font-size:.68rem}.revision-list{display:grid;gap:.65rem;margin-top:.85rem}.revision-card{display:grid;grid-template-columns:4rem minmax(0,1fr) auto;gap:.85rem;align-items:center;border:1px solid #e5e7eb;border-radius:1rem;background:#fff;padding:.75rem;cursor:pointer;transition:.18s ease}.revision-card:hover,.revision-card.selected{border-color:#dc2626;background:#fffafa;box-shadow:0 8px 20px rgba(153,27,27,.08);transform:translateY(-1px)}.file-thumbnail{display:grid;place-items:center;width:4rem;height:4.7rem;border-radius:.65rem;background:#111827;color:#fff}.file-thumbnail i{font-size:1.35rem}.file-thumbnail span{color:#fecaca;font-size:.58rem;font-weight:900;letter-spacing:.08em}.file-thumbnail.image{background:#7f1d1d}.file-thumbnail.pdf{background:#dc2626}.file-thumbnail.office{background:#111827}.revision-copy{min-width:0}.revision-title-row{display:flex;align-items:center;gap:.5rem}.revision-title-row>div{display:flex;align-items:baseline;gap:.35rem}.revision-title-row>div span{color:#9ca3af;font-size:.62rem;font-weight:900;text-transform:uppercase}.revision-title-row>div strong{color:#111827}.current-badge{border-radius:999px;background:#111827;padding:.2rem .4rem;color:#fff;font-size:.56rem;font-weight:900;text-transform:uppercase}.revision-copy h4{overflow:hidden;margin:.25rem 0;color:#111827;font-size:.82rem;text-overflow:ellipsis;white-space:nowrap}.revision-meta{display:flex;flex-wrap:wrap;gap:.7rem;color:#6b7280;font-size:.68rem}.revision-meta span{display:flex;align-items:center;gap:.3rem}.revision-copy p{display:flex;align-items:center;gap:.35rem;margin:.35rem 0 0;color:#6b7280;font-size:.7rem}.revision-actions{display:flex;gap:.3rem}.revision-actions button{display:grid;place-items:center;width:2rem;height:2rem;border:1px solid #d1d5db;border-radius:.55rem;background:#fff;color:#374151;cursor:pointer}.revision-actions button:hover{border-color:#dc2626;background:#dc2626;color:#fff}.no-revisions{display:grid;place-items:center;gap:.4rem;margin-top:.85rem;border:1px dashed #d1d5db;border-radius:.9rem;background:#f9fafb;padding:2rem;color:#6b7280;text-align:center}.no-revisions i{font-size:1.8rem;color:#dc2626}.no-revisions strong{color:#111827}.no-revisions span{font-size:.75rem}
        .revision-heading{margin-top:1.25rem;padding-top:1rem;border-top:1px solid #e5e7eb}.attachment-list{display:grid;gap:.5rem;margin-top:.85rem}.attachment-list a{display:flex;align-items:center;gap:.7rem;border:1px solid #e5e7eb;border-radius:.85rem;padding:.7rem .8rem;color:#111827;text-decoration:none}.attachment-list a>i:first-child{color:#dc2626}.attachment-list a>span{display:grid;min-width:0;flex:1}.attachment-list a strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.78rem}.attachment-list a small{margin-top:.15rem;color:#6b7280;font-size:.66rem}.attachment-list a.disabled{pointer-events:none;opacity:.55}
        /* Document details refresh: quieter surfaces, stronger hierarchy, and retrieval-first hardcopy layout. */
        .document-hero{min-height:7.5rem;border:0;border-radius:1.1rem;background:linear-gradient(118deg,#171717 0%,#262626 62%,#7f1d1d 100%);padding:1.35rem 1.5rem;color:#fff;box-shadow:0 12px 30px rgba(17,24,39,.16)}.document-hero.hardcopy{border:0;background:linear-gradient(118deg,#171717 0%,#292524 62%,#7f1d1d 100%)}.document-hero::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 82% 15%,rgba(255,255,255,.13),transparent 28%);pointer-events:none}.document-hero::after{right:-1.5rem;top:-6.5rem;width:16rem;height:16rem;border:1px solid rgba(255,255,255,.12)}.hero-icon{width:3.25rem;height:3.25rem;border:1px solid rgba(255,255,255,.18);border-radius:.85rem;background:rgba(255,255,255,.1);box-shadow:none}.hero-kicker{color:#fca5a5}.hero-copy h2{color:#fff;font-size:1.55rem;letter-spacing:-.02em}.hero-meta span{color:#d1d5db;font-weight:600}.hero-meta i{color:#fca5a5}.hero-badges{align-self:flex-start}.type-badge,.status-badge{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.1);color:#fff;box-shadow:none;backdrop-filter:blur(6px)}.status-badge{border-color:#86efac;background:#166534;color:#dcfce7}
        .summary-strip{gap:0;margin-top:.85rem;border-radius:1rem;background:#fff;box-shadow:0 6px 20px rgba(17,24,39,.05)}.summary-strip>div{position:relative;border:0;border-radius:0;background:transparent;padding:.9rem 1rem}.summary-strip>div+div::before{content:"";position:absolute;left:0;top:.8rem;bottom:.8rem;width:1px;background:#e5e7eb}.summary-strip span{color:#737373}.summary-strip strong{margin-top:.35rem;font-size:.82rem}.summary-strip small{margin-top:.28rem;line-height:1.35;white-space:normal}
        .workspace-grid{grid-template-columns:minmax(22rem,1.05fr) minmax(20rem,.95fr);gap:.85rem;margin-top:.85rem}.info-panel,.preview-panel,.revisions-section{border:0;border-radius:1rem;box-shadow:0 6px 20px rgba(17,24,39,.05)}.info-panel{padding:1.15rem}.section-icon{width:2.25rem;height:2.25rem;border-radius:.65rem;background:#991b1b}.physical-visual{grid-template-columns:2.6rem minmax(0,1fr) auto;margin-top:1rem;border-radius:.8rem;background:#f5f5f4;padding:.85rem;color:#171717}.shelf-icon{width:2.6rem;height:2.6rem;border-radius:.65rem;background:#991b1b;color:#fff}.physical-visual span{color:#737373}.physical-visual strong{font-size:.78rem}.physical-visual small{display:block;margin-top:.35rem;color:#78716c;font-size:.66rem}.route-content{min-width:0}.route-steps{display:flex;align-items:center;flex-wrap:wrap;gap:.3rem;margin-top:.3rem}.route-steps strong{border-radius:.45rem;background:#fff;padding:.28rem .4rem;line-height:1.25}.route-steps i{color:#a8a29e;font-size:.65rem}.copy-route-button{display:inline-flex;align-items:center;gap:.35rem;align-self:center;border:0;border-radius:.6rem;background:#fff;padding:.55rem .65rem;color:#7f1d1d;font:inherit;font-size:.68rem;font-weight:800;cursor:pointer;white-space:nowrap;box-shadow:0 2px 8px rgba(17,24,39,.06)}.copy-route-button:hover:not(:disabled){background:#991b1b;color:#fff}.copy-route-button:focus-visible{outline:2px solid #991b1b;outline-offset:2px}.copy-route-button:disabled{cursor:not-allowed;opacity:.45}.copy-route-button span{display:inline;color:inherit;font-size:inherit;letter-spacing:0;text-transform:none}.info-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;margin-top:.75rem}.info-row{display:block;border:0;border-radius:.7rem;background:#fafafa;padding:.7rem .75rem}.info-row span{font-size:.68rem}.info-row strong{display:block;max-width:none;margin-top:.35rem;font-size:.8rem;text-align:left}
        .revisions-section{margin-top:.85rem;padding:1.15rem}.evidence-heading{display:flex;align-items:center;gap:.7rem}.revisions-title>strong{background:#f5f5f4;color:#44403c}.no-revisions{min-height:8rem;margin-top:.75rem;border:0;border-radius:.8rem;background:#fafafa;padding:1.25rem}.no-revisions i{display:grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:50%;background:#fee2e2;font-size:1.15rem}.attachment-list a{border:0;background:#fafafa;transition:.18s ease}.attachment-list a:hover{background:#fff7f7;box-shadow:inset 3px 0 #991b1b}.revision-card{border:0;background:#fafafa}.revision-card:hover,.revision-card.selected{border-color:transparent}
        .route-steps{position:relative;display:flex;align-items:stretch;flex-wrap:wrap;overflow:visible;gap:.65rem;margin-top:.45rem;border-radius:.8rem;background-color:#fafaf9;background-image:radial-gradient(#d6d3d1 .8px,transparent .8px);background-size:10px 10px;padding:1rem .7rem;animation:map-drift 12s linear infinite}.route-node{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"icon label" "icon value" "icon note";align-items:center;min-width:0;flex:1 1 12rem;border:1px solid #d6d3d1;border-radius:.75rem;background:#fff;padding:.75rem;animation:map-stop-in .45s both,route-visit 6s ease-in-out infinite;animation-delay:calc(var(--route-delay) / 12),var(--route-delay)}.route-node::after{content:'';position:absolute;right:.5rem;top:.5rem;width:.38rem;height:.38rem;border-radius:50%;background:#d6d3d1;animation:status-pulse 6s ease-in-out infinite;animation-delay:var(--route-delay)}.route-node:first-child{border-color:#292524}.route-node>i{grid-area:icon;display:grid;place-items:center;width:2.15rem;height:2.15rem;margin-right:.55rem;border-radius:.6rem;background:#292524;color:#fff;animation:marker-step 6s ease-in-out infinite;animation-delay:var(--route-delay)}.route-node>span{grid-area:label;color:#78716c;font-size:.52rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;white-space:normal}.route-node>strong{grid-area:value;min-width:0;margin:.08rem 0 0;color:#171717;font-size:.76rem;line-height:1.4;overflow:visible;overflow-wrap:anywhere;word-break:break-word;text-overflow:clip;white-space:normal}.route-node>small{grid-area:note;display:flex;align-items:center;gap:.25rem;margin-top:.2rem;color:#991b1b;font-size:.52rem;font-weight:800;white-space:normal}.route-node>small i{font-size:.5rem}.route-destination{border-color:#991b1b;background:#fff7f7}.route-destination::after{background:#991b1b}.route-destination>i{background:#991b1b;animation:destination-bob 1.5s ease-in-out infinite}.route-connector{position:relative;display:flex;align-self:center;align-items:center;min-width:2.8rem;flex:0 1 3.5rem;height:3px;background:repeating-linear-gradient(90deg,#a8a29e 0 5px,transparent 5px 9px);background-size:18px 3px;animation:path-flow .65s linear infinite}.route-arrow{position:absolute;right:-.1rem;display:grid;place-items:center;width:1.1rem;height:1.1rem;border-radius:50%;background:#991b1b;color:#fff;font-size:.5rem;animation:arrow-nudge 1.1s ease-in-out infinite}.route-walker{position:absolute;z-index:1;left:0;bottom:.2rem;display:grid;place-items:center;width:1.35rem;height:1.35rem;border:1px solid #991b1b;border-radius:50%;background:#fff;color:#991b1b;font-size:.65rem;opacity:0;animation:walk-route 4.35s ease-in-out infinite;animation-delay:var(--route-delay)}.physical-visual{align-items:start}.copy-route-button{margin-top:.45rem;transition:transform .18s ease,background .18s ease,color .18s ease}.copy-route-button:hover:not(:disabled){transform:translateY(-2px)}.copy-route-button.copied{background:#166534;color:#fff;animation:copy-confirm .4s ease both}@keyframes walk-route{0%,60%{opacity:0;transform:translateX(0)}66%{opacity:1}72%{transform:translateX(.55rem) translateY(-3px)}79%{transform:translateX(1.1rem)}86%{transform:translateX(1.65rem) translateY(-3px)}94%{opacity:1;transform:translateX(2.2rem)}100%{opacity:0;transform:translateX(2.45rem)}}@keyframes path-flow{to{background-position:18px 0}}@keyframes arrow-nudge{50%{transform:translateX(3px)}}@keyframes marker-step{0%,18%,100%{transform:scale(1)}8%{transform:scale(1.08)}}@keyframes route-visit{0%,18%,100%{border-color:#d6d3d1;background:#fff}8%{border-color:#991b1b;background:#fff7f7}}@keyframes status-pulse{0%,18%,100%{transform:scale(1);background:#d6d3d1}8%{transform:scale(1.55);background:#991b1b}}@keyframes destination-bob{50%{transform:translateY(-3px) rotate(-3deg)}}@keyframes map-stop-in{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}@keyframes map-drift{to{background-position:20px 10px}}@keyframes copy-confirm{50%{transform:scale(1.04)}}@media(prefers-reduced-motion:reduce){.route-steps,.route-node,.route-node::after,.route-node>i,.route-destination>i,.route-connector,.route-arrow,.route-walker,.copy-route-button{animation:none!important}.route-walker{left:45%;opacity:1}}
        :host ::ng-deep .p-dialog{overflow:hidden;border-radius:1.35rem}:host ::ng-deep .p-dialog-header{border-bottom:1px solid #e5e7eb;background:#fff;padding:1rem 1.25rem}:host ::ng-deep .p-dialog-title{color:#111827!important;font-size:1rem;font-weight:900}:host ::ng-deep .p-dialog-content{background:#f5f5f5;padding:1rem}:host ::ng-deep .p-dialog-footer{border-top:1px solid #e5e7eb;background:#fff;padding:.75rem 1rem}
        @media(max-width:900px){.summary-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.summary-strip>div:nth-child(odd)::before{display:none}.workspace-grid{grid-template-columns:1fr}.preview-panel{min-height:20rem}.hardcopy-preview{min-height:auto}}@media(max-width:640px){.document-hero{align-items:flex-start;flex-wrap:wrap;padding:1.1rem}.hero-copy{width:calc(100% - 4.25rem)}.hero-copy h2{font-size:1.25rem;white-space:normal}.hero-badges{width:100%;justify-content:flex-start}.summary-strip{grid-template-columns:1fr}.summary-strip>div+div::before{left:.85rem;right:.85rem;top:0;bottom:auto;width:auto;height:1px}.physical-visual{grid-template-columns:2.6rem minmax(0,1fr)}.copy-route-button{grid-column:1/-1;width:100%;justify-content:center}.info-list{grid-template-columns:1fr}.hardcopy-preview{grid-template-columns:1fr;justify-items:center;text-align:center}.physical-document-art{grid-row:auto}.retrieval-references{text-align:left}.revision-card{grid-template-columns:3.4rem minmax(0,1fr)}.file-thumbnail{width:3.4rem;height:4rem}.revision-actions{grid-column:1/-1;justify-content:flex-end}.preview-actions ::ng-deep .p-button-label{display:none}}
        .route-guide-head{display:flex;align-items:center;justify-content:space-between;gap:.75rem}.route-guide-head>div{display:grid;gap:.2rem}.route-guide-head strong{display:flex;align-items:center;gap:.35rem;margin:0;color:#292524;font-size:.72rem}.route-guide-head strong i{color:#991b1b;animation:compass-turn 4s ease-in-out infinite}.route-guide-head button{display:inline-flex;align-items:center;gap:.35rem;border:1px solid #d6d3d1;border-radius:.6rem;background:#fff;padding:.45rem .6rem;color:#7f1d1d;font-size:.63rem;font-weight:800;cursor:pointer}.route-guide-head button:hover:not(:disabled){border-color:#991b1b;background:#fff7f7}.route-guide-head button:active:not(:disabled) i{transform:rotate(-180deg)}.route-guide-head button:disabled{opacity:.45;cursor:not-allowed}@keyframes compass-turn{0%,70%,100%{transform:rotate(0)}82%{transform:rotate(35deg)}90%{transform:rotate(-25deg)}}
        .route-live-progress{position:relative;height:.42rem;margin:.7rem .15rem .2rem;border-radius:999px;background:#e7e5e4}.route-live-progress>span{position:relative;display:block;height:100%;min-width:.4rem;border-radius:inherit;background:#991b1b;transition:width .7s cubic-bezier(.22,1,.36,1)}.route-live-progress i{position:absolute;right:-.55rem;top:50%;display:grid;place-items:center;width:1.1rem;height:1.1rem;border-radius:50%;background:#991b1b;color:#fff;font-size:.55rem;transform:translateY(-50%);animation:progress-marker .8s ease-in-out infinite}.route-node.route-visited{border-color:#a3a3a3;background:#fafafa}.route-node.route-visited::after{background:#166534}.route-node.route-current{border-color:#991b1b!important;background:#fff7f7!important;transform:translateY(-3px)}.route-node.route-current::after{background:#991b1b;animation:current-checkpoint .8s ease-in-out infinite}.route-guide-head strong .pi-check-circle{color:#166534;animation:arrival-turn .5s ease both}@keyframes progress-marker{50%{transform:translateY(-65%)}}@keyframes current-checkpoint{50%{transform:scale(1.7)}}@keyframes arrival-turn{from{transform:scale(.5) rotate(-90deg)}to{transform:scale(1) rotate(0)}}@media(max-width:640px){.route-guide-head{align-items:flex-start;flex-direction:column}.route-guide-head button{width:100%;justify-content:center}}@media(prefers-reduced-motion:reduce){.route-live-progress>span{transition:none}.route-live-progress i,.route-node.route-current::after,.route-guide-head strong i{animation:none!important}}
        /* State-driven route motion keeps replay, checkpoints, and the traveler synchronized. */
        .route-node{animation:map-stop-in .42s ease-out both;transition:transform .35s ease,border-color .35s ease,background-color .35s ease}.route-node::after,.route-node>i{animation:none}.route-node.route-visited{border-color:#a8a29e;background:#fafaf9}.route-node.route-visited::after{background:#166534}.route-node.route-current{border-color:#991b1b!important;background:#fff7f7!important;transform:translateY(-3px)}.route-node.route-current>i{animation:current-marker .85s ease-in-out infinite}.route-connector{background:#d6d3d1;animation:none;transition:background-color .3s ease}.route-connector .route-walker{display:none;animation:none}.route-connector-complete{background:#166534}.route-connector-complete .route-arrow{background:#166534;animation:none}.route-connector-active{background:repeating-linear-gradient(90deg,#991b1b 0 6px,transparent 6px 10px);background-size:20px 3px;animation:path-flow .55s linear infinite}.route-connector-active .route-walker{display:grid;opacity:1;animation:active-walk 1.45s ease-in-out both}.route-journey-complete .route-destination>i{animation:arrival-marker .65s ease-out 2}.route-journey-complete .route-destination::after{background:#166534;animation:none}.route-journey-complete .route-destination{border-color:#166534!important;background:#f0fdf4!important;transform:none}@keyframes active-walk{0%{opacity:0;transform:translateX(0) translateY(0)}12%{opacity:1}35%{transform:translateX(.75rem) translateY(-3px)}62%{transform:translateX(1.5rem) translateY(0)}88%{opacity:1;transform:translateX(2.2rem) translateY(-3px)}100%{opacity:0;transform:translateX(2.45rem)}}@keyframes current-marker{50%{transform:translateY(-2px)}}@keyframes arrival-marker{50%{transform:translateY(-4px) rotate(-5deg)}}@media(prefers-reduced-motion:reduce){.route-node,.route-connector{transition:none}.route-connector-active .route-walker,.route-node.route-current>i,.route-journey-complete .route-destination>i{animation:none!important}}
        /* Storage route timeline: alternating nodes and connectors stay on one row. */
        .physical-visual{position:relative;overflow:hidden;background:linear-gradient(145deg,#fafaf9 0%,#f5f5f4 55%,#fff7f7 100%);border:1px solid #e7e5e4;box-shadow:inset 0 1px rgba(255,255,255,.9),0 10px 24px rgba(28,25,23,.06)}
        .physical-visual::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.38;background-image:linear-gradient(28deg,transparent 46%,rgba(148,163,148,.22) 47%,transparent 48%),linear-gradient(118deg,transparent 46%,rgba(148,163,148,.16) 47%,transparent 48%);background-size:150px 110px,180px 140px}
        .route-content{position:relative;z-index:1;min-width:0}.route-guide-head{padding-bottom:.7rem;border-bottom:1px solid rgba(214,211,209,.7)}
        .route-guide-head>div>span{font-size:.58rem;letter-spacing:.14em;color:#a8a29e}.route-guide-head strong{color:#14532d!important;font-size:.86rem;letter-spacing:-.01em}.route-guide-head strong i{display:grid;place-items:center;width:1.35rem;height:1.35rem;border-radius:50%;background:#dcfce7!important;color:#166534!important;font-size:.65rem}
        .route-steps{position:relative;display:flex;align-items:flex-start;gap:0;min-height:9.25rem;margin-top:.9rem;padding:1rem .8rem .8rem;background:rgba(255,255,255,.56)!important;background-image:none!important;border:1px solid rgba(214,211,209,.85);border-radius:1rem;box-shadow:inset 0 1px rgba(255,255,255,.9);overflow:visible;isolation:isolate;animation:none}
        .route-node{position:relative;z-index:1;display:flex!important;flex:1 1 0;flex-direction:column;align-items:center;justify-content:flex-start;gap:.28rem;min-width:0;min-height:7.35rem;padding:.05rem .25rem!important;border:0!important;border-radius:.8rem;background:transparent!important;box-shadow:none!important;text-align:center;transform:none!important;animation:route-node-in .45s cubic-bezier(.22,1,.36,1) both!important;animation-delay:calc(var(--route-delay) / 5)!important;transition:background-color .25s ease,box-shadow .25s ease}
        .route-node>i{display:grid;place-items:center;width:2.35rem!important;height:2.35rem!important;flex:0 0 2.35rem;margin:0!important;border:.22rem solid #eef3ef;border-radius:50%!important;background:#647064!important;color:#fff;box-shadow:0 3px 8px rgba(28,25,23,.18)!important;font-size:.75rem;transition:transform .25s ease,background-color .25s ease}
        .route-node>span{order:2;margin-top:.18rem;color:#647064!important;font-size:.55rem!important;line-height:1.25;letter-spacing:.1em;text-transform:uppercase;font-weight:900;white-space:normal}
        .route-node>strong{order:3;display:block;min-width:0;max-width:100%;margin:0!important;color:#1f2937!important;font-size:.72rem!important;line-height:1.35!important;overflow:visible;overflow-wrap:anywhere;word-break:break-word;text-overflow:clip;white-space:normal}
        .route-node>small{order:4;justify-content:center;margin-top:.08rem;color:#64748b!important;font-size:.52rem!important;line-height:1.3;white-space:normal}
        .route-node::after{content:'';position:absolute;right:calc(50% - .24rem)!important;top:2.83rem!important;width:.48rem!important;height:.48rem!important;border:2px solid #eef3ef;border-radius:50%;background:#d6d3d1;box-shadow:none!important;animation:none;transition:background-color .3s ease}
        .route-connector{position:relative;z-index:0;display:block;align-self:flex-start!important;min-width:.8rem!important;flex:0 1 4rem!important;width:auto!important;height:.28rem!important;margin:2.92rem -.1rem 0!important;border-radius:99px;background:#cbd5cb!important;background-image:none!important;overflow:hidden!important;transition:background-color .3s ease}
        .route-connector-active{background:linear-gradient(90deg,#dc2626,#fca5a5,#dc2626)!important;background-size:200% 100%!important;animation:route-signal 1.2s linear infinite!important}.route-connector-complete{background:#16a34a!important}.route-connector::before{display:none!important}.route-arrow,.route-walker{display:none!important}
        .route-node.route-visited>i{background:#166534!important;transform:scale(1.02)!important}.route-node.route-visited::after{background:#166534!important}
        .route-node.route-current{background:#fff7f7!important;box-shadow:0 8px 18px rgba(153,27,27,.1)!important}.route-node.route-current>i{background:#b91c1c!important;box-shadow:0 0 0 5px rgba(185,28,28,.12),0 4px 10px rgba(127,29,29,.2)!important;animation:current-marker .85s ease-in-out infinite}.route-node.route-current::after{background:#dc2626!important;animation:route-pulse 1.4s ease-in-out infinite}
        .route-journey-complete .route-destination{background:#f0fdf4!important;box-shadow:0 8px 18px rgba(22,101,52,.1)!important}.route-journey-complete .route-destination>i{background:#166534!important;box-shadow:0 0 0 5px rgba(22,101,52,.1)!important;animation:arrival-marker .65s ease-out 2}.route-journey-complete .route-destination::after{background:#16a34a!important}
        .physical-visual>small{position:relative;z-index:1;grid-column:2;margin-top:.55rem!important;color:#526052!important}
        @keyframes route-node-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes route-signal{from{background-position:200% 0}to{background-position:0 0}}
        @keyframes route-pulse{50%{transform:scale(1.35);box-shadow:0 0 0 6px rgba(220,38,38,.08)}}
        @media(max-width:760px){.route-steps{flex-direction:column;min-height:0;gap:0;padding:.85rem}.route-node{display:grid!important;grid-template-columns:2.7rem minmax(0,1fr)!important;grid-template-rows:auto auto auto;grid-template-areas:"icon label" "icon value" "icon note";align-items:center;width:100%;min-height:4.25rem!important;padding:.25rem .2rem!important;text-align:left}.route-node>i{grid-area:icon!important}.route-node>span{grid-area:label!important;margin:0}.route-node>strong{grid-area:value!important;max-width:none;text-align:left}.route-node>small{grid-area:note!important;justify-content:flex-start}.route-node::after{left:2.31rem!important;right:auto!important;top:1.17rem!important}.route-connector{width:.28rem!important;min-width:.28rem!important;flex:0 0 1rem!important;height:1rem!important;margin:-.05rem 0 -.05rem 1.27rem!important}.route-connector-active{background:linear-gradient(180deg,#dc2626,#fca5a5,#dc2626)!important;background-size:100% 200%!important}.physical-visual>small{grid-column:1/-1}}
        @media(prefers-reduced-motion:reduce){.route-node,.route-connector-active,.route-node.route-current>i,.route-node.route-current::after,.route-journey-complete .route-destination>i{animation:none!important}.route-node,.route-connector{transition:none}}

        /* Stable SaaS route motion: the map stays mounted while only the checkpoint state changes. */
        .document-hero{isolation:isolate}.document-hero .hero-copy h2{max-width:min(52rem,100%)}
        .summary-strip{border:1px solid #e5e7eb}.summary-strip>div{min-height:4.6rem}
        .workspace-grid{align-items:start}.info-panel{background:linear-gradient(180deg,#fff 0%,#fcfcfd 100%)}
        .physical-visual{grid-template-columns:3rem minmax(0,1fr);border-color:#e2e8f0;background:linear-gradient(145deg,#f8fafc 0%,#f1f5f9 58%,#fff7f7 100%);padding:1rem}.shelf-icon{width:3rem;height:3rem;border-radius:.85rem;box-shadow:0 8px 16px rgba(153,27,27,.18)}
        .route-guide-head{align-items:flex-start}.route-guide-head button{transition:color .2s ease,border-color .2s ease,background-color .2s ease,transform .2s ease}.route-guide-head button:hover:not(:disabled){transform:translateY(-1px)}
        .route-steps{background:linear-gradient(180deg,rgba(255,255,255,.94),rgba(248,250,252,.9))!important;border-color:#dbe3ec!important;box-shadow:0 8px 22px rgba(15,23,42,.06),inset 0 1px rgba(255,255,255,.95)!important;animation:none!important}
        .route-node{animation:route-node-enter .35s cubic-bezier(.22,1,.36,1) both!important;animation-delay:0s!important;transition:background-color .25s ease,box-shadow .25s ease,border-color .25s ease!important}
        .route-node::after,.route-node>i,.route-node.route-current>i,.route-node.route-current::after,.route-destination>i{animation:none!important}
        .route-node.route-current{transform:none!important;box-shadow:0 8px 20px rgba(153,27,27,.12)!important}
        .route-connector{background:#cbd5e1!important;background-image:none!important;animation:none!important;transition:background-color .4s ease!important}
        .route-connector-complete{background:#16a34a!important}
        .route-connector-active{background:linear-gradient(90deg,#b91c1c,#ef4444,#b91c1c)!important;background-size:100% 100%!important;animation:none!important}
        .route-arrow{background:#991b1b!important;animation:none!important;transform:none!important}
        .route-walker{display:grid!important;visibility:hidden;opacity:1!important;left:0;top:50%;bottom:auto;width:1.35rem;height:1.35rem;transform:translateY(-50%);animation:none!important;transition:none!important}
        .route-connector-active .route-walker{visibility:visible;animation:route-traveler 1.95s cubic-bezier(.65,0,.35,1) both!important}
        .route-journey-complete .route-walker{visibility:hidden!important}
        .route-live-progress>span{transition:width .7s cubic-bezier(.22,1,.36,1)}.route-live-progress i{animation:none!important}
        @keyframes route-node-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes route-traveler{from{left:0}to{left:calc(100% - 1.35rem)}}
        @media(max-width:760px){.route-walker{top:.5rem;left:0!important;transform:translateY(-50%)!important}.route-connector-active .route-walker{animation:none!important;visibility:visible;top:calc(100% - .35rem);left:0!important}.route-connector-active{background:linear-gradient(180deg,#b91c1c,#ef4444,#b91c1c)!important}}
        @media(prefers-reduced-motion:reduce){.route-node,.route-connector,.route-live-progress>span{transition:none!important}.route-node,.route-connector-active .route-walker{animation:none!important}.route-walker{visibility:hidden!important}.route-connector-active .route-walker{visibility:visible!important;left:calc(100% - 1.35rem)!important}}

        .softcopy-record-section{margin-top:.85rem;border:1px solid #e2e8f0;border-radius:1rem;background:#fff;padding:1.15rem;box-shadow:0 6px 20px rgba(17,24,39,.05)}
        .metadata-section-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem}.metadata-section-caption{border:1px solid #fecaca;border-radius:999px;background:#fff7f7;padding:.35rem .65rem;color:#991b1b;font-size:.62rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
        .metadata-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.6rem;margin-top:1rem}.metadata-item,.revision-detail-item{min-width:0;border:1px solid #edf1f5;border-radius:.7rem;background:#f8fafc;padding:.7rem .75rem}.metadata-item-wide,.revision-detail-wide{grid-column:span 2}.metadata-item span,.revision-detail-item span{display:block;color:#64748b;font-size:.59rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.metadata-item strong,.revision-detail-item strong{display:block;margin-top:.3rem;color:#0f172a;font-size:.76rem;line-height:1.45}.revision-detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5rem;margin-top:.75rem;border-top:1px solid #e5e7eb;padding-top:.75rem}.revision-detail-item{background:#fff}.revision-detail-item strong{font-size:.68rem}
        @media(max-width:900px){.metadata-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.revision-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:640px){.metadata-section-heading{align-items:flex-start;flex-direction:column}.metadata-section-caption{margin-left:2.95rem}.metadata-grid,.revision-detail-grid{grid-template-columns:1fr}.metadata-item-wide,.revision-detail-wide{grid-column:auto}}

    `]
})
export class DocumentDetailDialogComponent implements OnChanges, OnDestroy {
    private readonly systemSettings = inject(SystemSettingsService);
    private readonly documentsService = inject(DocumentsService);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly changeDetector = inject(ChangeDetectorRef);
    private previewRequest = 0;

    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Input() document: DocumentDetail | null = null;
    @Input() revisions: RevisionSummary[] = [];
    @Input() users: DocumentUserSummary[] = [];
    @Input() canConfigureWorkflow = false;
    @Input() canAccessFiles = false;
    @Input() canDeleteAttachments = false;
    @Output() attachmentDelete = new EventEmitter<string>();

    selectedRevision: RevisionSummary | null = null;
    previewKind: PreviewKind = 'idle';
    previewObjectUrl = '';
    previewResourceUrl: SafeResourceUrl | null = null;
    previewHtml = '';
    previewError = '';
    downloadInProgress = false;
    downloadError = '';
    workflowReassignments: Record<string, { user_id: string; reason: string; saving: boolean; error: string }> = {};
    copiedRoute = false;
    routeJourneyStage = 0;
    routeJourneyComplete = false;
    private routeJourneyTimers: number[] = [];
    digitalJourneyVisible = true;
    digitalJourneyStage = 0;
    digitalJourneyComplete = false;
    private digitalJourneyTimers: number[] = [];
    private readonly journeyStepDuration = 2000;

    ngOnChanges(changes: SimpleChanges) {
        if (changes['visible'] && !this.visible) {
            this.clearRouteJourneyTimers();
            this.clearDigitalJourneyTimers();
        }
        if ((changes['document'] || changes['visible']) && this.visible && this.document?.document_type === 'HARDCOPY') this.startPhysicalRouteJourney();
        if ((changes['document'] || changes['visible']) && this.visible && this.document?.document_type === 'SOFTCOPY') this.startDigitalJourney();
        if (!this.canAccessFiles) {
            this.resetPreview();
            return;
        }

        if (changes['revisions'] || changes['document'] || changes['visible'] || changes['canAccessFiles']) this.resetPreview();
        if (changes['document']) this.initializeWorkflowReassignments();
    }

    ngOnDestroy() {
        this.clearRouteJourneyTimers();
        this.clearDigitalJourneyTimers();
        this.revokePreviewUrl();
    }

    trackRevision = (_index: number, revision: RevisionSummary) => revision.revision_id;
    documentAttachments() { return this.document?.document_type === 'SOFTCOPY' ? (this.document.softcopy?.attachments || []).filter((attachment) => attachment.status !== 'Rejected' && attachment.status !== 'Cancelled') : []; }
    attachmentApprovalLabel(attachment: { status?: string | null }) { return attachment.status === 'Approved' ? 'Approved attachment' : 'Pending Plant Manager approval'; }
    supportingEvidenceCount() { return (this.document?.softcopy?.current_revision ? 1 : 0) + this.documentAttachments().length; }

    isCurrentWorkflowStep(step: DocumentWorkflowStepSummary) {
        return this.document?.workflow_steps?.find((candidate) => candidate.status === 'PENDING')?.workflow_step_id === step.workflow_step_id;
    }
    workflowStepLabel(step: DocumentWorkflowStepSummary) { return ({ NOTED_BY: 'Leader / Noted By', PLANT_MANAGER: 'Plant Manager Approval', DOCUMENT_CONTROLLER_ADMIN: 'Document Controller Approval', HARDCOPY_APPROVAL: 'Hardcopy Approval' } as Record<string, string>)[step.stage] || step.stage; }
    workflowStepPerson(step: DocumentWorkflowStepSummary) { return step.acted_user_name_snapshot || this.fullName(step.actor) || step.assigned_user_name_snapshot || this.fullName(step.assignee) || 'Unassigned'; }
    workflowStepPosition(step: DocumentWorkflowStepSummary) { return step.acted_position_title_snapshot || step.actor?.position_title || step.assigned_position_title_snapshot || step.assignee?.position_title || 'Position not recorded'; }
    workflowStepStatusLabel(step: DocumentWorkflowStepSummary) { return ({ PENDING: this.isCurrentWorkflowStep(step) ? 'Awaiting action' : 'Queued', APPROVED: 'Approved', RETURNED: 'Returned for correction', REJECTED: 'Rejected', CANCELLED: 'Cancelled' } as Record<string, string>)[step.status] || step.status; }
    workflowUserOptionLabel(user: DocumentUserSummary) { return [this.fullName(user) || user.email || user.user_id, user.position_title, user.role?.role_name].filter(Boolean).join(' · '); }
    setWorkflowReassignment(stepId: string, field: 'user_id' | 'reason', value: string) { this.workflowReassignments[stepId] = { ...(this.workflowReassignments[stepId] || { user_id: '', reason: '', saving: false, error: '' }), [field]: value, error: '' }; }
    canSubmitWorkflowReassignment(step: DocumentWorkflowStepSummary) { const form = this.workflowReassignments[step.workflow_step_id]; return !!form?.user_id && !!form.reason.trim() && !form.saving; }
    reassignWorkflowStep(step: DocumentWorkflowStepSummary) {
        if (!this.document || !this.canSubmitWorkflowReassignment(step)) return;
        const form = this.workflowReassignments[step.workflow_step_id];
        form.saving = true; form.error = '';
        this.documentsService.reassignWorkflowStep(this.document.document_id, step.workflow_step_id, form.user_id, form.reason.trim()).subscribe({
            next: (updated) => { Object.assign(step, updated); this.workflowReassignments[step.workflow_step_id] = { user_id: '', reason: '', saving: false, error: '' }; this.changeDetector.markForCheck(); },
            error: (error: unknown) => { form.saving = false; form.error = this.workflowErrorMessage(error); this.changeDetector.markForCheck(); }
        });
    }
    private initializeWorkflowReassignments() { this.workflowReassignments = Object.fromEntries((this.document?.workflow_steps || []).map((step) => [step.workflow_step_id, { user_id: '', reason: '', saving: false, error: '' }])); }
    private workflowErrorMessage(error: unknown) { const candidate = error as { error?: { message?: string | string[] }; message?: string }; const message = candidate?.error?.message; return Array.isArray(message) ? message.join(' ') : message || candidate?.message || 'Unable to reassign this approval step.'; }

    async selectRevision(revision: RevisionSummary) {
        if (!this.canAccessFiles) return;
        this.selectedRevision = revision;
        this.revokePreviewUrl();
        this.previewHtml = '';
        this.previewError = '';
        const link = this.revisionLink(revision);
        const stampable = this.isStampableOfficeRevision(revision);
        if (!link && !stampable) { this.previewKind = 'error'; this.previewError = 'No served file URL is available for this revision.'; return; }

        const request = ++this.previewRequest;
        this.previewKind = 'loading';
        try {
            const blob = stampable && !link
                ? await this.loadStampedRevision(revision)
                : await this.loadOriginalRevision(link);
            if (request !== this.previewRequest) return;
            const name = revision.file_name || link;

            if (this.isImage(name, blob.type)) {
                this.previewObjectUrl = URL.createObjectURL(blob);
                this.previewKind = 'image';
            } else if (/\.pdf$/i.test(name) || blob.type === 'application/pdf') {
                this.previewObjectUrl = URL.createObjectURL(blob);
                this.previewResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewObjectUrl);
                this.previewKind = 'pdf';
            } else if (this.isModernOfficeRevision(revision)) {
                this.previewHtml = await this.buildOfficePreview(await blob.arrayBuffer(), revision);
                this.previewKind = 'office';
            } else {
                this.previewKind = 'unsupported';
            }
        } catch (error) {
            if (request !== this.previewRequest) return;
            this.previewKind = 'error';
            this.previewError = error instanceof Error ? error.message : 'The file could not be previewed.';
        }
    }

    revisionLink(revision: RevisionSummary) { return revision.file_url || revision.file_path || ''; }
    fullName(user?: { firstname?: string; lastname?: string } | null) { return [user?.firstname, user?.lastname].filter(Boolean).join(' '); }
    statusLabel(status?: string | null) { return !status ? 'N/A' : ({ Draft: 'Draft', PendingApproval: 'Pending Approval', ForNotedBy: 'For Noted By', ForPlantManagerApproval: 'For Plant Manager Approval', ForDocumentControllerAdmin: 'For Document Controller/Admin Approval', ForApproval: 'For Approval', Approved: 'Approved — Pending Release', Completed: 'Completed / Released', ForRevision: 'For Revision', ReturnedForCorrection: 'For Revision', Rejected: 'Rejected', Cancelled: 'Cancelled', ForTransfer: 'For Transfer', Transferred: 'Transferred', PendingRecipientAcceptance: 'Pending Recipient Acceptance', Disposed: 'Disposed' } as Record<string, string>)[status] || status.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' '); }
    softcopyDocumentRows() {
        const document = this.document;
        if (!document) return [];
        const requester = document.requested_by_name || this.fullName(document.requester) || this.fullName(document.creator);
        return [
            this.detailRow('Document number', document.document_number, false, true),
            this.detailRow('Document title', document.document_title, true, true),
            this.detailRow('Document type', document.document_type),
            this.detailRow('Request status', this.statusLabel(document.status)),
            this.detailRow('Date of request', this.formatDate(document.request_date)),
            this.detailRow('Requestor', requester, false, true),
            this.detailRow('Department', document.department, false, true),
            this.detailRow('Document category', document.business_document_type),
            this.detailRow('Action requested', this.actionRequestedLabel(document.action_requested)),
            this.detailRow('From', document.from_party, false, true),
            this.detailRow('To', document.to_party, false, true),
            this.detailRow('Reason for change', this.changeReasonLabel(document.reason_for_change)),
            this.detailRow('Revision level from', document.revision_level_from),
            this.detailRow('Revision level to', document.revision_level_to),
            this.detailRow('Previous effective date', this.formatDate(document.previous_effective_date || undefined)),
            this.detailRow('New effective date', this.formatDate(document.new_effective_date || undefined)),
            this.detailRow('Date received', this.formatDate(document.date_received || undefined)),
            this.detailRow('Date released', this.formatDate(document.date_released || undefined)),
            this.detailRow('Approval date', this.formatDate(document.approval_date || undefined)),
            this.detailRow('Created', this.formatDate(document.created_at)),
            this.detailRow('Last updated', this.formatDate(document.updated_at)),
            this.detailRow('Brief description of changes', document.brief_description, true, true),
            this.detailRow('Proposed change', document.proposed_change, true, true),
        ];
    }
    revisionRows(revision: RevisionSummary) {
        return [
            this.detailRow('Revision number', revision.revision_number),
            this.detailRow('Revision status', this.revisionStatusLabel(revision)),
            this.detailRow('Document title', revision.document_title, true, true),
            this.detailRow('File name', revision.file_name, true, true),
            this.detailRow('File type', revision.mime_type, false, true),
            this.detailRow('Uploaded by', this.fullName(revision.uploader), false, true),
            this.detailRow('Uploaded at', this.formatDate(revision.created_at)),
            this.detailRow('Effective date', this.formatDate(revision.effective_date)),
            this.detailRow('Series number', revision.series_number, false, true),
            this.detailRow('Page number', revision.page_number, false, true),
            this.detailRow('Revision level from', revision.revision_level_from),
            this.detailRow('Revision level to', revision.revision_level_to),
            this.detailRow('Previous effective date', this.formatDate(revision.previous_effective_date || undefined)),
            this.detailRow('New effective date', this.formatDate(revision.new_effective_date || undefined)),
            this.detailRow('Date received', this.formatDate(revision.date_received || undefined)),
            this.detailRow('Date released', this.formatDate(revision.date_released || undefined)),
          this.detailRow('Approval date', this.formatDate(revision.approval_date || revision.approved_at || undefined)),
          this.detailRow('Approved by', this.fullName(revision.approver), false, true),
          this.detailRow('Last updated', this.formatDate(revision.updated_at)),
          this.detailRow('Reason for revision', revision.reason_of_revision, true, true),
        ];
    }
    private detailRow(label: string, value: unknown, wide = false, breakable = false) { return { label, value: value === null || value === undefined ? '' : String(value), wide, breakable }; }
    private actionRequestedLabel(value?: string | null) { return value === 'CREATE' ? 'Create Document' : value === 'REVISE' ? 'Revise Document' : value === 'CREATE_REVISE' ? 'Create / Revise Document (legacy)' : value === 'CANCELLATION' ? 'Cancellation' : value; }
    private changeReasonLabel(value?: string | null) { return value === 'CorrectionOfPreviousReleases' ? 'Correction of Previous Releases' : value; }
    revisionStatusLabel(revision: RevisionSummary) {
        if (this.document?.softcopy?.current_revision?.revision_id === revision.revision_id || revision.is_current) return 'Current controlled revision';
        if (revision.is_historical) return 'Superseded revision';
        if (revision.approved_at) return 'Approved revision';
        return 'Pending approval';
    }
    formatDate(value?: string) { if (!value) return 'N/A'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(); }
    hardcopyRouteSteps() {
        return [
            { label: 'Area', value: this.document?.hardcopy?.area?.area_name, icon: 'pi pi-th-large' },
            { label: 'Specific', value: this.document?.hardcopy?.specific?.specific_name, icon: 'pi pi-map' },
            { label: 'Asset', value: this.document?.hardcopy?.asset?.asset_number, icon: 'pi pi-tag' },
            { label: 'Location', value: this.document?.hardcopy?.location?.location_name, icon: 'pi pi-map-marker' },
            { label: 'Sequence', value: this.document?.hardcopy?.sequence?.sequence_code, icon: 'pi pi-sort-numeric-down' }
        ].filter((step): step is { label: string; value: string; icon: string } => Boolean(step.value));
    }
    softcopyJourneySteps() {
        const current = this.document?.softcopy?.current_revision;
        const folder = this.document?.softcopy?.category;
        const folderPath = (folder?.folder_name || folder?.category_name || '').split('/').map((part) => part.trim()).filter(Boolean);
        const mainFolder = folder?.parent?.category_name || folderPath[0] || folder?.category_name;
        const subfolder = folder?.parent_category_id ? folder?.category_name || folderPath.slice(1).join(' / ') : folderPath.length > 1 ? folderPath.slice(1).join(' / ') : '';
        return [
            { label: 'Main folder', value: mainFolder, icon: 'pi pi-folder-open' },
            { label: 'Subfolder', value: subfolder, icon: 'pi pi-folder' },
            { label: 'Revision', value: current?.revision_number ? `Revision ${current.revision_number}` : '', icon: 'pi pi-history' },
            { label: 'Updated', value: current?.created_at ? this.formatDate(current.created_at) : '', icon: 'pi pi-clock' },
            { label: 'Controlled file', value: current?.file_name, icon: this.revisionIcon(current || null) }
        ].filter((step): step is { label: string; value: string; icon: string } => Boolean(step.value));
    }
    hasHardcopyRoute() { return this.hardcopyRouteSteps().length > 0; }
    hardcopyRoute() { return this.hardcopyRouteSteps().map((step) => `${step.label}: ${step.value}`).join(' / ') || 'No location mapped'; }
    hasRequester() { return Boolean(this.document?.requested_by_name || this.fullName(this.document?.requester)); }
    async copyHardcopyRoute() {
        if (!this.hasHardcopyRoute()) return;
        try {
            await navigator.clipboard.writeText(this.hardcopyRoute());
            this.copiedRoute = true;
            window.setTimeout(() => this.copiedRoute = false, 1800);
        } catch {
            this.copiedRoute = false;
        }
    }
    replayPhysicalRoute() {
        if (!this.hasHardcopyRoute()) return;
        this.startPhysicalRouteJourney();
    }
    handleShow() {
        window.setTimeout(() => {
            if (this.document?.document_type === 'HARDCOPY') this.startPhysicalRouteJourney();
            if (this.document?.document_type === 'SOFTCOPY') this.startDigitalJourney();
            this.changeDetector.markForCheck();
        });
    }
    routeJourneyProgress() {
        const total = this.hardcopyRouteSteps().length;
        return total > 1 ? Math.round((Math.min(this.routeJourneyStage, total - 1) / (total - 1)) * 100) : total ? 100 : 0;
    }
    routeJourneyStatus() {
        const steps = this.hardcopyRouteSteps();
        if (!steps.length) return 'No route mapped';
        if (this.routeJourneyComplete) return `Arrived at ${steps[steps.length - 1].label}`;
        const currentIndex = Math.min(this.routeJourneyStage, steps.length - 1);
        const current = steps[currentIndex];
        const next = steps[currentIndex + 1];
        return next ? `Traveling from ${current.label} to ${next.label}` : `Confirming destination at ${current.label}`;
    }
    private startPhysicalRouteJourney() {
        this.clearRouteJourneyTimers();
        const steps = this.hardcopyRouteSteps();
        this.routeJourneyStage = 0;
        this.routeJourneyComplete = false;
        this.changeDetector.markForCheck();
        steps.slice(1).forEach((_step, index) => this.routeJourneyTimers.push(window.setTimeout(() => { this.routeJourneyStage = index + 1; this.changeDetector.markForCheck(); }, (index + 1) * this.journeyStepDuration)));
        const arrivalTime = Math.max(1, steps.length) * this.journeyStepDuration;
        this.routeJourneyTimers.push(window.setTimeout(() => { this.routeJourneyComplete = true; this.changeDetector.markForCheck(); }, arrivalTime));
    }
    private clearRouteJourneyTimers() {
        this.routeJourneyTimers.forEach((timer) => window.clearTimeout(timer));
        this.routeJourneyTimers = [];
    }
    replayDigitalJourney() { this.startDigitalJourney(); }
    digitalJourneyProgress() {
        const total = this.softcopyJourneySteps().length;
        return total > 1 ? Math.round((Math.min(this.digitalJourneyStage, total - 1) / (total - 1)) * 100) : total ? 100 : 0;
    }
    digitalJourneyStatus() {
        const steps = this.softcopyJourneySteps();
        if (!steps.length) return 'No digital path available';
        if (this.digitalJourneyComplete) return `Controlled file ready: ${steps[steps.length - 1].value}`;
        const currentIndex = Math.min(this.digitalJourneyStage, steps.length - 1);
        const next = steps[currentIndex + 1];
        return next ? `Moving from ${steps[currentIndex].label} to ${next.label}` : `Verifying ${steps[currentIndex].label}`;
    }
    private startDigitalJourney() {
        this.clearDigitalJourneyTimers();
        const steps = this.softcopyJourneySteps();
        if (!steps.length) return;
        this.digitalJourneyStage = 0;
        this.digitalJourneyComplete = false;
        this.digitalJourneyVisible = true;
        this.changeDetector.markForCheck();
        steps.slice(1).forEach((_step, index) => this.digitalJourneyTimers.push(window.setTimeout(() => { this.digitalJourneyStage = index + 1; this.changeDetector.markForCheck(); }, (index + 1) * this.journeyStepDuration)));
        const arrivalTime = Math.max(1, steps.length) * this.journeyStepDuration;
        this.digitalJourneyTimers.push(window.setTimeout(() => { this.digitalJourneyComplete = true; this.changeDetector.markForCheck(); }, arrivalTime));
    }
    private clearDigitalJourneyTimers() {
        this.digitalJourneyTimers.forEach((timer) => window.clearTimeout(timer));
        this.digitalJourneyTimers = [];
    }
    assignmentUsersLabel() { const assignments=this.document?.assignments??[]; if(!assignments.length)return 'Unassigned'; return assignments.map((item)=>this.fullName(item.user)||item.user.email||'User').join(', '); }
    assignmentActorLabel() { const assignments=this.document?.assignments??[]; if(!assignments.length)return 'No user-specific access assigned'; const latest=[...assignments].sort((a,b)=>new Date(b.assigned_at??0).getTime()-new Date(a.assigned_at??0).getTime())[0]; return `Assigned by ${this.fullName(latest.assigner)||latest.assigner?.email||'Administrator'}${latest.assigned_at?` · ${this.formatDate(latest.assigned_at)}`:''}`; }
    fileExtension(revision: RevisionSummary) { const match = (revision.file_name || '').match(/\.([^.]+)$/); return (match?.[1] || 'FILE').toUpperCase(); }
    revisionIcon(revision: RevisionSummary | null) { const name = revision?.file_name || ''; if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) return 'pi pi-image'; if (/\.pdf$/i.test(name)) return 'pi pi-file-pdf'; if (/\.(xlsx|xls|csv)$/i.test(name)) return 'pi pi-table'; if (/\.(docx|doc|rtf)$/i.test(name)) return 'pi pi-file-word'; if (/\.(pptx|ppt)$/i.test(name)) return 'pi pi-desktop'; return 'pi pi-file'; }
    fileTone(revision: RevisionSummary) { const name = revision.file_name || ''; if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) return 'image'; if (/\.pdf$/i.test(name)) return 'pdf'; if (/\.(xlsx|xls|docx|doc|pptx|ppt)$/i.test(name)) return 'office'; return 'generic'; }

    close() { this.visible = false; this.visibleChange.emit(false); this.previewRequest++; this.resetPreview(); }
    handleHide() { this.close(); }

    async openRevision(revision: RevisionSummary) {
        const link = this.revisionLink(revision);
        const stampable = this.isStampableOfficeRevision(revision);
        if (!link && !stampable) return;
        const protocol = this.officeProtocol(revision);
        if (!stampable && protocol && this.systemSettings.settings().officeOpenMode === 'desktop') { window.location.href = `${protocol}:ofe|u|${this.absoluteUrl(link)}`; return; }
        if (!this.isModernOfficeRevision(revision)) { window.open(link, '_blank', 'noopener,noreferrer'); return; }
        const target = window.open('', '_blank'); if (!target) return;
        this.showLoadingPage(target, revision.file_name || 'Document preview');
        await this.renderModernOfficeRevision(revision, target);
    }

    async downloadRevision(revision: RevisionSummary, artifactType: 'controlled' | 'uncontrolled' = 'uncontrolled') {
        const link = this.revisionLink(revision);
        const stampable = this.isStampableOfficeRevision(revision);
        if (!link && !stampable) return;

        this.downloadError = '';
        if (!stampable && link) {
            this.triggerDownload(this.absoluteUrl(link), this.uncontrolledDownloadName(revision.file_name || `revision-${revision.revision_number}`));
            return;
        }

        this.downloadInProgress = true;
        try {
            const blob = artifactType === 'controlled'
                ? await this.loadStampedRevision(revision)
                : await this.loadUncontrolledRevision(revision);
            const objectUrl = URL.createObjectURL(blob);
            this.triggerDownload(objectUrl, this.stampedDownloadName(revision.file_name || `revision-${revision.revision_number}`, artifactType));
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        } catch (error) {
            this.downloadError = error instanceof Error ? error.message : 'The file could not be downloaded.';
        } finally {
            this.downloadInProgress = false;
            this.changeDetector.markForCheck();
        }
    }

    private triggerDownload(url: string, fileName: string) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.rel = 'noopener';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    }

    private isImage(name: string, mime: string) { return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name) || mime.startsWith('image/'); }
    private isExcelRevision(revision: RevisionSummary) { return /\.(xlsx|xls)$/i.test(revision.file_name || this.revisionLink(revision)); }
    private isModernOfficeRevision(revision: RevisionSummary) { return /\.(xlsx|xls|docx|pptx)$/i.test(revision.file_name || this.revisionLink(revision)); }
    isStampableOfficeRevision(revision: RevisionSummary) { return /\.(xlsx|xls|docx)$/i.test(revision.file_name || this.revisionLink(revision)); }
    private officeProtocol(revision: RevisionSummary) { const name = revision.file_name || this.revisionLink(revision); if (/\.(xlsx|xls|csv)$/i.test(name)) return 'ms-excel'; if (/\.(docx|doc|rtf)$/i.test(name)) return 'ms-word'; if (/\.(pptx|ppt)$/i.test(name)) return 'ms-powerpoint'; return ''; }
    private absoluteUrl(link: string) { return new URL(link, window.location.href).href; }

    openRevisionLink(event: Event, revision: RevisionSummary) {
        if (!this.isStampableOfficeRevision(revision)) return;
        event.preventDefault();
        void this.openRevision(revision);
    }

    private async loadOriginalRevision(link: string) {
        const response = await fetch(link);
        if (!response.ok) throw new Error(`Unable to load file (${response.status}).`);
        return response.blob();
    }

    private async loadStampedRevision(revision: RevisionSummary) {
        if (!this.document?.document_id) throw new Error('The document identifier is unavailable.');
        return firstValueFrom(this.documentsService.downloadStampedRevision(this.document.document_id, revision.revision_id));
    }

    private async loadUncontrolledRevision(revision: RevisionSummary) {
        if (!this.document?.document_id) throw new Error('The document identifier is unavailable.');
        return firstValueFrom(this.documentsService.downloadUncontrolledRevision(this.document.document_id, revision.revision_id));
    }

    private uncontrolledDownloadName(fileName: string) {
        const extension = fileName.match(/\.[^.]+$/)?.[0] || '';
        const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
        return `${baseName}-uncontrolled${extension}`;
    }

    private stampedDownloadName(fileName: string, artifactType: 'controlled' | 'uncontrolled') {
        const extension = fileName.match(/\.[^.]+$/)?.[0] || '';
        const outputExtension = extension.toLowerCase() === '.xls' ? '.xlsx' : extension;
        const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
        return `${baseName}-${artifactType}${outputExtension}`;
    }

    private async buildOfficePreview(buffer: ArrayBuffer, revision: RevisionSummary) {
        const title = this.escapeHtml(revision.file_name || `Revision ${revision.revision_number}`);
        if (this.isExcelRevision(revision)) {
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheets = workbook.SheetNames.map((name) => `<section><h4>${this.escapeHtml(name)}</h4>${this.buildWorksheetPreview(workbook.Sheets[name])}${this.stampMarkup(revision)}</section>`).join('');
            return `<h4>${title}</h4>${sheets || '<p>This workbook has no worksheets.</p>'}`;
        }

        const isWord = /\.docx$/i.test(revision.file_name || '');
        const archive = await JSZip.loadAsync(buffer);
        const entries = Object.values(archive.files)
            .filter((entry) => !entry.dir && (isWord ? /word\/document\.xml$/i.test(entry.name) : /ppt\/slides\/slide\d+\.xml$/i.test(entry.name)))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        if (!entries.length) throw new Error('No previewable Office content was found.');
        const sections = await Promise.all(entries.slice(0, 10).map(async (entry, index) => {
            const xml = await entry.async('string');
            const parsed = new DOMParser().parseFromString(xml, 'application/xml');
            const text = Array.from(parsed.getElementsByTagName('*')).filter((node) => ['w:t', 'a:t'].includes(node.nodeName)).map((node) => node.textContent || '').filter(Boolean);
            return `<section><h4>${isWord ? title : `Slide ${index + 1}`}</h4>${text.map((value) => `<p>${this.escapeHtml(value)}</p>`).join('')}${isWord ? this.stampMarkup(revision) : ''}</section>`;
        }));
        return sections.join('');
    }

    private buildWorksheetPreview(sheet: XLSX.WorkSheet | undefined) {
        const reference = sheet?.['!ref'];
        if (!sheet || !reference) return '<p>This worksheet is empty.</p>';

        const range = XLSX.utils.decode_range(reference);
        const lastRow = Math.min(range.e.r, range.s.r + 199);
        const lastColumn = Math.min(range.e.c, range.s.c + 49);
        const rows: string[] = [];

        for (let row = range.s.r; row <= lastRow; row++) {
            const cells: string[] = [];
            for (let column = range.s.c; column <= lastColumn; column++) {
                const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
                const value = cell?.w ?? cell?.v ?? '';
                const tag = row === range.s.r ? 'th' : 'td';
                cells.push(`<${tag}>${this.escapeHtml(String(value))}</${tag}>`);
            }
            rows.push(`<tr>${cells.join('')}</tr>`);
        }

        const truncated = range.e.r > lastRow || range.e.c > lastColumn;
        return `<table><tbody>${rows.join('')}</tbody></table>${truncated ? '<p>Preview limited to the first 200 rows and 50 columns for performance.</p>' : ''}`;
    }

    private async renderModernOfficeRevision(revision: RevisionSummary, target: Window) {
        try {
            const link = this.revisionLink(revision);
            const body = await this.buildOfficePreview(await (link ? (await this.loadOriginalRevision(link)).arrayBuffer() : (await this.loadStampedRevision(revision)).arrayBuffer()), revision);
            const stamp = this.stampMarkup(revision, 'fixed');
            target.document.open(); target.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${this.escapeHtml(revision.file_name || 'Preview')}</title><style>body{font-family:Arial,sans-serif;color:#111;margin:28px;padding-bottom:46px}h4{border-bottom:2px solid #b91c1c;padding-bottom:8px}section{margin-bottom:24px;break-after:page}section:last-child{break-after:auto}table{width:max-content;min-width:100%;border-collapse:collapse;font-size:12px}td,th{border:1px solid #aaa;padding:5px 7px}p{margin:5px 0;line-height:1.5}.electronic-stamp.inline{margin-top:18px;padding-top:8px;border-top:2px solid currentColor;text-align:center;font:700 11px Arial,sans-serif}.electronic-stamp.fixed{display:none}@media print{.electronic-stamp.inline{display:none}.electronic-stamp.fixed{display:block;position:fixed;left:0;right:0;bottom:0;margin:0;padding:8px 12px;border-top:2px solid currentColor;background:#fff;text-align:center;font:700 11px Arial,sans-serif}}</style></head><body>${body}${stamp}</body></html>`); target.document.close();
        } catch (error) { this.showPreviewError(target, error); }
    }

    private showLoadingPage(target: Window, title: string) { target.document.open(); target.document.write(`<!doctype html><html><head><title>${this.escapeHtml(title)}</title></head><body style="font-family:Arial,sans-serif;padding:24px">Preparing preview...</body></html>`); target.document.close(); }
    private showPreviewError(target: Window, error: unknown) { const message = error instanceof Error ? error.message : 'Unable to preview this file.'; target.document.open(); target.document.write(`<!doctype html><html><head><title>Preview unavailable</title></head><body style="font-family:Arial,sans-serif;padding:24px"><h1>Preview unavailable</h1><p>${this.escapeHtml(message)}</p></body></html>`); target.document.close(); }
    private stampMarkup(revision: RevisionSummary, variant: 'inline' | 'fixed' = 'inline') {
        const stamp = this.electronicStamp(revision);
        return `<div class="electronic-stamp ${variant}" style="color:#${stamp.color};">${this.escapeHtml(stamp.text)}</div>`;
    }
    private electronicStamp(revision: RevisionSummary) {
        const status = this.document?.status;
        const number = this.document?.document_number || 'N/A';
        const revisionNumber = revision.revision_number || 'N/A';
        const effectiveDate = revision.effective_date || revision.new_effective_date;
        const effective = effectiveDate ? new Date(effectiveDate).toISOString().slice(0, 10) : 'N/A';
        const metadata = `Document No.: ${number} | Rev. ${revisionNumber}`;
        if (revision.is_historical || (!revision.is_current && revision.approved_at)) return { color: '666666', text: `SUPERSEDED DOCUMENT | ${metadata} | NOT FOR CURRENT USE.` };
        if (status === 'Cancelled' || status === 'Disposed') return { color: '666666', text: `OBSOLETE DOCUMENT | ${metadata} | NOT FOR USE.` };
        if (status === 'Rejected') return { color: 'FF0000', text: `UNCONTROLLED COPY | ${metadata} | Verify the current revision before use.` };
        if (status === 'Approved' || status === 'Completed') return { color: '0000FF', text: `CONTROLLED DOCUMENT | ${metadata} | Effective Date: ${effective}` };
        return { color: 'C65D00', text: `DRAFT DOCUMENT | ${metadata} | NOT APPROVED FOR USE.` };
    }
    private resetPreview() { this.selectedRevision = null; this.previewKind = 'idle'; this.previewHtml = ''; this.previewError = ''; this.copiedRoute = false; this.revokePreviewUrl(); }
    private revokePreviewUrl() { if (this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl); this.previewObjectUrl = ''; this.previewResourceUrl = null; }
    private escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] || character); }
}
