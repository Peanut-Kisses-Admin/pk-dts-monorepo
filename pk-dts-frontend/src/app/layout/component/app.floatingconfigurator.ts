import { Component, input } from '@angular/core';

/**
 * Compatibility shell retained for legacy template references.
 * Theme switching and palette controls are intentionally removed.
 */
@Component({
    selector: 'app-floating-configurator',
    standalone: true,
    template: ''
})
export class AppFloatingConfigurator {
    float = input<boolean>(true);
}
