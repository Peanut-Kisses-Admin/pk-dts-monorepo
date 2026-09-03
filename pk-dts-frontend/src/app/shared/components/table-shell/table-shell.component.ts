import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-table-shell',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="table-frame" [class.table-frame--compact]="compact">
            <div class="table-scroll">
                <table class="shared-table" [style.minWidth]="minWidth">
                    <ng-content></ng-content>
                </table>
            </div>
        </div>
    `,
    styles: [
        `
            :host {
                display: block;
            }

            .table-frame {
                overflow: hidden;
                border: 1px solid rgba(148, 163, 184, 0.24);
                border-radius: 1rem;
                background: #ffffff;
                box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
            }

            .table-scroll {
                overflow-x: auto;
            }

            .shared-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                color: #0f172a;
                font-size: 0.9rem;
                text-align: left;
            }

            .table-frame--compact .shared-table {
                font-size: 0.84rem;
            }

            :host ::ng-deep thead {
                background: #111827;
                color: #ffffff;
                font-size: 0.72rem;
                letter-spacing: 0.08em;
                text-transform: uppercase;
            }

            :host ::ng-deep th {
                border-bottom: 1px solid rgba(17, 24, 39, 0.08);
                white-space: nowrap;
            }

            :host ::ng-deep tbody {
                background: #ffffff;
            }

            :host ::ng-deep tbody tr {
                transition:
                    background-color 0.16s ease,
                    box-shadow 0.16s ease;
            }

            :host ::ng-deep tbody tr + tr td {
                border-top: 1px solid rgba(226, 232, 240, 0.88);
            }

            :host ::ng-deep tbody tr:hover {
                background: #f8fafc;
            }

            :host ::ng-deep td {
                vertical-align: top;
            }

            :host ::ng-deep td:first-child,
            :host ::ng-deep th:first-child {
                padding-left: 1.15rem;
            }

            :host ::ng-deep td:last-child,
            :host ::ng-deep th:last-child {
                padding-right: 1.15rem;
            }

            .table-frame--compact {
                border-radius: 0.85rem;
                box-shadow: none;
            }
        `
    ]
})
export class TableShellComponent {
    @Input() minWidth = '64rem';
    @Input() compact = false;
}
