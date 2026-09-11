import { Component } from '@angular/core';

/**
 * Compatibility shell for legacy routes/components that may still reference
 * the old configurator. Runtime theme customization has been removed.
 */
@Component({
    selector: 'app-configurator',
    standalone: true,
    template: ''
})
export class AppConfigurator {}
