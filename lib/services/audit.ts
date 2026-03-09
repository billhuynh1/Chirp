import { db } from '@/lib/db/drizzle';
import { auditLogs, type NewAuditLog } from '@/lib/db/schema';

export async function createAuditLog(entry: NewAuditLog) {
  await db.insert(auditLogs).values(entry);
}
