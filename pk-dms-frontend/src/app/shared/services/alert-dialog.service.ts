import { Injectable, signal } from '@angular/core';
import { AlertSeverity } from '../components/alert-modal/alert-modal.component';

export interface AlertDialogState {
    severity: AlertSeverity;
    title: string;
    message: string;
    details: string;
}

@Injectable({ providedIn: 'root' })
export class AlertDialogService {
    readonly visible = signal(false);
    readonly alert = signal<AlertDialogState>({ severity: 'info', title: 'Notice', message: '', details: '' });

    show(severity: AlertSeverity, title: string, message: string, details = '') {
        this.alert.set({ severity, title, message, details });
        this.visible.set(true);
    }

    success(title: string, message: string, details = '') { this.show('success', title, message, details); }
    warning(title: string, message: string, details = '') { this.show('warning', title, message, details); }
    error(title: string, message: string, details = '') { this.show('error', title, message, details); }
    setVisible(visible: boolean) { this.visible.set(visible); }
}
