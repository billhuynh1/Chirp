import { processPendingJobs } from '@/lib/services/jobs';
import { getEnv } from '@/lib/env';

export async function POST(request: Request) {
  const secret = request.headers.get('x-internal-job-secret');
  const expected = getEnv('INTERNAL_JOB_SECRET');
  if (!expected || secret !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processPendingJobs(20);
  return Response.json(result);
}

