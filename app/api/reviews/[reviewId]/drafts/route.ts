import { generateDraftForReview } from '@/lib/services/reviews';
import { getCurrentWorkspace } from '@/lib/db/queries';
import {
  type DraftGenerationConflictResponse,
  isDraftGenerationConflictError
} from '@/lib/services/reviews/draft-generation-policy';
import {
  type AbuseProtectionResponse,
  isAbuseProtectionError
} from '@/lib/services/reviews/abuse-protection';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const workspace = await getCurrentWorkspace();
  const { reviewId } = await params;

  if (!workspace?.business) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let generationReason: string = 'manual';
  try {
    const body = (await request.json()) as { generationReason?: unknown };
    if (body.generationReason === 'regenerate') {
      generationReason = 'regenerate';
    }
  } catch {
    // keep default generation reason for requests without JSON body
  }

  try {
    const draft = await generateDraftForReview(Number(reviewId), generationReason);
    return Response.json({ draft });
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

    if (isDraftGenerationConflictError(error)) {
      return Response.json(
        {
          error: {
            code: error.code,
            message: error.message
          }
        } satisfies DraftGenerationConflictResponse,
        { status: error.status }
      );
    }

    throw error;
  }
}
