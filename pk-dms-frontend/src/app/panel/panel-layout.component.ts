import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Subject, catchError, filter, of, switchMap, takeUntil, timer } from 'rxjs';
import { AuthService } from '@/app/auth/auth.service';
import { ConfirmationDialogComponent } from '@/app/shared/components/confirmation-dialog/confirmation-dialog.component';
import { SystemSettingsService } from '@/app/shared/services/system-settings.service';
import { DashboardService } from './pages/dashboard/dashboard.service';
import { NavigationNotificationCounts } from './pages/dashboard/dashboard.types';
import { NotificationsService, UserNotification } from './notifications.service';

interface PanelNavItem {
    label: string;
    icon: string;
    route: string;
    permissions: string[];
    notificationKey?: keyof NavigationNotificationCounts;
}

interface PanelNavCategory {
    id: string;
    label: string;
    icon: string;
    items: PanelNavItem[];
}

@Component({
    selector: 'app-panel-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, ConfirmationDialogComponent],
    styleUrls: ['./panel-layout.component.scss'],
    template: `
        <div class="panel-shell">
            <div *ngIf="sidebarOpen()" class="panel-backdrop" (click)="closeSidebar()"></div>

            <aside class="panel-sidebar" [class.mobile-open]="sidebarOpen()">
                <div class="panel-brand">
                    <div class="brand-mark">
                        <img [src]="settings().logoUrl" [alt]="settings().systemTitle + ' logo'" />
                    </div>
                    <div class="brand-copy">
                        <div class="brand-eyebrow">{{ settings().brandEyebrow }}</div>
                        <div class="brand-title">{{ settings().systemShortTitle }}</div>
                    </div>
                    <button type="button" class="sidebar-close" aria-label="Close navigation" (click)="closeSidebar()"><i class="pi pi-times"></i></button>
                </div>

                <div class="panel-navigation">
                    <div class="nav-section-label">Workspace</div>
                    <nav class="panel-nav" aria-label="Panel navigation">
                        <a *ngFor="let item of visiblePrimaryNavItems()" [routerLink]="item.route" routerLinkActive="active" class="nav-item">
                            <span class="nav-icon"><i [class]="item.icon"></i></span>
                            <span class="nav-label">{{ item.label }}</span>
                            <span *ngIf="notificationCount(item)" class="nav-count" [attr.aria-label]="notificationCount(item) + ' new items'">{{ displayNotificationCount(item) }}</span>
                            <i class="pi pi-chevron-right nav-arrow"></i>
                        </a>

                        <div *ngFor="let category of visibleNavCategories(); trackBy: trackCategory" class="nav-group" [class.open]="isCategoryOpen(category.id)" [class.active]="isCategoryActive(category)">
                            <button
                                type="button"
                                class="nav-item nav-category"
                                [attr.aria-expanded]="isCategoryOpen(category.id)"
                                [attr.aria-controls]="'nav-category-' + category.id"
                                (click)="toggleCategory(category.id)"
                            >
                                <span class="nav-icon"><i [class]="category.icon"></i></span>
                                <span class="nav-label">{{ category.label }}</span>
                                <i class="pi pi-chevron-down category-arrow"></i>
                            </button>
                            <div *ngIf="isCategoryOpen(category.id)" class="nav-children" [id]="'nav-category-' + category.id">
                                <a *ngFor="let item of category.items" [routerLink]="item.route" routerLinkActive="active" class="nav-item nav-child">
                                    <span class="nav-icon"><i [class]="item.icon"></i></span>
                                    <span class="nav-label">{{ item.label }}</span>
                                    <span *ngIf="notificationCount(item)" class="nav-count" [attr.aria-label]="notificationCount(item) + ' new items'">{{ displayNotificationCount(item) }}</span>
                                    <i class="pi pi-chevron-right nav-arrow"></i>
                                </a>
                            </div>
                        </div>
                    </nav>
                </div>

                <div class="panel-sidebar-card">
                    <div class="sidebar-profile">
                        <div class="sidebar-avatar"><i class="pi pi-user"></i></div>
                        <div class="sidebar-profile-copy">
                            <div class="sidebar-session-label">Signed in as</div>
                            <div class="sidebar-name">{{ userName() }}</div>
                            <div class="sidebar-role">{{ userRole() }}</div>
                        </div>
                    </div>
                    <button pButton type="button" class="sidebar-logout" severity="danger" label="Sign out" icon="pi pi-sign-out" (click)="openLogoutConfirm()"></button>
                </div>
            </aside>

            <div class="panel-main">
                <header class="panel-topbar">
                    <div class="topbar-left">
                        <button pButton type="button" class="topbar-menu" severity="secondary" text icon="pi pi-bars" (click)="toggleSidebar()"></button>
                        <div class="topbar-page-icon"><i class="pi pi-file"></i></div>
                        <div class="topbar-page-copy">
                            <span class="topbar-eyebrow">Document workspace</span>
                            <div class="topbar-title">{{ pageTitle() }}</div>
                            <div class="topbar-subtitle">{{ pageSubtitle() }}</div>
                        </div>
                    </div>

                    <div class="topbar-right">
                        <div class="notification-center">
                            <button type="button" class="notification-trigger" [class.open]="notificationsOpen()" [class.has-unread]="unreadCount() > 0" [attr.aria-expanded]="notificationsOpen()" aria-label="Open notifications" (click)="toggleNotifications($event)"><i class="pi pi-bell"></i><span *ngIf="unreadCount()" class="notification-badge">{{ unreadCount() > 99 ? '99+' : unreadCount() }}</span></button>
                            <section *ngIf="notificationsOpen()" class="notification-panel">
                                <header><div><strong>Notifications</strong><small>{{ unreadCount() }} unread</small></div><button *ngIf="unreadCount()" type="button" (click)="markAllRead()">Mark all read</button></header>
                                <div class="notification-list">
                                    <button *ngFor="let item of notifications(); trackBy: trackNotification" type="button" class="notification-item" [class.unread]="!item.read" (click)="openNotification(item)">
                                        <span class="notification-icon"><i [class]="item.icon"></i></span><span class="notification-copy"><strong>{{ item.title }}</strong><span>{{ item.message }}</span><small>{{ notificationTime(item.created_at) }}</small></span><span *ngIf="!item.read" class="unread-dot"></span>
                                    </button>
                                    <div *ngIf="!notifications().length" class="notification-empty"><i class="pi pi-bell-slash"></i><strong>You’re all caught up</strong><span>New assignments and document updates will appear here.</span></div>
                                </div>
                            </section>
                        </div>
                        <button type="button" class="theme-toggle" [attr.aria-pressed]="settings().colorMode === 'dark'" [title]="settings().colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'" (click)="toggleColorMode()">
                            <i class="pi" [ngClass]="settings().colorMode === 'dark' ? 'pi-sun' : 'pi-moon'"></i>
                            <span class="theme-toggle-label">{{ settings().colorMode === 'dark' ? 'Light mode' : 'Dark mode' }}</span>
                            <span class="sr-only">{{ settings().colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode' }}</span>
                        </button>
                        <div class="topbar-account">
                            <div class="topbar-avatar">
                                <i class="pi pi-user"></i>
                            </div>
                            <div class="topbar-account-copy">
                                <div class="topbar-account-name">{{ userName() }}</div>
                                <div class="topbar-account-role">{{ userRole() }}</div>
                            </div>
                        </div>
                    </div>
                </header>

                <main class="panel-content">
                    <router-outlet></router-outlet>
                </main>
            </div>

            <app-confirmation-dialog
                [(visible)]="logoutConfirmVisible"
                title="Log out?"
                subtitle="End your current session"
                message="Are you sure you want to log out of the control panel?"
                confirmLabel="Log out"
                cancelLabel="Stay signed in"
                tone="primary"
                [dismissableMask]="true"
                (confirm)="confirmLogout()"
            />

        </div>
    `
})
export class PanelLayoutComponent implements OnInit, OnDestroy {
    private auth = inject(AuthService);
    private systemSettings = inject(SystemSettingsService);
    private dashboardService = inject(DashboardService);
    private notificationsService = inject(NotificationsService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private destroy$ = new Subject<void>();
    settings = this.systemSettings.settings;

    primaryNavItems: PanelNavItem[] = [
        { label: 'Dashboard', icon: 'pi pi-home', route: '/panel/dashboard', permissions: ['dashboard.view'] }
    ];

    navCategories: PanelNavCategory[] = [
        {
            id: 'documents',
            label: 'Documents',
            icon: 'pi pi-folder-open',
            items: [
                { label: 'Softcopy Documents', icon: 'pi pi-file', route: '/panel/softcopy-documents', permissions: ['documents.view', 'document-requests.view'] },
                { label: 'Hardcopy Documents', icon: 'pi pi-box', route: '/panel/hardcopy-documents', permissions: ['documents.view', 'document-requests.view'] },
                { label: 'Hardcopy Transfer Requests', icon: 'pi pi-arrow-right-arrow-left', route: '/panel/hardcopy-transfers', permissions: ['hardcopy-transfers.view-own', 'hardcopy-transfers.create', 'hardcopy-transfers.review'], notificationKey: 'hardcopy_transfers' },
                { label: 'Document Requests', icon: 'pi pi-file-edit', route: '/panel/my-document-requests', permissions: ['document-requests.view-own', 'document-requests.create'], notificationKey: 'document_requests' },
                { label: 'Document Access Requests', icon: 'pi pi-key', route: '/panel/document-access-requests', permissions: ['document-access-requests.catalog', 'document-access-requests.view-own', 'document-access-requests.review', 'document-access-requests.approve', 'document-access-requests.reject', 'document-access-requests.grant', 'document-access-requests.revoke', 'document-access-requests.expire'], notificationKey: 'access_requests' },
                { label: 'Disposal Requests', icon: 'pi pi-trash', route: '/panel/my-disposal-requests', permissions: ['document-disposal.request', 'document-disposal.view'], notificationKey: 'disposal_requests' },
                { label: 'Approval Review', icon: 'pi pi-check-square', route: '/panel/approval-review', permissions: ['document-requests.review', 'document-requests.approve-noted-by', 'document-requests.approve-plant-manager', 'document-requests.approve-document-controller', 'document-requests.approve-hardcopy', 'document-disposal.review', 'document-disposal.manage'], notificationKey: 'approval_review' },
                { label: 'Document Disposal', icon: 'pi pi-trash', route: '/panel/disposal', permissions: ['document-disposal.view'] }
            ]
        },
        {
            id: 'administration',
            label: 'Administration',
            icon: 'pi pi-objects-column',
            items: [
                { label: 'Storage and Classification', icon: 'pi pi-database', route: '/panel/storage', permissions: ['storage-classification.view', 'location-management.view', 'softcopy-folders.view', 'softcopy-folders.manage'] },
                { label: 'User Account', icon: 'pi pi-users', route: '/panel/users', permissions: [], notificationKey: 'user_accounts' },
                { label: 'Role and Permission', icon: 'pi pi-shield', route: '/panel/roles-permissions', permissions: ['roles-permissions.view'] },
                { label: 'Workflow Builder', icon: 'pi pi-sitemap', route: '/panel/workflow-builder', permissions: ['document-workflow.view', 'document-workflow.configure'] }
            ]
        },
        {
            id: 'system',
            label: 'System',
            icon: 'pi pi-cog',
            items: [
                { label: 'Backup, Restore and Reset', icon: 'pi pi-history', route: '/panel/backup-restore', permissions: ['backup-restore.view'] },
                { label: 'Audit and Activity Logs', icon: 'pi pi-list-check', route: '/panel/audit-logs', permissions: ['activity-logs.view_logs'] },
                { label: 'System Settings', icon: 'pi pi-sliders-h', route: '/panel/settings', permissions: ['system-settings.manage'] }
            ]
        }
    ];

    pageTitle = signal('Dashboard');
    pageSubtitle = signal('Your document-tracking overview will live here.');
    logoutConfirmVisible = false;

    userName = computed(() => {
        const user = this.auth.user();
        if (!user) {
            return 'Guest';
        }

        return `${user.firstname} ${user.lastname}`.trim();
    });

    userRole = computed(() => this.auth.user()?.role?.role_name ?? 'User');
    visiblePrimaryNavItems = computed(() => this.primaryNavItems.filter((item) => this.auth.hasAnyPermission(...item.permissions)));
    visibleNavCategories = computed(() =>
        this.navCategories
            .map((category) => ({ ...category, items: category.items.filter((item) => this.auth.hasAnyPermission(...item.permissions)) }))
            .filter((category) => category.items.length > 0)
    );
    openCategories = signal<Set<string>>(new Set());
    sidebarOpen = signal(false);
    notificationCounts = signal<NavigationNotificationCounts>({ approval_review: 0, document_requests: 0, disposal_requests: 0, access_requests: 0, hardcopy_transfers: 0, user_accounts: 0 });
    notifications = signal<UserNotification[]>([]);
    unreadCount = signal(0);
    notificationsOpen = signal(false);

    ngOnInit() {
        this.auth.refreshProfile()?.subscribe({
            next: () => this.openActiveCategory(),
            error: () => {
                this.auth.logout();
                this.router.navigate(['/auth/login']);
            }
        });
        this.syncPageMeta();
        this.openActiveCategory();
        timer(0, 30_000)
            .pipe(
                switchMap(() => this.dashboardService.getNavigationCounts().pipe(catchError(() => of(null)))),
                takeUntil(this.destroy$)
            )
            .subscribe((counts) => { if (counts) this.notificationCounts.set(counts); });
        timer(0, 30_000).pipe(switchMap(() => this.notificationsService.list().pipe(catchError(() => of(null)))), takeUntil(this.destroy$)).subscribe((feed) => { if (feed) { this.notifications.set(feed.items); this.unreadCount.set(feed.unread_count); } });

        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                this.syncPageMeta();
                this.openActiveCategory();
                this.closeSidebar();
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    openLogoutConfirm() {
        this.logoutConfirmVisible = true;
    }

    confirmLogout() {
        this.auth.logout();
        this.logoutConfirmVisible = false;
        this.router.navigate(['/auth/login']);
    }

    toggleSidebar() {
        this.sidebarOpen.update((value) => !value);
    }

    closeSidebar() {
        this.sidebarOpen.set(false);
    }

    toggleCategory(categoryId: string) {
        this.openCategories.update((current) => {
            const next = new Set(current);
            if (next.has(categoryId)) next.delete(categoryId);
            else next.add(categoryId);
            return next;
        });
    }

    isCategoryOpen(categoryId: string) {
        return this.openCategories().has(categoryId);
    }

    isCategoryActive(category: PanelNavCategory) {
        const currentUrl = this.router.url.split('?')[0].split('#')[0];
        return category.items.some((item) => currentUrl === item.route || currentUrl.startsWith(`${item.route}/`));
    }

    trackCategory = (_index: number, category: PanelNavCategory) => category.id;
    notificationCount(item: PanelNavItem) { return item.notificationKey ? this.notificationCounts()[item.notificationKey] ?? 0 : 0; }
    displayNotificationCount(item: PanelNavItem) { const count = this.notificationCount(item); return count > 99 ? '99+' : String(count); }
    trackNotification = (_index: number, item: UserNotification) => item.event_key;
    toggleNotifications(event: Event) { event.stopPropagation(); this.notificationsOpen.update((value) => !value); }
    openNotification(item: UserNotification) { this.notificationsService.read(item.event_key).subscribe(() => { this.notifications.update((items) => items.map((value) => value.event_key === item.event_key ? { ...value, read: true } : value)); this.unreadCount.set(this.notifications().filter((value) => !value.read).length); }); this.notificationsOpen.set(false); this.router.navigateByUrl(item.route); }
    markAllRead() { this.notificationsService.readAll().subscribe(() => { this.notifications.update((items) => items.map((item) => ({ ...item, read: true }))); this.unreadCount.set(0); }); }
    notificationTime(value: string) { const date = new Date(value); const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000)); if (seconds < 60) return 'Just now'; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; return date.toLocaleDateString(); }

