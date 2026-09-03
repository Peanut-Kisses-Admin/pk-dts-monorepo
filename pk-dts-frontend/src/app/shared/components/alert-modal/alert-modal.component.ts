import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

export type AlertSeverity = 'success' | 'warning' | 'error' | 'info';

@Component({
    selector: 'app-alert-modal',
    standalone: true,
    imports: [CommonModule, DialogModule, ButtonModule],
    template: `
        <p-dialog
            [(visible)]="visible"
            styleClass="modern-alert-dialog"
            [modal]="true"
            [closable]="false"
            [dismissableMask]="dismissableMask"
            [draggable]="false"
            [resizable]="false"
            [appendTo]="'body'"
            [style]="{ width: width, maxWidth: '94vw' }"
            [contentStyle]="{ padding: '0' }"
            [breakpoints]="{ '960px': '92vw', '640px': '96vw' }"
            [baseZIndex]="2300"
            (onHide)="handleHide()"
        >
            <ng-template pTemplate="header">
                <div class="flex w-full items-center gap-4">
                    <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" [ngClass]="severityClasses().badge">
                        <i class="text-2xl" [ngClass]="severityClasses().icon"></i>
                    </div>

                    <div class="min-w-0 flex-1">
                        <h2 class="m-0 text-xl font-bold leading-7 text-slate-900">
                            {{ title }}
                        </h2>

                        <p *ngIf="subtitle" class="mt-1 mb-0 text-sm leading-5 text-slate-500">
                            {{ subtitle }}
                        </p>
                    </div>
                </div>
            </ng-template>

            <div class="px-6 pb-6 pt-2 sm:px-6 sm:pb-6 sm:pt-3">
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                    <div class="space-y-4">
                        <p class="m-0 text-sm leading-6 text-slate-600">
                            {{ message }}
                        </p>
                        <p
                            *ngIf="details"
                            class="m-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[0.85rem] leading-relaxed text-slate-500 shadow-sm"
                        >
                            {{ details }}
                        </p>
                    </div>

                    <div class="mt-6 flex justify-end">
                        <p-button
                            [label]="actionLabel"
                            [severity]="severityClasses().buttonSeverity"
                            (onClick)="close()"
                            styleClass="!px-5 !py-2.5"
                        ></p-button>
                    </div>
                </div>
            </div>
        </p-dialog>
    `,
    styles: [
        `
            :host ::ng-deep .p-dialog {
                border: 1px solid rgba(226, 232, 240, 0.9);
                background: #ffffff;
                color: #0f172a;
                box-shadow:
                    0 24px 80px rgba(15, 23, 42, 0.18),
                    0 10px 28px rgba(15, 23, 42, 0.08);
                border-radius: 24px;
                overflow: hidden;
            }

            :host ::ng-deep .modern-alert-dialog .p-dialog-header {
                background:
                    radial-gradient(circle at top left, rgba(226, 232, 240, 0.8), transparent 38%),
                    linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                border-bottom: none;
                padding: 24px 24px 16px;
            }

            :host ::ng-deep .modern-alert-dialog .p-dialog-content {
                background: #ffffff;
                padding: 0;
            }

            :host ::ng-deep .modern-alert-dialog .p-button {
                height: 44px;
                border-radius: 14px;
                font-weight: 600;
                padding-inline: 18px;
            }

            :host ::ng-deep .modern-alert-dialog .p-button-label {
                font-size: 14px;
            }

            :host ::ng-deep .modern-alert-dialog .p-button-outlined {
                background: #ffffff;
            }

            :host ::ng-deep .modern-alert-dialog .p-button-outlined:hover {
                background: #f8fafc;
            }

            :host ::ng-deep .p-dialog-mask {
                background: rgba(15, 23, 42, 0.28);
                backdrop-filter: blur(4px);
            }

            :host ::ng-deep .p-dialog-enter-active {
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }

            @media (max-width: 640px) {
                :host ::ng-deep .modern-alert-dialog .p-dialog-header {
                    padding: 20px 20px 14px;
                }

                :host ::ng-deep .modern-alert-dialog .p-dialog-content > div {
                    padding-left: 20px;
                    padding-right: 20px;
                    padding-bottom: 20px;
                }
            }
        `
    ]
})
export class AlertModalComponent {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() severity: AlertSeverity = 'success';
    @Input() title = 'Notice';
    @Input() subtitle = '';
    @Input() message = '';
    @Input() details = '';
    @Input() actionLabel = 'Close';
    @Input() width = '28rem';
    @Input() dismissableMask = true;

    @Output() closed = new EventEmitter<void>();

    severityClasses() {
        switch (this.severity) {
            case 'warning':
                return {
                    badge: 'bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100',
                    icon: 'pi pi-exclamation-triangle',
                    buttonSeverity: 'warn' as const
                };
            case 'error':
                return {
                    badge: 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-100',
                    icon: 'pi pi-times-circle',
                    buttonSeverity: 'danger' as const
                };
            case 'info':
                return {
                    badge: 'bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100',
                    icon: 'pi pi-info-circle',
                    buttonSeverity: 'info' as const
                };
            default:
                return {
                    badge: 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100',
                    icon: 'pi pi-check-circle',
                    buttonSeverity: 'success' as const
                };
        }
    }

    close() {
        this.closed.emit();
        this.visible = false;
        this.visibleChange.emit(false);
    }

    handleHide() {
        this.close();
    }
}
