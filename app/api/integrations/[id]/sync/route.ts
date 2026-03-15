import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { connectedAccounts } from '@/lib/db/schema';
import { queueJob } from '@/lib/services/job-queue';
import { processPendingJobs } from '@/lib/services/jobs';
import {
  mutationErrorResponseWithTelemetry,
  parseRouteId,
  requireWorkspaceForMutation
} from '@/lib/auth/mutation-guards';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const workspaceResult = await requireWorkspaceForMutation(request, {
    ownerOnly: true,
    targetEntityType: 'connected_account'
  });
  if (!workspaceResult.ok) {
    return workspaceResult.response;
  }
  const workspace = workspaceResult.workspace;
  const { id: idRaw } = await params;
  const accountId = await parseRouteId(idRaw, 'id', {
    request,
    workspace,
    targetEntityType: 'connected_account'
  });
  if (!accountId.ok) {
    return accountId.response;
  }

  const account = await db.query.connectedAccounts.findFirst({
    where: and(
      eq(connectedAccounts.id, accountId.value),
      eq(connectedAccounts.businessId, workspace.business.id)
    )
  });

  if (!account) {
    const [existingAccount] = await db
      .select({ id: connectedAccounts.id })
      .from(connectedAccounts)
      .where(eq(connectedAccounts.id, accountId.value))
      .limit(1);

    if (existingAccount) {
      return mutationErrorResponseWithTelemetry(
        403,
        'forbidden_scope',
        'Access to this connected account is forbidden for the current workspace.',
        {
          request,
          workspace,
          targetEntityType: 'connected_account',
          targetEntityId: accountId.value
        }
      );
    }

    return mutationErrorResponseWithTelemetry(
      404,
      'not_found',
      'Connected account not found',
      {
        request,
        workspace,
        targetEntityType: 'connected_account',
        targetEntityId: accountId.value
      }
    );
  }

  const job = await queueJob({
    jobType: 'sync_reviews',
    idempotencyKey: `api-sync:${accountId.value}:${Date.now()}`,
    payload: { connectedAccountId: accountId.value }
  });
  const result = await processPendingJobs(20);

  return Response.json({ job, result });
}
