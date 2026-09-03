import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

export interface ResourceFormValue {
    name: string;
    description: string;
}

type ResourceKind = 'role' | 'permission';
type ResourceMode = 'create' | 'update';

@Component({
    selector: 'app-resource-form-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, TextareaModule],
    template: `
        <p-dialog
            [(visible)]="visible"
            [modal]="true"
            [draggable]="false"
            [resizable]="false"
            [dismissableMask]="true"
            [blockScroll]="true"
            [appendTo]="'body'"
            [style]="{ width: '34rem', maxWidth: '94vw' }"
            [breakpoints]="{ '960px': '92vw', '640px': '96vw' }"
            [header]="dialogTitle"
            (onHide)="handleHide()"
        >
            <div class="space-y-5 pt-2">
                <div>
                    <label [for]="nameInputId" class="mb-2 block text-sm font-bold text-slate-700">
                        {{ nameLabel }} <span class="text-red-500">*</span>
                    </label>
                    <input
                        [id]="nameInputId"
                        [name]="nameInputId"
                        type="text"
                        pInputText
                        [(ngModel)]="form.name"
                        class="w-full"
                        [placeholder]="namePlaceholder"
                    />
                    <small *ngIf="submitted && !form.name.trim()" class="mt-2 block text-red-500">
                        {{ nameLabel }} is required.
                    </small>
                </div>

                <div>
                    <label [for]="descriptionInputId" class="mb-2 block text-sm font-bold text-slate-700">
                        Description
                    </label>
                    <textarea
                        [id]="descriptionInputId"
                        [name]="descriptionInputId"
                        pTextarea
                        [(ngModel)]="form.description"
                        rows="4"
                        class="w-full"
                        [placeholder]="descriptionPlaceholder"
                    ></textarea>
                </div>
            </div>

            <ng-template pTemplate="footer">
                <p-button label="Cancel" severity="secondary" text (onClick)="cancel()" />
                <p-button [label]="saveLabel" icon="pi pi-check" [loading]="saving" (onClick)="submit()" />
            </ng-template>
        </p-dialog>
    `,
    styles: [
        `
            :host ::ng-deep .p-dialog {
                border-radius: 1.5rem;
                overflow: hidden;
            }

            :host ::ng-deep .p-dialog .p-dialog-header {
                padding: 1.35rem 1.5rem 1rem;
                border-bottom: 1px solid rgba(148, 163, 184, 0.15);
                background:
                    radial-gradient(circle at top left, rgba(220, 38, 38, 0.08), transparent 35%),
                    linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
            }

            :host ::ng-deep .p-dialog .p-dialog-content {
                padding: 1.5rem;
                background: #ffffff;
            }

            :host ::ng-deep .p-dialog .p-dialog-footer {
                padding: 0 1.5rem 1.5rem;
                background: #ffffff;
                border-top: none;
            }
        `
    ]
})
export class ResourceFormDialogComponent {
    private _visible = false;

    @Input()
    get visible() {
        return this._visible;
    }
    set visible(value: boolean) {
        this._visible = value;
        if (value) {
            this.submitted = false;
        }
    }

    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() kind: ResourceKind = 'role';
    @Input() mode: ResourceMode = 'create';
    @Input() form: ResourceFormValue = { name: '', description: '' };
    @Input() saving = false;

    @Output() save = new EventEmitter<ResourceFormValue>();
    @Output() cancelClick = new EventEmitter<void>();

    submitted = false;

    get dialogTitle() {
        const action = this.mode === 'create' ? 'Create' : 'Update';
        return `${action} ${this.kind === 'role' ? 'Role' : 'Permission'}`;
    }

    get nameLabel() {
        return this.kind === 'role' ? 'Role name' : 'Permission name';
    }

    get namePlaceholder() {
        return this.kind === 'role' ? 'Administrator' : 'documents.create';
    }

    get descriptionPlaceholder() {
        return this.kind === 'role' ? 'Full access to the panel.' : 'Can create and manage documents.';
    }

    get saveLabel() {
        return this.mode === 'create' ? 'Create' : 'Update';
    }

    get nameInputId() {
        return `${this.kind}-name`;
    }

    get descriptionInputId() {
        return `${this.kind}-description`;
    }

    submit() {
        this.submitted = true;

        if (!this.form.name.trim()) {
            return;
        }

        this.save.emit({ ...this.form });
    }

    cancel() {
        this.cancelClick.emit();
        this.close();
    }

    handleHide() {
        this.close();
    }

    private close() {
        this.visible = false;
        this.visibleChange.emit(false);
    }
}
