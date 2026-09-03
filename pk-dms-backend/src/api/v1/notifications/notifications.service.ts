import { Injectable } from '@nestjs/common';
import { DocumentAccessRequestStatus, DocumentStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user.interface';
import { isAdministrativeRole } from '../../../common/auth/administrative-role.util';
import { PrismaService } from '../../../core/prisma/prisma.service';

interface FeedItem { event_key: string; title: string; message: string; route: string; created_at: Date; icon: string; }

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    const userId = BigInt(user.user_id);
    const isAdmin = isAdministrativeRole(user.role.role_name);
    const [assignments, histories, accessRequests, reads] = await Promise.all([
      this.prisma.documentAssignment.findMany({ where: isAdmin ? { assigned_by: userId } : { user_id: userId }, take: 30, orderBy: { assigned_at: 'desc' }, include: { document: { select: { document_id: true, document_title: true, document_type: true } } } }),
      this.prisma.documentStatusHistory.findMany({ where: isAdmin ? { new_status: DocumentStatus.PendingApproval } : { document: { OR: [{ created_by: userId }, { assignments: { some: { user_id: userId } } }] }, NOT: { performed_by: userId } }, take: 40, orderBy: { created_at: 'desc' }, include: { document: { select: { document_id: true, document_title: true, document_type: true } } } }),
      this.prisma.documentAccessRequest.findMany({ where: isAdmin ? { status: DocumentAccessRequestStatus.PENDING } : { requested_by_user_id: userId, status: { in: [DocumentAccessRequestStatus.APPROVED, DocumentAccessRequestStatus.REJECTED] } }, take: 40, orderBy: { updated_at: 'desc' }, include: { document: { select: { document_title: true } }, requester: { select: { firstname: true, lastname: true } } } }),
      this.prisma.notificationRead.findMany({ where: { user_id: userId }, select: { event_key: true } }),
    ]);
    const items: FeedItem[] = [
      ...assignments.map((item) => ({ event_key: `assignment:${item.document_assignment_id}`, title: isAdmin ? 'Document assignment updated' : 'Document assigned to you', message: item.document.document_title, route: item.document.document_type === 'SOFTCOPY' ? '/panel/softcopy-documents' : '/panel/hardcopy-documents', created_at: item.assigned_at, icon: 'pi pi-user-plus' })),
      ...histories.map((item) => ({ event_key: `status:${item.history_id}`, title: this.statusTitle(item.new_status), message: item.document.document_title, route: isAdmin && item.new_status === DocumentStatus.PendingApproval ? '/panel/approval-review' : '/panel/my-requests', created_at: item.created_at, icon: this.statusIcon(item.new_status) })),
      ...accessRequests.map((item) => ({ event_key: `access-request:${item.access_request_id}:${item.status}`, title: isAdmin ? 'Document access requested' : item.status === DocumentAccessRequestStatus.APPROVED ? 'Document access approved' : 'Document access rejected', message: isAdmin ? `${item.requester.firstname} ${item.requester.lastname} requested ${item.document.document_title}` : item.document.document_title, route: '/panel/document-access-requests', created_at: item.updated_at, icon: item.status === DocumentAccessRequestStatus.APPROVED ? 'pi pi-user-plus' : item.status === DocumentAccessRequestStatus.REJECTED ? 'pi pi-times-circle' : 'pi pi-key' })),
    ].sort((a, b) => b.created_at.getTime() - a.created_at.getTime()).slice(0, 50);
    const readKeys = new Set(reads.map((item) => item.event_key));
    const notifications = items.map((item) => ({ ...item, created_at: item.created_at.toISOString(), read: readKeys.has(item.event_key) }));
    return { items: notifications, unread_count: notifications.filter((item) => !item.read).length };
  }

  async read(user: AuthenticatedUser, eventKey: string) { await this.prisma.notificationRead.upsert({ where: { user_id_event_key: { user_id: BigInt(user.user_id), event_key: eventKey } }, update: { read_at: new Date() }, create: { user_id: BigInt(user.user_id), event_key: eventKey } }); return { success: true }; }
  async readAll(user: AuthenticatedUser) { const feed = await this.list(user); await this.prisma.notificationRead.createMany({ data: feed.items.map((item) => ({ user_id: BigInt(user.user_id), event_key: item.event_key })), skipDuplicates: true }); return { success: true }; }
  private statusTitle(status: DocumentStatus) { return ({ PendingApproval: 'Request submitted for approval', Approved: 'Document request approved', Rejected: 'Document request rejected', ForRevision: 'Document revision requested', Draft: 'Document returned to draft', Disposed: 'Document disposed' } as Record<string,string>)[status] || 'Document updated'; }
  private statusIcon(status: DocumentStatus) { return status === DocumentStatus.Approved ? 'pi pi-check-circle' : status === DocumentStatus.ForRevision ? 'pi pi-refresh' : status === DocumentStatus.Rejected ? 'pi pi-times-circle' : 'pi pi-file-edit'; }
}
