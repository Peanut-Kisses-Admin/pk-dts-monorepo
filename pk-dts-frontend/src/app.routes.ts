import { Routes } from '@angular/router';
import { authGuard } from './app/auth/auth.guard';
import { Notfound } from './app/pages/notfound/notfound';

export const appRoutes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
    {
        path: 'panel',
        canActivate: [authGuard],
        canActivateChild: [authGuard],
        loadChildren: () => import('./app/panel/panel.routes').then((routes) => routes.panelRoutes)
    },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];
