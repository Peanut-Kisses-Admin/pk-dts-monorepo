import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import {
    SEARCHABLE_DROPDOWN_THRESHOLD,
    SearchableDropdownComponent,
    SearchableDropdownOption,
    SearchableDropdownValue
} from '@/app/shared/components/searchable-dropdown/searchable-dropdown.component';
import { UserAccountFormValue, UserAccountSummary, UserRoleSummary } from '../../user-account.types';

type UserFormMode = 'create' | 'update';

@Component({
    selector: 'app-user-form-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, PasswordModule, SearchableDropdownComponent],
    template: `
        <p-dialog
            [(visible)]="visible"
            [modal]="true"
            [draggable]="false"
            [resizable]="false"
            [dismissableMask]="true"
            [blockScroll]="true"
            [appendTo]="'body'"
            [style]="{ width: '56rem', maxWidth: '94vw' }"
            [breakpoints]="{ '960px': '92vw', '640px': '96vw' }"
            [header]="mode === 'create' ? 'Create User Account' : 'Update User Account'"
            (onHide)="handleHide()"
        >
            <div class="grid gap-4 pt-2 md:grid-cols-2">
                <div class="field">
                    <label for="firstname">First name <span class="text-red-500">*</span></label>
                    <input id="firstname" name="firstname" pInputText [(ngModel)]="form.firstname" class="w-full" placeholder="Juan" />
                    <small *ngIf="submitted && !form.firstname.trim()">First name is required.</small>
                </div>

                <div class="field">
                    <label for="lastname">Last name <span class="text-red-500">*</span></label>
                    <input id="lastname" name="lastname" pInputText [(ngModel)]="form.lastname" class="w-full" placeholder="Dela Cruz" />
                    <small *ngIf="submitted && !form.lastname.trim()">Last name is required.</small>
                </div>

                <div class="field">
                    <label for="middlename">Middle name</label>
                    <input id="middlename" name="middlename" pInputText [(ngModel)]="form.middlename" class="w-full" placeholder="Santos" />
                </div>

                <div class="field">
                    <label for="age">Age</label>
                    <input id="age" name="age" pInputText [(ngModel)]="form.age" class="w-full" placeholder="30" />
                    <small *ngIf="submitted && !ageIsValid()">Age must be a whole number greater than or equal to 0.</small>
                </div>

                <div class="field">
                    <label for="email">Email <span class="text-red-500">*</span></label>
                    <input id="email" name="email" type="email" pInputText [(ngModel)]="form.email" class="w-full" placeholder="juan@example.com" />
                    <small *ngIf="submitted && !emailIsValid()">Enter a valid email address.</small>
                </div>

                <div class="field">
                    <label for="phone_number">Phone number</label>
                    <input id="phone_number" name="phone_number" pInputText [(ngModel)]="form.phone_number" class="w-full" placeholder="+639171234567" />
                </div>

                <div class="field">
                    <label for="position_title">Position title</label>
                    <input id="position_title" name="position_title" pInputText [(ngModel)]="form.position_title" class="w-full" placeholder="Document Controller" />
                </div>

                <div class="field">
                    <label for="role_id">Role <span class="text-red-500">*</span></label>
                    <ng-container *ngIf="roles.length > searchableThreshold; else defaultRoleSelect">
                        <app-searchable-dropdown
                            inputId="role_id"
                            [value]="form.role_id"
                            [options]="roleOptions"
                            placeholder="Select role"
                            [disabled]="saving || rolesLoading || roleLocked"
                            [loading]="rolesLoading"
                            [invalid]="submitted && !form.role_id"
                            [required]="true"
                            [clearValue]="''"
                            (valueChange)="form.role_id = normalizeSelectValue($event)"
                        />
                    </ng-container>
                    <ng-template #defaultRoleSelect>
                        <select id="role_id" name="role_id" [(ngModel)]="form.role_id" class="select-field" [disabled]="saving || rolesLoading || roleLocked">
                            <option value="">Select role</option>
                            <option *ngFor="let role of roles; trackBy: trackRole" [value]="role.role_id">
                                {{ role.role_name }}
                            </option>
                        </select>
                    </ng-template>
                    <small *ngIf="submitted && !form.role_id">Role is required.</small>
                    <small *ngIf="roleLocked" class="role-note">Your role is protected and can only be changed by an authorized account manager.</small>
                </div>

                <div class="field">
                    <label for="leader_id">Leader / Noted By</label>
                    <select id="leader_id" name="leader_id" [(ngModel)]="form.leader_id" class="select-field">
                        <option value="">No Leader/Noted By assigned</option>
                        <option *ngFor="let user of users; trackBy: trackUser" [value]="user.user_id">{{ fullName(user) }}</option>
                    </select>
                    <small class="role-note">Required before submitting a Softcopy request.</small>
                </div>

                <div class="field md:col-span-2">
                    <label for="address">Address</label>
                    <input id="address" name="address" pInputText [(ngModel)]="form.address" class="w-full" placeholder="Manila, Philippines" />
                </div>

                <div class="field md:col-span-2">
                    <label for="password">
                        Password <span class="text-red-500" *ngIf="mode === 'create'">*</span>
                    </label>
                    <p-password
                        inputId="password"
                        name="password"
                        [(ngModel)]="form.password"
                        [toggleMask]="true"
                        [feedback]="false"
                        [fluid]="true"
                        [placeholder]="mode === 'create' ? 'Enter password' : 'Leave blank to keep the current password'"
                    ></p-password>
                    <small *ngIf="submitted && mode === 'create' && !form.password.trim()">Password is required.</small>
                </div>
            </div>

            <ng-template pTemplate="footer">
                <p-button label="Cancel" severity="secondary" text (onClick)="cancel()" />
                <p-button [label]="mode === 'create' ? 'Create user' : 'Save changes'" icon="pi pi-check" [loading]="saving" (onClick)="submit()" />
            </ng-template>
        </p-dialog>
    `,
    styles: [
        `
            .field {
                display: flex;
                flex-direction: column;
                gap: 0.55rem;
            }

            .field label {
                font-size: 0.9rem;
                font-weight: 700;
                color: #334155;
            }

            .field small {
                color: #dc2626;
                font-size: 0.8rem;
                font-weight: 600;
            }

            .field small.role-note { color: #64748b; }

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

            :host ::ng-deep .p-password,
            :host ::ng-deep .p-password-input {
                width: 100%;
            }
        `
    ]
})
export class UserFormDialogComponent {
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

