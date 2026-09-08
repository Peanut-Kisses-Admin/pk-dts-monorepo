import { RolesService } from './roles.service';
import { RolePermissionsService } from '../role-permissions/role-permissions.service';

describe('Fixed system roles', () => {
  it('rejects role creation, renaming and deletion', async () => {
    const service = new RolesService({} as any);
    expect(() => service.create({ role_name: 'Extra' })).toThrow();
    expect(() => service.update('1', { role_name: 'Extra' })).toThrow();
    await expect(service.remove('1')).rejects.toThrow();
  });
  it('prevents granting write access to Internal Audit', async () => {
    const prisma = { role: { findUnique: jest.fn().mockResolvedValue({ role_name: 'Internal Audit' }) },
      permission: { findUnique: jest.fn().mockResolvedValue({ permission_name: 'documents.delete' }) } };
    await expect(new RolePermissionsService(prisma as any).create({ role_id: '1', permission_id: '2' })).rejects.toThrow('read-only');
  });
});
