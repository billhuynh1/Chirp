import { analyzeStoredReview } from '@/lib/services/reviews';
import { getCurrentWorkspace } from '@/lib/db/queries';
import {
  type AbuseProtectionResponse,
  isAbuseProtectionError
} from '@/lib/services/reviews/abuse-protection';

export async function POST(
  _: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const workspace = await getCurrentWorkspace();
  const { reviewId } = await params;

  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const analysis = await analyzeStoredReview(Number(reviewId));
    return Response.json({ analysis });
  } catch (error) {
    if (isAbuseProtectionError(error)) {
      return Response.json(
        {
          error: {
            code: error.code,
            message: error.message,
            retryAfterSeconds: error.retryAfterSeconds
          }
        } satisfies AbuseProtectionResponse,
        {
          status: error.status,
          headers: {
            'Retry-After': String(error.retryAfterSeconds)
          }
        }
      );
    }

    throw error;
  }
}
