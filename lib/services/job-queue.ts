import { and, eq, lte } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { jobs, type Job, type NewJob } from '@/lib/db/schema';

export async function queueJob({
  jobType,
  idempotencyKey,
  payload,
  runAfter,
  maxAttempts = 5
}: {
  jobType: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  runAfter?: Date;
  maxAttempts?: number;
}) {
  const values: NewJob = {
    jobType,
    idempotencyKey,
    payload,
    maxAttempts,
    runAfter: runAfter ?? new Date()
  };

  const [job] = await db
    .insert(jobs)
    .values(values)
    .onConflictDoNothing({
      target: jobs.idempotencyKey
    })
    .returning();

  if (job) {
    return job;
  }

  return db.query.jobs.findFirst({
    where: eq(jobs.idempotencyKey, idempotencyKey)
  });
}

export async function claimPendingJobs(limit = 10) {
  const pendingJobs = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.status, 'pending'), lte(jobs.runAfter, new Date())))
    .limit(limit);

  const claimed: Job[] = [];

  for (const job of pendingJobs) {
    const [updated] = await db
      .update(jobs)
      .set({
        status: 'running',
        lockedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(eq(jobs.id, job.id), eq(jobs.status, 'pending')))
      .returning();

    if (updated) {
      claimed.push(updated);
    }
  }

  return claimed;
}

export async function completeJob(jobId: number) {
  await db
    .update(jobs)
    .set({
      status: 'succeeded',
      lockedAt: null,
      completedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(jobs.id, jobId));
}

export async function failJob(job: Job, error: Error) {
  const attemptCount = job.attemptCount + 1;
  const dead = attemptCount >= job.maxAttempts;
  const delayMinutes = Math.min(attemptCount * 5, 60);

  await db
    .update(jobs)
    .set({
      status: dead ? 'dead' : 'pending',
      attemptCount,
      lastError: error.message,
      lockedAt: null,
      runAfter: dead ? job.runAfter : new Date(Date.now() + delayMinutes * 60_000),
      updatedAt: new Date()
    })
    .where(eq(jobs.id, job.id));
}
