import { Routes } from '@angular/router';
import { DocumentsPage } from './pages/documents/documents.page';
import { PanelLayoutComponent } from './panel-layout.component';
import { RolesPermissionsPage } from './pages/roles-permissions/roles-permissions.page';
import { StorageClassificationPage } from './pages/storage-classification/storage-classification.page';
import { UserAccountPage } from './pages/user-account/user-account.page';
import { DocumentDisposalPage } from './pages/document-disposal/document-disposal.page';
import { BackupRestorePage } from './pages/backup-restore/backup-restore.page';
import { DashboardPage } from './pages/dashboard/dashboard.page';
import { DocumentRequestsPage } from './pages/document-requests/document-requests.page';
import { ApprovalReviewPage } from './pages/approval-review/approval-review.page';
import { SystemSettingsPage } from './pages/system-settings/system-settings.page';
import { AuditLogsPage } from './pages/audit-logs/audit-logs.page';
import { DocumentAccessRequestsPage } from './pages/document-access-requests/document-access-requests.page';
import { HardcopyTransfersPage } from './pages/hardcopy-transfers/hardcopy-transfers.page';
import { WorkflowBuilderPage } from './pages/workflow-builder/workflow-builder.page';

export const panelRoutes: Routes = [
    {
        path: '',
        component: PanelLayoutComponent,
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            { path: 'dashboard', component: DashboardPage, data: { title: 'Dashboard', subtitle: 'Track the system summary, recent activity, and key counts at a glance.', permissions: ['dashboard.view'] } },
            { path: 'documents', component: DocumentsPage, data: { title: 'Document', subtitle: 'Manage document records, revisions, request states, and catalog mappings here.', permissions: ['documents.view', 'document-requests.view'] } },
            { path: 'softcopy-documents', component: DocumentsPage, data: { documentType: 'SOFTCOPY', title: 'Softcopy Documents', subtitle: 'Browse digital documents by folder, table list, or card grid.', permissions: ['documents.view', 'document-requests.view'] } },
            { path: 'hardcopy-documents', component: DocumentsPage, data: { documentType: 'HARDCOPY', title: 'Hardcopy Documents', subtitle: 'Browse physical records by area, location, asset number, table list, or card grid.', permissions: ['documents.view', 'document-requests.view'] } },
            { path: 'hardcopy-transfers', component: HardcopyTransfersPage, data: { title: 'Hardcopy Transfers', subtitle: 'Issue, transfer, and confirm receipt of physical document copies.', permissions: ['hardcopy-transfers.view-own', 'hardcopy-transfers.create', 'hardcopy-transfers.review'] } },
            { path: 'softcopy-folders', component: StorageClassificationPage, data: { resource: 'softcopyCategories', title: 'Softcopy Folders', subtitle: 'Manage digital document folders and subfolders independently.', permissions: ['softcopy-folders.view', 'softcopy-folders.manage'] } },
            { path: 'my-requests', component: DocumentRequestsPage, data: { title: 'My Requests', subtitle: 'Track document and disposal requests you created.', permissions: ['document-requests.view-own', 'document-disposal.request'] } },
            { path: 'document-access-requests', component: DocumentAccessRequestsPage, data: { title: 'Document Access Requests', subtitle: 'Request document assignments and review pending access approvals.', permissions: ['document-access-requests.catalog', 'document-access-requests.view-own', 'document-access-requests.review', 'document-access-requests.approve', 'document-access-requests.reject', 'document-access-requests.grant', 'document-access-requests.revoke', 'document-access-requests.expire'] } },
            { path: 'approval-review', component: ApprovalReviewPage, data: { title: 'Approval Review', subtitle: 'Review document and disposal requests waiting for a decision.', permissions: ['document-requests.review', 'document-requests.approve-noted-by', 'document-requests.approve-plant-manager', 'document-requests.approve-document-controller', 'document-requests.approve-hardcopy', 'document-disposal.review', 'document-disposal.manage'] } },
            { path: 'disposal', component: DocumentDisposalPage, data: { title: 'Document Disposal', subtitle: 'Review disposed documents, disposal remarks, and restore records when needed.', permissions: ['document-disposal.view'] } },
            {
                path: 'storage',
                component: StorageClassificationPage,
                data: {
                    title: 'Storage and Classification',
                    subtitle: 'Storage management, filing structure, and classification rules can be managed together here.',
                    permissions: ['storage-classification.view', 'location-management.view']
                }
            },
            { path: 'classification', pathMatch: 'full', redirectTo: 'storage' },
            { path: 'users', component: UserAccountPage, data: { title: 'User Account', subtitle: 'Edit your own profile or manage user accounts when permitted.' } },
            { path: 'roles-permissions', component: RolesPermissionsPage, data: { title: 'Role and Permission', subtitle: 'Define access control and permissions on this page.', permissions: ['roles-permissions.view'] } },
            { path: 'workflow-builder', component: WorkflowBuilderPage, data: { title: 'Workflow Builder', subtitle: 'Build and safely version dynamic document approval routes.', permissions: ['document-workflow.view', 'document-workflow.configure'] } },
            { path: 'backup-restore', component: BackupRestorePage, data: { title: 'Backup, Restore and Reset', subtitle: 'Create snapshots, restore history, and run guarded factory reset actions.', permissions: ['backup-restore.view'] } },
            { path: 'audit-logs', component: AuditLogsPage, data: { title: 'Audit and Activity Logs', subtitle: 'Trace authenticated document and system actions.', permissions: ['activity-logs.view_logs'] } },
            { path: 'settings', component: SystemSettingsPage, data: { title: 'System Settings', subtitle: 'Manage device branding, static content, document behavior, AI presentation, and protected integration status.', permissions: ['system-settings.manage'] } }
        ]
    }
];
