import { ForbiddenException } from "@nestjs/common";
import { HardcopyTransferStatus, RecipientAcceptanceStatus } from "@prisma/client";
import { HardcopyTransfersService } from "./hardcopy-transfers.service";

const recipient = {
  user_id: "12",
  email: "recipient@example.com",
  firstname: "Receiving",
  lastname: "User",
  require_password_change: false,
  role: { role_id: "2", role_name: "User", permissions: ["hardcopy-transfers.accept"] },
};

describe("HardcopyTransfersService", () => {
  it("returns an awaiting-approval transfer for correction", async () => {
    const tx: any = {
      hardcopyTransferRequest: {
        findUnique: jest.fn().mockResolvedValue({
          transfer_request_id: 6n,
          status: HardcopyTransferStatus.ForApproval,
          approver_user_id: 4n,
          comments: null,
        }),
        update: jest.fn().mockResolvedValue({ status: HardcopyTransferStatus.Returned }),
      },
      hardcopyTransferHistory: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new HardcopyTransfersService({ $transaction: jest.fn((callback) => callback(tx)) } as any);
    const approver = { ...recipient, user_id: "4", role: { ...recipient.role, permissions: ["hardcopy-transfers.approve"] } };

    await service.returnForCorrection("6", approver as any, "Correct the destination.");

    expect(tx.hardcopyTransferRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: HardcopyTransferStatus.Returned }),
    }));
  });

  it("allows the requester to cancel a returned transfer", async () => {
    const tx: any = {
      hardcopyTransferRequest: {
        findUnique: jest.fn().mockResolvedValue({
          transfer_request_id: 6n,
          requested_by_user_id: 12n,
          status: HardcopyTransferStatus.Returned,
          comments: "Correct the destination.",
        }),
        update: jest.fn().mockResolvedValue({ status: HardcopyTransferStatus.Cancelled }),
      },
      hardcopyTransferHistory: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new HardcopyTransfersService({ $transaction: jest.fn((callback) => callback(tx)) } as any);
    const requester = { ...recipient, role: { ...recipient.role, permissions: ["hardcopy-transfers.create"] } };

    await service.cancel("6", requester as any, "No longer needed.");

    expect(tx.hardcopyTransferRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: HardcopyTransferStatus.Cancelled }),
    }));
  });

  it("allows only the assigned recipient to accept physical receipt", async () => {
    const prisma: any = {
      $transaction: jest.fn((callback) => callback({
        hardcopyTransferRequest: {
          findUnique: jest.fn().mockResolvedValue({
            transfer_request_id: 7n,
            status: HardcopyTransferStatus.PendingRecipientAcceptance,
            assigned_recipient_user_id: 12n,
            transfer_to: "Receiving Office",
          }),
        },
      })),
    };
    const service = new HardcopyTransfersService(prisma);

    await expect(service.accept("7", { ...recipient, user_id: "9" } as any))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it("records recipient acceptance and changes the current holder only after confirmation", async () => {
    const tx: any = {
      hardcopyTransferRequest: {
        findUnique: jest.fn().mockResolvedValue({
          transfer_request_id: 7n,
          status: HardcopyTransferStatus.PendingRecipientAcceptance,
          assigned_recipient_user_id: 12n,
          transfer_to: "Receiving Office",
        }),
        update: jest.fn().mockResolvedValue({
          transfer_request_id: 7n,
          status: HardcopyTransferStatus.Completed,
          recipient_acceptance: RecipientAcceptanceStatus.ACCEPTED,
        }),
      },
      hardcopyTransferHistory: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = { $transaction: jest.fn((callback) => callback(tx)) };
    const service = new HardcopyTransfersService(prisma);

    await service.accept("7", recipient as any, "Received in good condition");

    expect(tx.hardcopyTransferRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: HardcopyTransferStatus.Completed,
        recipient_acceptance: RecipientAcceptanceStatus.ACCEPTED,
        accepted_by_user_id: 12n,
        current_holder: "Receiving Office",
      }),
    }));
    expect(tx.hardcopyTransferHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        previous_status: HardcopyTransferStatus.PendingRecipientAcceptance,
        new_status: HardcopyTransferStatus.Completed,
        action: "accept",
      }),
    }));
  });

  it("moves the Hardcopy storage route only after recipient acceptance", async () => {
    const tx: any = {
      hardcopyTransferRequest: {
        findUnique: jest.fn().mockResolvedValue({
          transfer_request_id: 8n,
          hardcopy_id: 21n,
          status: HardcopyTransferStatus.PendingRecipientAcceptance,
          assigned_recipient_user_id: 12n,
          transfer_to: "Receiving Office",
          destination_area_id: 2n,
          destination_specific_id: 3n,
          destination_asset_id: 4n,
          destination_location_id: 5n,
          destination_sequence_id: 6n,
        }),
        update: jest.fn().mockResolvedValue({ status: HardcopyTransferStatus.Completed }),
      },
      hardcopyDocument: { update: jest.fn().mockResolvedValue({}) },
      hardcopyTransferHistory: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = { $transaction: jest.fn((callback) => callback(tx)) };
    const service = new HardcopyTransfersService(prisma);

    await service.accept("8", recipient as any);

    expect(tx.hardcopyDocument.update).toHaveBeenCalledWith({
      where: { hardcopy_id: 21n },
      data: {
        area_id: 2n,
        specific_id: 3n,
        asset_id: 4n,
        location_id: 5n,
        sequence_id: 6n,
      },
    });
  });
});
