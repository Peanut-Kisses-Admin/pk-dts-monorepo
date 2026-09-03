import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

export interface ResourceViewItem {
    label: string;
    value: string;
}

export interface ResourceViewDialogData {
    kindLabel: string;
    title: string;
    subtitle?: string;
    nameLabel: string;
    name: string;
    description: string;
    metrics: ResourceViewItem[];
    remarksLabel?: string;
    remarks?: string | null;
    chipsLabel: string;
    chips: string[];
    emptyChipsText: string;
}

@Component({
    selector: 'app-resource-view-dialog',
    standalone: true,
    imports: [CommonModule, ButtonModule, DialogModule],
    template: `
        <p-dialog
            [(visible)]="visible"
            [modal]="true"
            [draggable]="false"
            [resizable]="false"
            [dismissableMask]="true"
            [blockScroll]="true"
            [appendTo]="'body'"
            [style]="{ width: '42rem', maxWidth: '94vw' }"
            [breakpoints]="{ '960px': '92vw', '640px': '96vw' }"
            [header]="data?.title || 'Details'"
            (onHide)="handleHide()"
        >
            <ng-container *ngIf="data; else emptyState">
                <div class="space-y-5 pt-2">
                    <div class="flex flex-wrap items-center gap-3">
                        <span class="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                            {{ data.kindLabel }}
                        </span>
                        <span *ngIf="data.subtitle" class="text-sm text-slate-500">{{ data.subtitle }}</span>
                    </div>

                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{{ data.nameLabel }}</div>
                        <div class="mt-2 text-2xl font-black tracking-tight text-slate-900 break-words">{{ data.name }}</div>
                        <p class="mt-3 mb-0 text-sm leading-6 text-slate-600">{{ data.description || 'No description provided.' }}</p>
                    </div>

                    <div class="grid gap-3 sm:grid-cols-2">
                        <div *ngFor="let metric of data.metrics" class="rounded-2xl border border-slate-200 bg-white p-4">
                            <div class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{{ metric.label }}</div>
                            <div class="mt-2 text-xl font-black text-slate-900">{{ metric.value }}</div>
                        </div>
                    </div>

                    <div *ngIf="data.remarks" class="rounded-2xl bg-slate-50 p-4">
                        <div class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{{ data.remarksLabel || 'Remarks' }}</div>
                        <p class="mt-2 mb-0 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{{ data.remarks }}</p>
                    </div>

                    <div>
                        <div class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{{ data.chipsLabel }}</div>
                        <div *ngIf="data.chips.length; else emptyChips" class="mt-3 flex flex-wrap gap-2">
                            <span
                                *ngFor="let chip of data.chips"
                                class="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                            >
                                {{ chip }}
                            </span>
                        </div>
                        <ng-template #emptyChips>
                            <div class="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                                {{ data.emptyChipsText }}
                            </div>
                        </ng-template>
                    </div>
                </div>
            </ng-container>

            <ng-template #emptyState>
                <div class="py-8 text-sm text-slate-500">No details are available.</div>
            </ng-template>

            <ng-template pTemplate="footer">
                <p-button label="Close" severity="secondary" text (onClick)="close()" />
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
export class ResourceViewDialogComponent {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() data: ResourceViewDialogData | null = null;

    close() {
        this.visible = false;
        this.visibleChange.emit(false);
    }

    handleHide() {
        this.close();
    }
}
