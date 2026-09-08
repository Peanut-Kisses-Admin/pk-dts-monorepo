import { DocumentsService } from './documents.service';

const graph = {
  schema_version: 2, start_node_key: 'review',
  nodes: [
    { key: 'review', type: 'APPROVAL', label: 'Technical review', stage: 'CUSTOM', assignment: { type: 'REQUESTER_LEADER' } },
    { key: 'extra', type: 'APPROVAL', label: 'Extra review', stage: 'CUSTOM', assignment: { type: 'USER', user_id: '8' } },
    { key: 'end', type: 'END', label: 'Approved' },
  ],
  edges: [
    { key: 'approved', from: 'review', to: 'end', outcome: 'APPROVE' },
    { key: 'fallback', from: 'review', to: 'extra', outcome: 'DEFAULT' },
  ],
};

describe('Workflow Builder execution', () => {
  let service: any;
  let prisma: any;
  const actor: any = { user_id: '7', firstname: 'Assigned', lastname: 'Reviewer', role: { role_name: 'Staff', permissions: [] } };
  beforeEach(() => {
    prisma = {
      document: { findUnique: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn() },
      documentWorkflowStep: { update: jest.fn(), updateMany: jest.fn(), createMany: jest.fn() },
      documentStatusHistory: { create: jest.fn() },
      documentApproverConfiguration: { findUnique: jest.fn(), upsert: jest.fn() },
      user: { findUnique: jest.fn().mockResolvedValue({ firstname: 'Assigned', lastname: 'Reviewer' }), findFirst: jest.fn(), findMany: jest.fn() },
      $transaction: (fn: any) => fn(prisma),
    };
    service = new DocumentsService(prisma);
  });

  it('ends at the explicit outcome instead of following the default branch', () => {
    const plan = service.workflowGraphToPlan(graph, { document_type: 'SOFTCOPY' });
    expect(plan).toHaveLength(1);
    expect(plan[0].on_approve_node_key).toBeUndefined();
  });

  it('uses the default when the explicit condition does not match', () => {
    const conditional = { ...graph, edges: graph.edges.map(edge => edge.outcome === 'APPROVE'
      ? { ...edge, conditions: [{ field: 'action_requested', operator: 'EQUALS', value: 'CANCELLATION' }] } : edge) };
    const plan = service.workflowGraphToPlan(conditional, { document_type: 'SOFTCOPY', action_requested: 'CREATE' });
    expect(plan[0].on_approve_node_key).toBe('extra');
    expect(plan).toHaveLength(2);
  });

  it('rejects unmatched conditions instead of silently approving', () => {
    const conditional = { ...graph, edges: [{ ...graph.edges[0], conditions: [{ field: 'document_type', operator: 'EQUALS', value: 'HARDCOPY' }] }] };
    expect(() => service.workflowGraphToPlan(conditional, { document_type: 'SOFTCOPY' })).toThrow('No approval path matches');
  });

  it('rejects ambiguous matching branches', () => {
    const ambiguous = { ...graph, edges: [...graph.edges, { key: 'duplicate', from: 'review', to: 'extra', outcome: 'APPROVE' }] };
    expect(() => service.workflowGraphToPlan(ambiguous, { document_type: 'SOFTCOPY' })).toThrow('multiple matching');
  });

  it.each(['approve', 'reject', 'request-revision'])('follows the configured %s branch', async action => {
    const permission = action === 'reject' ? 'document-requests.reject' : action === 'request-revision' ? 'document-requests.request-revision' : 'custom.review';
    prisma.document.findUnique.mockResolvedValueOnce({
      document_id: 1n, document_type: 'HARDCOPY', created_by: 3n, status: 'PendingApproval', workflow_version_id: 2n,
      workflow_current_node_key: 'review', workflow_steps: [
        { workflow_step_id: 10n, node_key: 'review', stage: 'CUSTOM', assigned_user_id: 7n, status: 'PENDING', required_permission: 'custom.review',
          on_approve_node_key: 'extra', on_reject_node_key: 'extra', on_return_node_key: 'extra' },
        { workflow_step_id: 11n, node_key: 'extra', stage: 'CUSTOM', assigned_user_id: 8n, status: 'QUEUED' },
      ],
    }).mockResolvedValueOnce({ document_id: 1n, status: 'PendingApproval' });
    await service.transition('1', '7', action, '', { ...actor, role: { ...actor.role, permissions: [permission] } });
    expect(prisma.documentWorkflowStep.update).toHaveBeenCalledWith({ where: { workflow_step_id: 11n }, data: { status: 'PENDING' } });
    expect(prisma.document.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ workflow_current_node_key: 'extra' }) }));
  });

  it('allows an assigned custom approver without legacy Hardcopy permissions', async () => {
    prisma.document.findUnique.mockResolvedValueOnce({
      document_id: 1n, document_type: 'HARDCOPY', created_by: 3n, status: 'PendingApproval', workflow_steps: [
        { workflow_step_id: 10n, node_key: 'review', stage: 'CUSTOM', assigned_user_id: 7n, status: 'PENDING' },
      ],
    }).mockResolvedValueOnce({ document_id: 1n, status: 'Approved' });
    await expect(service.transition('1', '7', 'approve', '', actor)).resolves.toMatchObject({ status: 'Approved' });
  });

  it('does not substitute a legacy approver for an unresolved Builder role', async () => {
    prisma.document.findUnique.mockResolvedValue({ action_requested: 'CREATE' });
    prisma.documentApproverConfiguration.findUnique.mockResolvedValue({ workflow_plan: [
      { node_key: 'review', stage: 'NOTED_BY', assignment_type: 'ROLE', assigned_role_id: '99' },
    ], noted_by_user_id: 8n });
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.initializeWorkflowSteps(prisma, 1n, 3n, 'SOFTCOPY')).rejects.toThrow('does not have an eligible approver');
    expect(prisma.documentWorkflowStep.createMany).not.toHaveBeenCalled();
  });
});
