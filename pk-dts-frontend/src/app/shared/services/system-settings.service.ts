import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { map, tap } from 'rxjs';
import { BACKEND_API_BASE_URL } from '@/app/config/api-config';

export type DocumentViewMode = 'list' | 'grid' | 'folder';
export type OfficeOpenMode = 'desktop' | 'browser';
export type ColorMode = 'light' | 'dark';
export type ThemeScope = 'shared' | 'device';
export const COLOR_THEME_OPTIONS = [
    { id: 'default', name: 'Ruby Red', description: 'Classic document-control red', accent: '#dc2626', deep: '#991b1b', soft: '#fee2e2' },
    { id: 'crimson', name: 'Deep Crimson', description: 'Dark professional crimson', accent: '#9f1239', deep: '#4c0519', soft: '#ffe4e6' },
    { id: 'monochrome', name: 'Monochrome', description: 'Neutral black and white', accent: '#262626', deep: '#000000', soft: '#e5e5e5' },
    { id: 'ocean', name: 'Ocean Blue', description: 'Clear corporate blue', accent: '#2563eb', deep: '#1e3a8a', soft: '#dbeafe' },
    { id: 'emerald', name: 'Emerald', description: 'Calm operational green', accent: '#059669', deep: '#064e3b', soft: '#d1fae5' },
    { id: 'violet', name: 'Violet', description: 'Modern creative violet', accent: '#7c3aed', deep: '#4c1d95', soft: '#ede9fe' },
    { id: 'amber', name: 'Amber', description: 'Warm high-visibility amber', accent: '#d97706', deep: '#78350f', soft: '#fef3c7' },
    { id: 'teal', name: 'Teal', description: 'Balanced records teal', accent: '#0d9488', deep: '#134e4a', soft: '#ccfbf1' },
    { id: 'rose', name: 'Rose', description: 'Bright polished rose', accent: '#e11d48', deep: '#881337', soft: '#ffe4e6' },
    { id: 'indigo', name: 'Indigo', description: 'Structured executive indigo', accent: '#4f46e5', deep: '#312e81', soft: '#e0e7ff' }
] as const;
export type ColorTheme = (typeof COLOR_THEME_OPTIONS)[number]['id'];

export interface SystemSettings {
    defaultDocumentView: DocumentViewMode;
    documentRowsPerPage: number;
    officeOpenMode: OfficeOpenMode;
    automaticPrintDialog: boolean;
    themeScope: ThemeScope;
    colorMode: ColorMode;
    colorTheme: ColorTheme;
    systemTitle: string;
    systemShortTitle: string;
    brandEyebrow: string;
    logoUrl: string;
    faviconUrl: string;
    loginCoverUrl: string;
    loginKicker: string;
    loginHeadline: string;
    loginDescription: string;
    loginWelcomeTitle: string;
    loginWelcomeSubtitle: string;
    assistantEnabled: boolean;
    assistantTitle: string;
    assistantWelcomeText: string;
    footerText: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
    defaultDocumentView: 'list',
    documentRowsPerPage: 10,
    officeOpenMode: 'desktop',
    automaticPrintDialog: true,
    themeScope: 'device',
    colorMode: 'light',
    colorTheme: 'default',
    systemTitle: 'Document Tracking System (DTS)',
    systemShortTitle: 'DTS',
    brandEyebrow: 'Records workspace',
    logoUrl: '/images/pk-dts-mark-v3.png',
    faviconUrl: '/images/dts-logo.png',
    loginCoverUrl: '/images/pk-building-cover.png',
    loginKicker: 'Document Tracking System',
    loginHeadline: 'Secure access for your document control center.',
    loginDescription: 'Manage the full document lifecycle from one secure workspace. This portal keeps records organized, routes access by role, and brings documents, storage, users, and permissions together in a clean panel experience.',
    loginWelcomeTitle: 'Welcome back',
    loginWelcomeSubtitle: 'Use your email and password to continue.',
    assistantEnabled: true,
    assistantTitle: 'Document Assistant',
    assistantWelcomeText: 'Available across the panel for faster document lookup and guided retrieval, with offline local search fallback when internet AI is unavailable.',
    footerText: 'Document Tracking System (DTS)'
};

