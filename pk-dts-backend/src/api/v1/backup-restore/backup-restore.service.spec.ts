import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { BackupRestoreService } from "./backup-restore.service";
import { FactoryResetScope } from "./dto/factory-reset.dto";

describe("BackupRestoreService", () => {
  it("deletes account registration requests before the roles they reference", async () => {
    const calls: string[] = [];
    const tx = new Proxy(
      {},
      {
        get: (_target, model: string) => ({
          updateMany: async () => calls.push(`${model}.updateMany`),
          deleteMany: async () => calls.push(`${model}.deleteMany`),
        }),
      },
    ) as Prisma.TransactionClient;
    const service = new BackupRestoreService(
      {} as PrismaService,
      {} as ConfigService,
    );

    await (service as unknown as { clearDatabase(client: Prisma.TransactionClient): Promise<void> })
      .clearDatabase(tx);

    expect(calls).toContain("accountRegistrationRequest.deleteMany");
    expect(calls.indexOf("accountRegistrationRequest.deleteMany")).toBeLessThan(
      calls.indexOf("role.deleteMany"),
    );
    expect(calls.indexOf("accountRegistrationRequest.deleteMany")).toBeLessThan(
      calls.indexOf("user.deleteMany"),
    );
  });

  it.each([FactoryResetScope.SOFTCOPY, FactoryResetScope.HARDCOPY])(
    "deletes only %s documents for a scoped reset",
    async (scope) => {
      const updateMany = jest.fn().mockResolvedValue({ count: 0 });
      const deleteMany = jest.fn().mockResolvedValue({ count: 3 });
      const tx = {
        softcopyDocument: { updateMany },
        document: { deleteMany },
      } as unknown as Prisma.TransactionClient;
      const service = new BackupRestoreService(
        {} as PrismaService,
        {} as ConfigService,
      );

      const count = await (
        service as unknown as {
          clearDocumentsByType(
            client: Prisma.TransactionClient,
            resetScope: FactoryResetScope.SOFTCOPY | FactoryResetScope.HARDCOPY,
          ): Promise<number>;
        }
      ).clearDocumentsByType(
        tx,
        scope as FactoryResetScope.SOFTCOPY | FactoryResetScope.HARDCOPY,
      );

      expect(deleteMany).toHaveBeenCalledWith({
        where: { document_type: scope },
      });
      expect(updateMany).toHaveBeenCalledTimes(
        scope === FactoryResetScope.SOFTCOPY ? 1 : 0,
      );
      expect(count).toBe(3);
    },
  );
});
