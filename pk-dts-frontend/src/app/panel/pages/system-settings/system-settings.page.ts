import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { BACKEND_API_BASE_URL } from '@/app/config/api-config';
import { COLOR_THEME_OPTIONS, DEFAULT_SYSTEM_SETTINGS, SystemSettings, SystemSettingsService } from '@/app/shared/services/system-settings.service';

@Component({
    selector: 'app-system-settings-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule],
    template: `
        <section class="settings-page">
            <div *ngIf="saved" class="saved-message"><i class="pi pi-check-circle"></i> Settings saved and applied.</div>
            <div *ngIf="saveError()" class="saved-message error"><i class="pi pi-exclamation-circle"></i> {{ saveError() }}</div>

            <div class="settings-toolbar">
                <nav class="section-nav" aria-label="Settings sections">
                    <button type="button" [class.active]="activeTab() === 'appearance'" (click)="activeTab.set('appearance')"><i class="pi pi-sun"></i> Appearance</button>
                    <button type="button" [class.active]="activeTab() === 'branding'" (click)="activeTab.set('branding')"><i class="pi pi-palette"></i> Branding</button>
                    <button type="button" [class.active]="activeTab() === 'login'" (click)="activeTab.set('login')"><i class="pi pi-image"></i> Login page</button>
                    <button type="button" [class.active]="activeTab() === 'documents'" (click)="activeTab.set('documents')"><i class="pi pi-file"></i> Documents</button>
                    <button type="button" [class.active]="activeTab() === 'infrastructure'" (click)="activeTab.set('infrastructure')"><i class="pi pi-server"></i> Connections</button>
                </nav>
                <div class="top-actions" aria-label="System settings actions">
                    <p-button styleClass="settings-reset" label="Defaults" icon="pi pi-refresh" severity="secondary" [outlined]="true" [disabled]="saving()" (onClick)="restoreDefaults()" />
                    <p-button styleClass="settings-save" label="Save changes" icon="pi pi-check" [loading]="saving()" (onClick)="save()" />
                </div>
            </div>

            <div class="settings-grid">
                <article *ngIf="activeTab() === 'appearance'" id="appearance" class="setting-card span-2">
                    <div class="card-heading">
                        <div class="card-icon"><i class="pi pi-sun"></i></div>
                        <div>
                            <h2>Appearance and color theme</h2>
                            <p>Choose light or dark mode and one of 10 system-wide desktop color themes.</p>
                        </div>
                    </div>
                    <div class="field span-2">
                        <label>Settings access</label>
                        <div class="scope-options" role="group" aria-label="Settings access mode">
                            <button type="button" [class.active]="form.themeScope === 'shared'" (click)="form.themeScope = 'shared'">
                                <i class="pi pi-globe"></i><span><strong>One settings profile for all devices</strong><small>Everyone receives the saved appearance, branding, login page, and document experience settings.</small></span>
                            </button>
                            <button type="button" [class.active]="form.themeScope === 'device'" (click)="form.themeScope = 'device'">
                                <i class="pi pi-desktop"></i><span><strong>Each device keeps its own settings</strong><small>Every browser keeps its own complete settings profile.</small></span>
                            </button>
                        </div>
                    </div>
                    <div class="appearance-grid">
                        <div class="field">
                            <label>Color mode</label>
                            <div class="mode-options" role="group" aria-label="Color mode">
                                <button type="button" [class.active]="form.colorMode === 'light'" (click)="selectColorMode('light')"><i class="pi pi-sun"></i><span>Light</span></button>
                                <button type="button" [class.active]="form.colorMode === 'dark'" (click)="selectColorMode('dark')"><i class="pi pi-moon"></i><span>Dark</span></button>
                            </div>
                        </div>
                        <div class="field">
                            <label>Color theme</label>
                            <div class="theme-options">
                                <button
                                    *ngFor="let theme of colorThemes"
                                    type="button"
                                    class="theme-option"
                                    [class.active]="form.colorTheme === theme.id"
                                    [style.--theme-accent]="theme.accent"
                                    [style.--theme-deep]="theme.deep"
                                    [style.--theme-soft]="theme.soft"
                                    (click)="selectColorTheme(theme.id)"
                                >
                                    <span class="theme-swatches"><i></i><i></i><i></i></span><strong>{{ theme.name }}</strong
                                    ><small>{{ theme.description }}</small>
                                </button>
                            </div>
                        </div>
                    </div>
                </article>

                <article *ngIf="activeTab() === 'branding'" id="branding" class="setting-card span-2">
                    <div class="card-heading">
                        <div class="card-icon"><i class="pi pi-palette"></i></div>
                        <div>
                            <h2>System identity</h2>
                            <p>Used by the browser title, panel sidebar, logo, favicon, and other shared brand surfaces.</p>
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="field span-2"><label for="system-title">System title</label><input id="system-title" [(ngModel)]="form.systemTitle" maxlength="100" /></div>
                        <div class="field"><label for="short-title">Short panel title</label><input id="short-title" [(ngModel)]="form.systemShortTitle" maxlength="50" /></div>
                        <div class="field"><label for="brand-eyebrow">Panel eyebrow</label><input id="brand-eyebrow" [(ngModel)]="form.brandEyebrow" maxlength="40" /></div>
                        <div class="field span-2">
                            <label for="logo-url">Logo image path or URL</label><input id="logo-url" [(ngModel)]="form.logoUrl" placeholder="/images/company-logo.png" /><label class="image-upload" for="logo-upload"
                                ><i class="pi pi-upload"></i><span>Upload system logo</span><small>PNG, JPG, WebP, GIF or SVG · up to 750 KB</small></label
                            ><input id="logo-upload" class="file-picker" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" (change)="uploadImage($event, 'logoUrl', 768000)" />
                        </div>
                        <div class="field">
                            <label for="favicon-url">Favicon path or URL</label><input id="favicon-url" [(ngModel)]="form.faviconUrl" placeholder="/images/favicon.png" /><label class="image-upload compact" for="favicon-upload"
                                ><i class="pi pi-upload"></i><span>Upload favicon</span><small>Image file · up to 256 KB</small></label
                            ><input id="favicon-upload" class="file-picker" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon" (change)="uploadImage($event, 'faviconUrl', 262144)" />
                        </div>
                        <div class="field"><label for="footer-text">Static footer text</label><input id="footer-text" [(ngModel)]="form.footerText" maxlength="100" /></div>
                    </div>
                    <div class="brand-preview">
                        <div class="preview-logo"><img class="dts-brand-logo" [src]="form.logoUrl" alt="Logo preview" /></div>
                        <div>
                            <span>{{ form.brandEyebrow }}</span
                            ><strong>{{ form.systemShortTitle }}</strong
                            ><small>{{ form.footerText }}</small>
                        </div>
                    </div>
                </article>

                <article *ngIf="activeTab() === 'login'" id="static-content" class="setting-card span-2">
                    <div class="card-heading">
                        <div class="card-icon"><i class="pi pi-image"></i></div>
                        <div>
                            <h2>Login cover and static content</h2>
                            <p>Customize the cover image and fixed copy shown before users sign in.</p>
                        </div>
                    </div>
                    <div class="form-grid">
                        <div class="field span-2">
                            <label for="cover-url">Login cover image path or URL</label><input id="cover-url" [(ngModel)]="form.loginCoverUrl" placeholder="/images/building.jpg" /><label class="image-upload" for="cover-upload"
                                ><i class="pi pi-images"></i><span>Upload login cover</span><small>PNG, JPG, WebP, GIF or SVG · up to 2 MB</small></label
                            ><input id="cover-upload" class="file-picker" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" (change)="uploadImage($event, 'loginCoverUrl', 2097152)" />
                        </div>
                        <div class="field"><label for="login-kicker">Cover label</label><input id="login-kicker" [(ngModel)]="form.loginKicker" maxlength="60" /></div>
                        <div class="field"><label for="welcome-title">Login card title</label><input id="welcome-title" [(ngModel)]="form.loginWelcomeTitle" maxlength="60" /></div>
                        <div class="field span-2"><label for="login-headline">Cover headline</label><input id="login-headline" [(ngModel)]="form.loginHeadline" maxlength="120" /></div>
                        <div class="field span-2"><label for="login-description">Cover description</label><textarea id="login-description" [(ngModel)]="form.loginDescription" rows="3" maxlength="500"></textarea></div>
                        <div class="field span-2"><label for="welcome-subtitle">Login card subtitle</label><input id="welcome-subtitle" [(ngModel)]="form.loginWelcomeSubtitle" maxlength="140" /></div>
                    </div>
                    <div *ngIf="imageMessage()" class="image-message" [class.error]="imageError()"><i [class]="imageError() ? 'pi pi-exclamation-circle' : 'pi pi-check-circle'"></i>{{ imageMessage() }}</div>
                    <div class="cover-preview" [style.backgroundImage]="coverPreviewImage()">
                        <div>
                            <span>{{ form.loginKicker }}</span
                            ><strong>{{ form.loginHeadline }}</strong
                            ><small>{{ form.loginDescription }}</small>
                        </div>
                    </div>
                </article>

                <article *ngIf="activeTab() === 'documents'" id="documents" class="setting-card span-2">
                    <div class="card-heading">
                        <div class="card-icon"><i class="pi pi-table"></i></div>
                        <div>
                            <h2>Workspace experience</h2>
                            <p>Default table, card grid, paging, Office opener, and printing behavior across supported pages.</p>
                        </div>
                    </div>
                    <div class="field">
                        <label for="default-view">Default view</label
                        ><select id="default-view" [(ngModel)]="form.defaultDocumentView">
                            <option value="list">Table list</option>
                            <option value="grid">Card grid</option>
                            <option value="folder">Folders</option>
                        </select>
                    </div>
                    <div class="field">
                        <label for="rows-per-page">Records per page</label
                        ><select id="rows-per-page" [(ngModel)]="form.documentRowsPerPage">
                            <option [ngValue]="10">10 records</option>
                            <option [ngValue]="20">20 records</option>
                            <option [ngValue]="50">50 records</option>
                        </select>
                    </div>
                    <div class="field">
                        <label for="office-opener">Office file opener</label
                        ><select id="office-opener" [(ngModel)]="form.officeOpenMode">
                            <option value="desktop">Installed desktop app</option>
                            <option value="browser">Browser preview</option>
                        </select>
                    </div>
                    <label class="check-row"
                        ><input type="checkbox" [(ngModel)]="form.automaticPrintDialog" /><span><strong>Automatic print dialog</strong><small>Show the browser print dialog after preparing a file.</small></span></label
                    >
                </article>

                <article *ngIf="activeTab() === 'infrastructure'" id="storage-api" class="setting-card">
                    <div class="card-heading">
                        <div class="card-icon"><i class="pi pi-cloud"></i></div>
                        <div>
                            <h2>Backblaze B2</h2>
                            <p>Off-site backup synchronization is managed by the backend backup worker.</p>
                        </div>
                    </div>
                    <div class="integration-list">
                        <div>
                            <i class="pi pi-key"></i><span><strong>Application credentials</strong><small>Protected server setting</small></span>
                        </div>
                        <div>
                            <i class="pi pi-database"></i><span><strong>Bucket and backup prefix</strong><small>Configured through deployment environment</small></span>
                        </div>
                        <div>
                            <i class="pi pi-sync"></i><span><strong>Sync and retry policy</strong><small>Handled by the background automation service</small></span>
                        </div>
                    </div>
                    <div class="security-note"><i class="pi pi-shield"></i><span>B2 key IDs, application keys, and bucket IDs are intentionally never sent to the browser.</span></div>
                </article>

                <article *ngIf="activeTab() === 'infrastructure'" class="setting-card">
                    <div class="card-heading">
                        <div class="card-icon"><i class="pi pi-server"></i></div>
                        <div>
                            <h2>System API</h2>
                            <p>Read-only public endpoints currently compiled into this frontend.</p>
                        </div>
                    </div>
                    <div class="field"><label>Backend API base URL</label><input [value]="backendApiUrl" readonly /></div>
                    <div class="field"><label>Backup and restore API</label><input [value]="backupApiUrl" readonly /></div>
                    <div class="security-note"><i class="pi pi-info-circle"></i><span>Change public API routing through deployment configuration, then rebuild the frontend.</span></div>
                </article>
            </div>
        </section>
    `,
    styles: [
        `
            .settings-page {
                display: grid;
                gap: 1.25rem;
                color: #111827;
            }
            .settings-hero,
            .setting-card,
            .section-nav {
                border: 1px solid #e5e7eb;
                border-radius: 1.25rem;
                background: #fff;
            }
            .settings-hero {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 1.5rem;
                border-left: 6px solid var(--dts-accent, #dc2626);
                padding: 1.5rem;
            }
            .hero-controls {
                display: grid;
                justify-items: end;
                gap: 0.8rem;
                flex: 0 0 auto;
            }
            .top-actions {
                display: flex;
                justify-content: flex-end;
                gap: 0.65rem;
                flex-wrap: wrap;
            }
            .settings-toolbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                border: 1px solid #e5e7eb;
                border-radius: 1.15rem;
                background: #fff;
                padding: 0.45rem;
                box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
            }
            .eyebrow {
                color: var(--dts-accent, #dc2626);
                font-size: 0.72rem;
                font-weight: 900;
                letter-spacing: 0.16em;
                text-transform: uppercase;
            }
            h1 {
                margin: 0.35rem 0;
                color: #111827;
                font-size: 1.8rem;
            }
            p {
                margin: 0;
                color: #64748b;
                line-height: 1.6;
            }
            .scope-badge {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                border-radius: 999px;
                background: #111827;
                padding: 0.55rem 0.8rem;
                color: #fff;
                font-size: 0.78rem;
                font-weight: 800;
                white-space: nowrap;
            }
            .saved-message {
                display: flex;
                align-items: center;
                gap: 0.55rem;
                border: 1px solid color-mix(in srgb, var(--dts-accent) 35%, #e5e7eb);
                border-radius: 1rem;
                background: var(--dts-accent-soft);
                padding: 0.85rem 1rem;
                color: var(--dts-accent-deep);
                font-weight: 800;
            }
            .section-nav {
                display: flex;
                flex-wrap: wrap;
                gap: 0.45rem;
                padding: 0;
            }
            .section-nav button {
                display: inline-flex;
                align-items: center;
                gap: 0.45rem;
                border: 0;
                border-radius: 0.75rem;
                background: transparent;
                padding: 0.6rem 0.75rem;
                color: #475569;
                font-size: 0.75rem;
                font-weight: 800;
                cursor: pointer;
            }
            .section-nav button:hover,
            .section-nav button.active {
                background: var(--dts-accent-soft, #fee2e2);
                color: var(--dts-accent-deep, #991b1b);
            }
            .storage-scope {
                display: flex;
                align-items: flex-start;
                gap: 0.55rem;
                border-left: 3px solid var(--dts-accent, #dc2626);
                padding: 0.15rem 0.2rem 0.15rem 0.8rem;
                font-size: 0.75rem;
            }
            .storage-scope i {
                margin-top: 0.32rem;
                color: var(--dts-accent, #dc2626);
            }
            .settings-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 1.25rem;
            }
            .setting-card {
                display: grid;
                align-content: start;
                gap: 1rem;
                padding: 1.4rem;
                scroll-margin-top: 1rem;
            }
            .span-2 {
                grid-column: 1/-1;
            }
            .card-heading {
                display: flex;
                align-items: flex-start;
                gap: 0.85rem;
            }
            .card-icon {
                display: grid;
                place-items: center;
                width: 3rem;
                height: 3rem;
                flex: 0 0 auto;
                border-radius: 1rem;
                background: var(--dts-accent-deep);
                color: #fff;
                font-size: 1.15rem;
            }
            .setting-card h2 {
                margin: 0 0 0.3rem;
                color: #111827;
                font-size: 1.15rem;
            }
            .form-grid,
            .appearance-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 1rem;
            }
            .field {
                display: grid;
                align-content: start;
                gap: 0.45rem;
            }
            .field.span-2 {
                grid-column: 1/-1;
            }
            .field label {
                color: #374151;
                font-size: 0.7rem;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 0.08em;
            }
            .field input,
            .field select,
            .field textarea {
                width: 100%;
                border: 1px solid #d1d5db;
                border-radius: 0.8rem;
                background: #fff;
                padding: 0.75rem 0.85rem;
                color: #111827;
                outline: none;
                resize: vertical;
            }
            .field input:focus,
            .field select:focus,
            .field textarea:focus {
                border-color: var(--dts-accent, #dc2626);
                box-shadow: 0 0 0 3px color-mix(in srgb, var(--dts-accent, #dc2626) 16%, transparent);
            }
            .field input[readonly] {
                background: #f8fafc;
                color: #475569;
            }
            .mode-options {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0.5rem;
            }
            .mode-options button {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                border: 1px solid #d1d5db;
                border-radius: 0.85rem;
                background: #fff;
                padding: 0.8rem;
                color: #64748b;
                font-weight: 800;
                cursor: pointer;
            }
            .mode-options button.active {
                border-color: var(--dts-accent, #dc2626);
                background: var(--dts-accent-deep);
                color: #fff;
            }
            .theme-options {
                display: grid;
                grid-template-columns: repeat(5, minmax(0, 1fr));
                gap: 0.5rem;
            }
            .theme-option {
                display: grid;
                gap: 0.3rem;
                justify-items: start;
                border: 1px solid #d1d5db;
                border-radius: 0.85rem;
                background: #fff;
                padding: 0.7rem;
                text-align: left;
                cursor: pointer;
            }
            .theme-option.active {
                border-color: var(--dts-accent, #dc2626);
                box-shadow: 0 0 0 2px var(--dts-accent-soft, #fee2e2);
            }
            .theme-option strong {
                font-size: 0.72rem;
            }
            .theme-option small {
                color: #64748b;
                font-size: 0.62rem;
            }
            .theme-swatches {
                display: flex;
                gap: 0.18rem;
            }
            .theme-swatches i {
                display: block;
                width: 1rem;
                height: 1rem;
                border-radius: 50%;
                border: 1px solid rgba(0, 0, 0, 0.12);
            }
            .theme-swatches i:nth-child(1) {
                background: var(--theme-accent);
            }
            .theme-swatches i:nth-child(2) {
                background: var(--theme-deep);
            }
            .theme-swatches i:nth-child(3) {
                background: var(--theme-soft);
            }
            .check-row {
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                border: 1px solid #e5e7eb;
                border-radius: 1rem;
                background: #f9fafb;
                padding: 1rem;
                cursor: pointer;
            }
            .check-row.disabled {
                opacity: 0.62;
                cursor: not-allowed;
            }
            .check-row input {
                margin-top: 0.2rem;
                accent-color: var(--dts-accent, #dc2626);
            }
            .check-row span {
                display: grid;
                gap: 0.25rem;
                color: #111827;
            }
            .check-row small {
                color: #64748b;
                line-height: 1.45;
            }
            .brand-preview {
                display: flex;
                align-items: center;
                gap: 1rem;
                border: 1px solid #e5e7eb;
                border-radius: 1rem;
                background: var(--dts-accent-deep);
                padding: 1rem;
                color: #fff;
            }
            .preview-logo {
                display: grid;
                place-items: center;
                width: 6rem;
                height: 4rem;
                overflow: hidden;
                border-radius: 1rem;
                background: #070707;
            }
            .preview-logo img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            .brand-preview span,
            .brand-preview small {
                display: block;
                color: rgba(255, 255, 255, 0.76);
                font-size: 0.7rem;
            }
            .brand-preview strong {
                display: block;
                margin: 0.2rem 0;
                font-size: 1rem;
            }
            .cover-preview {
                position: relative;
                overflow: hidden;
                min-height: 14rem;
                border-radius: 1.15rem;
                background-position: center;
                background-size: cover;
            }
            .cover-preview::before {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(135deg, color-mix(in srgb, var(--dts-accent-deep) 76%, transparent), rgba(17, 24, 39, 0.68));
            }
            .cover-preview > div {
                position: relative;
                z-index: 1;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                min-height: 14rem;
                max-width: 38rem;
                padding: 1.25rem;
                color: #fff;
            }
            .cover-preview span {
                font-size: 0.68rem;
                font-weight: 900;
                letter-spacing: 0.14em;
                text-transform: uppercase;
            }
            .cover-preview strong {
                margin: 0.45rem 0;
                font-size: 1.35rem;
            }
            .cover-preview small {
                color: #e2e8f0;
                line-height: 1.55;
            }
            .status-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                border-bottom: 1px solid #f1f5f9;
                padding: 0.55rem 0;
                color: #64748b;
                font-size: 0.78rem;
            }
            .status-row strong {
                color: #111827;
            }
            .status-row strong.online {
                color: #166534;
            }
            .security-note {
                display: flex;
                align-items: flex-start;
                gap: 0.65rem;
                border: 1px solid #e5e7eb;
                border-radius: 0.9rem;
                background: #f8fafc;
                padding: 0.8rem;
                color: #475569;
                font-size: 0.72rem;
                line-height: 1.55;
            }
            .security-note i {
                margin-top: 0.15rem;
                color: var(--dts-accent-deep, #b91c1c);
            }
            .integration-list {
                display: grid;
                gap: 0.65rem;
            }
            .integration-list > div {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                border: 1px solid #f1f5f9;
                border-radius: 0.9rem;
                padding: 0.75rem;
            }
            .integration-list > div > i {
                display: grid;
                place-items: center;
                width: 2.25rem;
                height: 2.25rem;
                border-radius: 0.7rem;
                background: var(--dts-accent-deep);
                color: #fff;
            }
            .integration-list span {
                display: grid;
                gap: 0.15rem;
            }
            .integration-list strong {
                font-size: 0.78rem;
            }
            .integration-list small {
                color: #64748b;
                font-size: 0.68rem;
            }
            .file-picker {
                position: absolute;
                width: 1px !important;
                height: 1px !important;
                padding: 0 !important;
                margin: -1px !important;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0 !important;
            }
            .image-upload {
                display: grid !important;
                grid-template-columns: 2.25rem minmax(0, 1fr);
                align-items: center;
                gap: 0.15rem 0.7rem;
                border: 1px dashed #cbd5e1;
                border-radius: 0.85rem;
                background: #f8fafc;
                padding: 0.7rem 0.8rem !important;
                color: #334155 !important;
                cursor: pointer;
                text-transform: none !important;
                letter-spacing: normal !important;
            }
            .image-upload i {
                grid-row: 1/3;
                display: grid;
                place-items: center;
                width: 2.25rem;
                height: 2.25rem;
                border-radius: 0.65rem;
                background: var(--dts-accent, #dc2626);
                color: #fff;
            }
            .image-upload span {
                font-size: 0.75rem;
                font-weight: 850;
            }
            .image-upload small {
                color: #64748b;
                font-size: 0.65rem;
                font-weight: 500;
            }
            .image-upload:hover {
                border-color: var(--dts-accent, #dc2626);
                background: var(--dts-accent-soft, #fee2e2);
            }
            .image-message {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                border: 1px solid #bbf7d0;
                border-radius: 0.8rem;
                background: #f0fdf4;
                padding: 0.7rem 0.85rem;
                color: #166534;
                font-size: 0.75rem;
                font-weight: 800;
            }
            .image-message.error {
                border-color: #fecaca;
                background: #fef2f2;
                color: #991b1b;
            }
            :host-context(.app-dark) .image-upload {
                border-color: #3f3f46;
                background: #101010;
                color: #f5f5f5 !important;
            }
            :host-context(.app-dark) .image-upload small {
                color: #a3a3a3;
            }
            :host-context(.app-dark) .image-upload:hover {
                border-color: var(--dts-accent, #dc2626);
                background: color-mix(in srgb, var(--dts-accent, #dc2626) 12%, #171717);
            }
            :host-context(.app-dark) .settings-toolbar {
                border-color: #333;
                background: #171717;
                box-shadow: none;
            }
            :host ::ng-deep .settings-save.p-button {
                border-color: var(--dts-accent, #dc2626);
                background: var(--dts-accent, #dc2626);
            }
            @media (max-width: 1100px) {
                .theme-options {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
            }
            @media (max-width: 900px) {
                .settings-toolbar {
                    align-items: stretch;
                    flex-direction: column;
                }
                .settings-hero {
                    flex-direction: column;
                }
                .hero-controls {
                    width: 100%;
                    justify-items: start;
                }
                .top-actions {
                    justify-content: flex-end;
                }
            }
            @media (max-width: 800px) {
                .settings-grid,
                .form-grid,
                .appearance-grid {
                    grid-template-columns: 1fr;
                }
                .span-2,
                .field.span-2 {
                    grid-column: auto;
                }
                .theme-options {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }
            @media (max-width: 520px) {
                .theme-options {
                    grid-template-columns: 1fr;
                }
                .top-actions,
                .top-actions p-button {
                    width: 100%;
                }
                :host ::ng-deep .top-actions .p-button {
                    width: 100%;
                    justify-content: center;
                }
            }
        `,
        `
            .scope-options {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0.5rem;
            }
            .scope-options button {
                display: flex;
                align-items: center;
                justify-content: flex-start;
                gap: 0.65rem;
                border: 1px solid #d1d5db;
                border-radius: 0.85rem;
                background: #fff;
                padding: 0.85rem;
                color: #64748b;
                text-align: left;
                cursor: pointer;
            }
            .scope-options button.active {
                border-color: var(--dts-accent, #dc2626);
                background: var(--dts-accent-deep);
                color: #fff;
            }
            .scope-options button > i {
                font-size: 1.2rem;
            }
            .scope-options button span {
                display: grid;
                gap: 0.15rem;
            }
            .scope-options button small {
                font-weight: 600;
                opacity: 0.75;
            }
            .saved-message.error {
                border-color: #fecaca;
                background: #fef2f2;
                color: #991b1b;
            }
            .scope-badge {
                background: var(--dts-accent-deep, #991b1b);
            }
            @media (max-width: 800px) {
                .scope-options {
                    grid-template-columns: 1fr;
                }
            }
        `
    ]
})
export class SystemSettingsPage {
    private readonly settingsService = inject(SystemSettingsService);
    form: SystemSettings = { ...this.settingsService.settings() };
    saved = false;
    saving = signal(false);
    saveError = signal('');
    imageMessage = signal('');
    imageError = signal(false);
    activeTab = signal<'appearance' | 'branding' | 'login' | 'documents' | 'infrastructure'>('appearance');
    readonly colorThemes = COLOR_THEME_OPTIONS;
    readonly backendApiUrl = BACKEND_API_BASE_URL;
    readonly backupApiUrl = `${BACKEND_API_BASE_URL}/backup-restore`;

