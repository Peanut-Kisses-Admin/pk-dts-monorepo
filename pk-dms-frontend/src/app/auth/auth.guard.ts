import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isAuthenticated()) {
        const requiredPermissions = route.data?.['permissions'] as string[] | undefined;
        if (!requiredPermissions?.length || auth.hasAnyPermission(...requiredPermissions)) {
            return true;
        }

        if (route.routeConfig?.path === 'dashboard') {
            return router.createUrlTree([firstAuthorizedPanelUrl(auth)]);
        }

        const refreshedProfile = auth.refreshProfile();
        if (!refreshedProfile) {
            return router.createUrlTree(['/auth/login']);
        }

        return refreshedProfile.pipe(
            map(() => auth.hasAnyPermission(...requiredPermissions)
                ? true
                : router.createUrlTree(['/auth/access'])),
            catchError(() => {
                auth.logout();
                return of(router.createUrlTree(['/auth/login']));
            })
        );
    }

    if (route.data?.['publicFallback']) {
        return true;
    }

    return router.createUrlTree(['/auth/login']);
};

function firstAuthorizedPanelUrl(auth: AuthService) {
    const routes: Array<{ url: string; permissions: string[] }> = [
        { url: '/panel/dashboard', permissions: ['dashboard.view'] },
        { url: '/panel/documents', permissions: ['documents.view', 'document-requests.view'] },
        { url: '/panel/my-document-requests', permissions: ['document-requests.view-own', 'document-requests.create'] },
        { url: '/panel/my-disposal-requests', permissions: ['document-disposal.request', 'document-disposal.view'] },
        { url: '/panel/hardcopy-transfers', permissions: ['hardcopy-transfers.view-own', 'hardcopy-transfers.create', 'hardcopy-transfers.review'] },
        { url: '/panel/approval-review', permissions: ['document-requests.review', 'document-requests.approve-noted-by', 'document-requests.approve-plant-manager', 'document-requests.approve-document-controller', 'document-requests.approve-hardcopy', 'document-disposal.review', 'document-disposal.manage'] },
        { url: '/panel/disposal', permissions: ['document-disposal.view'] },
        { url: '/panel/storage', permissions: ['storage-classification.view', 'location-management.view', 'softcopy-folders.view', 'softcopy-folders.manage'] },
        { url: '/panel/roles-permissions', permissions: ['roles-permissions.view'] },
        { url: '/panel/backup-restore', permissions: ['backup-restore.view'] },
        { url: '/panel/settings', permissions: ['system-settings.manage'] }
    ];

    return routes.find((candidate) => auth.hasAnyPermission(...candidate.permissions))?.url ?? '/panel/users';
}

export const guestGuard: CanActivateFn = (): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
        return true;
    }

    return router.createUrlTree(['/panel/dashboard']);
};
