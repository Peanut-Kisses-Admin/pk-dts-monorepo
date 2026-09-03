import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { AreaSummary, AssetNumberSummary, SoftcopyCategorySummary, SpecificSummary, StorageResourceFormValue, StorageResourceKey } from '../../storage-classification.types';

@Component({
    selector: 'app-storage-resource-form-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule],
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
                    <label for="primary-field" class="mb-2 block text-sm font-bold text-slate-700">
                        {{ primaryLabel }} <span class="text-red-500">*</span>
                    </label>
                    <input id="primary-field" name="primary-field" type="text" pInputText [(ngModel)]="form.primary" class="w-full" [placeholder]="primaryPlaceholder" />
                    <small *ngIf="submitted && !form.primary.trim()" class="mt-2 block text-red-500">{{ primaryLabel }} is required.</small>
                </div>

                <div *ngIf="resource === 'softcopyCategories'">
                    <label for="parent-category" class="mb-2 block text-sm font-bold text-slate-700">Main folder <span class="font-normal text-slate-400">Optional</span></label>
                    <select id="parent-category" class="select-field" [(ngModel)]="form.parent_category_id">
                        <option value="">Create as main folder</option>
                        <option *ngFor="let category of categoryOptions" [value]="category.softcopy_category_id">{{ category.folder_name }}</option>
                    </select>
                    <small class="mt-2 block text-slate-500">Choose a main folder to create or move this item as a subfolder.</small>
                </div>

                <div *ngIf="resource === 'specifics'">
                    <label class="mb-2 block text-sm font-bold text-slate-700">Assigned area <span class="text-red-500">*</span></label>
                    <select class="select-field" [(ngModel)]="form.area_id"><option value="">Select area</option><option *ngFor="let area of areas" [value]="area.area_id">{{ area.area_name }}</option></select>
                </div>
                <div *ngIf="resource === 'assetNumbers'">
                    <label class="mb-2 block text-sm font-bold text-slate-700">Assigned specific <span class="text-red-500">*</span></label>
                    <select class="select-field" [(ngModel)]="form.specific_id"><option value="">Select specific</option><option *ngFor="let specific of specifics" [value]="specific.specific_id">{{ specific.area?.area_name || 'No area' }} → {{ specific.specific_name }}</option></select>
                </div>
                <div *ngIf="resource === 'locations'">
                    <label class="mb-2 block text-sm font-bold text-slate-700">Assigned specific <span class="text-red-500">*</span></label>
                    <select class="select-field" [(ngModel)]="form.specific_id" (ngModelChange)="specificChanged()"><option value="">Select specific</option><option *ngFor="let specific of specifics" [value]="specific.specific_id">{{ specific.area?.area_name || 'No area' }} → {{ specific.specific_name }}</option></select>
                    <small class="mt-2 block text-slate-500">The location follows this specific and its area even without an asset number.</small>
                </div>
                <div *ngIf="resource === 'locations'">
                    <label class="mb-2 block text-sm font-bold text-slate-700">Assigned asset number <span class="font-normal text-slate-400">Optional</span></label>
                    <select class="select-field" [(ngModel)]="form.asset_id" (ngModelChange)="assetChanged($event)"><option value="">No asset number</option><option *ngFor="let asset of locationAssets" [value]="asset.asset_id">{{ asset.asset_number }}</option></select>
                    <small class="mt-2 block text-slate-500">Only asset numbers belonging to the selected specific are shown.</small>
                </div>

            </div>

            <ng-template pTemplate="footer">
                <p-button label="Cancel" severity="secondary" text (onClick)="cancel()" />
                <p-button [label]="mode === 'create' ? 'Create' : 'Update'" icon="pi pi-check" [loading]="saving" (onClick)="submit()" />
            </ng-template>
        </p-dialog>
    `,
    styles: [
        `
            .select-field {
                min-height: 2.75rem;
                width: 100%;
                border-radius: 0.85rem;
                border: 1px solid #cbd5e1;
                background: #ffffff;
                padding: 0.75rem 0.9rem;
                color: #0f172a;
                outline: none;
            }

            .select-field:focus {
                border-color: #0f172a;
            }

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
export class StorageResourceFormDialogComponent {
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

    @Input() resource: StorageResourceKey = 'areas';
    @Input() mode: 'create' | 'update' = 'create';
    @Input() form: StorageResourceFormValue = { primary: '', area_id: '' };
    @Input() saving = false;
    @Input() categoryOptions: SoftcopyCategorySummary[] = [];
    @Input() areas: AreaSummary[] = [];
    @Input() specifics: SpecificSummary[] = [];
    @Input() assets: AssetNumberSummary[] = [];

    @Output() save = new EventEmitter<StorageResourceFormValue>();
    @Output() cancelClick = new EventEmitter<void>();

    submitted = false;

    get dialogTitle() {
        return `${this.mode === 'create' ? 'Create' : 'Update'} ${this.resourceLabel()}`;
    }

    get primaryLabel() {
        switch (this.resource) {
            case 'areas':
                return 'Area name';
            case 'assetNumbers':
                return 'Asset number';
            case 'specifics':
                return 'Specific name';
            case 'locations':
                return 'Location name';
            case 'softcopyCategories':
                return 'Folder name';
            default:
                return 'Sequence code';
        }
    }

    get primaryPlaceholder() {
        switch (this.resource) {
            case 'areas':
                return 'Quality Assurance';
            case 'assetNumbers':
                return 'ASSET-2026-001';
            case 'specifics':
                return 'Controlled Documents';
            case 'locations':
                return 'Main Office';
            case 'softcopyCategories':
                return 'Policies';
            default:
                return 'QMS';
        }
    }

    submit() {
        this.submitted = true;
        if (!this.form.primary.trim() || (this.resource === 'specifics' && !this.form.area_id) || (this.resource === 'assetNumbers' && !this.form.specific_id) || (this.resource === 'locations' && !this.form.specific_id)) {
            return;
        }

        this.save.emit({ ...this.form });
    }

    cancel() {
        this.cancelClick.emit();
        this.close();
    }

    get locationAssets() {
        return this.form.specific_id ? this.assets.filter((asset) => asset.specific_id === this.form.specific_id) : [];
    }

    specificChanged() {
        if (this.form.asset_id && !this.locationAssets.some((asset) => asset.asset_id === this.form.asset_id)) this.form.asset_id = '';
    }

    assetChanged(assetId: string) {
        const asset = this.assets.find((item) => item.asset_id === assetId);
        if (asset?.specific_id) this.form.specific_id = asset.specific_id;
    }
    handleHide() {
        this.close();
    }

    private resourceLabel() {
        switch (this.resource) {
            case 'areas':
                return 'Area';
            case 'assetNumbers':
                return 'Asset Number';
            case 'specifics':
                return 'Specific';
            case 'locations':
                return 'Location';
            case 'softcopyCategories':
                return 'Softcopy Folder';
            default:
                return 'Sequence';
        }
    }

    private close() {
        this.visible = false;
        this.visibleChange.emit(false);
    }
}