    constructor() {
        effect(() => {
            const settings = this.settingsService.settings();
            this.form.themeScope = settings.themeScope;
            this.form.colorMode = settings.colorMode;
            this.form.colorTheme = settings.colorTheme;
        });
    }

    coverPreviewImage() {
        const safeUrl = this.form.loginCoverUrl.replace(/["'()]/g, '');
        return `linear-gradient(135deg, rgba(127,29,29,.2), rgba(17,24,39,.18)), url("${safeUrl}")`;
    }

    selectColorMode(colorMode: SystemSettings['colorMode']) {
        this.form.colorMode = colorMode;
        this.settingsService.previewAppearance(this.form.colorMode, this.form.colorTheme);
    }

    selectColorTheme(colorTheme: SystemSettings['colorTheme']) {
        this.form.colorTheme = colorTheme;
        this.settingsService.previewAppearance(this.form.colorMode, this.form.colorTheme);
    }

    uploadImage(event: Event, field: 'logoUrl' | 'faviconUrl' | 'loginCoverUrl', maxBytes: number) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showImageMessage('Choose a valid image file.', true);
            return;
        }
        if (file.size > maxBytes) {
            this.showImageMessage(`The selected image is too large. Maximum size is ${this.formatBytes(maxBytes)}.`, true);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === 'string' ? reader.result : '';
            if (!dataUrl.startsWith('data:image/')) {
                this.showImageMessage('The selected image could not be read.', true);
                return;
            }
            this.form[field] = dataUrl;
            this.showImageMessage(`${file.name} is ready. Select Save and apply to use it across the system.`, false);
        };
        reader.onerror = () => this.showImageMessage('The selected image could not be read.', true);
        reader.readAsDataURL(file);
    }

    save() {
        try {
            this.saving.set(true);
            this.saveError.set('');
            this.settingsService.save(this.form);
            this.settingsService.updateAppearanceScope(this.form).subscribe({
                next: () => {
                    this.saving.set(false);
                    this.form = { ...this.settingsService.settings() };
                    this.imageMessage.set('');
                    this.showSaved();
                },
                error: () => {
                    this.saving.set(false);
                    this.saveError.set('Local preferences were saved, but the shared system settings could not be updated. Check your permission and try again.');
                }
            });
        } catch (error) {
            this.saving.set(false);
            this.showImageMessage(error instanceof Error ? error.message : 'The settings could not be saved.', true);
        }
    }

    restoreDefaults() {
        this.form = { ...DEFAULT_SYSTEM_SETTINGS };
        this.save();
    }

    private showSaved() {
        this.saved = true;
        window.setTimeout(() => (this.saved = false), 2500);
    }

    private showImageMessage(message: string, error: boolean) {
        this.imageMessage.set(message);
        this.imageError.set(error);
    }

    private formatBytes(bytes: number) {
        return bytes >= 1024 * 1024 ? `${Math.round(bytes / (1024 * 1024))} MB` : `${Math.round(bytes / 1024)} KB`;
    }
}
