import { claimPendingJobs, completeJob, failJob } from '@/lib/services/job-queue';
import {
  analyzeStoredReview,
  generateDraftForReview,
  syncConnectedAccountReviews
} from '@/lib/services/reviews';
import { sendNotification } from '@/lib/services/notifications';

export async function processPendingJobs(limit = 10) {
  const claimedJobs = await claimPendingJobs(limit);
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0
  };

  for (const job of claimedJobs) {
    try {
      switch (job.jobType) {
        case 'sync_reviews':
          await syncConnectedAccountReviews(Number(job.payload.connectedAccountId));
          break;
        case 'analyze_review':
          await analyzeStoredReview(Number(job.payload.reviewId));
          break;
        case 'generate_draft':
          await generateDraftForReview(
            Number(job.payload.reviewId),
            String(job.payload.generationReason ?? 'manual')
          );
          break;
        case 'send_notification':
          await sendNotification(Number(job.payload.notificationId));
          break;
        case 'cleanup_jobs':
          break;
        default:
          throw new Error(`Unsupported job type: ${job.jobType}`);
      }

      await completeJob(job.id);
      results.succeeded += 1;
    } catch (error) {
      await failJob(job, error as Error);
      results.failed += 1;
    }

    results.processed += 1;
  }

  return results;
}