    @HostListener('document:click') closeNotifications() { this.notificationsOpen.set(false); }

    toggleColorMode() {
        this.systemSettings.toggleColorMode();
    }

    @HostListener('window:resize')
    onResize() {
        if (window.innerWidth > 991) {
            this.sidebarOpen.set(false);
        }
    }

    private syncPageMeta() {
        const snapshot = this.getDeepestSnapshot();
        const data = snapshot?.data ?? {};

        this.pageTitle.set((data['title'] as string) ?? this.titleFromUrl(this.router.url));
        this.pageSubtitle.set((data['subtitle'] as string) ?? 'Manage this section from the panel.');
    }

    private openActiveCategory() {
        const active = this.visibleNavCategories().find((category) => this.isCategoryActive(category));
        if (!active || this.openCategories().has(active.id)) return;
        this.openCategories.update((current) => new Set([...current, active.id]));
    }

    private getDeepestSnapshot() {
        let current = this.route;

        while (current.firstChild) {
            current = current.firstChild;
        }

        return current.snapshot;
    }

    private titleFromUrl(url: string) {
        const segment = url.split('?')[0].split('#')[0].split('/').filter(Boolean).pop() ?? 'dashboard';

        switch (segment) {
            case 'documents':
                return 'Document';
            case 'storage':
                return 'Storage and Classification';
            case 'disposal':
                return 'Document Disposal';
            case 'classification':
                return 'Storage and Classification';
            case 'users':
                return 'User Account';
            case 'roles-permissions':
                return 'Role and Permission';
            case 'backup-restore':
                return 'Backup, Restore and Reset';
            case 'settings':
                return 'System Settings';
            default:
                return 'Dashboard';
        }
    }
}
