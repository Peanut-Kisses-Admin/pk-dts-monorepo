import { BadRequestException, ConflictException } from "@nestjs/common";
import { WorkflowVersionStatus } from "@prisma/client";
import { WorkflowDefinitionsService } from "./workflow-definitions.service";

const graph = {
  schema_version: 2,
  start_node_key: "leader",
  nodes: [
    { key: "leader", label: "Leader approval", type: "APPROVAL", assignment: { type: "REQUESTER_LEADER" } },
    { key: "released", label: "Released", type: "END" },
  ],
  edges: [{ key: "leader-approved", from: "leader", to: "released", outcome: "APPROVE" }],
};

describe("WorkflowDefinitionsService", () => {
  it("accepts an acyclic graph with explicit assignment rules", async () => {
    const service = new WorkflowDefinitionsService({} as any);
    await expect(service.validateGraph(graph)).resolves.toMatchObject({ schema_version: 2, start_node_key: "leader" });
  });

  it("rejects workflow cycles before a version can be saved", async () => {
    const service = new WorkflowDefinitionsService({} as any);
    await expect(service.validateGraph({
      ...graph,
      edges: [
        ...graph.edges,
        { key: "released-back", from: "released", to: "leader", outcome: "DEFAULT" },
      ],
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("does not allow a published version to be edited", async () => {
    const prisma: any = {
      workflowVersion: { findFirst: jest.fn().mockResolvedValue({ status: WorkflowVersionStatus.PUBLISHED }) },
    };
    const service = new WorkflowDefinitionsService(prisma);
    await expect(service.updateVersion("1", "2", { graph })).rejects.toBeInstanceOf(ConflictException);
  });
});