    @Input() mode: UserFormMode = 'create';
    @Input() roles: UserRoleSummary[] = [];
    @Input() users: UserAccountSummary[] = [];
    @Input() rolesLoading = false;
    @Input() roleLocked = false;
    @Input() form: UserAccountFormValue = {
        firstname: '',
        lastname: '',
        middlename: '',
        age: '',
        address: '',
        phone_number: '',
        email: '',
        position_title: '',
        password: '',
        role_id: '',
        leader_id: ''
    };
    @Input() saving = false;

    @Output() save = new EventEmitter<UserAccountFormValue>();
    @Output() cancelClick = new EventEmitter<void>();

    submitted = false;
    readonly searchableThreshold = SEARCHABLE_DROPDOWN_THRESHOLD;

    submit() {
        this.submitted = true;

        if (!this.form.firstname.trim() || !this.form.lastname.trim() || !this.emailIsValid() || !this.form.role_id || !this.ageIsValid()) {
            return;
        }

        if (this.mode === 'create' && !this.form.password.trim()) {
            return;
        }

        this.save.emit({ ...this.form });
    }

    cancel() {
        this.cancelClick.emit();
        this.close();
    }

    emailIsValid() {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim());
    }

    ageIsValid() {
        const trimmedAge = this.form.age.trim();
        if (!trimmedAge) {
            return true;
        }

        return /^\d+$/.test(trimmedAge);
    }

    get roleOptions(): SearchableDropdownOption[] {
        return this.roles.map((role) => ({
            label: role.role_name,
            value: role.role_id
        }));
    }

    trackRole = (_index: number, role: UserRoleSummary) => role.role_id;
    trackUser = (_index: number, user: UserAccountSummary) => user.user_id;

    fullName(user: UserAccountSummary) {
        return [user.firstname, user.lastname].filter(Boolean).join(' ');
    }

    handleHide() {
        this.close();
    }

    private close() {
        this.visible = false;
        this.visibleChange.emit(false);
    }

    normalizeSelectValue(value: SearchableDropdownValue) {
        return value === null || value === undefined ? '' : String(value);
    }
}
