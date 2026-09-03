import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(search = '', module = '', action = '', user = '', document = '', from = '', to = '', pageValue = '1', limitValue = '20') {
    const page = Math.max(1, Number(pageValue) || 1);
    const limit = Math.min(100, Math.max(1, Number(limitValue) || 20));
    const userId = this.userIdOrUndefined(user);
    const where: Prisma.AuditLogWhereInput = {
      ...(module ? { module } : {}),
      ...(action ? { action: action.toUpperCase() } : {}),
      ...(document ? { entity_id: document.trim() } : {}),
      ...(user ? { OR: [{ user_name: { contains: user } }, { user_email: { contains: user } }, ...(userId ? [{ user_id: userId }] : [])] } : {}),
      ...(search ? { AND: [{ OR: [{ user_name: { contains: search } }, { user_email: { contains: search } }, { description: { contains: search } }, { path: { contains: search } }, { entity_id: { contains: search } }, { reason: { contains: search } }] }] } : {}),
      ...(from || to ? { created_at: { ...(from ? { gte: this.date(from, false) } : {}), ...(to ? { lte: this.date(to, true) } : {}) } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, meta: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async timeline(documentId: string) {
    if (!/^\d+$/.test(documentId)) throw new BadRequestException('Document ID must be numeric.');
    const [audit, history] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where: { entity_id: documentId }, orderBy: { created_at: 'asc' } }),
      this.prisma.documentStatusHistory.findMany({ where: { document_id: BigInt(documentId) }, orderBy: { created_at: 'asc' }, include: { actor: { select: { user_id: true, firstname: true, lastname: true, email: true, role: { select: { role_name: true } } } } } }),
    ]);
    return { audit, workflow_history: history };
  }

  private userIdOrUndefined(value: string) { return /^\d+$/.test(value.trim()) ? BigInt(value.trim()) : undefined; }
  private date(value: string, end: boolean) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`Invalid audit date: ${value}`);
    if (end && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
    return date;
  }
}
