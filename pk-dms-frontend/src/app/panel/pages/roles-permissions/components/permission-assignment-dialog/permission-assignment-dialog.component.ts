import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import {
    SEARCHABLE_DROPDOWN_THRESHOLD,
    SearchableDropdownComponent,
    SearchableDropdownOption,
    SearchableDropdownValue
} from '@/app/shared/components/searchable-dropdown/searchable-dropdown.component';
import { Permission, Role } from '../../role-permission.types';

export interface PermissionAssignmentFormValue {
    roleId: string;
    permissionIds: string[];
}

interface PermissionModuleGroup {
    moduleKey: string;
    moduleLabel: string;
    permissions: Permission[];
}

@Component({
    selector: 'app-permission-assignment-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, CheckboxModule, DialogModule, SearchableDropdownComponent],
    template: `
        <p-dialog
            [(visible)]="visible"
            [modal]="true"
            [draggable]="false"
            [resizable]="false"
            [dismissableMask]="true"
            [blockScroll]="true"
            [appendTo]="'body'"
            [style]="{ width: '52rem', maxWidth: '94vw' }"
            [breakpoints]="{ '960px': '92vw', '640px': '96vw' }"
            (onHide)="handleHide()"
        >
            <ng-template pTemplate="header">
                <div class="flex w-full items-center gap-4">
                    <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-inset ring-red-100">
                        <i class="pi pi-link text-2xl"></i>
                    </div>

                    <div class="min-w-0 flex-1">
                        <h2 class="m-0 text-xl font-bold leading-7 text-slate-900">Assign permissions</h2>
                        <p class="mt-1 mb-0 text-sm leading-5 text-slate-500">
                            Update the final permission set for {{ roleName || 'the selected role' }} by checking what should stay assigned. Uncheck any permission here to remove it from this role.
                        </p>
                    </div>
                </div>
            </ng-template>

            <div class="space-y-5 pt-2">
                <div class="grid gap-4 lg:grid-cols-[18rem_1fr]">
                    <div>
                        <label for="assignment-role" class="mb-2 block text-sm font-bold text-slate-700">Role</label>
                        <ng-container *ngIf="roles.length > searchableThreshold; else defaultRoleSelect">
                            <app-searchable-dropdown
                                inputId="assignment-role"
                                [value]="form.roleId"
                                [options]="roleOptions"
                                placeholder="Select role"
                                [disabled]="saving || loading"
                                [loading]="loading"
                                [invalid]="!form.roleId && submitted"
                                [required]="true"
                                [clearValue]="''"
                                (valueChange)="onSearchableRoleChange($event)"
                            />
                        </ng-container>
                        <ng-template #defaultRoleSelect>
                            <select
                                id="assignment-role"
                                name="assignment-role"
                                [(ngModel)]="form.roleId"
                                (ngModelChange)="onRoleChange()"
                                class="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                                [disabled]="saving || loading"
                            >
                                <option value="">Select role</option>
                                <option *ngFor="let role of roles; trackBy: trackRole" [value]="roleId(role)">
                                    {{ role.role_name }}
                                </option>
                            </select>
                        </ng-template>
                        <small class="mt-2 block text-slate-500">Pick the role you want to update, then keep only the permissions that should remain assigned.</small>
                    </div>

                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Final selection</div>
                                <div class="mt-1 text-sm text-slate-600">{{ form.permissionIds.length }} permission{{ form.permissionIds.length === 1 ? '' : 's' }} will remain on this role</div>
                                <div class="mt-1 text-xs leading-5 text-slate-500">Disable a module to clear all of its actions. Enabled modules let you keep only the actions this role should have.</div>
                            </div>

                            <div class="flex gap-2">
                                <p-button label="Select all" severity="secondary" text (onClick)="selectAll()" />
                                <p-button label="Clear all" severity="secondary" text (onClick)="clearAll()" />
                            </div>
                        </div>

                        <div class="mt-4 max-h-[22rem] overflow-auto rounded-2xl border border-slate-200 bg-white p-4">
                            <ng-container *ngIf="permissionModules().length; else noPermissions">
                                <div class="space-y-4">
                                    <div *ngFor="let module of permissionModules(); trackBy: trackModule" class="rounded-2xl border border-slate-200 p-4">
                                        <div class="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <div class="text-sm font-black text-slate-900">{{ module.moduleLabel }}</div>
                                                <div class="mt-1 text-xs leading-5 text-slate-500">{{ module.permissions.length }} action{{ module.permissions.length === 1 ? '' : 's' }} available for this module.</div>
                                            </div>

                                            <div class="flex items-center gap-3">
                                                <span class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Enable Module</span>
                                                <input type="checkbox" class="h-4 w-4 accent-red-600" [checked]="moduleEnabled(module)" (change)="toggleModule(module, $any($event.target).checked)" />
                                            </div>
                                        </div>

                                        <div *ngIf="moduleEnabled(module)" class="mt-4 grid gap-3 sm:grid-cols-2">
                                            <label
                                                *ngFor="let permission of module.permissions; trackBy: trackPermission"
                                                class="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-red-200 hover:bg-red-50/40"
                                            >
                                                <p-checkbox [value]="permissionId(permission)" [(ngModel)]="form.permissionIds" [inputId]="'permission-' + permissionId(permission)" name="permissionIds"></p-checkbox>

                                                <div class="min-w-0">
                                                    <div class="text-sm font-black text-slate-900 break-words">{{ permission.action_label || permission.permission_name }}</div>
                                                    <div class="mt-1 font-mono text-[11px] text-slate-500 break-words">{{ permission.permission_name }}</div>
                                                    <div class="mt-1 text-xs leading-5 text-slate-500">{{ permission.description || 'No description provided.' }}</div>
                                                </div>
                                            </label>
                                        </div>

                                        <div *ngIf="!moduleEnabled(module)" class="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">This module is disabled for the selected role.</div>
                                    </div>
                                </div>
                            </ng-container>

                            <ng-template #noPermissions>
                                <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-slate-500">No permissions available to assign yet.</div>
                            </ng-template>
                        </div>
                    </div>
                </div>
            </div>

            <ng-template pTemplate="footer">
                <p-button label="Cancel" severity="secondary" text (onClick)="cancel()" />
                <p-button label="Save changes" icon="pi pi-link" [loading]="saving" [disabled]="!canSubmit()" (onClick)="submit()" />
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
                background: radial-gradient(circle at top left, rgba(220, 38, 38, 0.08), transparent 35%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
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
export class PermissionAssignmentDialogComponent {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    private enabledModuleKeys = new Set<string>();

    @Input() roles: Role[] = [];
    @Input() permissions: Permission[] = [];
    @Input() loading = false;
    @Input() set form(value: PermissionAssignmentFormValue) {
        this._form = value;
        this.submitted = false;
        this.syncEnabledModules();
    }
    get form() {
        return this._form;
    }
    @Input() roleName = '';
    @Input() saving = false;

    @Output() save = new EventEmitter<void>();
    @Output() cancelClick = new EventEmitter<void>();
    @Output() roleSelectionChange = new EventEmitter<string>();

    private _form: PermissionAssignmentFormValue = { roleId: '', permissionIds: [] };
    submitted = false;
    readonly searchableThreshold = SEARCHABLE_DROPDOWN_THRESHOLD;

    permissionModules = () => {
        const modules = new Map<string, PermissionModuleGroup>();

        for (const permission of this.permissions) {
            const moduleKey = permission.module_key || 'general';
            const existingGroup = modules.get(moduleKey);

            if (existingGroup) {
                existingGroup.permissions.push(permission);
                continue;
            }

            modules.set(moduleKey, {
                moduleKey,
                moduleLabel: permission.module_label || moduleKey,
                permissions: [permission]
            });
        }

        return [...modules.values()];
    };

    canSubmit() {
        return !!this.form.roleId && !this.saving;
    }

    get roleOptions(): SearchableDropdownOption[] {
        return this.roles.map((role) => ({
            label: role.role_name,
            value: this.roleId(role)
        }));
    }

    selectAll() {
        this.form.permissionIds = this.permissions.map((permission) => this.permissionId(permission));
    }

    clearAll() {
        this.form.permissionIds = [];
    }

    moduleEnabled(module: PermissionModuleGroup) {
        return this.enabledModuleKeys.has(module.moduleKey);
    }

    toggleModule(module: PermissionModuleGroup, enabled: boolean) {
        const modulePermissionIds = new Set(module.permissions.map((permission) => this.permissionId(permission)));

        if (enabled) {
            this.enabledModuleKeys.add(module.moduleKey);
            return;
        }

        this.enabledModuleKeys.delete(module.moduleKey);
        this.form.permissionIds = this.form.permissionIds.filter((permissionId) => !modulePermissionIds.has(permissionId));
    }

    onRoleChange() {
        this.roleSelectionChange.emit(this.form.roleId);
    }

    onSearchableRoleChange(value: SearchableDropdownValue) {
        this.form.roleId = this.normalizeSelectValue(value);
        this.onRoleChange();
    }

    submit() {
        this.submitted = true;
        if (!this.canSubmit()) {
            return;
        }

        this.save.emit();
    }

    cancel() {
        this.submitted = false;
        this.cancelClick.emit();
        this.close();
    }

    handleHide() {
        this.close();
    }

    roleId(role: Role) {
        const flexibleRole = role as Role & { id?: unknown; roleId?: unknown };
        return this.stringValue(flexibleRole.role_id ?? flexibleRole.id ?? flexibleRole.roleId);
    }

    permissionId(permission: Permission) {
        const flexiblePermission = permission as Permission & { id?: unknown; permissionId?: unknown };
        return this.stringValue(flexiblePermission.permission_id ?? flexiblePermission.id ?? flexiblePermission.permissionId);
    }

    trackRole = (_index: number, role: Role) => this.roleId(role);
    trackPermission = (_index: number, permission: Permission) => this.permissionId(permission);
    trackModule = (_index: number, module: PermissionModuleGroup) => module.moduleKey;

    private close() {
        this.visible = false;
        this.visibleChange.emit(false);
    }

    private stringValue(value: unknown) {
        return value === undefined || value === null ? '' : String(value);
    }

    private normalizeSelectValue(value: SearchableDropdownValue) {
        return value === null || value === undefined ? '' : String(value);
    }

    private syncEnabledModules() {
        const nextEnabledModuleKeys = new Set<string>();
        const selectedPermissionIds = new Set(this.form.permissionIds);

        for (const module of this.permissionModules()) {
            if (module.permissions.some((permission) => selectedPermissionIds.has(this.permissionId(permission)))) {
                nextEnabledModuleKeys.add(module.moduleKey);
            }
        }

        this.enabledModuleKeys = nextEnabledModuleKeys;
    }
}
