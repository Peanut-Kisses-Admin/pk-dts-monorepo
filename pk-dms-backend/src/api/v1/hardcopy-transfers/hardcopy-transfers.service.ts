import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { HardcopyTransferStatus, Prisma, RecipientAcceptanceStatus } from "@prisma/client";
import { AuthenticatedUser } from "../../../common/auth/authenticated-user.interface";
import { isAdministrativeRole } from "../../../common/auth/administrative-role.util";
import { hasPermission } from "../../../common/auth/document-workflow-permissions";
import { toBigIntId } from "../../../common/utils/prisma-id.util";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { CreateHardcopyTransferDto } from "./dto/create-hardcopy-transfer.dto";

@Injectable()
export class HardcopyTransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHardcopyTransferDto, actor: AuthenticatedUser) {
    this.assertActorPermission(actor, "hardcopy-transfers.create");
    const documentId = toBigIntId(dto.document_id, "document_id");
    const actorId = toBigIntId(actor.user_id, "current_user_id");
    const document = await this.prisma.document.findUnique({
      where: { document_id: documentId },
      include: {
        hardcopy: true,
        approver_configuration: true,
        assignments: { orderBy: { assigned_at: "desc" }, select: { user_id: true } },
      },
    });
    if (!document?.hardcopy) throw new NotFoundException("Hardcopy document not found.");
    if (!["Approved", "Completed"].includes(document.status)) {
      throw new ConflictException("A Hardcopy transfer can only be requested for an approved Hardcopy document.");
    }
    const isAdministrator = isAdministrativeRole(actor.role.role_name);
    const assignedHolderId = document.assignments[0]?.user_id ?? null;
    const manuallySelectedHolderId = dto.current_holder_user_id
      ? toBigIntId(dto.current_holder_user_id, "current_holder_user_id")
      : null;
    const holderId = isAdministrator
      ? manuallySelectedHolderId ?? assignedHolderId
      : actorId;
    if (!holderId) {
      throw new BadRequestException("Select a Current Holder when the Hardcopy document has no assigned user.");
    }
    if (isAdministrator && holderId === actorId) {
      throw new BadRequestException("The Current Holder must be another user when an administrator creates the transfer.");
    }
    const holder = await this.prisma.user.findUnique({
      where: { user_id: holderId },
      select: { user_id: true, firstname: true, lastname: true },
    });
    if (!holder) throw new NotFoundException("The selected Current Holder was not found.");
    const approverId = document.approver_configuration?.hardcopy_approver_user_id
      ?? await this.findApproverId();
    if (!approverId) throw new ConflictException("A Hardcopy approver is not configured.");
    await this.assertTransferApprover(approverId);
    return this.prisma.$transaction(async (tx) => {
      const destination = await this.resolveDestinationStorage(tx, dto);
      const transfer = await tx.hardcopyTransferRequest.create({
        data: {
          document_id: documentId,
          hardcopy_id: document.hardcopy!.hardcopy_id,
          from_area_id: document.hardcopy!.area_id,
          from_specific_id: document.hardcopy!.specific_id,
          from_asset_id: document.hardcopy!.asset_id,
          from_location_id: document.hardcopy!.location_id,
          from_sequence_id: document.hardcopy!.sequence_id,
          destination_area_id: destination.area_id,
          destination_specific_id: destination.specific_id,
          destination_asset_id: destination.asset_id,
          destination_location_id: destination.location_id,
          destination_sequence_id: destination.sequence_id,
          document_copy_number: dto.document_copy_number?.trim() || null,
          current_holder: [holder.firstname, holder.lastname].filter(Boolean).join(" ") || null,
          transfer_to: dto.transfer_to?.trim() || null,
          requested_by_user_id: actorId,
          reason: dto.reason.trim(),
          approver_user_id: approverId,
          assigned_recipient_user_id: isAdministrator ? holderId : actorId,
          comments: dto.comments?.trim() || null,
        },
      });
      await this.recordHistory(tx, transfer.transfer_request_id, null, HardcopyTransferStatus.Draft, "create", actor, dto.comments);
      return transfer;
    });
  }

  listMine(actor: AuthenticatedUser) {
    const userId = toBigIntId(actor.user_id, "current_user_id");
    return this.prisma.hardcopyTransferRequest.findMany({
      where: { OR: [{ requested_by_user_id: userId }, { assigned_recipient_user_id: userId }] },
      include: {
        document: { include: { hardcopy: { include: { area: true, specific: true, asset: true, location: true, sequence: true } } } },
        from_area: true, from_specific: true, from_asset: true, from_location: true, from_sequence: true,
        destination_area: true, destination_specific: true, destination_asset: true, destination_location: true, destination_sequence: true,
        assigned_recipient: true, approver: true, history: { orderBy: { created_at: "asc" } },
      },
      orderBy: { updated_at: "desc" },
    });
  }

  listPending(actor: AuthenticatedUser) {
    return this.prisma.hardcopyTransferRequest.findMany({
      where: {
        status: { in: [HardcopyTransferStatus.ForApproval, HardcopyTransferStatus.Approved, HardcopyTransferStatus.ForTransfer] },
        approver_user_id: toBigIntId(actor.user_id, "current_user_id"),
      },
      include: {
        document: { include: { hardcopy: { include: { area: true, specific: true, asset: true, location: true, sequence: true } } } },
        from_area: true, from_specific: true, from_asset: true, from_location: true, from_sequence: true,
        destination_area: true, destination_specific: true, destination_asset: true, destination_location: true, destination_sequence: true,
        requester: true, assigned_recipient: true, approver: true,
      },
      orderBy: { created_at: "asc" },
    });
  }

  async submit(id: string, actor: AuthenticatedUser) {
    return this.changeStatus(id, HardcopyTransferStatus.Draft, HardcopyTransferStatus.ForApproval, "submit", actor);
  }

  async approve(id: string, actor: AuthenticatedUser, comments?: string) {
    return this.review(id, actor, HardcopyTransferStatus.Approved, "approve", comments);
  }

  async returnForCorrection(id: string, actor: AuthenticatedUser, comments?: string) {
    if (!comments?.trim()) throw new BadRequestException("Explain what must be corrected before returning the transfer.");
    return this.review(id, actor, HardcopyTransferStatus.Returned, "return", comments);
  }

  async reject(id: string, actor: AuthenticatedUser, comments?: string) {
    if (!comments?.trim()) throw new BadRequestException("Explain why the transfer is being rejected.");
    return this.review(id, actor, HardcopyTransferStatus.Rejected, "reject", comments);
  }

  async resubmit(id: string, actor: AuthenticatedUser) {
    return this.changeStatus(id, HardcopyTransferStatus.Returned, HardcopyTransferStatus.ForApproval, "resubmit", actor);
  }

  async cancel(id: string, actor: AuthenticatedUser, comments?: string) {
    this.assertActorPermission(actor, "hardcopy-transfers.create");
    const transferId = toBigIntId(id, "transfer_request_id");
    const actorId = toBigIntId(actor.user_id, "current_user_id");
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.hardcopyTransferRequest.findUnique({ where: { transfer_request_id: transferId } });
      if (!transfer) throw new NotFoundException("Hardcopy transfer request not found.");
      if (transfer.requested_by_user_id !== actorId) throw new ForbiddenException("Only the transfer requester can cancel this transfer.");
      const cancellable = new Set<HardcopyTransferStatus>([
        HardcopyTransferStatus.Draft,
        HardcopyTransferStatus.ForApproval,
        HardcopyTransferStatus.Returned,
      ]);
      if (!cancellable.has(transfer.status)) {
        throw new ConflictException(`Cannot cancel a ${transfer.status} transfer.`);
      }
      const updated = await tx.hardcopyTransferRequest.update({ where: { transfer_request_id: transferId }, data: { status: HardcopyTransferStatus.Cancelled, comments: comments?.trim() || transfer.comments } });
      await this.recordHistory(tx, transferId, transfer.status, updated.status, "cancel", actor, comments);
      return updated;
    });
  }

  private async review(id: string, actor: AuthenticatedUser, next: HardcopyTransferStatus, action: "approve" | "return" | "reject", comments?: string) {
    this.assertActorPermission(actor, "hardcopy-transfers.approve");
    const transferId = toBigIntId(id, "transfer_request_id");
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.hardcopyTransferRequest.findUnique({ where: { transfer_request_id: transferId } });
      if (!transfer) throw new NotFoundException("Hardcopy transfer request not found.");
      if (transfer.status !== HardcopyTransferStatus.ForApproval) throw new ConflictException("This transfer is not awaiting approval.");
      const actorId = toBigIntId(actor.user_id, "current_user_id");
      if (transfer.approver_user_id !== actorId) throw new ForbiddenException("You are not the configured Hardcopy transfer approver.");
      const updated = await tx.hardcopyTransferRequest.update({ where: { transfer_request_id: transferId }, data: { status: next, ...(next === HardcopyTransferStatus.Approved ? { approval_date: new Date() } : {}), comments: comments?.trim() || transfer.comments } });
      await this.recordHistory(tx, transferId, transfer.status, updated.status, action, actor, comments);
      return updated;
    });
  }

  async markForTransfer(id: string, actor: AuthenticatedUser) {
    return this.changeStatus(id, HardcopyTransferStatus.Approved, HardcopyTransferStatus.ForTransfer, "for-transfer", actor);
  }

  async dispatch(id: string, actor: AuthenticatedUser) {
    return this.changeStatus(id, HardcopyTransferStatus.ForTransfer, HardcopyTransferStatus.Transferred, "transfer", actor, { transfer_date: new Date() });
  }

  async awaitAcceptance(id: string, actor: AuthenticatedUser) {
    return this.changeStatus(id, HardcopyTransferStatus.Transferred, HardcopyTransferStatus.PendingRecipientAcceptance, "await-recipient-acceptance", actor);
  }

  async accept(id: string, actor: AuthenticatedUser, comments?: string) {
    this.assertActorPermission(actor, "hardcopy-transfers.accept");
    const transferId = toBigIntId(id, "transfer_request_id");
    const actorId = toBigIntId(actor.user_id, "current_user_id");
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.hardcopyTransferRequest.findUnique({ where: { transfer_request_id: transferId } });
      if (!transfer) throw new NotFoundException("Hardcopy transfer request not found.");
      if (transfer.status !== HardcopyTransferStatus.PendingRecipientAcceptance || transfer.assigned_recipient_user_id !== actorId) {
        throw new ForbiddenException("Only the assigned recipient can accept a pending physical transfer.");
      }
      if (transfer.destination_area_id && transfer.destination_location_id) {
        await tx.hardcopyDocument.update({
          where: { hardcopy_id: transfer.hardcopy_id },
          data: {
            area_id: transfer.destination_area_id,
            specific_id: transfer.destination_specific_id,
            asset_id: transfer.destination_asset_id,
            location_id: transfer.destination_location_id,
            sequence_id: transfer.destination_sequence_id,
          },
        });
      }
      const updated = await tx.hardcopyTransferRequest.update({
        where: { transfer_request_id: transferId },
        data: { status: HardcopyTransferStatus.Completed, recipient_acceptance: RecipientAcceptanceStatus.ACCEPTED, accepted_by_user_id: actorId, acceptance_at: new Date(), current_holder: transfer.current_holder ?? transfer.transfer_to, comments: comments?.trim() || transfer.comments },
      });
      await this.recordHistory(tx, transferId, transfer.status, updated.status, "accept", actor, comments);
      return updated;
    });
  }

  private async changeStatus(id: string, expected: HardcopyTransferStatus, next: HardcopyTransferStatus, action: string, actor: AuthenticatedUser, extra: Prisma.HardcopyTransferRequestUpdateInput = {}) {
    const isRequesterAction = action === "submit" || action === "resubmit";
    this.assertActorPermission(actor, isRequesterAction ? "hardcopy-transfers.create" : "hardcopy-transfers.dispatch");
    const transferId = toBigIntId(id, "transfer_request_id");
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.hardcopyTransferRequest.findUnique({ where: { transfer_request_id: transferId } });
      if (!transfer) throw new NotFoundException("Hardcopy transfer request not found.");
      if (transfer.status !== expected) throw new ConflictException(`Cannot move a ${transfer.status} transfer to ${next}.`);
      const actorId = toBigIntId(actor.user_id, "current_user_id");
      if (isRequesterAction && transfer.requested_by_user_id !== actorId) throw new ForbiddenException("Only the transfer requester can submit this transfer.");
      if (!isRequesterAction && !isAdministrativeRole(actor.role.role_name) && transfer.approver_user_id !== actorId) throw new ForbiddenException("You are not authorized to execute this transfer action.");
      const updated = await tx.hardcopyTransferRequest.update({ where: { transfer_request_id: transferId }, data: { status: next, ...extra } });
      await this.recordHistory(tx, transferId, transfer.status, updated.status, action, actor);
      return updated;
    });
  }

  private async recordHistory(tx: Prisma.TransactionClient, transferId: bigint, previous: HardcopyTransferStatus | null, next: HardcopyTransferStatus, action: string, actor: AuthenticatedUser, comments?: string) {
    await tx.hardcopyTransferHistory.create({ data: { transfer_request_id: transferId, previous_status: previous, new_status: next, action, performed_by_user_id: toBigIntId(actor.user_id, "current_user_id"), comments: comments?.trim() || null } });
  }

  private async findApproverId() {
    const user = await this.prisma.user.findFirst({ where: { role: { role_name: { in: ["Admin", "ADMIN", "Administrator", "DOCUMENT_CONTROLLER", "Document Controller", "Document Controller Officer", "PLANT_MANAGER", "Plant Manager"] } } }, select: { user_id: true }, orderBy: { user_id: "asc" } });
    return user?.user_id ?? null;
  }

  private async resolveDestinationStorage(
    tx: Prisma.TransactionClient,
    dto: CreateHardcopyTransferDto,
  ) {
    const locationId = toBigIntId(dto.destination_location_id, "destination_location_id");
    const location = await tx.location.findUnique({
      where: { location_id: locationId },
      include: {
        specific: true,
        asset: { include: { specific: true } },
      },
    });
    if (!location || !location.is_active) {
      throw new BadRequestException("The destination storage location does not exist or is inactive.");
    }

    const requestedAssetId = dto.destination_asset_id
      ? toBigIntId(dto.destination_asset_id, "destination_asset_id")
      : null;
    const requestedSpecificId = dto.destination_specific_id
      ? toBigIntId(dto.destination_specific_id, "destination_specific_id")
      : null;
    const requestedAreaId = dto.destination_area_id
      ? toBigIntId(dto.destination_area_id, "destination_area_id")
      : null;
    const requestedSequenceId = dto.destination_sequence_id
      ? toBigIntId(dto.destination_sequence_id, "destination_sequence_id")
      : null;
    const selectedAsset = requestedAssetId
      ? await tx.assetNumber.findUnique({
          where: { asset_id: requestedAssetId },
          include: { specific: true },
        })
      : null;
    if (requestedAssetId && !selectedAsset) {
      throw new BadRequestException("The destination asset number does not exist.");
    }
    if (requestedSequenceId) {
      const sequence = await tx.sequence.findUnique({ where: { sequence_id: requestedSequenceId }, select: { sequence_id: true } });
      if (!sequence) throw new BadRequestException("The destination sequence does not exist.");
    }

    const locationAssetId = location.asset_id;
    if (locationAssetId && requestedAssetId && locationAssetId !== requestedAssetId) {
      throw new BadRequestException("The selected asset number is not assigned to the destination location.");
    }
    if (location.specific_id && selectedAsset?.specific_id && location.specific_id !== selectedAsset.specific_id) {
      throw new BadRequestException("The selected asset number does not match the destination classification.");
    }
    const assetId = locationAssetId ?? requestedAssetId;
    const specificId = location.asset?.specific_id ?? location.specific_id ?? selectedAsset?.specific_id ?? requestedSpecificId;
    const areaId = location.asset?.specific?.area_id ?? location.specific?.area_id ?? selectedAsset?.specific?.area_id ?? requestedAreaId;

    if (requestedAreaId && areaId !== requestedAreaId) {
      throw new BadRequestException("The destination Area does not match the selected storage classification.");
    }
    if (requestedSpecificId && specificId !== requestedSpecificId) {
      throw new BadRequestException("The destination Specific does not match the selected storage location.");
    }
    if (!specificId) {
      throw new BadRequestException("The destination storage location must have a Specific classification.");
    }

    return {
      area_id: areaId,
      specific_id: specificId,
      asset_id: assetId,
      location_id: locationId,
      sequence_id: requestedSequenceId,
    };
  }

  private assertActorPermission(actor: AuthenticatedUser, permission: string) {
    if (!hasPermission(actor, permission)) {
      throw new ForbiddenException("You do not have permission to perform this Hardcopy transfer action.");
    }
  }

  private async assertTransferApprover(approverId: bigint) {
    const approver = await this.prisma.user.findUnique({
      where: { user_id: approverId },
      select: {
        user_id: true,
        role: {
          select: {
            role_name: true,
            role_permissions: {
              select: { permission: { select: { permission_name: true } } },
            },
          },
        },
      },
    });
    if (!approver) throw new ConflictException("The configured Hardcopy approver no longer exists.");
    if (isAdministrativeRole(approver.role.role_name)) return;
    const permissions = new Set(approver.role.role_permissions.map((link) => link.permission.permission_name));
    if (!permissions.has("hardcopy-transfers.approve") || !permissions.has("hardcopy-transfers.dispatch")) {
      throw new ConflictException("The configured Hardcopy approver must have Hardcopy transfer approval and dispatch permissions.");
    }
  }
}