const STORAGE_KEY = 'dts.system-settings.v3';
const LEGACY_STORAGE_KEYS = ['dms.system-settings.v2', 'dms.system-settings.v1'] as const;
const DEVICE_APPEARANCE_KEY = 'dts.device-appearance.v2';
const LEGACY_DEVICE_APPEARANCE_KEY = 'dms.device-appearance.v1';
const LEGACY_SYSTEM_TITLE = 'Document Tracking and Management System';
const LEGACY_SYSTEM_SHORT_TITLE = 'Document Management';
const LEGACY_FOOTER_TEXT = 'Document Tracking and Management System';
const LEGACY_LOGO_URL = '/images/peanut_kisses_logo-removebg-preview.png';
const PREVIOUS_LOGO_URL = '/images/dts-logo.png';
const FORMER_BRAND_LOGO_URL = '/images/pk-dts-logo.png';
const GENERATED_BRAND_LOGO_URL = '/images/pk-dts-logo-v2.png';
const LEGACY_FAVICON_URL = '/images/peanut_kisses_logo-removebg-preview.png';
const APPEARANCE_API = `${BACKEND_API_BASE_URL}/system-settings/appearance`;

interface AppearanceSettings {
    themeScope: ThemeScope;
    colorMode: ColorMode;
    colorTheme: ColorTheme;
    settings?: Partial<SystemSettings>;
}

interface ApiResponseEnvelope<T> {
    data: T;
}

@Injectable({ providedIn: 'root' })
export class SystemSettingsService {
    private readonly http = inject(HttpClient);
    private readonly settingsState = signal<SystemSettings>(this.read());
    readonly settings = this.settingsState.asReadonly();

