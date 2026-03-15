import { selectGoogleLocationsForBusiness } from '@/lib/services/integrations/google';
import { processPendingJobs } from '@/lib/services/jobs';
import { queueJob } from '@/lib/services/job-queue';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { connectedAccounts } from '@/lib/db/schema';
import {
  mutationErrorResponseWithTelemetry,
  parseJsonBody,
  requireWorkspaceForMutation
} from '@/lib/auth/mutation-guards';
import { selectGoogleLocationsBodySchema } from '@/lib/validation/mutations';

export async function POST(request: Request) {
  const workspaceResult = await requireWorkspaceForMutation(request, {
    ownerOnly: true,
    targetEntityType: 'connected_account'
  });
  if (!workspaceResult.ok) {
    return workspaceResult.response;
  }
  const workspace = workspaceResult.workspace;

  const bodyResult = await parseJsonBody(request, selectGoogleLocationsBodySchema, {
    telemetry: {
      workspace,
      targetEntityType: 'connected_account'
    }
  });
  if (!bodyResult.ok) {
    return bodyResult.response;
  }
  const body = bodyResult.data;

  const account = await db.query.connectedAccounts.findFirst({
    where: and(
      eq(connectedAccounts.id, body.connectedAccountId),
      eq(connectedAccounts.businessId, workspace.business.id)
    )
  });

  if (!account) {
    const [existingAccount] = await db
      .select({ id: connectedAccounts.id })
      .from(connectedAccounts)
      .where(eq(connectedAccounts.id, body.connectedAccountId))
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
          targetEntityId: body.connectedAccountId
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
        targetEntityId: body.connectedAccountId
      }
    );
  }

  let selectedLocations;
  try {
    selectedLocations = await selectGoogleLocationsForBusiness({
      businessId: workspace.business.id,
      connectedAccountId: body.connectedAccountId,
      locationIds: body.locationIds
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Connected account not found') {
      return mutationErrorResponseWithTelemetry(
        404,
        'not_found',
        error.message,
        {
          request,
          workspace,
          targetEntityType: 'connected_account',
          targetEntityId: body.connectedAccountId
        }
      );
    }
    if (error instanceof Error && error.message === 'Select at least one location') {
      return mutationErrorResponseWithTelemetry(
        400,
        'invalid_input',
        error.message,
        {
          request,
          workspace,
          targetEntityType: 'connected_account',
          targetEntityId: body.connectedAccountId
        }
      );
    }
    throw error;
  }

  await queueJob({
    jobType: 'sync_reviews',
    idempotencyKey: `select-sync:${body.connectedAccountId}:${Date.now()}`,
    payload: { connectedAccountId: body.connectedAccountId }
  });
  await processPendingJobs(20);

  return Response.json({ locations: selectedLocations });
}
