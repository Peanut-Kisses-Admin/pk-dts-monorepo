import { Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `<div class="layout-footer">
        <span>Created by John Paul Curib, Full-stack Developer</span>
        <span class="layout-footer-separator" aria-hidden="true">&middot;</span>
        <span>UI by <a href="https://primeng.org" target="_blank" rel="noopener noreferrer" class="text-primary font-bold hover:underline">PrimeNG</a></span>
    </div>`
})
export class AppFooter {}
