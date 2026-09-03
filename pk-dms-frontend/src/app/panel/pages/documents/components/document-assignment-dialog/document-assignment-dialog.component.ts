import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DocumentSummary, DocumentUserSummary } from '../../documents.types';

@Component({
    selector: 'app-document-assignment-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule],
    template: `
        <p-dialog [(visible)]="visible" [modal]="true" [draggable]="false" [resizable]="false" [style]="{ width: '36rem', maxWidth: '95vw' }" header="Assign document access" (onHide)="close()">
            <div class="space-y-4">
                <div class="rounded-xl bg-slate-50 p-4">
                    <div class="font-bold text-slate-900">{{ document?.document_type === 'HARDCOPY' ? 'Hardcopy record' : (document?.document_number || 'No document number') }}</div>
                    <div class="mt-1 text-sm text-slate-600">{{ document?.document_title }}</div>
                </div>
                <p class="m-0 text-sm leading-6 text-slate-600">Selected users can access this {{ document?.document_type === 'SOFTCOPY' ? 'softcopy' : 'hardcopy' }} document after signing in. Admin and super admin accounts always retain access.</p>
                <input type="search" [(ngModel)]="search" class="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Search users" />
                <div class="max-h-72 space-y-2 overflow-y-auto pr-1">
                    <label *ngFor="let user of filteredUsers()" class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                        <input type="checkbox" [checked]="selected.has(user.user_id)" (change)="toggle(user.user_id)" />
                        <span><strong class="block text-slate-900">{{ user.firstname }} {{ user.lastname }}</strong><small class="text-slate-500">{{ user.email }}</small></span>
                    </label>
                    <div *ngIf="!filteredUsers().length" class="py-8 text-center text-sm text-slate-500">No users match this search.</div>
                </div>
            </div>
            <ng-template pTemplate="footer">
                <p-button label="Cancel" severity="secondary" [outlined]="true" [disabled]="saving" (onClick)="close()" />
                <p-button label="Save assignments" icon="pi pi-users" [loading]="saving" (onClick)="save.emit(selectedIds())" />
            </ng-template>
        </p-dialog>
    `
})
export class DocumentAssignmentDialogComponent {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Input() document: DocumentSummary | null = null;
    @Input() users: DocumentUserSummary[] = [];
    @Input() saving = false;
    @Output() save = new EventEmitter<string[]>();
    search = '';
    selected = new Set<string>();

    open(document: DocumentSummary) {
        this.document = document;
        this.search = '';
        this.selected = new Set((document.assignments ?? []).map((assignment) => assignment.user.user_id));
    }

    filteredUsers() {
        const term = this.search.trim().toLowerCase();
        return this.users.filter((user) => !term || `${user.firstname} ${user.lastname} ${user.email ?? ''}`.toLowerCase().includes(term));
    }

    toggle(userId: string) {
        const next = new Set(this.selected);
        next.has(userId) ? next.delete(userId) : next.add(userId);
        this.selected = next;
    }

    selectedIds() {
        return Array.from(this.selected);
    }

    close() {
        if (this.saving) return;
        this.visible = false;
        this.visibleChange.emit(false);
    }
}
