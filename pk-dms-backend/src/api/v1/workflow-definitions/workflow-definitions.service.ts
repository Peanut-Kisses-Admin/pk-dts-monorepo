import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WorkflowVersionStatus } from "@prisma/client";
import { AuthenticatedUser } from "../../../common/auth/authenticated-user.interface";
import { toBigIntId } from "../../../common/utils/prisma-id.util";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { CreateWorkflowDefinitionDto } from "./dto/create-workflow-definition.dto";
import { CreateWorkflowVersionDto } from "./dto/create-workflow-version.dto";
import { UpdateWorkflowVersionDto } from "./dto/update-workflow-version.dto";
import { WorkflowCondition, WorkflowGraph, WorkflowGraphEdge, WorkflowGraphNode } from "./workflow-graph.types";

const WORKFLOW_INCLUDE = {
  created_by: { select: { user_id: true, firstname: true, lastname: true, email: true } },
  versions: {
    orderBy: { version_number: "desc" as const },
    include: {
      created_by: { select: { user_id: true, firstname: true, lastname: true, email: true } },
      published_by: { select: { user_id: true, firstname: true, lastname: true, email: true } },
      _count: { select: { documents: true } },
    },
  },
};

@Injectable()
export class WorkflowDefinitionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(includeInactive = false) {
    return this.prisma.workflowDefinition.findMany({
      where: includeInactive ? undefined : { is_active: true },
      include: WORKFLOW_INCLUDE,
      orderBy: [{ document_type: "asc" }, { name: "asc" }],
    });
  }

  async published(documentType?: string) {
    return this.prisma.workflowVersion.findMany({
      where: {
        status: WorkflowVersionStatus.PUBLISHED,
        workflow_definition: {
          is_active: true,
          ...(documentType ? { OR: [{ document_type: documentType as never }, { document_type: null }] } : {}),
        },
      },
      include: { workflow_definition: true },
      orderBy: [{ workflow_definition: { name: "asc" } }, { version_number: "desc" }],
    });
  }

  async create(dto: CreateWorkflowDefinitionDto, actor: AuthenticatedUser) {
    const graph = await this.validateGraph(dto.graph);
    const actorId = toBigIntId(actor.user_id, "current_user_id");
    return this.prisma.$transaction(async (tx) => {
      const definition = await tx.workflowDefinition.create({
        data: {
          workflow_key: dto.workflow_key.trim().toLowerCase(),
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          document_type: dto.document_type ?? null,
          created_by_user_id: actorId,
        },
      });
      await tx.workflowVersion.create({
        data: {
          workflow_definition_id: definition.workflow_definition_id,
          version_number: 1,
          graph: graph as unknown as Prisma.InputJsonValue,
          created_by_user_id: actorId,
        },
      });
      return tx.workflowDefinition.findUnique({ where: { workflow_definition_id: definition.workflow_definition_id }, include: WORKFLOW_INCLUDE });
    });
  }

  async createVersion(id: string, dto: CreateWorkflowVersionDto, actor: AuthenticatedUser) {
    const definitionId = toBigIntId(id, "workflow_definition_id");
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { workflow_definition_id: definitionId },
      include: { versions: { orderBy: { version_number: "desc" }, take: 1 } },
    });
    if (!definition) throw new NotFoundException("Workflow definition was not found.");
    const latest = definition.versions[0];
    const graph = await this.validateGraph(dto.graph ?? latest?.graph);
    return this.prisma.workflowVersion.create({
      data: {
        workflow_definition_id: definitionId,
        version_number: (latest?.version_number ?? 0) + 1,
        graph: graph as unknown as Prisma.InputJsonValue,
        created_by_user_id: toBigIntId(actor.user_id, "current_user_id"),
      },
    });
  }

  async updateVersion(definitionIdValue: string, versionIdValue: string, dto: UpdateWorkflowVersionDto) {
    const definitionId = toBigIntId(definitionIdValue, "workflow_definition_id");
    const versionId = toBigIntId(versionIdValue, "workflow_version_id");
    const version = await this.prisma.workflowVersion.findFirst({ where: { workflow_version_id: versionId, workflow_definition_id: definitionId } });
    if (!version) throw new NotFoundException("Workflow version was not found.");
    if (version.status !== WorkflowVersionStatus.DRAFT) throw new ConflictException("Published workflow versions are immutable. Create a new draft version instead.");
    const graph = await this.validateGraph(dto.graph);
    return this.prisma.workflowVersion.update({
      where: { workflow_version_id: versionId },
      data: { graph: graph as unknown as Prisma.InputJsonValue },
    });
  }

  async publish(definitionIdValue: string, versionIdValue: string, actor: AuthenticatedUser) {
    const definitionId = toBigIntId(definitionIdValue, "workflow_definition_id");
    const versionId = toBigIntId(versionIdValue, "workflow_version_id");
    return this.prisma.$transaction(async (tx) => {
      const version = await tx.workflowVersion.findFirst({ where: { workflow_version_id: versionId, workflow_definition_id: definitionId } });
      if (!version) throw new NotFoundException("Workflow version was not found.");
      if (version.status !== WorkflowVersionStatus.DRAFT) throw new ConflictException("Only a draft workflow version can be published.");
      await this.validateGraph(version.graph, tx);
      await tx.workflowVersion.updateMany({
        where: { workflow_definition_id: definitionId, status: WorkflowVersionStatus.PUBLISHED },
        data: { status: WorkflowVersionStatus.ARCHIVED },
      });
      return tx.workflowVersion.update({
        where: { workflow_version_id: versionId },
        data: {
          status: WorkflowVersionStatus.PUBLISHED,
          published_by_user_id: toBigIntId(actor.user_id, "current_user_id"),
          published_at: new Date(),
        },
      });
    });
  }

  async setActive(id: string, isActive: boolean) {
    const workflowDefinitionId = toBigIntId(id, "workflow_definition_id");
    const result = await this.prisma.workflowDefinition.updateMany({ where: { workflow_definition_id: workflowDefinitionId }, data: { is_active: isActive } });
    if (!result.count) throw new NotFoundException("Workflow definition was not found.");
    return this.prisma.workflowDefinition.findUnique({ where: { workflow_definition_id: workflowDefinitionId }, include: WORKFLOW_INCLUDE });
  }

  async validateGraph(value: unknown, database: Prisma.TransactionClient | PrismaService = this.prisma): Promise<WorkflowGraph> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException("Workflow graph must be an object.");
    const graph = value as Partial<WorkflowGraph>;
    if (!Array.isArray(graph.nodes) || !graph.nodes.length || graph.nodes.length > 50) throw new BadRequestException("A workflow must contain between 1 and 50 nodes.");
    if (!Array.isArray(graph.edges) || graph.edges.length > 150) throw new BadRequestException("A workflow can contain at most 150 connections.");
    const nodes = graph.nodes as WorkflowGraphNode[];
    const edges = graph.edges as WorkflowGraphEdge[];
    const nodeKeys = new Set<string>();
    for (const node of nodes) {
      if (!node || !/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(node.key || "")) throw new BadRequestException("Every workflow node needs a valid unique key.");
      if (nodeKeys.has(node.key)) throw new BadRequestException(`Workflow node key ${node.key} is duplicated.`);
      nodeKeys.add(node.key);
      if (!node.label?.trim() || node.label.length > 150) throw new BadRequestException(`Workflow node ${node.key} needs a label.`);
      if (!["APPROVAL", "END"].includes(node.type)) throw new BadRequestException(`Workflow node ${node.key} has an invalid type.`);
      if (node.type === "APPROVAL" && !node.assignment) throw new BadRequestException(`Approval node ${node.label} needs an assignment rule.`);
      if (node.assignment) await this.validateAssignment(node, database);
    }
    if (!graph.start_node_key || !nodeKeys.has(graph.start_node_key)) throw new BadRequestException("Select a valid workflow start node.");
    const edgeKeys = new Set<string>();
    for (const edge of edges) {
      if (!edge?.key || edgeKeys.has(edge.key)) throw new BadRequestException("Every workflow connection needs a unique key.");
      edgeKeys.add(edge.key);
      if (!nodeKeys.has(edge.from) || !nodeKeys.has(edge.to)) throw new BadRequestException(`Workflow connection ${edge.key} references a missing node.`);
      if (!["APPROVE", "REJECT", "RETURN", "DEFAULT"].includes(edge.outcome)) throw new BadRequestException(`Workflow connection ${edge.key} has an invalid outcome.`);
      this.validateConditions(edge.conditions ?? []);
    }
    this.assertAcyclic(nodes, edges);
    return { schema_version: 2, start_node_key: graph.start_node_key, nodes, edges };
  }

  private async validateAssignment(node: WorkflowGraphNode, database: Prisma.TransactionClient | PrismaService) {
    const assignment = node.assignment!;
    if (!["USER", "ROLE", "REQUESTER_LEADER", "PERMISSION"].includes(assignment.type)) throw new BadRequestException(`Node ${node.label} has an invalid assignment type.`);
    if (assignment.type === "USER") {
      if (!assignment.user_id) throw new BadRequestException(`Node ${node.label} needs an assigned user.`);
      const user = await database.user.findUnique({ where: { user_id: toBigIntId(assignment.user_id, "workflow_user_id") }, select: { user_id: true } });
      if (!user) throw new BadRequestException(`The assigned user for ${node.label} does not exist.`);
    }
    if (assignment.type === "ROLE") {
      if (!assignment.role_id) throw new BadRequestException(`Node ${node.label} needs an assigned role.`);
      const role = await database.role.findUnique({ where: { role_id: toBigIntId(assignment.role_id, "workflow_role_id") }, select: { role_id: true } });
      if (!role) throw new BadRequestException(`The assigned role for ${node.label} does not exist.`);
    }
    const permission = assignment.type === "PERMISSION" ? assignment.permission : node.required_permission;
    if (permission) {
      const found = await database.permission.findUnique({ where: { permission_name: permission }, select: { permission_id: true } });
      if (!found) throw new BadRequestException(`Permission ${permission} used by ${node.label} does not exist.`);
    }
  }

  private validateConditions(conditions: WorkflowCondition[]) {
    const fields = new Set(["document_type", "action_requested", "business_document_type", "requester_type"]);
    for (const condition of conditions) {
      if (!fields.has(condition.field) || !["EQUALS", "NOT_EQUALS", "IN"].includes(condition.operator)) throw new BadRequestException("A workflow connection contains an invalid condition.");
      if (condition.operator === "IN" ? !Array.isArray(condition.value) : typeof condition.value !== "string") throw new BadRequestException("A workflow condition has an invalid comparison value.");
    }
  }

  private assertAcyclic(nodes: WorkflowGraphNode[], edges: WorkflowGraphEdge[]) {
    const adjacent = new Map(nodes.map((node) => [node.key, [] as string[]]));
    edges.forEach((edge) => adjacent.get(edge.from)!.push(edge.to));
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (key: string) => {
      if (visiting.has(key)) throw new BadRequestException("Workflow connections cannot contain a cycle.");
      if (visited.has(key)) return;
      visiting.add(key);
      adjacent.get(key)?.forEach(visit);
      visiting.delete(key);
      visited.add(key);
    };
    nodes.forEach((node) => visit(node.key));
  }
}
