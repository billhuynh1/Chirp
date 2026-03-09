import { getCurrentWorkspace } from '@/lib/db/queries';
import { queueJob } from '@/lib/services/job-queue';
import { processPendingJobs } from '@/lib/services/jobs';

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const workspace = await getCurrentWorkspace();
  const { id } = await params;

  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const job = await queueJob({
    jobType: 'sync_reviews',
    idempotencyKey: `api-sync:${id}:${Date.now()}`,
    payload: { connectedAccountId: Number(id) }
  });
  const result = await processPendingJobs(20);

  return Response.json({ job, result });
}