    constructor() {
        this.applyBrowserBranding(this.settingsState());
        this.refreshAppearance();
        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (event) => {
                if (event.key !== STORAGE_KEY && !LEGACY_STORAGE_KEYS.includes(event.key as (typeof LEGACY_STORAGE_KEYS)[number])) return;
                const settings = this.read();
                this.settingsState.set(settings);
                this.applyBrowserBranding(settings);
            });
            window.setInterval(() => this.refreshAppearance(), 30_000);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') this.refreshAppearance();
            });
        }
    }

    save(settings: SystemSettings) {
        const normalized: SystemSettings = {
            defaultDocumentView: this.documentViewMode(settings.defaultDocumentView),
            documentRowsPerPage: [10, 20, 50].includes(Number(settings.documentRowsPerPage)) ? Number(settings.documentRowsPerPage) : 10,
            officeOpenMode: settings.officeOpenMode === 'browser' ? 'browser' : 'desktop',
            automaticPrintDialog: settings.automaticPrintDialog !== false,
            themeScope: settings.themeScope === 'shared' ? 'shared' : 'device',
            colorMode: settings.colorMode === 'dark' ? 'dark' : 'light',
            colorTheme: this.colorTheme(settings.colorTheme),
            systemTitle: this.brandingText(settings.systemTitle, LEGACY_SYSTEM_TITLE, DEFAULT_SYSTEM_SETTINGS.systemTitle, 100),
            systemShortTitle: this.brandingText(settings.systemShortTitle, LEGACY_SYSTEM_SHORT_TITLE, DEFAULT_SYSTEM_SETTINGS.systemShortTitle, 50),
            brandEyebrow: this.text(settings.brandEyebrow, DEFAULT_SYSTEM_SETTINGS.brandEyebrow, 40),
            logoUrl: this.brandingAssetUrl(settings.logoUrl, [LEGACY_LOGO_URL, PREVIOUS_LOGO_URL, FORMER_BRAND_LOGO_URL, GENERATED_BRAND_LOGO_URL], DEFAULT_SYSTEM_SETTINGS.logoUrl),
            faviconUrl: this.brandingAssetUrl(settings.faviconUrl, LEGACY_FAVICON_URL, DEFAULT_SYSTEM_SETTINGS.faviconUrl),
            loginCoverUrl: this.coverUrl(settings.loginCoverUrl),
            loginKicker: this.text(settings.loginKicker, DEFAULT_SYSTEM_SETTINGS.loginKicker, 60),
            loginHeadline: this.text(settings.loginHeadline, DEFAULT_SYSTEM_SETTINGS.loginHeadline, 120),
            loginDescription: this.text(settings.loginDescription, DEFAULT_SYSTEM_SETTINGS.loginDescription, 500),
            loginWelcomeTitle: this.text(settings.loginWelcomeTitle, DEFAULT_SYSTEM_SETTINGS.loginWelcomeTitle, 60),
            loginWelcomeSubtitle: this.text(settings.loginWelcomeSubtitle, DEFAULT_SYSTEM_SETTINGS.loginWelcomeSubtitle, 140),
            assistantEnabled: settings.assistantEnabled !== false,
            assistantTitle: this.text(settings.assistantTitle, DEFAULT_SYSTEM_SETTINGS.assistantTitle, 60),
            assistantWelcomeText: this.text(settings.assistantWelcomeText, DEFAULT_SYSTEM_SETTINGS.assistantWelcomeText, 300),
            footerText: this.brandingText(settings.footerText, LEGACY_FOOTER_TEXT, DEFAULT_SYSTEM_SETTINGS.footerText, 100)
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            if (normalized.themeScope === 'device') {
                localStorage.setItem(DEVICE_APPEARANCE_KEY, JSON.stringify({ colorMode: normalized.colorMode, colorTheme: normalized.colorTheme }));
            }
        } catch {
            throw new Error('The uploaded branding images exceed this browser storage capacity. Choose smaller image files.');
        }
        this.settingsState.set(normalized);
        this.applyBrowserBranding(normalized);
    }

    reset() {
        this.save({ ...DEFAULT_SYSTEM_SETTINGS });
    }

    toggleColorMode() {
        const previous = this.settingsState();
        const next = { ...previous, colorMode: previous.colorMode === 'dark' ? ('light' as const) : ('dark' as const) };

        if (previous.themeScope !== 'shared') {
            this.save(next);
            return;
        }

        this.settingsState.set(next);
        this.applyBrowserBranding(next);
        this.updateAppearanceScope(next).subscribe({
            error: () => {
                this.settingsState.set(previous);
                this.applyBrowserBranding(previous);
            }
        });
    }

    defaultDataView(): 'list' | 'grid' {
        return this.settingsState().defaultDocumentView === 'list' ? 'list' : 'grid';
    }

    defaultRowsPerPage(): number {
        return this.settingsState().documentRowsPerPage;
    }

    updateAppearanceScope(settings: SystemSettings) {
        const payload: AppearanceSettings = {
            themeScope: settings.themeScope === 'shared' ? 'shared' : 'device',
            colorMode: settings.colorMode === 'dark' ? 'dark' : 'light',
            colorTheme: this.colorTheme(settings.colorTheme),
            settings: { ...settings }
        };

        return this.http.patch<ApiResponseEnvelope<AppearanceSettings> | AppearanceSettings>(APPEARANCE_API, payload).pipe(
            map((response) => this.unwrapAppearance(response)),
            tap((appearance) => this.applyServerAppearance(appearance))
        );
    }

    refreshAppearance() {
        this.http
            .get<ApiResponseEnvelope<AppearanceSettings> | AppearanceSettings>(APPEARANCE_API)
            .pipe(map((response) => this.unwrapAppearance(response)))
            .subscribe({ next: (appearance) => this.applyServerAppearance(appearance), error: () => undefined });
    }

    previewAppearance(colorMode: ColorMode, colorTheme: ColorTheme) {
        this.applyBrowserBranding({ ...this.settingsState(), colorMode, colorTheme });
    }

    private read(): SystemSettings {
        try {
            const storedValue = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS].map((key) => localStorage.getItem(key)).find(Boolean) || '{}';
            const stored = JSON.parse(storedValue) as Partial<SystemSettings>;
            return {
                defaultDocumentView: this.documentViewMode(stored.defaultDocumentView),
                documentRowsPerPage: [10, 20, 50].includes(Number(stored.documentRowsPerPage)) ? Number(stored.documentRowsPerPage) : DEFAULT_SYSTEM_SETTINGS.documentRowsPerPage,
                officeOpenMode: stored.officeOpenMode === 'browser' ? 'browser' : DEFAULT_SYSTEM_SETTINGS.officeOpenMode,
                automaticPrintDialog: stored.automaticPrintDialog !== false,
                themeScope: stored.themeScope === 'shared' ? 'shared' : DEFAULT_SYSTEM_SETTINGS.themeScope,
                colorMode: stored.colorMode === 'dark' ? 'dark' : DEFAULT_SYSTEM_SETTINGS.colorMode,
                colorTheme: this.colorTheme(stored.colorTheme),
                systemTitle: this.brandingText(stored.systemTitle, LEGACY_SYSTEM_TITLE, DEFAULT_SYSTEM_SETTINGS.systemTitle, 100),
                systemShortTitle: this.brandingText(stored.systemShortTitle, LEGACY_SYSTEM_SHORT_TITLE, DEFAULT_SYSTEM_SETTINGS.systemShortTitle, 50),
                brandEyebrow: this.text(stored.brandEyebrow, DEFAULT_SYSTEM_SETTINGS.brandEyebrow, 40),
                logoUrl: this.brandingAssetUrl(stored.logoUrl, [LEGACY_LOGO_URL, PREVIOUS_LOGO_URL, FORMER_BRAND_LOGO_URL, GENERATED_BRAND_LOGO_URL], DEFAULT_SYSTEM_SETTINGS.logoUrl),
                faviconUrl: this.brandingAssetUrl(stored.faviconUrl, LEGACY_FAVICON_URL, DEFAULT_SYSTEM_SETTINGS.faviconUrl),
                loginCoverUrl: this.coverUrl(stored.loginCoverUrl),
                loginKicker: this.text(stored.loginKicker, DEFAULT_SYSTEM_SETTINGS.loginKicker, 60),
                loginHeadline: this.text(stored.loginHeadline, DEFAULT_SYSTEM_SETTINGS.loginHeadline, 120),
                loginDescription: this.text(stored.loginDescription, DEFAULT_SYSTEM_SETTINGS.loginDescription, 500),
                loginWelcomeTitle: this.text(stored.loginWelcomeTitle, DEFAULT_SYSTEM_SETTINGS.loginWelcomeTitle, 60),
                loginWelcomeSubtitle: this.text(stored.loginWelcomeSubtitle, DEFAULT_SYSTEM_SETTINGS.loginWelcomeSubtitle, 140),
                assistantEnabled: stored.assistantEnabled !== false,
                assistantTitle: this.text(stored.assistantTitle, DEFAULT_SYSTEM_SETTINGS.assistantTitle, 60),
                assistantWelcomeText: this.text(stored.assistantWelcomeText, DEFAULT_SYSTEM_SETTINGS.assistantWelcomeText, 300),
                footerText: this.brandingText(stored.footerText, LEGACY_FOOTER_TEXT, DEFAULT_SYSTEM_SETTINGS.footerText, 100)
            };
        } catch {
            return { ...DEFAULT_SYSTEM_SETTINGS };
        }
    }

    private text(value: unknown, fallback: string, maxLength: number) {
        const normalized = typeof value === 'string' ? value.trim() : '';
        return (normalized || fallback).slice(0, maxLength);
    }

    private brandingText(value: unknown, legacyValue: string, fallback: string, maxLength: number) {
        return this.text(value === legacyValue ? fallback : value, fallback, maxLength);
    }

    private brandingAssetUrl(value: unknown, legacyValue: string | readonly string[], fallback: string) {
        const legacyValues = Array.isArray(legacyValue) ? legacyValue : [legacyValue];
        return this.assetUrl(legacyValues.includes(value as string) ? fallback : value, fallback);
    }

    private documentViewMode(value: unknown): DocumentViewMode {
        return value === 'grid' || value === 'folder' ? value : 'list';
    }

    private coverUrl(value: unknown) {
        const normalized = this.assetUrl(value, DEFAULT_SYSTEM_SETTINGS.loginCoverUrl);
        return normalized.toLowerCase() === '/images/pk building.jpg' ? DEFAULT_SYSTEM_SETTINGS.loginCoverUrl : normalized;
    }

    private colorTheme(value: unknown): ColorTheme {
        return COLOR_THEME_OPTIONS.some((theme) => theme.id === value) ? (value as ColorTheme) : DEFAULT_SYSTEM_SETTINGS.colorTheme;
    }

    private applyServerAppearance(appearance: AppearanceSettings & Partial<SystemSettings>) {
        const current = this.settingsState();
        if (appearance.themeScope === 'shared') {
            const settings = this.migrateBranding({
                ...current,
                ...(appearance.settings || appearance),
                themeScope: 'shared' as const,
                colorMode: appearance.colorMode === 'dark' ? ('dark' as const) : ('light' as const),
                colorTheme: this.colorTheme(appearance.colorTheme)
            });
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            } catch {
                // Keep the synchronized in-memory settings when browser storage is unavailable.
            }
            this.settingsState.set(settings);
            this.applyBrowserBranding(settings);
            return;
        }

        const deviceAppearance = this.readDeviceAppearance();
        const settings = { ...current, themeScope: 'device' as const, ...deviceAppearance };
        this.settingsState.set(settings);
        this.applyBrowserBranding(settings);
    }

    private readDeviceAppearance(): Pick<SystemSettings, 'colorMode' | 'colorTheme'> {
        try {
            const stored = JSON.parse(
                localStorage.getItem(DEVICE_APPEARANCE_KEY) ||
                    localStorage.getItem(LEGACY_DEVICE_APPEARANCE_KEY) ||
                    localStorage.getItem(STORAGE_KEY) ||
                    LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean) ||
                    '{}'
            ) as Partial<AppearanceSettings>;
            return {
                colorMode: stored.colorMode === 'dark' ? 'dark' : this.settingsState().colorMode,
                colorTheme: stored.colorTheme ? this.colorTheme(stored.colorTheme) : this.settingsState().colorTheme
            };
        } catch {
            return { colorMode: this.settingsState().colorMode, colorTheme: this.settingsState().colorTheme };
        }
    }

    private unwrapAppearance(response: ApiResponseEnvelope<AppearanceSettings> | AppearanceSettings): AppearanceSettings {
        return 'data' in response ? response.data : response;
    }

    private assetUrl(value: unknown, fallback: string) {
        const normalized = typeof value === 'string' ? value.trim() : '';
        if (/^data:image\/(?:png|jpe?g|webp|gif|svg\+xml|x-icon);base64,/i.test(normalized)) {
            return normalized.slice(0, 3_000_000);
        }
        return /^(\/|https?:\/\/)/i.test(normalized) ? normalized.slice(0, 500) : fallback;
    }

    private applyBrowserBranding(settings: SystemSettings) {
        if (typeof document === 'undefined') {
            return;
        }

        document.title = settings.systemTitle;
        document.documentElement.classList.toggle('app-dark', settings.colorMode === 'dark');
        document.documentElement.dataset['dtsTheme'] = settings.colorTheme;
        const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (favicon) {
            favicon.href = settings.faviconUrl;
        }
    }

    private migrateBranding(settings: SystemSettings): SystemSettings {
        return {
            ...settings,
            systemTitle: this.brandingText(settings.systemTitle, LEGACY_SYSTEM_TITLE, DEFAULT_SYSTEM_SETTINGS.systemTitle, 100),
            systemShortTitle: this.brandingText(settings.systemShortTitle, LEGACY_SYSTEM_SHORT_TITLE, DEFAULT_SYSTEM_SETTINGS.systemShortTitle, 50),
            logoUrl: this.brandingAssetUrl(settings.logoUrl, [LEGACY_LOGO_URL, PREVIOUS_LOGO_URL, FORMER_BRAND_LOGO_URL, GENERATED_BRAND_LOGO_URL], DEFAULT_SYSTEM_SETTINGS.logoUrl),
            faviconUrl: this.brandingAssetUrl(settings.faviconUrl, LEGACY_FAVICON_URL, DEFAULT_SYSTEM_SETTINGS.faviconUrl),
            footerText: this.brandingText(settings.footerText, LEGACY_FOOTER_TEXT, DEFAULT_SYSTEM_SETTINGS.footerText, 100)
        };
    }
}
