import { Injectable } from "@nestjs/common";
import { DocumentAccessRequestStatus, DocumentStatus, HardcopyTransferStatus, Prisma, WorkflowStepStatus } from "@prisma/client";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { isAdministrativeRole } from "../../../common/auth/administrative-role.util";
import { AuthenticatedUser } from "../../../common/auth/authenticated-user.interface";
import { DOCUMENT_REVIEW_PERMISSIONS, hasAnyPermission } from "../../../common/auth/document-workflow-permissions";
import {
  DashboardRecentDocumentItem,
  DashboardRecentUserItem,
  DashboardSummary,
  NavigationNotificationCounts,
} from "./dashboard.types";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getNavigationCounts(user: AuthenticatedUser): Promise<NavigationNotificationCounts> {
    const isAdmin = isAdministrativeRole(user.role.role_name);
    const permissions = new Set(user.role.permissions);
    const canReview = isAdmin || hasAnyPermission(user, DOCUMENT_REVIEW_PERMISSIONS);
    const canReviewDisposals = isAdmin || permissions.has("document-disposal.review") || permissions.has("document-disposal.manage");
    const canRequestDisposal = isAdmin || permissions.has("document-disposal.request");
    const canApproveUsers = isAdmin || permissions.has("user-accounts.approve") || permissions.has("user-accounts.manage");
    const userId = BigInt(user.user_id);
    const [documentApprovals, disposalApprovals, documentRequests, disposalRequests, accessRequests, hardcopyTransfers, userAccounts] = await Promise.all([
      canReview ? this.prisma.document.count({
        where: isAdmin
          ? { status: { in: [DocumentStatus.PendingApproval, DocumentStatus.ForNotedBy, DocumentStatus.ForPlantManagerApproval, DocumentStatus.ForDocumentControllerAdmin, DocumentStatus.ForApproval] }, workflow_steps: { some: { assigned_user_id: userId, status: WorkflowStepStatus.PENDING } } }
          : { status: { in: [DocumentStatus.PendingApproval, DocumentStatus.ForNotedBy, DocumentStatus.ForPlantManagerApproval, DocumentStatus.ForDocumentControllerAdmin, DocumentStatus.ForApproval] }, workflow_steps: { some: { assigned_user_id: userId, status: WorkflowStepStatus.PENDING } } },
      }) : Promise.resolve(0),
      canReviewDisposals ? this.prisma.documentDisposalRequest.count({ where: { status: "Pending" } }) : Promise.resolve(0),
      this.prisma.document.count({ where: { created_by: userId, status: { notIn: [DocumentStatus.Approved, DocumentStatus.Completed, DocumentStatus.Disposed] } } }),
      canRequestDisposal ? this.prisma.documentDisposalRequest.count({ where: { requested_by_user_id: userId, status: "Pending" } }) : Promise.resolve(0),
      this.prisma.documentAccessRequest.count({ where: { OR: [{ requested_by_user_id: userId, status: { in: [DocumentAccessRequestStatus.PENDING, DocumentAccessRequestStatus.ForAccessApproval] } }, { approver_user_id: userId, status: { in: [DocumentAccessRequestStatus.PENDING, DocumentAccessRequestStatus.ForAccessApproval, DocumentAccessRequestStatus.APPROVED] } }] } }),
      this.prisma.hardcopyTransferRequest.count({ where: { OR: [{ requested_by_user_id: userId, status: { in: [HardcopyTransferStatus.Draft, HardcopyTransferStatus.ForApproval, HardcopyTransferStatus.Returned] } }, { assigned_recipient_user_id: userId, status: HardcopyTransferStatus.ForTransfer }, { approver_user_id: userId, status: { in: [HardcopyTransferStatus.ForApproval, HardcopyTransferStatus.Approved, HardcopyTransferStatus.ForTransfer] } }] } }),
      canApproveUsers ? this.prisma.accountRegistrationRequest.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    ]);
    return {
      approval_review: documentApprovals + disposalApprovals,
      document_requests: documentRequests,
      disposal_requests: disposalRequests,
      access_requests: accessRequests,
      hardcopy_transfers: hardcopyTransfers,
      user_accounts: userAccounts,
    };
  }

  async getSummary(user?: AuthenticatedUser): Promise<DashboardSummary> {
    const isAdmin = isAdministrativeRole(user?.role.role_name);
    const documentWhere: Prisma.DocumentWhereInput =
      !user || isAdmin
        ? {}
        : { assignments: { some: { user_id: BigInt(user.user_id) } } };
    const [
      documents,
      approvedDocuments,
      disposedDocuments,
      users,
      roles,
      permissions,
      areas,
      specifics,
      locations,
      sequences,
      assetNumbers,
      hardcopies,
      softcopies,
      revisions,
      recentDocuments,
      recentUsers,
    ] = await this.prisma.$transaction([
      this.prisma.document.count({ where: documentWhere }),
      this.prisma.document.count({
        where: { ...documentWhere, status: "Approved" },
      }),
      this.prisma.document.count({
        where: { ...documentWhere, status: "Disposed" },
      }),
      this.prisma.user.count(),
      this.prisma.role.count(),
      this.prisma.permission.count(),
      this.prisma.area.count(),
      this.prisma.specific.count(),
      this.prisma.location.count(),
      this.prisma.sequence.count(),
      this.prisma.assetNumber.count(),
      this.prisma.hardcopyDocument.count({
        where: { document: documentWhere },
      }),
      this.prisma.softcopyDocument.count({
        where: { document: documentWhere },
      }),
      this.prisma.documentRevision.count({
        where: { softcopy: { document: documentWhere } },
      }),
      this.prisma.document.findMany({
        where: documentWhere,
        orderBy: { created_at: "desc" },
        take: 6,
        select: {
          document_id: true,
          document_title: true,
          document_type: true,
          status: true,
          created_at: true,
          creator: {
            select: {
              firstname: true,
              lastname: true,
            },
          },
          hardcopy: {
            include: {
              area: { select: { area_name: true } },
              location: { select: { location_name: true } },
              asset: { select: { asset_number: true } },
              sequence: { select: { sequence_code: true } },
            },
          },
          softcopy: {
            select: {
              document_number: true,
              current_revision: {
                select: { revision_number: true },
              },
            },
          },
        },
      }),
      this.prisma.user.findMany({
        orderBy: { created_at: "desc" },
        take: 5,
        include: {
          role: {
            select: {
              role_name: true,
            },
          },
        },
      }),
    ]);

    return {
      counters: {
        documents,
        approved_documents: approvedDocuments,
        disposed_documents: disposedDocuments,
        users,
        roles,
        permissions,
        areas,
        specifics,
        locations,
        sequences,
        asset_numbers: assetNumbers,
        hardcopies,
        softcopies,
        revisions,
      },
      recent_documents: recentDocuments.map((document) =>
        this.mapRecentDocument(document),
      ),
      recent_users: recentUsers.map((user) => this.mapRecentUser(user)),
      generated_at: new Date().toISOString(),
    };
  }

  private mapRecentDocument(
    document: Prisma.DocumentGetPayload<{
      select: {
        document_id: true;
        document_title: true;
        document_type: true;
        status: true;
        created_at: true;
        creator: { select: { firstname: true; lastname: true } };
        hardcopy: {
          select: {
            area: { select: { area_name: true } };
            location: { select: { location_name: true } };
            asset: { select: { asset_number: true } };
            sequence: { select: { sequence_code: true } };
          };
        };
        softcopy: {
          select: {
            document_number: true;
            current_revision: { select: { revision_number: true } };
          };
        };
      };
    }>,
  ): DashboardRecentDocumentItem {
    const storageSummary =
      document.document_type === "HARDCOPY"
        ? [
            `Area: ${document.hardcopy?.area?.area_name ?? "None"}`,
            `Location: ${document.hardcopy?.location?.location_name ?? "None"}`,
            `Asset: ${document.hardcopy?.asset?.asset_number ?? "None"}`,
          ].join(" · ")
        : `Current revision: ${
            document.softcopy?.current_revision?.revision_number ?? "None"
          }`;

    return {
      document_id: document.document_id.toString(),
      document_number: document.softcopy?.document_number ?? null,
      document_title: document.document_title,
      document_type: document.document_type,
      status: document.status,
      created_at: document.created_at.toISOString(),
      creator_name:
        `${document.creator.firstname} ${document.creator.lastname}`.trim(),
      current_revision_number:
        document.softcopy?.current_revision?.revision_number ?? null,
      storage_summary: storageSummary,
    };
  }

  private mapRecentUser(
    user: Prisma.UserGetPayload<{
      include: { role: { select: { role_name: true } } };
    }>,
  ): DashboardRecentUserItem {
    return {
      user_id: user.user_id.toString(),
      full_name: `${user.firstname} ${user.lastname}`.trim(),
      email: user.email,
      role_name: user.role.role_name,
      created_at: user.created_at.toISOString(),
    };
  }
}
