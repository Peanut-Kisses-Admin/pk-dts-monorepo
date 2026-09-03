export type WorkflowDocumentType = 'SOFTCOPY' | 'HARDCOPY' | null;
export type WorkflowVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type WorkflowAssignmentType = 'USER' | 'ROLE' | 'REQUESTER_LEADER' | 'PERMISSION';
export type WorkflowOutcome = 'APPROVE' | 'REJECT' | 'RETURN' | 'DEFAULT';

export interface WorkflowCondition {
    field: 'document_type' | 'action_requested' | 'business_document_type' | 'requester_type';
    operator: 'EQUALS' | 'NOT_EQUALS' | 'IN';
    value: string | string[];
}

export interface WorkflowNode {
    key: string;
    label: string;
    type: 'APPROVAL' | 'END';
    stage?: 'NOTED_BY' | 'PLANT_MANAGER' | 'DOCUMENT_CONTROLLER_ADMIN' | 'HARDCOPY_APPROVAL' | 'CUSTOM';
    assignment?: {
        type: WorkflowAssignmentType;
        user_id?: string;
        role_id?: string;
        permission?: string;
    };
    required_permission?: string;
    position?: { x: number; y: number };
}

export interface WorkflowEdge {
    key: string;
    from: string;
    to: string;
    outcome: WorkflowOutcome;
    conditions?: WorkflowCondition[];
}

export interface WorkflowGraph {
    schema_version: 2;
    start_node_key: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

export interface WorkflowVersion {
    workflow_version_id: string;
    workflow_definition_id: string;
    version_number: number;
    status: WorkflowVersionStatus;
    graph: WorkflowGraph;
    published_at?: string | null;
    _count?: { documents: number };
}

export interface WorkflowDefinition {
    workflow_definition_id: string;
    workflow_key: string;
    name: string;
    description?: string | null;
    document_type: WorkflowDocumentType;
    is_active: boolean;
    versions: WorkflowVersion[];
}

export interface PublishedWorkflowVersion extends WorkflowVersion {
    workflow_definition: WorkflowDefinition;
}
