import { getCurrentWorkspace } from '@/lib/db/queries';
import { selectGoogleLocationsForBusiness } from '@/lib/services/integrations/google';
import { processPendingJobs } from '@/lib/services/jobs';
import { queueJob } from '@/lib/services/job-queue';

export async function POST(request: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const selectedLocations = await selectGoogleLocationsForBusiness({
    businessId: workspace.business.id,
    connectedAccountId: Number(body.connectedAccountId),
    locationIds: body.locationIds as string[]
  });

  await queueJob({
    jobType: 'sync_reviews',
    idempotencyKey: `select-sync:${body.connectedAccountId}:${Date.now()}`,
    payload: { connectedAccountId: Number(body.connectedAccountId) }
  });
  await processPendingJobs(20);

  return Response.json({ locations: selectedLocations });
}

