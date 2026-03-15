import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { auditLogs } from '@/lib/db/schema';
import { createAuditLog } from '@/lib/services/audit';

const REJECTION_ACTION = 'mutation_rejected';
const ABUSE_WINDOW_MS = 5 * 60_000;
const ABUSE_THRESHOLD = 6;
const ABUSE_WARNING_COOLDOWN_MS = 2 * 60_000;

const warningCooldownByActorRoute = new Map<string, number>();

type MutationWorkspaceActor = {
  user: { id: number; role?: string | null };
  team: { id: number };
  business: { id: number };
};

type MutationSecurityEventInput = {
  request: Request;
  status: number;
  code: string;
  message: string;
  details?: unknown;
  workspace?: MutationWorkspaceActor | null;
  targetEntityType?: string;
  targetEntityId?: number | null;
};

function getRequestRoute(request: Request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return 'unknown';
  }
}

function getRequestIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? null;
  }
  return request.headers.get('x-real-ip');
}

async function maybeWarnMutationAbuse(event: {
  route: string;
  code: string;
  workspace: MutationWorkspaceActor;
}) {
  const windowStart = new Date(Date.now() - ABUSE_WINDOW_MS);
  const [attemptsInWindow] = await db
    .select({
      count: sql<number>`count(*)`
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, REJECTION_ACTION),
        eq(auditLogs.teamId, event.workspace.team.id),
        eq(auditLogs.businessId, event.workspace.business.id),
        eq(auditLogs.userId, event.workspace.user.id),
        gte(auditLogs.createdAt, windowStart),
        sql`${auditLogs.metadata} ->> 'route' = ${event.route}`
      )
    );

  const rejectionCount = Number(attemptsInWindow?.count ?? 0);
  if (rejectionCount < ABUSE_THRESHOLD) {
    return;
  }

  const warningKey = `${event.workspace.user.id}:${event.route}`;
  const lastWarningAt = warningCooldownByActorRoute.get(warningKey) ?? 0;
  if (Date.now() - lastWarningAt < ABUSE_WARNING_COOLDOWN_MS) {
    return;
  }

  warningCooldownByActorRoute.set(warningKey, Date.now());
  console.warn('Potential mutation abuse pattern detected', {
    userId: event.workspace.user.id,
    teamId: event.workspace.team.id,
    businessId: event.workspace.business.id,
    route: event.route,
    code: event.code,
    rejectionCount,
    windowMs: ABUSE_WINDOW_MS
  });
}

export async function recordMutationSecurityEvent(input: MutationSecurityEventInput) {
  const route = getRequestRoute(input.request);
  const method = input.request.method;
  const ipAddress = getRequestIp(input.request);

  if (!input.workspace?.business) {
    if (input.status >= 400) {
      console.warn('Unauthenticated mutation rejection', {
        route,
        method,
        status: input.status,
        code: input.code
      });
    }
    return;
  }

  try {
    await createAuditLog({
      teamId: input.workspace.team.id,
      businessId: input.workspace.business.id,
      userId: input.workspace.user.id,
      entityType: input.targetEntityType ?? 'mutation',
      entityId: input.targetEntityId ?? 0,
      action: REJECTION_ACTION,
      metadata: {
        route,
        method,
        status: input.status,
        code: input.code,
        message: input.message,
        details: input.details,
        actorRole: input.workspace.user.role ?? null
      },
      ipAddress: ipAddress ?? undefined
    });

    await maybeWarnMutationAbuse({
      route,
      code: input.code,
      workspace: input.workspace
    });
  } catch (error) {
    console.error('Failed to persist mutation security event', {
      route,
      status: input.status,
      code: input.code,
      error
    });
  }
}
