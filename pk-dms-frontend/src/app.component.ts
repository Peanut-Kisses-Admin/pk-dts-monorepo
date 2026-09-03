import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AlertModalComponent } from '@/app/shared/components/alert-modal/alert-modal.component';
import { AlertDialogService } from '@/app/shared/services/alert-dialog.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule, AlertModalComponent],
    template: `
        <router-outlet></router-outlet>
        <app-alert-modal
            [visible]="alerts.visible()"
            (visibleChange)="alerts.setVisible($event)"
            [severity]="alerts.alert().severity"
            [title]="alerts.alert().title"
            [message]="alerts.alert().message"
            [details]="alerts.alert().details"
        />
    `
})
export class AppComponent {
    readonly alerts = inject(AlertDialogService);
}
