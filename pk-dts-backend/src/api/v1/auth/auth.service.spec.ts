import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { validate } from 'class-validator';

describe('Username authentication', () => {
  it('accepts a username without an email address and rejects whitespace', async () => {
    expect(await validate(Object.assign(new LoginDto(), { username: 'juan.delacruz', password: 'secret' }))).toHaveLength(0);
    expect(await validate(Object.assign(new LoginDto(), { username: 'juan dela cruz', password: 'secret' }))).not.toHaveLength(0);
  });
  it('normalizes the username and returns no email or password', async () => {
    const user = { user_id: 1n, username: 'juan', firstname: 'Juan', lastname: 'Cruz', require_password_change: false,
      password: await bcrypt.hash('secret', 4), role: { role_id: 1n, role_name: 'Staff', role_permissions: [] } };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) }, auditLog: { create: jest.fn().mockResolvedValue({}) } };
    const service = new AuthService(prisma as any, { createToken: () => 'session' } as any);
    const result = await service.login({ username: ' JUAN ', password: 'secret' });
    expect(prisma.user.findUnique.mock.calls[0][0].where).toEqual({ username: 'juan' });
    expect(result.user.username).toBe('juan');
    expect(result.user).not.toHaveProperty('email');
    expect(result.user).not.toHaveProperty('password');
    await expect(service.login({ username: 'juan', password: 'wrong' })).rejects.toThrow('Invalid username or password');
  });
});
